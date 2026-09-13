"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "../../app/auth/components/SessionProvider";
import { getCurrentUser } from "../../lib/api-client";

type CurrentUser = {
  displayName: string;
  avatarUrl?: string;
};

const LoginButton = () => {
  const { isLoggedIn, client } = useSession();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      setAvatarUrl(null);
      return;
    }

    const ac = new AbortController();

    getCurrentUser({ client, signal: ac.signal })
      .then((user) =>
        setAvatarUrl((user.data as CurrentUser).avatarUrl ?? null),
      )
      .catch((error) => {
        if (ac.signal.aborted) return;
        console.error("Failed to load current user avatar", error);
      });

    return () => ac.abort();
  }, [client, isLoggedIn]);

  if (isLoggedIn) {
    return (
      <Link href="/account" className="btn btn-ghost btn-circle avatar mr-2">
        <div className="w-10 rounded-full overflow-hidden">
          <img
            alt="Avatar"
            src={avatarUrl ?? "https://placehold.co/10x10/png"}
          />
        </div>
      </Link>
    );
  }

  return (
    <a className="btn" href="/auth/init">
      Login
    </a>
  );
};

export default LoginButton;
