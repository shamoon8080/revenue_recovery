import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
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

        return NextResponse.json({
            ok: true,
            case: recoveryCase,
        });
    } catch (error) {
        console.error("Failed to fetch recovery case:", error);

        return NextResponse.json(
            { error: "Unable to fetch recovery case." },
            { status: 500 },
        );
    }
}
