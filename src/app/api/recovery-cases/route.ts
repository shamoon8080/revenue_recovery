import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET() {
    try {
        const recoveryCases = await prisma.recoveryCase.findMany({
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json({
            ok: true,
            cases: recoveryCases,
        });
    } catch (error) {
        console.error("Failed to fetch recovery cases:", error);

        return NextResponse.json(
            { error: "Unable to fetch recovery cases." },
            { status: 500 },
        );
    }
}