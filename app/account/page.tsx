"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "../auth/components/SessionProvider";
import {
  getCurrentUser,
  getCurrentUserNodes,
  getCurrentUserTransactions,
} from "../../lib/api-client";
import { createNode, resetNodeToken } from "../../lib/api-client";

type NodeToken = {
  id: number;
  token: string;
  name: string;
};

type UserSession = {
  displayName: string;
  credits?: string;
};

type Transaction = {
  id: number;
  amount: string;
  type: string;
  note?: string | null;
  createdAt?: string;
  job?: { id: number } | null;
  task?: { id: number } | null;
};

// TODO: Split this page into smaller reusable components (deferred cleanup)
const AccountPage = () => {
  const { isLoggedIn, logout, client } = useSession();
  const [session, setSession] = useState<UserSession | null>(null);
  const [nodeTokens, setNodeTokens] = useState<NodeToken[]>([]);
  const [nodeName, setNodeName] = useState("");
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsLimit] = useState(100);
  const [transactionsTotal, setTransactionsTotal] = useState<number | null>(
    null,
  );
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>(
    {},
  );
  const [showTokenAlert, setShowTokenAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadNodeTokens = useCallback(
    async (signal?: AbortSignal) => {
      setLoadingNodes(true);
      setErrorMessage(null);

      try {
        const res = await getCurrentUserNodes({ client, signal });
        const nodes = (res as any)?.data ?? [];
        setNodeTokens(
          nodes.map((node: any) => ({
            id: node.id,
            name: node.name ?? "",
            token: "",
          })),
        );
      } catch (error) {
        if (signal?.aborted) return;
        console.error("Failed to load node tokens", error);
        setErrorMessage("Failed to load node tokens.");
      } finally {
        setLoadingNodes(false);
      }
    },
    [client],
  );

  const loadTransactions = useCallback(
    async (signal?: AbortSignal, page = 1, append = false) => {
      setLoadingTransactions(true);
      setErrorMessage(null);

      try {
        const res = await getCurrentUserTransactions({
          client,
          signal,
          query: {
            page,
            limit: transactionsLimit,
            sort: "createdAt",
            order: "desc",
          },
        } as any);

        const raw = res as any;
        // Debug log to inspect response shape in the browser console
        // eslint-disable-next-line no-console
        console.debug("getCurrentUserTransactions raw:", raw);

        let data: any[] = [];
        let extra: any = {};

        // Possible shapes:
        // 1) raw is the body: { data: [...], extra: {...} }
        // 2) raw is already the array of transactions
        // 3) sdk wraps again: raw.data = { data: [...], extra }
        if (raw == null) {
          data = [];
        } else if (Array.isArray(raw)) {
          data = raw;
        } else if (Array.isArray(raw.data)) {
          data = raw.data;
          extra = raw.extra ?? {};
        } else if (raw.data && Array.isArray(raw.data.data)) {
          data = raw.data.data;
          extra = raw.data.extra ?? {};
        } else {
          // Fallback: try to coerce single item into array
          const candidate = raw?.data ?? raw;
          if (Array.isArray(candidate)) data = candidate;
          else if (candidate == null) data = [];
          else data = [candidate];
        }

        if (append) {
          setTransactions((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const filtered = (data as Transaction[]).filter(
              (d) => !existingIds.has(d.id),
            );
            return [...prev, ...filtered];
          });
          setTransactionsPage(page);
          setTransactionsTotal(
            (prev) =>
              extra?.totalCount ??
              (prev != null
                ? prev + (data as Transaction[]).length
                : (data as Transaction[]).length),
          );
        } else {
          setTransactions(data as Transaction[]);
          setTransactionsPage(page);
          setTransactionsTotal(
            extra?.totalCount ?? (Array.isArray(data) ? data.length : null),
          );
        }
        // Debug parsed data
        // eslint-disable-next-line no-console
        console.debug(
          "parsed transactions count:",
          Array.isArray(data) ? data.length : 0,
          data?.slice?.(0, 5),
        );
      } catch (error) {
        if (signal?.aborted) return;
        console.error("Failed to load transactions", error);
        setErrorMessage("Failed to load transactions.");
      } finally {
        setLoadingTransactions(false);
      }
    },
    [client, transactionsLimit],
  );

  const toggleType = (groupId: string) => {
    setExpandedTypes((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const formatAmount = (amountStr: string) => {
    try {
      // Convert work units to credits: 100000 work units = 1 credit
      const n = Number(amountStr) || 0;
      const credits = n / 100000;
      const sign = credits < 0 ? "-" : "";
      const abs = Math.abs(credits);
      return `${sign}${new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(abs)}`;
    } catch {
      return amountStr;
    }
  };

  const TransactionTypeIcon = ({ type }: { type: string }) => {
    const commonProps = {
      className: "h-6 w-6 text-current",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.8,
      strokeLinecap: "round" as const,
      strokeLinejoin: "round" as const,
      "aria-hidden": true,
    };

    switch (type) {
      case "job_fee":
        return (
          <svg {...commonProps}>
            <path d="M7 4.75h10A2.25 2.25 0 0 1 19.25 7v10A2.25 2.25 0 0 1 17 19.25H7A2.25 2.25 0 0 1 4.75 17V7A2.25 2.25 0 0 1 7 4.75Z" />
            <path d="M8.5 9.5h7" />
            <path d="M8.5 12.5h7" />
            <path d="M8.5 15.5h4.5" />
          </svg>
        );
      case "job_refund":
        return (
          <svg {...commonProps}>
            <path d="M8 7.5h9a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8" />
            <path d="M10 11.5 7 14.5l3 3" />
            <path d="M7 14.5h8" />
          </svg>
        );
      case "render_reward":
        return (
          <svg {...commonProps}>
            <path d="M12 3.75v3.5" />
            <path d="M12 16.75v3.5" />
            <path d="M6.5 7.5h11" />
            <path d="M6.5 16.5h11" />
            <path d="M8.5 9.5h7v5h-7z" />
            <path d="M12 9.5v5" />
          </svg>
        );
      case "weekly_grant":
        return (
          <svg {...commonProps}>
            <rect x="4.75" y="5.5" width="14.5" height="14" rx="2" />
            <path d="M8 3.75v3.5" />
            <path d="M16 3.75v3.5" />
            <path d="M4.75 9.5h14.5" />
            <path d="M8.5 13.5h3" />
            <path d="M8.5 16.5h7" />
          </svg>
        );
      case "admin_adjustment":
        return (
          <svg {...commonProps}>
            <circle cx="12" cy="12" r="2.5" />
            <path d="M19.5 12a7.5 7.5 0 0 0-.12-1.3l2.02-1.57-1.75-3.03-2.43 1a7.7 7.7 0 0 0-2.25-1.3L14.5 3h-5l-.47 2.8a7.7 7.7 0 0 0-2.25 1.3l-2.43-1-1.75 3.03 2.02 1.57A7.5 7.5 0 0 0 4.5 12c0 .44.04.88.12 1.3L2.6 15.87l1.75 3.03 2.43-1a7.7 7.7 0 0 0 2.25 1.3L9.5 21h5l.47-2.8a7.7 7.7 0 0 0 2.25-1.3l2.43 1 1.75-3.03-2.02-1.57c.08-.42.12-.86.12-1.3Z" />
          </svg>
        );
      default:
        return (
          <svg {...commonProps}>
            <rect x="4.75" y="6.5" width="14.5" height="11" rx="2" />
            <path d="M8.5 10.5h7" />
            <path d="M8.5 13.5h4" />
          </svg>
        );
    }
  };

  const transactionGroups = (() => {
    const groups: Array<{ id: string; type: string; items: Transaction[] }> =
      [];
    let currentType: string | null = null;
    let currentItems: Transaction[] = [];

    const flushCurrent = () => {
      if (!currentType || currentItems.length === 0) return;
      groups.push({
        id: `${currentType}-${groups.length}`,
        type: currentType,
        items: currentItems,
      });
      currentType = null;
      currentItems = [];
    };

    for (const transaction of transactions) {
      const nextType = transaction.type ?? "unknown";
      const isRenderReward = nextType === "render_reward";

      if (isRenderReward) {
        if (currentType === "render_reward") {
          currentItems.push(transaction);
          continue;
        }

        flushCurrent();
        currentType = "render_reward";
        currentItems = [transaction];
        continue;
      }

      flushCurrent();
      groups.push({
        id: `${nextType}-${groups.length}`,
        type: nextType,
        items: [transaction],
      });
    }

    flushCurrent();
    return groups;
  })();

  useEffect(() => {
    const ac = new AbortController();

    if (!isLoggedIn) {
      return () => ac.abort();
    }

    getCurrentUser({ client, signal: ac.signal })
      .then((user) =>
        setSession({
          displayName: user.data.displayName,
          credits: user.data.credits,
        }),
      )
      .catch((error) => {
        if (ac.signal.aborted) return;
        console.error("Failed to get user", error);
        setErrorMessage("Failed to load user information.");
      });

    loadNodeTokens(ac.signal);
    loadTransactions(ac.signal, 1);

    return () => ac.abort();
  }, [client, isLoggedIn, loadNodeTokens, loadTransactions]);

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setShowTokenAlert(true);
    window.setTimeout(() => setShowTokenAlert(false), 5000);
  };

  const handleTokenReset = useCallback(
    async (nodeId: number) => {
      try {
        const res = await resetNodeToken({ client, path: { id: nodeId } });
        const newToken: string | undefined = (res as any)?.data?.token;

        if (newToken) {
          setNodeTokens((prevTokens) =>
            prevTokens.map((token) =>
              token.id === nodeId ? { ...token, token: newToken } : token,
            ),
          );
        } else {
          console.warn("No token returned from response");
        }
      } catch (error) {
        console.error("Failed to reset node token", error);
        setErrorMessage("Failed to reset node token.");
      }
    },
    [client],
  );

  const handleCreateNodeToken = useCallback(async () => {
    if (!nodeName.trim()) {
      return;
    }

    try {
      const res = await createNode({ client, body: { name: nodeName } });
      const data = (res as any)?.data;
      if (data?.id) {
        setNodeTokens((prevTokens) => [
          ...prevTokens,
          {
            id: data.id,
            token: data.token ?? "",
            name: nodeName,
          },
        ]);
        setNodeName("");
      } else {
        console.warn("No data returned from create node response");
        setErrorMessage("Failed to create node token.");
      }
    } catch (error) {
      console.error("Failed to create node", error);
      setErrorMessage("Failed to create node token.");
    }
  }, [client, nodeName]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed", error);
      setErrorMessage("Logout failed.");
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-base-200 text-white px-4 py-24">
        <div className="mx-auto max-w-xl rounded-2xl border border-base-300/80 bg-base-100/90 p-8 text-center shadow-xl">
          <h1 className="text-3xl font-bold">Account</h1>
          <p className="mt-4 text-gray-400">
            You need to sign in to manage your render node tokens.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/auth/init" className="btn btn-primary">
              Login
            </Link>
            <Link href="/" className="btn btn-ghost">
              Back Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 text-white px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-base-300/80 bg-base-100/90 p-8 shadow-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold">Account</h1>
              <p className="mt-2 text-sm text-gray-400">
                Manage your render node tokens and credit history.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleLogout}
              >
                Logout
              </button>
              <Link href="/" className="btn btn-ghost">
                Back Home
              </Link>
            </div>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-[1fr_2fr]">
            <div className="rounded-2xl border border-base-300/80 bg-base-100/90 p-4">
              <p className="text-sm text-gray-400">Current Credits</p>
              <p className="text-3xl font-bold">
                {formatAmount(String(session?.credits ?? "—"))}
              </p>
              <p className="text-sm text-gray-500">Available balance</p>
            </div>

            <div className="rounded-2xl border border-base-300/80 bg-base-100/90 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Transaction History</h2>
                <p className="text-sm text-gray-400">Most recent</p>
              </div>

              {loadingTransactions ? (
                <div className="p-6 text-center">Loading transactions…</div>
              ) : transactions.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  No transactions yet.
                </div>
              ) : (
                <>
                  <div className="mt-4 space-y-3 max-h-[42vh] overflow-auto pr-2">
                    {transactionGroups.map((group) => {
                      const { id, type, items } = group;
                      const expanded = !!expandedTypes[id];
                      const total = items.reduce(
                        (s, it) => s + Number(it.amount || 0),
                        0,
                      );

                      return (
                        <div
                          key={id}
                          className="rounded-lg border border-base-300/60 bg-base-200 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center text-base-content">
                                <TransactionTypeIcon type={type} />
                              </div>
                              <div>
                                <p className="font-medium">{type}</p>
                                <p className="text-sm text-gray-400">
                                  {items.length} transaction
                                  {items.length !== 1 ? "s" : ""}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div
                                className={`font-semibold ${total < 0 ? "text-red-400" : "text-green-400"}`}
                              >
                                {formatAmount(String(total))}
                              </div>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => toggleType(id)}
                              >
                                {expanded ? "Hide" : "Show"}
                              </button>
                            </div>
                          </div>

                          {expanded ? (
                            <div className="mt-3 space-y-2">
                              {items.map((t) => (
                                <div
                                  key={t.id}
                                  className="flex items-start justify-between gap-4 bg-base-100 p-3 rounded-lg"
                                >
                                  <div>
                                    <p className="font-medium">
                                      {t.note ?? t.type}
                                    </p>
                                    <p className="text-sm text-gray-400">
                                      {t.job?.id
                                        ? `Job ${t.job.id}`
                                        : t.task?.id
                                          ? `Task ${t.task.id}`
                                          : null}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p
                                      className={`font-semibold ${t.amount && t.amount.startsWith("-") ? "text-red-400" : "text-green-400"}`}
                                    >
                                      {formatAmount(t.amount)}
                                    </p>
                                    <p className="text-sm text-gray-400">
                                      {t.createdAt
                                        ? new Date(t.createdAt).toLocaleString()
                                        : ""}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {(transactionsTotal == null ||
                    transactions.length < transactionsTotal) && (
                    <div className="mt-3 text-center">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() =>
                          loadTransactions(
                            undefined,
                            transactionsPage + 1,
                            true,
                          )
                        }
                        disabled={loadingTransactions}
                      >
                        {loadingTransactions ? "Loading…" : "Load more history"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Render Nodes</h2>
          </div>

          {errorMessage ? (
            <div className="alert alert-error mb-6">
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {showTokenAlert ? (
            <div className="alert alert-success mb-6">
              <span>Token copied to clipboard.</span>
            </div>
          ) : null}

          <div className="mb-6 grid gap-4 sm:grid-cols-[1.5fr_1fr]">
            <label className="input validator w-full">
              <input
                type="text"
                value={nodeName}
                onChange={(e) => setNodeName(e.target.value)}
                placeholder="New node name"
              />
            </label>
            <button
              type="button"
              className="btn btn-primary min-h-12 w-full"
              onClick={handleCreateNodeToken}
              disabled={!nodeName.trim()}
            >
              Create node token
            </button>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-base-300/80 bg-base-100/90">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Token</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingNodes ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center">
                      Loading nodes…
                    </td>
                  </tr>
                ) : nodeTokens.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-gray-400">
                      No node tokens yet.
                    </td>
                  </tr>
                ) : (
                  nodeTokens.map((token) => (
                    <tr key={token.id}>
                      <th>{token.id}</th>
                      <td>{token.name}</td>
                      <td className="truncate max-w-xs">
                        {token.token ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => handleCopyToken(token.token)}
                          >
                            {token.token}
                          </button>
                        ) : (
                          <span className="text-gray-500">••••••••••</span>
                        )}
                      </td>
                      <td className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-primary btn-xs"
                          onClick={() => handleTokenReset(token.id)}
                        >
                          Reset
                        </button>
                        {/*<button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() =>
                            setNodeTokens((prev) =>
                              prev.filter((item) => item.id !== token.id),
                            )
                          }
                        >
                          Delete
                        </button>*/}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
