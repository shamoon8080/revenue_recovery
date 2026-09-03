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

export default function Home() {
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCases() {
    try {
      setError("");

      const response = await fetch("/api/recovery-cases", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load recovery cases.");
      }

      const data = await response.json();

      setCases(data.cases ?? []);
    } catch (err) {
      console.error(err);
      setError("Unable to load recovery cases.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCases();
  }, []);

  const recoveredCases = cases.filter(
    (item) => item.recoveryStatus === "RECOVERED",
  );

  const openRecoveryCases = cases.filter(
    (item) =>
      item.paymentStatus === "FAILED" &&
      item.recoveryStatus !== "RECOVERED",
  );

  const recoveredRevenue = recoveredCases.reduce(
    (total, item) => total + item.amountPaid,
    0,
  );

  const openRecoveryAmount = openRecoveryCases.reduce(
    (total, item) => total + Math.max(item.amount - item.amountPaid, 0),
    0,
  );

  const recoveryOpportunities =
    recoveredCases.length + openRecoveryCases.length;

  const recoveryRate =
    recoveryOpportunities > 0
      ? Math.round(
        (recoveredCases.length / recoveryOpportunities) * 100,
      )
      : 0;

  function formatAmount(amount: number, currency: string) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  }

  return (
    <main className="min-h-screen bg-[#f5f6f8] text-zinc-950">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-sm font-bold text-white">
                RR
              </div>

              <div>
                <p className="text-sm font-semibold text-zinc-950">
                  Revenue Rescue
                </p>
                <p className="text-xs text-zinc-500">
                  AI Revenue Recovery
                </p>
              </div>
            </div>

            <h1 className="mt-8 text-3xl font-semibold tracking-tight sm:text-4xl">
              Recovery dashboard
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Detect failed payments, prioritize recovery opportunities, and
              turn recoverable revenue into successful payments.
            </p>
          </div>

          <button
            onClick={loadCases}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            Refresh data
          </button>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Recovered revenue"
            value={formatAmount(recoveredRevenue, "INR")}
            description="Successfully recovered"
            emphasis="success"
          />

          <MetricCard
            label="Open recovery"
            value={formatAmount(openRecoveryAmount, "INR")}
            description="Revenue still recoverable"
            emphasis="warning"
          />

          <MetricCard
            label="Recovery cases"
            value={cases.length.toString()}
            description="Total tracked cases"
          />

          <MetricCard
            label="Recovery rate"
            value={`${recoveryRate}%`}
            description="Recovered / failed cases"
            emphasis="success"
          />
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-6 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">Recovery cases</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Every failed payment becomes a trackable recovery
                  opportunity.
                </p>
              </div>

              <span className="w-fit rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                {cases.length} cases
              </span>
            </div>
          </div>

          {loading ? (
            <div className="px-6 py-16 text-center text-sm text-zinc-500">
              Loading recovery cases...
            </div>
          ) : cases.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="font-medium text-zinc-900">
                No recovery cases yet
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Failed Razorpay payments will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50/80">
                  <tr>
                    <th className="px-6 py-3 font-medium text-zinc-500">
                      Case
                    </th>

                    <th className="px-6 py-3 font-medium text-zinc-500">
                      Amount
                    </th>

                    <th className="px-6 py-3 font-medium text-zinc-500">
                      Payment
                    </th>

                    <th className="px-6 py-3 font-medium text-zinc-500">
                      Recovery
                    </th>

                    <th className="px-6 py-3 font-medium text-zinc-500">
                      Opportunity
                    </th>

                    <th className="px-6 py-3 font-medium text-zinc-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-100">
                  {cases.map((item) => {
                    const isRecovered =
                      item.recoveryStatus === "RECOVERED";

                    const isFailed =
                      item.paymentStatus === "FAILED";

                    const opportunityScore =
                      isFailed || item.recoveryStatus === "AWAITING_OUTCOME"
                        ? 90
                        : null;

                    return (
                      <tr
                        key={item.id}
                        className={`transition ${isRecovered
                          ? "bg-emerald-50/30 hover:bg-emerald-50/60"
                          : "hover:bg-zinc-50"
                          }`}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-zinc-900">
                            {item.referenceId}
                          </div>

                          {item.orderId && (
                            <div className="mt-1 max-w-[260px] truncate text-xs text-zinc-400">
                              {item.orderId}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="font-semibold">
                            {formatAmount(item.amount, item.currency)}
                          </div>

                          {item.amountPaid > 0 &&
                            item.amountPaid < item.amount && (
                              <div className="mt-1 text-xs text-zinc-400">
                                {formatAmount(
                                  item.amountPaid,
                                  item.currency,
                                )}{" "}
                                paid
                              </div>
                            )}
                        </td>

                        <td className="px-6 py-4">
                          <StatusBadge status={item.paymentStatus} />
                        </td>

                        <td className="px-6 py-4">
                          <StatusBadge status={item.recoveryStatus} />
                        </td>

                        <td className="px-6 py-4">
                          {opportunityScore !== null ? (
                            <div>
                              <span className="font-semibold text-zinc-900">
                                {opportunityScore}/100
                              </span>

                              <p className="mt-1 text-xs text-zinc-500">
                                High opportunity
                              </p>
                            </div>
                          ) : isRecovered ? (
                            <div>
                              <span className="font-semibold text-emerald-700">
                                Recovered
                              </span>

                              <p className="mt-1 text-xs text-zinc-500">
                                Revenue rescued
                              </p>
                            </div>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <Link
                            href={`/recovery-cases/${item.id}`}
                            className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
                          >
                            View case
                            <span className="ml-1.5">→</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-6 flex flex-col gap-1 text-xs text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
          <span>Revenue Rescue · Razorpay Buildathon</span>
          <span>Recovery intelligence & action layer</span>
        </footer>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  description,
  emphasis,
}: {
  label: string;
  value: string;
  description: string;
  emphasis?: "success" | "warning";
}) {
  let valueClassName = "text-zinc-950";

  if (emphasis === "success") {
    valueClassName = "text-emerald-700";
  } else if (emphasis === "warning") {
    valueClassName = "text-amber-700";
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-zinc-500">{label}</p>

        <span className="h-2 w-2 rounded-full bg-zinc-300" />
      </div>

      <p
        className={`mt-4 text-3xl font-semibold tracking-tight ${valueClassName}`}
      >
        {value}
      </p>

      <p className="mt-2 text-xs text-zinc-400">{description}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let className = "bg-zinc-100 text-zinc-700";

  if (status === "FAILED") {
    className = "bg-red-50 text-red-700 ring-1 ring-red-100";
  } else if (status === "AT_RISK") {
    className = "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
  } else if (status === "ELIGIBLE") {
    className = "bg-blue-50 text-blue-700 ring-1 ring-blue-100";
  } else if (status === "AWAITING_OUTCOME") {
    className = "bg-violet-50 text-violet-700 ring-1 ring-violet-100";
  } else if (status === "RECOVERED" || status === "CAPTURED") {
    className = "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  } else if (status === "INTERVENTION_PENDING") {
    className = "bg-blue-50 text-blue-700 ring-1 ring-blue-100";
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}