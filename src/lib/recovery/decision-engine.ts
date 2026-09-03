export type RecoveryDecisionInput = {
    amount: number;
    amountPaid: number;
    paymentStatus: string;
    recoveryStatus: string;
    errorSource: string | null;
    errorStep: string | null;
    errorReason: string | null;
};

export type RecoveryDecision = {
    score: number;
    eligible: boolean;
    recommendedAction: "RETRY_PAYMENT_LINK" | null;
    reasons: string[];
};

export function getRecoveryDecision(
    recoveryCase: RecoveryDecisionInput,
): RecoveryDecision {
    let score = 0;
    const reasons: string[] = [];

    /*
     * These are product heuristics, not a machine-learning probability.
     * The score represents the strength of the recovery opportunity.
     */

    if (recoveryCase.paymentStatus === "FAILED") {
        score += 35;
        reasons.push("Payment failed and has not been captured.");
    }

    if (recoveryCase.amountPaid < recoveryCase.amount) {
        score += 10;
        reasons.push("There is still unpaid amount remaining.");
    }

    if (recoveryCase.errorSource === "bank") {
        score += 20;
        reasons.push("Failure originated at the bank authorization stage.");
    }

    if (recoveryCase.errorStep === "payment_authorization") {
        score += 15;
        reasons.push("Failure occurred during payment authorization.");
    }

    if (recoveryCase.errorReason === "payment_failed") {
        score += 10;
        reasons.push("The payment failure is marked as a payment failure event.");
    }

    const eligible =
        recoveryCase.paymentStatus === "FAILED" &&
        recoveryCase.amountPaid < recoveryCase.amount &&
        ["AT_RISK", "ELIGIBLE"].includes(recoveryCase.recoveryStatus);

    if (eligible) {
        reasons.push("Case meets the current recovery eligibility rules.");
    }

    const normalizedScore = Math.min(score, 100);

    return {
        score: normalizedScore,
        eligible,
        recommendedAction: eligible ? "RETRY_PAYMENT_LINK" : null,
        reasons,
    };
}