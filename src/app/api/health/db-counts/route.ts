import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET() {
    try {
        const [webhookEvents, recoveryCases] = await Promise.all([
            prisma.webhookEvent.count(),
            prisma.recoveryCase.count(),
        ]);

        return NextResponse.json({
            ok: true,
            counts: {
                webhookEvents,
                recoveryCases,
            },
        });
    } catch (error) {
        console.error("Database count check failed:", error);

        return NextResponse.json(
            {
                ok: false,
                error: "Database query failed.",
            },
            { status: 503 },
        );
    }
}