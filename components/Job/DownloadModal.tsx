"use client";

import { useState } from "react";
import { useSession } from "../../app/auth/components/SessionProvider";
import { getJobFile, getJobResultFile, UserJob } from "../../lib/api-client";

type DownloadableFile = "image" | "dump" | "scene" | "octree" | "emittergrid";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: UserJob;
}

const FILE_OPTIONS: {
  label: string;
  value: DownloadableFile;
  isAvailable?: (job: UserJob) => boolean;
}[] = [
  {
    label: "Result image",
    value: "image",
    isAvailable: (job) => job.status === "completed",
  },
  {
    label: "Result dump",
    value: "dump",
    isAvailable: (job) => job.status === "completed" && job.createDump,
  },
  { label: "Scene", value: "scene" },
  { label: "Octree", value: "octree" },
  {
    label: "Emitter Grid",
    value: "emittergrid",
    isAvailable: (job) => job.hasEmitterGrid,
  },
];

function getFallbackFilename(
  jobId: number,
  fileType: DownloadableFile,
): string {
  const extensionByType: Record<DownloadableFile, string> = {
    image: "png",
    dump: "dump",
    scene: "json",
    octree: "octree",
    emittergrid: "emittergrid",
  };
  return `job-${jobId}-${fileType}.${extensionByType[fileType]}`;
}

export default function DownloadModal({
  isOpen,
  job,
  onClose,
}: DownloadModalProps) {
  const { client } = useSession();
  const [downloadingFile, setDownloadingFile] =
    useState<DownloadableFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const triggerBrowserDownload = (downloadUrl: string, filename: string) => {
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = filename;
    anchor.click();
    anchor.remove();
  };

  const handleDownload = async (file: DownloadableFile) => {
    if (downloadingFile) {
      return;
    }

    setDownloadingFile(file);
    setError(null);

    try {
      const result =
        file === "image" || file === "dump"
          ? await getJobResultFile({
              client,
              path: { id: job.id, file },
            })
          : await getJobFile({
              client,
              path: { id: job.id, file },
            });

      triggerBrowserDownload(
        result.data.url,
        getFallbackFilename(job.id, file),
      );
      onClose();
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Download failed.",
      );
    } finally {
      setDownloadingFile(null);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal modal-open">
      <div
        className="modal-box max-h-[90vh] w-[calc(100%-1rem)] max-w-lg overflow-y-auto p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-modal-title"
        aria-describedby="download-modal-description"
      >
        <h3 id="download-modal-title" className="text-xl font-semibold">
          Download Job files
        </h3>
        <p id="download-modal-description" className="mt-2 text-sm opacity-80">
          Job ID: {job.id}
        </p>

        <div className="mt-5 space-y-3">
          <p className="font-medium">Choose file to download:</p>
          {FILE_OPTIONS.map((option) => {
            const isCurrent = downloadingFile === option.value;

            return (
              <button
                key={option.value}
                type="button"
                className="btn btn-outline w-full min-h-12 justify-between px-4 text-left"
                onClick={() => {
                  void handleDownload(option.value);
                }}
                aria-label={`Download ${option.label} file`}
                disabled={
                  option.isAvailable?.(job) === false ||
                  downloadingFile !== null
                }
              >
                <span>{option.label}</span>
                <span className="inline-flex items-center gap-2">
                  {isCurrent ? "Downloading..." : "Download"}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1ZM5 18a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />
                  </svg>
                </span>
              </button>
            );
          })}
        </div>

        {error && <p className="mt-4 text-sm text-error">{error}</p>}

        <div className="modal-action">
          <button
            type="button"
            className="btn w-full sm:w-auto"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
      <button
        type="button"
        className="modal-backdrop bg-black/60"
        onClick={onClose}
        aria-label="Close download dialog"
      >
        Close
      </button>
    </div>
  );
}
