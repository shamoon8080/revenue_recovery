import { NextResponse } from "next/server";
import { z } from "zod";

const createPaymentLinkSchema = z.object({
    amount: z.number().int().positive(),
    description: z.string().min(1).max(200),
    referenceId: z.string().min(1).max(40),
    customer: z
        .object({
            name: z.string().min(1).max(100).optional(),
            email: z.string().email().optional(),
            contact: z.string().max(20).optional(),
        })
        .optional(),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            return NextResponse.json(
                { error: "Razorpay is not configured." },
                { status: 500 },
            );
        }

        const body = await request.json();

        const parsed = createPaymentLinkSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request." },
                { status: 400 },
            );
        }

        const { amount, description, referenceId, customer } = parsed.data;

        const razorpayPayload: Record<string, unknown> = {
            amount,
            currency: "INR",
            description,
            reference_id: referenceId,
            notify: {
                sms: false,
                email: false,
            },
        };

        if (customer) {
            razorpayPayload.customer = {
                ...(customer.name ? { name: customer.name } : {}),
                ...(customer.email ? { email: customer.email } : {}),
                ...(customer.contact ? { contact: customer.contact } : {}),
            };
        }

        const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

        const response = await fetch(
            "https://api.razorpay.com/v1/payment_links",
            {
                method: "POST",
                headers: {
                    Authorization: `Basic ${auth}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(razorpayPayload),
                cache: "no-store",
            },
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Razorpay Payment Link API error:", {
                status: response.status,
                error: data?.error?.code,
            });

            return NextResponse.json(
                { error: "Unable to create payment link." },
                { status: 502 },
            );
        }

        return NextResponse.json({
            id: data.id,
            shortUrl: data.short_url,
            status: data.status,
            referenceId: data.reference_id,
        });
    } catch (error) {
        console.error("Payment Link creation failed:", error);

        return NextResponse.json(
            { error: "Unable to create payment link." },
            { status: 500 },
        );
    }
}