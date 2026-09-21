"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "../../app/auth/components/SessionProvider";
import { getCurrentUser } from "../../lib/api-client";

import type { UserResponse } from "../../lib/api-client";

const LoginButton = () => {
  const { isLoggedIn, client } = useSession();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      setAvatarUrl(null);
      setCredits(null);
      return;
    }

    const ac = new AbortController();

    getCurrentUser({ client, signal: ac.signal })
      .then((user) => {
        const data = user.data as UserResponse;
        setAvatarUrl(data.avatarUrl ?? null);

        setCredits(
          data.credits != null ? parseInt(data.credits) / 100000 : null,
        );
      })

      .catch((error) => {
        if (ac.signal.aborted) return;
        console.error("Failed to load current user avatar", error);
      });

    return () => ac.abort();
  }, [client, isLoggedIn]);

  if (isLoggedIn) {
    return (
      <>
        <div className="badge badge-neutral mr-5">
          {credits != null ? credits : "..."}
          <svg
            width="200%"
            height="200%"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M13 5C13 6.10457 10.5376 7 7.5 7C4.46243 7 2 6.10457 2 5M13 5C13 3.89543 10.5376 3 7.5 3C4.46243 3 2 3.89543 2 5M13 5V9.45715C11.7785 9.82398 11 10.3789 11 11M2 5V17C2 18.1046 4.46243 19 7.5 19C8.82963 19 10.0491 18.8284 11 18.5429V11M2 9C2 10.1046 4.46243 11 7.5 11C8.82963 11 10.0491 10.8284 11 10.5429M2 13C2 14.1046 4.46243 15 7.5 15C8.82963 15 10.0491 14.8284 11 14.5429M22 11C22 12.1046 19.5376 13 16.5 13C13.4624 13 11 12.1046 11 11M22 11C22 9.89543 19.5376 9 16.5 9C13.4624 9 11 9.89543 11 11M22 11V19C22 20.1046 19.5376 21 16.5 21C13.4624 21 11 20.1046 11 19V11M22 15C22 16.1046 19.5376 17 16.5 17C13.4624 17 11 16.1046 11 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <Link href="/account" className="btn btn-ghost btn-circle avatar mr-2">
          <div className="w-10 rounded-full overflow-hidden">
            <img
              alt="Avatar"
              src={avatarUrl ?? "https://placehold.co/10x10/png"}
            />
          </div>
        </Link>
      </>
    );
  }

  return (
    <a className="btn" href="/auth/init">
      Login
    </a>
  );
};

export default LoginButton;
