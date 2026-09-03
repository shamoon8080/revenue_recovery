import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

function verifyWebhookSignature(
  rawBody: string,
  receivedSignature: string,
  secret: string,
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const expected = Buffer.from(expectedSignature, "utf8");
  const received = Buffer.from(receivedSignature, "utf8");

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, received);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];

  return typeof value === "string" ? value : undefined;
}

function getNumber(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = record[key];

  return typeof value === "number" ? value : undefined;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("RAZORPAY_WEBHOOK_SECRET is not configured.");

    return NextResponse.json(
      { error: "Webhook is not configured." },
      { status: 500 },
    );
  }

  const rawBody = await request.text();

  const signature = request.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing webhook signature." },
      { status: 400 },
    );
  }

  const isValid = verifyWebhookSignature(
    rawBody,
    signature,
    webhookSecret,
  );

  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 401 },
    );
  }

  const eventId = request.headers.get("x-razorpay-event-id");

  if (!eventId) {
    return NextResponse.json(
      { error: "Missing webhook event ID." },
      { status: 400 },
    );
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook payload." },
      { status: 400 },
    );
  }

  if (!isRecord(payload)) {
    return NextResponse.json(
      { error: "Invalid webhook payload." },
      { status: 400 },
    );
  }

  const eventType = getString(payload, "event");

  if (!eventType) {
    return NextResponse.json(
      { error: "Webhook event type is missing." },
      { status: 400 },
    );
  }

  // Database unique constraint is the final idempotency guard.
  try {
    await prisma.webhookEvent.create({
      data: {
        razorpayEventId: eventId,
        eventType,
        status: "RECEIVED",
      },
    });
  } catch (error) {
    // A duplicate event is safe to acknowledge.
    if (
      isRecord(error) &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json({
        received: true,
        duplicate: true,
      });
    }

    console.error("Failed to persist webhook event:", error);

    return NextResponse.json(
      { error: "Unable to process webhook." },
      { status: 500 },
    );
  }

  try {
    if (eventType === "payment.failed") {
      const payloadRoot = payload.payload;

      if (!isRecord(payloadRoot)) {
        throw new Error("Missing webhook payload object.");
      }

      const paymentWrapper = payloadRoot.payment;

      if (!isRecord(paymentWrapper)) {
        throw new Error("Missing payment payload.");
      }

      const payment = paymentWrapper.entity;

      if (!isRecord(payment)) {
        throw new Error("Missing payment entity.");
      }

      const paymentId = getString(payment, "id");
      const orderId = getString(payment, "order_id");
      const amount = getNumber(payment, "amount");
      const currency = getString(payment, "currency");

      const errorCode = getString(payment, "error_code");
      const errorDescription = getString(payment, "error_description");
      const errorReason = getString(payment, "error_reason");
      const errorSource = getString(payment, "error_source");
      const errorStep = getString(payment, "error_step");

      if (!paymentId || amount === undefined || !currency) {
        throw new Error(
          "Required payment.failed fields are missing.",
        );
      }

      /*
       * For payment.failed, we need a stable application reference.
       *
       * If an order_id exists, use it as the reference for this
       * payment-at-risk case. Otherwise fall back to payment ID.
       */
      const referenceId = orderId ?? paymentId;

      await prisma.recoveryCase.upsert({
        where: {
          referenceId,
        },
        create: {
          referenceId,
          orderId,
          paymentId,
          amount,
          amountPaid: 0,
          currency,
          paymentStatus: "FAILED",
          recoveryStatus: "AT_RISK",
          errorCode,
          errorDescription,
          errorReason,
          errorSource,
          errorStep,
        },
        update: {
          orderId,
          paymentId,
          amount,
          currency,
          paymentStatus: "FAILED",
          errorCode,
          errorDescription,
          errorReason,
          errorSource,
          errorStep,
        },
      });
    }
    if (eventType === "payment_link.paid") {
      const payloadRoot = payload.payload;

      if (!isRecord(payloadRoot)) {
        throw new Error("Missing webhook payload object.");
      }

      const paymentLinkWrapper = payloadRoot.payment_link;

      if (!isRecord(paymentLinkWrapper)) {
        throw new Error("Missing payment link payload.");
      }

      const paymentLink = paymentLinkWrapper.entity;

      if (!isRecord(paymentLink)) {
        throw new Error("Missing payment link entity.");
      }

      const paymentLinkId = getString(paymentLink, "id");
      const amountPaid = getNumber(paymentLink, "amount_paid");

      if (!paymentLinkId || amountPaid === undefined) {
        throw new Error(
          "Required payment_link.paid fields are missing.",
        );
      }

      const recoveryCase = await prisma.recoveryCase.findFirst({
        where: {
          paymentLinkId,
        },
      });

      if (recoveryCase) {
        const recoveryAction =
          await prisma.recoveryAction.findFirst({
            where: {
              recoveryCaseId: recoveryCase.id,
              externalId: paymentLinkId,
              actionType: "RETRY_PAYMENT_LINK",
            },
            orderBy: {
              createdAt: "desc",
            },
          });

        if (recoveryAction) {
          const now = new Date();

          await prisma.$transaction([
            prisma.recoveryAction.update({
              where: {
                id: recoveryAction.id,
              },
              data: {
                status: "EXECUTED",
                completedAt: now,
              },
            }),
            prisma.recoveryCase.update({
              where: {
                id: recoveryCase.id,
              },
              data: {
                amountPaid,
                paymentStatus: "CAPTURED",
                recoveryStatus: "RECOVERED",
              },
            }),
          ]);
        }
      }
    }

    await prisma.webhookEvent.update({
      where: {
        razorpayEventId: eventId,
      },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
      },
    });

    console.log("[RAZORPAY WEBHOOK PROCESSED]", {
      eventId,
      eventType,
    });

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error("Webhook processing failed:", {
      eventId,
      eventType,
      error,
    });

    await prisma.webhookEvent
      .update({
        where: {
          razorpayEventId: eventId,
        },
        data: {
          status: "FAILED",
        },
      })
      .catch((updateError) => {
        console.error(
          "Failed to mark webhook as FAILED:",
          updateError,
        );
      });

    return NextResponse.json(
      { error: "Unable to process webhook." },
      { status: 500 },
    );
  }
}