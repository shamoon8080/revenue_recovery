import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getRecoveryDecision } from "@/lib/recovery/decision-engine";

export const runtime = "nodejs";

type Props = {
    params: Promise<{ id: string }>;
};

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

        const decision = getRecoveryDecision({
            amount: recoveryCase.amount,
            amountPaid: recoveryCase.amountPaid,
            paymentStatus: recoveryCase.paymentStatus,
            recoveryStatus: recoveryCase.recoveryStatus,
            errorSource: recoveryCase.errorSource,
            errorStep: recoveryCase.errorStep,
            errorReason: recoveryCase.errorReason,
        });

        return NextResponse.json({
            ok: true,
            caseId: recoveryCase.id,
            decision,
        });
    } catch (error) {
        console.error("Failed to calculate recovery decision:", error);

        return NextResponse.json(
            { error: "Unable to calculate recovery decision." },
            { status: 500 },
        );
    }
}