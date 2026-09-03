"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RecoveryCase = {
    id: string;
    referenceId: string;
    paymentLinkId: string | null;
    orderId: string | null;
    paymentId: string | null;
    amount: number;
    amountPaid: number;
    currency: string;
    paymentStatus: string;
    recoveryStatus: string;
    errorCode: string | null;
    errorDescription: string | null;
    errorReason: string | null;
    errorSource: string | null;
    errorStep: string | null;
    createdAt: string;
    updatedAt: string;
};

type Decision = {
    score: number;
    eligible: boolean;
    recommendedAction: "RETRY_PAYMENT_LINK" | null;
    reasons: string[];
};

type PaymentLink = {
    id: string;
    shortUrl: string;
    status: string;
    amount: number;
    amountPaid: number;
    referenceId: string;
};

export default function RecoveryCasePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const [caseData, setCaseData] = useState<RecoveryCase | null>(null);
    const [decision, setDecision] = useState<Decision | null>(null);
    const [paymentLink, setPaymentLink] = useState<PaymentLink | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState("");

    async function loadData(id: string) {
        try {
            setError("");

            const [caseResponse, decisionResponse] = await Promise.all([
                fetch(`/api/recovery-cases/${id}`, {
                    cache: "no-store",
                }),
                fetch(`/api/recovery-cases/${id}/decision`, {
                    cache: "no-store",
                }),
            ]);

            if (!caseResponse.ok) {
                throw new Error("Failed to load recovery case.");
            }

            if (!decisionResponse.ok) {
                throw new Error("Failed to load recovery decision.");
            }

            const caseJson = await caseResponse.json();
            const decisionJson = await decisionResponse.json();

            setCaseData(caseJson.case);
            setDecision(decisionJson.decision);

            if (caseJson.case?.paymentLinkId) {
                const linkResponse = await fetch(
                    `/api/recovery-cases/${id}/recover`,
                    {
                        cache: "no-store",
                    },
                );

                if (linkResponse.ok) {
                    const linkJson = await linkResponse.json();
                    setPaymentLink(linkJson.paymentLink);
                }
            }
        } catch (err) {
            console.error(err);
            setError("Unable to load recovery case.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        params.then(({ id }) => {
            loadData(id);
        });
    }, [params]);

    async function createRecoveryAction() {
        if (!caseData) {
            return;
        }

        try {
            setActionLoading(true);
            setError("");

            const response = await fetch(
                `/api/recovery-cases/${caseData.id}/recover`,
                {
                    method: "POST",
                },
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data?.error ?? "Unable to create recovery action.",
                );
            }

            setPaymentLink(data.paymentLink);

            await loadData(caseData.id);
        } catch (err) {
            console.error(err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to create recovery action.",
            );
        } finally {
            setActionLoading(false);
        }
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-[#f5f6f8] px-6 py-10">
                <div className="mx-auto max-w-5xl">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500 shadow-sm">
                        Loading recovery case...
                    </div>
                </div>
            </main>
        );
    }

    if (!caseData) {
        return (
            <main className="min-h-screen bg-[#f5f6f8] px-6 py-10">
                <div className="mx-auto max-w-5xl">
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-sm text-red-700">
                        {error || "Recovery case not found."}
                    </div>
                </div>
            </main>
        );
    }

    const isRecovered = caseData.recoveryStatus === "RECOVERED";
    const isAwaitingOutcome =
        caseData.recoveryStatus === "AWAITING_OUTCOME";

    function formatAmount(amount: number, currency: string) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
        }).format(amount / 100);
    }

    return (
        <main className="min-h-screen bg-[#f5f6f8] text-zinc-950">
            <div className="mx-auto max-w-5xl px-6 py-8 lg:px-10">
                <Link
                    href="/"
                    className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
                >
                    ← Back to dashboard
                </Link>

                <header className="mt-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-sm font-medium text-zinc-500">
                                Revenue Rescue
                            </p>

                            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                                Recovery case
                            </h1>

                            <p className="mt-2 break-all font-mono text-sm text-zinc-500">
                                {caseData.referenceId}
                            </p>
                        </div>

                        <StatusBadge status={caseData.recoveryStatus} />
                    </div>
                </header>

                {error && (
                    <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {isRecovered ? (
                    <section className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm sm:p-8">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700">
                                ✓
                            </div>

                            <div>
                                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                                    Revenue recovered
                                </p>

                                <h2 className="mt-1 text-3xl font-semibold tracking-tight text-emerald-950">
                                    {formatAmount(
                                        caseData.amountPaid,
                                        caseData.currency,
                                    )}
                                </h2>

                                <p className="mt-1 text-sm text-emerald-800">
                                    Payment successfully recovered through a retry
                                    Payment Link.
                                </p>
                            </div>
                        </div>
                    </section>
                ) : decision ? (
                    <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
                            <div className="flex items-start justify-between gap-6">
                                <div>
                                    <p className="text-sm font-medium text-zinc-500">
                                        Recovery opportunity
                                    </p>

                                    <div className="mt-2 flex items-end gap-2">
                                        <span className="text-5xl font-semibold tracking-tight">
                                            {decision.score}
                                        </span>

                                        <span className="mb-1 text-lg text-zinc-400">
                                            /100
                                        </span>
                                    </div>
                                </div>

                                <div className="rounded-xl bg-zinc-950 px-4 py-2 text-xs font-semibold text-white">
                                    {decision.eligible
                                        ? "Eligible"
                                        : "Not eligible"}
                                </div>
                            </div>

                            <div className="mt-8">
                                <h2 className="font-semibold">Why this case?</h2>

                                <div className="mt-4 space-y-3">
                                    {decision.reasons.map((reason) => (
                                        <div
                                            key={reason}
                                            className="flex gap-3 text-sm text-zinc-700"
                                        >
                                            <span className="mt-0.5 text-emerald-600">
                                                ✓
                                            </span>

                                            <span>{reason}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
                            <p className="text-sm font-medium text-zinc-500">
                                Recommended action
                            </p>

                            <h2 className="mt-2 text-xl font-semibold">
                                {decision.recommendedAction ===
                                    "RETRY_PAYMENT_LINK"
                                    ? "Retry Payment Link"
                                    : "No action available"}
                            </h2>

                            <p className="mt-3 text-sm leading-6 text-zinc-500">
                                Revenue Rescue can create a fresh Razorpay Payment
                                Link for the unpaid amount and track the outcome
                                automatically.
                            </p>

                            {paymentLink ? (
                                <a
                                    href={paymentLink.shortUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
                                >
                                    Open retry payment link →
                                </a>
                            ) : decision.eligible &&
                                decision.recommendedAction ===
                                "RETRY_PAYMENT_LINK" ? (
                                <button
                                    onClick={createRecoveryAction}
                                    disabled={actionLoading}
                                    className="mt-6 w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {actionLoading
                                        ? "Creating retry link..."
                                        : "Create retry payment link"}
                                </button>
                            ) : null}

                            {isAwaitingOutcome && (
                                <p className="mt-4 text-center text-xs text-violet-600">
                                    Retry link created. Waiting for payment outcome.
                                </p>
                            )}
                        </div>
                    </section>
                ) : null}

                <section className="mt-6 grid gap-6 md:grid-cols-2">
                    <InfoCard title="Payment">
                        <InfoRow
                            label="Amount"
                            value={formatAmount(
                                caseData.amount,
                                caseData.currency,
                            )}
                        />

                        <InfoRow
                            label="Amount paid"
                            value={formatAmount(
                                caseData.amountPaid,
                                caseData.currency,
                            )}
                        />

                        <InfoRow
                            label="Payment status"
                            value={caseData.paymentStatus}
                        />

                        <InfoRow
                            label="Recovery status"
                            value={caseData.recoveryStatus}
                        />
                    </InfoCard>

                    <InfoCard title="Payment IDs">
                        <InfoRow
                            label="Order ID"
                            value={caseData.orderId}
                            mono
                        />

                        <InfoRow
                            label="Payment ID"
                            value={caseData.paymentId}
                            mono
                        />

                        <InfoRow
                            label="Payment Link ID"
                            value={caseData.paymentLinkId}
                            mono
                        />
                    </InfoCard>
                </section>

                <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
                    <h2 className="font-semibold">Failure details</h2>

                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        <InfoRow
                            label="Error code"
                            value={caseData.errorCode}
                        />

                        <InfoRow
                            label="Reason"
                            value={caseData.errorReason}
                        />

                        <InfoRow
                            label="Source"
                            value={caseData.errorSource}
                        />

                        <InfoRow
                            label="Step"
                            value={caseData.errorStep}
                        />

                        <div className="sm:col-span-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                                Description
                            </p>

                            <p className="mt-2 text-sm leading-6 text-zinc-700">
                                {caseData.errorDescription ?? "—"}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
                    <h2 className="font-semibold">Recovery timeline</h2>

                    <div className="mt-6 space-y-5">
                        <TimelineItem
                            title="Payment failure detected"
                            description="Razorpay payment.failed webhook received."
                            active
                        />

                        <TimelineItem
                            title="Recovery opportunity evaluated"
                            description={
                                isRecovered
                                    ? "Recovery opportunity resolved successfully."
                                    : decision
                                        ? `Opportunity score: ${decision.score}/100.`
                                        : "Decision evaluated."
                            }
                            active
                        />

                        <TimelineItem
                            title="Recovery intervention"
                            description={
                                caseData.paymentLinkId
                                    ? "Retry Payment Link created."
                                    : "No recovery intervention executed yet."
                            }
                            active={Boolean(caseData.paymentLinkId)}
                        />

                        <TimelineItem
                            title="Revenue outcome"
                            description={
                                isRecovered
                                    ? "Customer successfully completed the retry payment."
                                    : "Waiting for successful payment."
                            }
                            active={isRecovered}
                            last
                        />
                    </div>
                </section>

                <footer className="mt-8 text-xs text-zinc-400">
                    Revenue Rescue · Recovery intelligence & action layer
                </footer>
            </div>
        </main>
    );
}

function InfoCard({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="font-semibold">{title}</h2>

            <div className="mt-5 space-y-4">{children}</div>
        </section>
    );
}

function InfoRow({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: string | null;
    mono?: boolean;
}) {
    return (
        <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                {label}
            </p>

            <p
                className={`mt-1 break-all text-sm text-zinc-800 ${mono ? "font-mono" : "font-medium"
                    }`}
            >
                {value ?? "—"}
            </p>
        </div>
    );
}

function TimelineItem({
    title,
    description,
    active,
    last = false,
}: {
    title: string;
    description: string;
    active: boolean;
    last?: boolean;
}) {
    return (
        <div className="flex gap-4">
            <div className="flex flex-col items-center">
                <div
                    className={`mt-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-zinc-100 text-zinc-400"
                        }`}
                >
                    {active ? "✓" : "•"}
                </div>

                {!last && (
                    <div className="mt-1 h-full min-h-8 w-px bg-zinc-200" />
                )}
            </div>

            <div className="pb-5">
                <p className="text-sm font-semibold text-zinc-900">
                    {title}
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                    {description}
                </p>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    let className = "bg-zinc-100 text-zinc-700";

    if (status === "RECOVERED") {
        className = "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
    } else if (status === "AWAITING_OUTCOME") {
        className = "bg-violet-50 text-violet-700 ring-1 ring-violet-100";
    } else if (status === "AT_RISK") {
        className = "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
    } else if (status === "FAILED") {
        className = "bg-red-50 text-red-700 ring-1 ring-red-100";
    }

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${className}`}
        >
            {status.replaceAll("_", " ")}
        </span>
    );
}