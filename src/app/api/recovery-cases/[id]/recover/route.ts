import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getRecoveryDecision } from "@/lib/recovery/decision-engine";

export const runtime = "nodejs";

type Props = {
    params: Promise<{ id: string }>;
};

export async function POST(
    request: Request,
    { params }: Props,
) {
    try {
        const { id } = await params;

        const recoveryCase = await prisma.recoveryCase.findUnique({
            where: {
                id,
            },
        });

        if (!recoveryCase) {
            return NextResponse.json(
                { error: "Recovery case not found." },
                { status: 404 },
            );
        }

        const decision = getRecoveryDecision({
            amount: recoveryCase.amount,
            amountPaid: recoveryCase.amountPaid,
            paymentStatus: recoveryCase.paymentStatus,
            recoveryStatus: recoveryCase.recoveryStatus,
            errorSource: recoveryCase.errorSource,
            errorStep: recoveryCase.errorStep,
            errorReason: recoveryCase.errorReason,
        });

        if (!decision.eligible) {
            return NextResponse.json(
                {
                    error: "Recovery case is not eligible for recovery.",
                    decision,
                },
                { status: 409 },
            );
        }

        if (decision.recommendedAction !== "RETRY_PAYMENT_LINK") {
            return NextResponse.json(
                { error: "No recovery action is available." },
                { status: 409 },
            );
        }

        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            return NextResponse.json(
                { error: "Razorpay is not configured." },
                { status: 500 },
            );
        }

        const existingAction = await prisma.recoveryAction.findFirst({
            where: {
                recoveryCaseId: recoveryCase.id,
                actionType: "RETRY_PAYMENT_LINK",
                status: {
                    in: ["PENDING", "EXECUTED"],
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        if (existingAction) {
            return NextResponse.json(
                {
                    error: "A retry payment action already exists for this case.",
                    action: existingAction,
                },
                { status: 409 },
            );
        }

        const action = await prisma.recoveryAction.create({
            data: {
                recoveryCaseId: recoveryCase.id,
                actionType: "RETRY_PAYMENT_LINK",
                status: "PENDING",
                reason: decision.reasons.join(" "),
            },
        });

        await prisma.recoveryCase.update({
            where: {
                id: recoveryCase.id,
            },
            data: {
                recoveryStatus: "INTERVENTION_PENDING",
            },
        });

        const referenceId = `RR-${action.id}`;

        const auth = Buffer.from(
            `${keyId}:${keySecret}`,
        ).toString("base64");

        const response = await fetch(
            "https://api.razorpay.com/v1/payment_links",
            {
                method: "POST",
                headers: {
                    Authorization: `Basic ${auth}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    amount: recoveryCase.amount - recoveryCase.amountPaid,
                    currency: recoveryCase.currency,
                    description: `Retry payment for ${recoveryCase.referenceId}`,
                    reference_id: referenceId,
                    notify: {
                        sms: false,
                        email: false,
                    },
                }),
                cache: "no-store",
            },
        );

        const data = await response.json();

        if (!response.ok) {
            await prisma.recoveryAction.update({
                where: {
                    id: action.id,
                },
                data: {
                    status: "FAILED",
                },
            });

            await prisma.recoveryCase.update({
                where: {
                    id: recoveryCase.id,
                },
                data: {
                    recoveryStatus: "ELIGIBLE",
                },
            });

            console.error("Razorpay recovery Payment Link error:", {
                status: response.status,
                error: data?.error?.code,
            });

            return NextResponse.json(
                { error: "Unable to create retry payment link." },
                { status: 502 },
            );
        }

        const paymentLinkId =
            typeof data?.id === "string" ? data.id : undefined;

        const shortUrl =
            typeof data?.short_url === "string"
                ? data.short_url
                : undefined;

        if (!paymentLinkId || !shortUrl) {
            await prisma.recoveryAction.update({
                where: {
                    id: action.id,
                },
                data: {
                    status: "FAILED",
                },
            });

            await prisma.recoveryCase.update({
                where: {
                    id: recoveryCase.id,
                },
                data: {
                    recoveryStatus: "ELIGIBLE",
                },
            });

            return NextResponse.json(
                { error: "Razorpay returned an incomplete payment link." },
                { status: 502 },
            );
        }

        const now = new Date();

        const [updatedAction, updatedCase] = await prisma.$transaction([
            prisma.recoveryAction.update({
                where: {
                    id: action.id,
                },
                data: {
                    status: "EXECUTED",
                    externalId: paymentLinkId,
                    executedAt: now,
                },
            }),
            prisma.recoveryCase.update({
                where: {
                    id: recoveryCase.id,
                },
                data: {
                    paymentLinkId,
                    recoveryStatus: "AWAITING_OUTCOME",
                },
            }),
        ]);

        return NextResponse.json({
            ok: true,
            action: updatedAction,
            recoveryCase: updatedCase,
            paymentLink: {
                id: paymentLinkId,
                shortUrl,
                referenceId: data.reference_id,
            },
        });
    } catch (error) {
        console.error("Recovery action failed:", error);

        return NextResponse.json(
            { error: "Unable to execute recovery action." },
            { status: 500 },
        );
    }
}
export async function GET(
    request: Request,
    { params }: Props,
) {
    try {
        const { id } = await params;

        const recoveryCase = await prisma.recoveryCase.findUnique({
            where: {
                id,
            },
        });

        if (!recoveryCase) {
            return NextResponse.json(
                { error: "Recovery case not found." },
                { status: 404 },
            );
        }

        const action = await prisma.recoveryAction.findFirst({
            where: {
                recoveryCaseId: recoveryCase.id,
                actionType: "RETRY_PAYMENT_LINK",
                status: "EXECUTED",
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        if (!action?.externalId) {
            return NextResponse.json(
                { error: "No executed recovery payment link found." },
                { status: 404 },
            );
        }

        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            return NextResponse.json(
                { error: "Razorpay is not configured." },
                { status: 500 },
            );
        }

        const auth = Buffer.from(
            `${keyId}:${keySecret}`,
        ).toString("base64");

        const response = await fetch(
            `https://api.razorpay.com/v1/payment_links/${action.externalId}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Basic ${auth}`,
                },
                cache: "no-store",
            },
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Failed to fetch Razorpay Payment Link:", {
                status: response.status,
                error: data?.error?.code,
            });

            return NextResponse.json(
                { error: "Unable to fetch payment link." },
                { status: 502 },
            );
        }

        return NextResponse.json({
            ok: true,
            paymentLink: {
                id: data.id,
                shortUrl: data.short_url,
                status: data.status,
                amount: data.amount,
                amountPaid: data.amount_paid,
                referenceId: data.reference_id,
            },
        });
    } catch (error) {
        console.error("Failed to retrieve recovery payment link:", error);

        return NextResponse.json(
            { error: "Unable to retrieve payment link." },
            { status: 500 },
        );
    }
}
