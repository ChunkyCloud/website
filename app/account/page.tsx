"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "../auth/components/SessionProvider";
import { getCurrentUser, getCurrentUserNodes } from "../../lib/api-client";
import { createNode, resetNodeToken } from "../../lib/api-client";

type NodeToken = {
  id: number;
  token: string;
  name: string;
};

type UserSession = {
  displayName: string;
};

// TODO: Split this page into smaller reusable components (deferred cleanup)
const AccountPage = () => {
  const { isLoggedIn, logout, client } = useSession();
  const [session, setSession] = useState<UserSession | null>(null);
  const [nodeTokens, setNodeTokens] = useState<NodeToken[]>([]);
  const [nodeName, setNodeName] = useState("");
  const [loadingNodes, setLoadingNodes] = useState(false);
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

  useEffect(() => {
    const ac = new AbortController();

    if (!isLoggedIn) {
      return () => ac.abort();
    }

    getCurrentUser({ client, signal: ac.signal })
      .then((user) => setSession(user.data))
      .catch((error) => {
        if (ac.signal.aborted) return;
        console.error("Failed to get user", error);
        setErrorMessage("Failed to load user information.");
      });

    loadNodeTokens(ac.signal);

    return () => ac.abort();
  }, [client, isLoggedIn, loadNodeTokens]);

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
              <p className="text-gray-400">
                Manage your node tokens and account settings.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn btn-error" onClick={handleLogout}>
                Logout
              </button>
              <Link href="/" className="btn btn-ghost">
                Back Home
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-base-300/80 bg-base-200 p-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-500">Signed in as</p>
                <p className="text-xl font-semibold">{session?.displayName}</p>
              </div>
              <div className="space-y-2 text-right text-sm text-gray-400">
                <p>
                  Render node tokens are only visible immediately after
                  creation.
                </p>
                <p>Keep them safe and do not share them publicly.</p>
              </div>
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
                className="btn btn-primary min-h-[3rem] w-full"
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
    </div>
  );
};

export default AccountPage;
