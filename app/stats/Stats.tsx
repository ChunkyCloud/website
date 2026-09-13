"use client";

import { useEffect, useState } from "react";
import type { PublicStatsResponse } from "../../lib/api-client";
import { getPublicStats } from "../../lib/api-client";
import { publicApiClient } from "../../lib/publicApiClient";
import Step from "../../components/Stats/step";

const defaultStats: PublicStatsResponse = {
  nodes: {
    connected: 0,
    rendering: 0,
  },
  jobs: {
    queued: 0,
    running: 0,
  },
  totalSamplesPerSeconds: 0,
};

type StatsProps = {
  initialStats?: PublicStatsResponse;
};

export default function Stats({ initialStats = defaultStats }: StatsProps) {
  const [stats, setStats] = useState<PublicStatsResponse>(initialStats);

  useEffect(() => {
    let stale = false;

    async function loadStats() {
      try {
        const { data } = await getPublicStats({
          client: publicApiClient,
          throwOnError: false,
        });
        if (!stale && data) {
          setStats(data);
        }
      } catch (err) {
        console.error("Fehler beim Laden der Stats:", err);
      }
    }

    const interval = setInterval(loadStats, 30_000);
    return () => {
      stale = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-10 rounded-xl bg-base-200 p-6 shadow">
        <h1 className="text-xl font-semibold mb-3">Service overview</h1>
        <p className="text-sm text-gray-600 leading-6">
          These statistics show the current activity on ChunkyCloud and refresh
          every 30 seconds.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Step
          Title="Connected render nodes"
          value={stats.nodes?.connected ?? 0}
        />
        <Step Title="Rendering nodes" value={stats.nodes?.rendering ?? 0} />
        <Step Title="Queued jobs" value={stats.jobs?.queued ?? 0} />
        <Step Title="Running jobs" value={stats.jobs?.running ?? 0} />
      </div>

      <div className="prose max-w-none bg-base-200 p-6 rounded-xl shadow">
        <h2>How ChunkyCloud works</h2>
        <p>
          Each scene submitted for rendering becomes a{" "}
          <strong>render job</strong>. Each job is split into{" "}
          <strong>tasks</strong>, which are distributed across{" "}
          <strong>render nodes</strong>. The number of tasks depends on the
          image resolution and the target number of samples per pixel.
        </p>
        <p>
          Once all tasks of a job are complete, a worker node merges the results
          into a final image and, if enabled for the job, a render dump. A
          single worker node currently handles this process.
        </p>
        <p>
          When a job is cancelled, it is removed from the queue. Render nodes
          stop processing its tasks shortly afterwards.
        </p>
      </div>
    </div>
  );
}
