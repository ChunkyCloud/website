"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useLayoutEffect, useState } from "react";
import { useSession } from "../../../app/auth/components/SessionProvider";
import type { TileResponse, UserJob } from "../../../lib/api-client";
import {
  abortJob,
  getCurrentUserJob,
  getJobResultFile,
  getJobTiles,
} from "../../../lib/api-client";

import DownloadModal from "../../../components/Job/DownloadModal";
import getStatusTag from "../../../components/Job/getStatusTag";
import { DurationCounter } from "./DurationCounter";

interface PageProps {
  params: Promise<{
    id: number;
  }>;
}

// TODO: Split this page into smaller reusable components (deferred cleanup)
const JobPage = ({ params }: PageProps) => {
  const { id } = use(params);
  const { client } = useSession();
  const router = useRouter();

  const [job, setJob] = useState<UserJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const [tiles, setTiles] = useState<TileResponse[]>([]);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);

  const fetchResultImage = async (jobId: number) => {
    try {
      const result = await getJobResultFile({
        client,
        path: { id: jobId, file: "image" },
        throwOnError: false,
      });

      if (result.data?.url) {
        setResultImageUrl(result.data.url);
      } else {
        setResultImageUrl(null);
      }
    } catch (err) {
      console.error("Failed to fetch result image:", err);
      setResultImageUrl(null);
    }
  };

  const fetchJob = async () => {
    try {
      const fetchedJob = await getCurrentUserJob({
        client,
        path: { id },
      });

      // fetchedJob.data can be either an array (from 200: Array<UserJob>)
      // or a single object depending on the client generic. Normalize it
      // to a single `UserJob | null` before updating state.
      const maybeData = fetchedJob.data as unknown as
        | UserJob[]
        | UserJob
        | undefined;
      let jobItem: UserJob | null = null;
      if (Array.isArray(maybeData)) {
        jobItem = maybeData[0] ?? null;
      } else {
        jobItem = (maybeData as UserJob) ?? null;
      }

      setJob(jobItem);

      if (jobItem?.status === "completed") {
        await fetchResultImage(jobItem.id);
      } else {
        setResultImageUrl(null);
        await fetchTile();
      }
    } catch (err) {
      console.error("Failed to fetch job:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTile = async () => {
    try {
      const result = await getJobTiles({
        client,
        path: { id },
      });

      if (result.data) {
        setTiles(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch tiles:", err);
    }
  };

  useEffect(() => {
    void fetchJob();
  }, [client, id]);

  const handleAbort = async () => {
    if (!job || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const result = await abortJob({
        client,
        path: { id: job.id },
        throwOnError: false,
      });

      if (result.error) {
        const errorMessage =
          typeof result.error === "object" &&
          result.error !== null &&
          "message" in result.error &&
          typeof (result.error as { message?: unknown }).message === "string"
            ? (result.error as { message: string }).message
            : "Unable to abort the job.";
        setActionError(errorMessage);
        return;
      }

      await fetchJob();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Unable to abort the job.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!job || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const result = await client.delete({
        security: [{ key: "access-token", scheme: "bearer", type: "http" }],
        url: "/users/me/jobs/{id}",
        path: { id: job.id },
        throwOnError: false,
      });

      if (result.error) {
        const errorMessage =
          typeof result.error === "object" &&
          result.error !== null &&
          "message" in result.error &&
          typeof (result.error as { message?: unknown }).message === "string"
            ? (result.error as { message: string }).message
            : "Unable to delete the job.";
        setActionError(errorMessage);
        return;
      }

      router.push("/jobs");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Unable to delete the job.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const canAbort = job?.status === "queued" || job?.status === "running";

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const previewImageUrl =
    job?.status === "completed" ? resultImageUrl : imageUrl;

  useLayoutEffect(() => {
    if (job?.status === "completed") {
      setImageUrl(null);
      return;
    }

    let cancelled = false;
    let blobUrl: string | null = null;
    async function render() {
      const width = Math.max(
        ...tiles.map((tile: any) => tile.x + tile.width),
        0,
      );
      const height = Math.max(
        ...tiles.map((tile: any) => tile.y + tile.height),
        0,
      );

      if (width === 0 || height === 0) {
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);

      await Promise.all(
        tiles.map(async (tile: any) => {
          if (!tile.url) {
            return;
          }

          const image = new Image();
          image.crossOrigin = "anonymous";
          image.src = tile.url;

          await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () =>
              reject(new Error(`Failed to load tile: ${tile.url}`));
          });

          ctx.drawImage(image, tile.x, tile.y, tile.width, tile.height);
        }),
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create image blob"));
          }
        }, "image/png");
      });

      if (cancelled) {
        return;
      }

      blobUrl = URL.createObjectURL(blob);
      setImageUrl(blobUrl);
    }

    if (tiles) {
      render().catch(console.error);

      return () => {
        cancelled = true;

        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
      };
    }
  }, [id, job?.status, tiles]);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Job Details</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Job Details</h1>
        <p>Job not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 p-4 sm:space-y-6 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="w-full lg:basis-1/3 lg:min-w-[280px]">
          <div className="card min-w-0 bg-gray-800 text-white shadow-lg">
            <div className="card-body space-y-4">
              <h2 className="card-title text-2xl">ID: {job.id}</h2>
              <span className="font-mono">{getStatusTag(job)}</span>

              <div className="divider"></div>

              <div className="space-y-2">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold">Progress:</span>
                  <span className="font-mono text-sm">
                    {(job.progress * 100).toFixed(2)}%
                  </span>
                </div>
                <progress
                  className="progress progress-primary w-full"
                  value={job.progress}
                  max={1}
                  aria-label={`Job progress ${(job.progress * 100).toFixed(2)}%`}
                ></progress>
              </div>

              <div className="divider"></div>

              <div className="space-y-2">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <span className="font-semibold">Render Time:</span>
                  <span className="font-mono text-sm">
                    {job.status !== "aborted" && job.startedAt ? (
                      <DurationCounter
                        startDate={job.startedAt}
                        endDate={job.finishedAt}
                      />
                    ) : (
                      "n/a"
                    )}
                  </span>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <span className="font-semibold">Created at:</span>
                  <span className="font-mono text-sm">
                    {job.startedAt
                      ? new Date(job.startedAt).toLocaleString()
                      : "n/a"}
                  </span>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <span className="font-semibold">Started at:</span>
                  <span className="font-mono text-sm">
                    {job.startedAt
                      ? new Date(job.startedAt).toLocaleString()
                      : "n/a"}
                  </span>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <span className="font-semibold">Finished at:</span>
                  <span className="font-mono text-sm">
                    {job.finishedAt
                      ? new Date(job.finishedAt).toLocaleString()
                      : "n/a"}
                  </span>
                </div>
              </div>

              <div className="divider"></div>

              <div className="space-y-3">
                <h3 className="font-semibold">Scene Description</h3>
                <div className="bg-gray-700 p-3 rounded space-y-2 text-sm">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <span>SPP Goal:</span>
                    <span className="font-mono">{job.spp}</span>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <span>Resolution:</span>
                    <span className="font-mono">
                      {job.width}x{job.height}
                    </span>
                  </div>
                  {/*<div className="flex justify-between">
                    <span>Ray Depth:</span>
                    <span className="font-mono">CURRENTLY NOT IMPLEMENTED</span>
                  </div>*/}
                </div>
              </div>

              <div className="divider"></div>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {canAbort ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline btn-warning w-full min-h-11 sm:w-fit"
                      onClick={handleAbort}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Working..." : "Abort Job"}
                    </button>
                  ) : (
                    <div
                      className="tooltip w-full sm:w-fit"
                      data-tip="Only queued or running jobs can be aborted."
                    >
                      <button
                        type="button"
                        className="btn btn-sm btn-disabled btn-outline btn-warning w-full min-h-11 sm:w-fit"
                        disabled
                      >
                        Abort Job
                      </button>
                    </div>
                  )}

                  {/*<button
                    type="button"
                    className="btn btn-sm btn-outline btn-error w-full min-h-11 sm:w-fit"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Working..." : "Delete Job"}
                  </button>
                  */}
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-outline btn-info w-full min-h-11 sm:w-fit"
                  onClick={() => setIsDownloadModalOpen(true)}
                >
                  Download
                </button>
              </div>
              {actionError && (
                <p className="text-sm text-error">{actionError}</p>
              )}
            </div>
          </div>
        </div>

        <div className="w-full lg:basis-2/3">
          <div className="aspect-video overflow-hidden rounded-md bg-gray-900 flex items-center justify-center p-2">
            {previewImageUrl ? (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "hidden",
                }}
              >
                <img
                  src={previewImageUrl}
                  alt={`Render preview for job ${id}`}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    width: "auto",
                    height: "auto",
                    objectFit: "contain",
                  }}
                  onError={(event) => {
                    const target = event.currentTarget as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <p className="text-lg">Render Preview</p>
                <p className="text-sm">
                  {job.status === "completed"
                    ? "Result image is not available yet."
                    : "Waiting for tiles from render nodes…"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        job={job}
      />
    </div>
  );
};

export default JobPage;
