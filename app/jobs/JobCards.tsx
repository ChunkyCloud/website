"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "../../app/auth/components/SessionProvider";
import { getCurrentUserJobs, getJobResultFile } from "../../lib/api-client";
import type { UserJob } from "../../lib/api-client";

import LoadingCards from "./LoadingCards";
import getStatusTag from "../../components/Job/getStatusTag";
import type { JobStatus } from "../../lib/api-client";

type JobCardsProps = {
  status?: JobStatus[];
  sort?: "createdAt" | "startedAt" | "finishedAt";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
  onPaginationInfo?: (totalPages: number) => void;
};

const JobCards = ({
  status = [],
  sort = "createdAt",
  order = "desc",
  page = 1,
  limit = 100,
  onPaginationInfo,
}: JobCardsProps) => {
  const { client } = useSession();

  const [jobs, setJobs] = useState<UserJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showLoadingFallback, setShowLoadingFallback] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      if (isMounted) {
        setShowLoadingFallback(true);
      }
    }, 220);

    const fetchJobs = async () => {
      try {
        setLoading(true);
        setErrorMsg("");

        const result = await getCurrentUserJobs({
          client,
          query: {
            status,
            sort,
            order,
            page,
            limit,
          },
        });

        const statusCode = result.response.status;

        if (statusCode === 400) {
          setErrorMsg("Error Code 400: Bad Request");
        }

        let allJobs: UserJob[] = [];
        let newTotalPages = 1;
        const rdata: unknown = result.data;

        if (Array.isArray(rdata)) {
          // shape: [{ data: UserJob[] }, ...]
          allJobs = (rdata as any).flatMap((page: any) => page.data ?? []);
          newTotalPages = 1;
        } else if (
          rdata &&
          typeof rdata === "object" &&
          Array.isArray((rdata as any).data)
        ) {
          const responseData = rdata as {
            data: UserJob[];
            extra?: {
              page?: { page?: number; size?: number };
              totalCount?: number;
            };
          };
          allJobs = responseData.data ?? [];

          const totalCount = responseData.extra?.totalCount ?? allJobs.length;
          const pageSize = responseData.extra?.page?.size ?? limit;
          newTotalPages =
            pageSize > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;
        } else {
          allJobs = [];
          newTotalPages = 1;
        }

        if (isMounted) {
          setJobs(allJobs);
          onPaginationInfo?.(newTotalPages);
        }
      } catch (err) {
        if (isMounted) {
          console.error(err);
          setErrorMsg(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (isMounted) {
          window.clearTimeout(timeoutId);
          setShowLoadingFallback(false);
          setLoading(false);
        }
      }
    };

    fetchJobs();

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [client, status, sort, order, page, limit, onPaginationInfo]);

  const getGlowColor = (status: string | null | undefined): string => {
    if (!status) return "rgba(59,130,246,0.12)"; // default blue
    const s = String(status).toLowerCase();
    if (s.includes("queue")) return "rgba(250,204,21,0.14)"; // yellow
    if (s.includes("render") || s.includes("running"))
      return "rgba(16,185,129,0.14)"; // green
    if (s.includes("error") || s.includes("failed") || s.includes("aborted"))
      return "rgba(239,68,68,0.16)"; // red
    if (s.includes("octree") || s.includes("generating"))
      return "rgba(168,85,247,0.14)"; // purple
    return "rgba(59,130,246,0.12)"; // default blue
  };

  if (loading) {
    return showLoadingFallback ? <LoadingCards /> : null;
  }

  if (errorMsg) {
    return (
      <div className="alert alert-error">
        <span>{errorMsg}</span>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="alert alert-info">
        <span>No jobs found.</span>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .job-card {
          transition: box-shadow 200ms ease;
          box-shadow: 0 6px 18px rgba(0,0,0,0.35);
          border-radius: 0.5rem;
          border: 1px solid rgba(255,255,255,0.04);
        }
        .job-card:hover {
          box-shadow: 0 0 30px var(--job-card-glow, rgba(59,130,246,0.12));
        }
      `}</style>

      {jobs.map((job) => {
        const imageSrc = job.thumbnailUrl ?? "/images/blueprint.png";

        return (
          <Link key={job.id} href={`/jobs/${job.id}`} className="block mb-4">
            <div
              className="card flex w-full bg-gray-800/90 text-white shadow-lg job-card cursor-pointer"
              style={
                {
                  ["--job-card-glow" as any]: getGlowColor(job.status),
                } as React.CSSProperties
              }
            >
              <div className="card-body p-4 space-y-3">
                <h2 className="card-title text-lg">ID: {job.id}</h2>
                <div className="aspect-video overflow-hidden rounded-md">
                  <img
                    src={imageSrc}
                    alt="Job Thumbnail"
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      const target = event.currentTarget as HTMLImageElement;
                      target.src = "/images/blueprint.png";
                    }}
                  />
                </div>

                <div>{getStatusTag(job)}</div>

                <div>
                  <progress
                    className="progress progress-primary w-full"
                    value={job.progress}
                    max={1}
                  ></progress>
                  <p>{(job.progress * 100).toFixed(0)}%</p>
                  <p>SPP: {job.spp}</p>
                </div>

                <div className="text=[8px] text-gray-500 space-y-1">
                  <p>
                    Started:{" "}
                    {job.startedAt
                      ? new Date(job.startedAt).toLocaleString()
                      : "n/a"}
                  </p>
                  {job.finishedAt && (
                    <p>Finished: {new Date(job.finishedAt).toLocaleString()}</p>
                  )}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </>
  );
};

export default JobCards;
