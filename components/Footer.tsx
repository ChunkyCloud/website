import Link from "next/link";
import React from "react";

const commit = process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) ?? "dev";

const Footer = () => {
  return (
    <footer className="footer sm:footer-horizontal bg-base-200 text-base-content p-10 relative">
      <aside>
        <img src="/favicon.ico" alt="logo" className="w-16 h-16" />
        <p className="font-bold">ChunkyCloud</p>
        <p className="text-sm text-gray-500">A Distributed Rendering Service</p>
      </aside>
      <nav>
        <h6 className="footer-title">Chunky</h6>
        <Link href="https://chunky.lemaik.de/" className="link link-hover">
          Website
        </Link>
        <Link
          href="https://www.reddit.com/r/chunky/"
          className="link link-hover"
        >
          Subreddit
        </Link>
        <Link
          href="https://discord.com/invite/VqcHpsF"
          className="link link-hover"
        >
          Discord
        </Link>
      </nav>
      <nav>
        <h6 className="footer-title">Developers</h6>
        <Link href="https://github.com/ChunkyCloud" className="link link-hover">
          ChunkyCloud
        </Link>
        <Link
          href="https://api.chunkycloud.net/docs"
          className="link link-hover"
        >
          ChunkyCloud API
        </Link>
        <Link
          href="https://github.com/leMaik/chunky"
          className="link link-hover"
        >
          Chunky
        </Link>
      </nav>
      <nav>
        <h6 className="footer-title">Placeholder Legal</h6>
        <Link href="" className="link link-hover">
          Terms of use
        </Link>
        <Link href="" className="link link-hover">
          Privacy policy
        </Link>
        <Link href="" className="link link-hover">
          Cookie policy
        </Link>
      </nav>
      <div className="absolute bottom-4 right-10">
        <p className="text-xs text-gray-500">
          {" "}
          v{process.env.NEXT_PUBLIC_APP_VERSION} • {commit}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
