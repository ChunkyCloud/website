"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";
import Header from "../../components/Header";

import { canvasSizeToDimensions } from "../new/utils";

import { useSession } from "../../app/auth/components/SessionProvider";
import { createJob, startJob, getResourcePacks } from "../../lib/api-client";
import type { ResourcePackResponse } from "../../lib/api-client";

import LogPanel, { LogPanelRef } from "../../components/LogPanel";
import MultiSelect from "../../components/MultiSelect";
import Link from "next/link";

// TODO: Add a clear prompt/CTA for users who are not logged in.
{
  /* Things that got removed from the old code, but are needed later 
  
  fetchresourcepack
  
  */
}

//TODO: Add a check for Scene Description description octree to test if the file structure is correct before sending to api
//TODO: Add A Job Name
//TODO: Show Warning for too high SPP Values
//TODO: Split this page into smaller reusable components (deferred cleanup)

function createFileList(...files: File[]): FileList {
  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  return dataTransfer.files;
}

export default function CreateJob() {
  const router = useRouter();
  const { client, isLoggedIn } = useSession();

  {
    /* Objects to Remove from SceneDescription */
  }
  const removefromSceneDescription: string[] = [
    "world",
    "actors.skin",
    "skymap",
  ];

  {
    /* Form Variables */
  }

  const [sceneDescription, setSceneDescription] = useState<File>();

  const [octreeDescription, setOctree] = useState<File>();
  const [emitterGrid, setEmitterGrid] = useState<File>();
  const [emitterGridRequired, setEmitterGridRequired] = useState(false);

  const [canvasWidth, setCanvasWidth] = useState(1920);
  const [canvasHeight, setCanvasHeight] = useState(1080);
  const [canvasSize, setCanvasSize] = useState("1920x1080");

  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);

  const [renderName, setRenderName] = useState<string>("");
  const [targetSpp, setTargetSpp] = useState(500);
  const [renderDump, setRenderDump] = useState(false);
  const [texturepack, setTexturepack] = useState<ResourcePackResponse[]>([]);

  const [skymap, setSkymap] = useState<File>();
  const [skymapRequired, setSkymapRequired] = useState(false);
  const [resourcePacks, setResourcePacks] = useState<ResourcePackResponse[]>(
    [],
  );

  const [folderDropSupported, setFolderDropSupported] = useState(true);
  const logRef = useRef<LogPanelRef>(null);

  {
    /* Idk what this if for */
  }

  const sceneDescriptionRef = useRef<HTMLInputElement>(null);
  const octreeRef = useRef<HTMLInputElement>(null);
  const emitterGridRef = useRef<HTMLInputElement>(null);
  const skymapRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchResourcePacks();

    setFolderDropSupported(
      typeof window !== "undefined" &&
        typeof DataTransferItem !== "undefined" &&
        !!DataTransferItem.prototype.webkitGetAsEntry &&
        typeof DataTransfer === "function",
    );
  }, []);

  function fetchResourcePacks() {
    getResourcePacks({ client })
      .then((packs) => {
        setResourcePacks(packs.data);
      })
      .catch((error) => {
        console.error("Failed to fetch resource packs:", error);
      });
  }

  function ApplyCustomCanvasSize() {
    setCanvasHeight(Number(customHeight));
    setCanvasWidth(Number(customWidth));
    setCanvasSize(`${customWidth}x${customHeight}`);
  }

  function deleteByPath(obj: any, path: string) {
    const parts = path.split(".");
    const last = parts.pop();

    let current = obj;

    for (const part of parts) {
      if (!current || typeof current !== "object") return;
      current = current[part];
    }

    if (current && last) {
      delete current[last];
    }
  }

  const handleSceneDescriptionFileChange = useCallback(
    async (file: File | undefined) => {
      if (file?.type === "application/json") {
        setSceneDescription(file);
        const json = JSON.parse(await file.text());

        const height = json.height;
        const width = json.width;
        setCanvasHeight(height);
        setCanvasWidth(width);
        setCanvasSize(height + "x" + width);

        const newEmitterGridRequired =
          json.emitterSamplingStrategy &&
          json.emitterSamplingStrategy !== "NONE";
        setEmitterGridRequired(newEmitterGridRequired);
        if (!newEmitterGridRequired && emitterGridRef.current) {
          emitterGridRef.current.value = "";
        }

        const newSkymapRequired =
          json.sky?.mode === "SKYMAP_PANORAMIC" ||
          json.sky?.mode === "SKYMAP_SPHERICAL";
        setSkymapRequired(newSkymapRequired);
        if (!newSkymapRequired && skymapRef.current) {
          skymapRef.current.value = "";
        }
      } else {
        setEmitterGridRequired(false);
        setSkymapRequired(false);
        if (emitterGridRef.current) emitterGridRef.current.value = "";
        if (skymapRef.current) skymapRef.current.value = "";
      }
    },
    [],
  );

  const handleSceneDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleSceneDescriptionFileChange(e.target.files?.[0]);
    },
    [handleSceneDescriptionFileChange],
  );

  const [submitting, setSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const handleFiles = useCallback(
    (files: File[]) => {
      const json = files.find((f) => f.name.endsWith(".json"));
      if (json && sceneDescriptionRef.current) {
        sceneDescriptionRef.current.files = createFileList(json);
        handleSceneDescriptionFileChange(json);

        const sceneName = json.name.replace(/\.json$/, "");

        setRenderName(sceneName);

        const octreeFile = files.find((f) => f.name === `${sceneName}.octree2`);
        if (octreeFile && octreeRef.current) {
          octreeRef.current.files = createFileList(octreeFile);
          setOctree(octreeFile);
        }

        const emitterGridFile = files.find(
          (f) => f.name === `${sceneName}.emittergrid`,
        );
        if (emitterGridFile && emitterGridRef.current) {
          emitterGridRef.current.files = createFileList(emitterGridFile);
          setEmitterGrid(emitterGridFile);
        }
      }
    },
    [handleSceneDescriptionFileChange],
  );

  const [dragging, setDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);

      if (folderDropSupported) {
        const folderEntry = Array.prototype.find
          .call(
            e.dataTransfer.items,
            (item: DataTransferItem) => item.webkitGetAsEntry()?.isDirectory,
          )
          ?.webkitGetAsEntry();

        if (folderEntry && folderEntry.isDirectory) {
          folderEntry
            .createReader()
            .readEntries(async (entries: FileSystemEntry[]) => {
              try {
                const files = await Promise.all(
                  entries
                    .filter((entry) => entry.isFile)
                    .map(
                      (entry) =>
                        new Promise<File>((resolve, reject) =>
                          (entry as FileSystemFileEntry).file(resolve, reject),
                        ),
                    ),
                );
                handleFiles(files);
              } catch (e) {
                console.error("Could not get files", e);
              }
            });
          return;
        }
      }

      handleFiles(Array.from(e.dataTransfer.files));
    },
    [handleFiles],
  );

  const HandlecreateJob = useCallback(async () => {
    {
      /* Validate if required Inputs are filled out */
    }
    if (!sceneDescription || !octreeDescription || !renderName) {
      setShowValidation(true);
      console.log("Job Validation failed Case: Missing required field:", {
        sceneDescription: sceneDescription,
        octreeDescription: octreeDescription,
        renderName: renderName,
      });
      return;
    }

    logRef.current?.show();
    console.log("Starting Job Creation");
    logRef.current?.addLog("Starting Job Creation", "info");

    console.log("Job Validation complete");
    logRef.current?.addLog("Job Validation complete", "success");

    setShowValidation(false);
    setSubmitting(true);

    let shouldRedirectToJobs = false;
    let createdJobId: number | null = null;

    try {
      console.log("Creating job on backend");
      const creation_res = await createJob({
        client,
        body: {
          spp: targetSpp,
          width: canvasWidth,
          height: canvasHeight,
          createDump: true,
          resourcePacks: texturepack,
        },
      });
      const creation_data = (creation_res as any)?.data;
      if (creation_data) {
        createdJobId = creation_data.id;
        console.log("Job created with ID:", creation_data.id);
        logRef.current?.addLog(
          "Job created with ID " + creation_data.id,
          "success",
        );
        logRef.current?.addLog("Uploading files ", "info");
        console.log("Scene upload URL:", creation_data.uploadUrls.scene);
        console.log("Octree upload URL:", creation_data.uploadUrls.octree);
        console.log(
          "EmitterGrid upload URL:",
          creation_data.uploadUrls.emittergrid,
        );

        {
          /* Clean scene Description from local Paths*/
        }

        const json = JSON.parse(await sceneDescription.text());

        removefromSceneDescription.forEach((path) => {
          deleteByPath(json, path);
        });

        const cleanedSceneDescription = new File(
          [JSON.stringify(json)],
          sceneDescription.name,
          {
            type: "application/json",
          },
        );

        await uploadFile(
          creation_data.uploadUrls.scene,
          cleanedSceneDescription,
        );
        await uploadFile(creation_data.uploadUrls.octree, octreeDescription);

        if (emitterGridRequired && emitterGrid) {
          await uploadFile(creation_data.uploadUrls.emittergrid, emitterGrid);
        }

        {
          /* After Uploading Start Job */
        }

        try {
          console.log("Starting job ", creation_data.id);
          logRef.current?.addLog("Starting Job ", "info");

          const res = await startJob({
            client,
            path: {
              id: creation_data.id,
            },
          });

          console.log("Response:", res);

          if ((res as any)?.response?.status === 202) {
            console.log("Job queued successfully");
            logRef.current?.addLog("Job queued successfully", "success");
          }
        } catch (err: any) {
          console.error("Failed:", err);
          logRef.current?.addLog("Starting Job failed", "error");

          if (err?.response?.status === 409) {
            console.error("Job is not a draft or required files are missing");
            logRef.current?.addLog(
              "Job is not a draft or required files are missing",
              "error",
            );
          }
        } finally {
          shouldRedirectToJobs = true;
        }
      } else {
        console.warn("No data returned from job creation response");
      }
    } catch (e) {
      console.error("Failed to create job", e);
      logRef.current?.addLog("Failed creating Job", "error");
    } finally {
      setSubmitting(false);

      if (shouldRedirectToJobs && createdJobId !== null) {
        router.push(`/jobs/${createdJobId}`);
      }

      setTimeout(() => {
        logRef.current?.clear();
        logRef.current?.hide();
      }, 10_000); // 10 seconds
    }
  }, [
    client,
    sceneDescription,
    octreeDescription,
    emitterGrid,
    emitterGridRequired,
    skymap,
    targetSpp,
    canvasWidth,
    canvasHeight,
    texturepack,
    router,
  ]);

  async function uploadFile(uploadUrl: string, file: File) {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Upload failed: ${response.status} ${response.statusText}`,
      );
    }
  }

  /*
  TODO add Status after clicking Submit (Error codes, Loading Progress, 
  
  Creat Job-> Done -> Uploading Files Json, Octree Emitter Skymap(SKIP) -> Job Render Start -> Redirect to Job Page




   * TODO: Add Explanation Questionmark Circles
   *
   */

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-base-200 text-white px-4 py-24">
        <div className="mx-auto max-w-xl rounded-2xl border border-base-300/80 bg-base-100/90 p-8 text-center shadow-xl">
          <h1 className="text-3xl font-bold">Create Job</h1>
          <p className="mt-4 text-gray-400">
            You need to sign in before creating a render job.
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
    <>
      <div
        className="bg-fixed bg-cover bg-center overflow-hidden"
        style={{
          backgroundImage: "url(/images/boscawinks-Basalt_Deltas_be_like.png)",
        }}
      >
        <div className="px-6 py-8 max-w-4xl mx-auto">
          <fieldset className="fieldset bg-base-200/95 border-base-300 rounded-box border p-8 shadow">
            <legend className="fieldset-legend text-3xl font-bold">
              Create a new Render Job
            </legend>
            <div
              className={`mt-4 p-4 rounded-lg border-2 ${
                dragging
                  ? "border-primary bg-base-100"
                  : "border-dashed border-base-300"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <p className="text-base leading-relaxed mb-6">
                To create a new render job, please select your scene files below
                and fill out the required fields.
                <br />
                You can also drag and drop the files
                {folderDropSupported && " (or the scene folder)"} anywhere on
                this page.
              </p>

              <div className="form-control w-full mb-4">
                <label className="label" htmlFor="sceneDescription">
                  <span className="label-text text-base font-bold">
                    Scene description* (.json)
                  </span>
                </label>
                <input
                  type="file"
                  className={`file-input file-input-bordered w-full ${
                    showValidation && !sceneDescription
                      ? "file-input-error"
                      : ""
                  }`}
                  id="sceneDescription"
                  accept=".json"
                  onChange={handleSceneDescriptionChange}
                  ref={sceneDescriptionRef}
                />
              </div>

              <div className="form-control w-full mb-4">
                <label className="label" htmlFor="octree">
                  <span className="label-text text-base font-bold">
                    Octree* (.octree2)
                  </span>
                </label>
                <input
                  type="file"
                  className={`file-input file-input-bordered w-full ${
                    showValidation && !octreeDescription
                      ? "file-input-error"
                      : ""
                  }`}
                  id="octree"
                  accept=".octree2"
                  onChange={(e) => setOctree(e.target.files?.[0])}
                  ref={octreeRef}
                />
              </div>

              <div className="form-control w-full mb-4">
                <label className="label" htmlFor="emitterGrid">
                  <span className="label-text text-base font-bold">
                    Emitter grid (.emittergrid)
                  </span>
                </label>
                <input
                  type="file"
                  className="file-input file-input-bordered w-full"
                  id="emitterGrid"
                  accept=".emittergrid"
                  onChange={(e) => setEmitterGrid(e.target.files?.[0])}
                  ref={emitterGridRef}
                />
              </div>

              <div className="form-control w-full mb-6">
                <label className="label" htmlFor="skymap">
                  <span className="label-text text-base font-bold">
                    Skymap (.hdr, .exr)
                  </span>
                </label>
                <input
                  type="file"
                  className="file-input file-input-bordered w-full "
                  id="skymap"
                  accept=".hdr, .exr"
                  onChange={(e) => setSkymap(e.target.files?.[0])}
                  ref={skymapRef}
                />
              </div>
              <div className="form-control w-full mb-6 menu-vertical">
                <label className="label" htmlFor="renderName">
                  <span className="block mb-2 label-text text-base font-bold">
                    Scene Name
                  </span>
                </label>
                <input
                  type="string"
                  placeholder="Scene Name"
                  className="input input-bordered input-md w-1/2 mb-3"
                  value={renderName}
                  onChange={(e) => setRenderName(String(e.target.value))}
                />
              </div>
              <div className="form-control w-full mb-4 menu-vertical">
                <label className="label" htmlFor="Canvas Size">
                  <span className="input-md label-text text-base font-bold">
                    Canvas Size
                  </span>
                </label>
                <select
                  defaultValue="1920x1080"
                  className="select"
                  value={canvasSize}
                  onChange={(e) => {
                    setCanvasSize(e.target.value);
                    const { width, height } = canvasSizeToDimensions(
                      e.target.value,
                    );
                    setCanvasWidth(width);
                    setCanvasHeight(height);
                  }}
                >
                  <option>Custom</option>
                  <option>{canvasSize}</option>
                  <option>400x400</option>
                  <option>960x540</option>
                  <option>1024x768</option>
                  <option>1920x1080</option>
                </select>
              </div>

              {canvasSize === "Custom" && (
                <div className="ml-6 mt-3 bg-base-300 rounded-box p-4 border-l-4 border-primary shadow-sm">
                  <div className="form-control w-full mb-6 menu-vertical">
                    <label className="label" htmlFor="targetSpp">
                      <span className="label-text text-base font-bold">
                        Custom Canvas Size
                      </span>
                    </label>
                    <div className="form-control w-full mb-6 menu-horizontal">
                      <input
                        type="number"
                        placeholder="Target height"
                        className="input input-bordered input-md w-40 mb-3"
                        value={customHeight}
                        step={10}
                        onChange={(e) =>
                          setCustomHeight(Number(e.target.value))
                        }
                      />
                      <p className="text-xl m-3"> X </p>
                      <input
                        type="number"
                        placeholder="Target width"
                        className="input input-bordered input-md w-40 mb-3"
                        value={customWidth}
                        step={10}
                        onChange={(e) => setCustomWidth(Number(e.target.value))}
                      />
                    </div>
                    <button
                      className="btn btn-info w-1/4"
                      onClick={ApplyCustomCanvasSize}
                    >
                      <p>Apply</p>
                    </button>
                  </div>
                </div>
              )}
              <div className="form-control w-full mb-6 menu-vertical">
                <label className="label" htmlFor="targetSpp">
                  <span className="label-text text-base font-bold">
                    Target SPP
                  </span>
                </label>
                <div className="w-full mb-6 flex items-center">
                  <input
                    type="number"
                    placeholder="Target SPP"
                    className="input input-bordered input-md w-40 mb-3"
                    value={targetSpp}
                    step={100}
                    onChange={(e) => setTargetSpp(Number(e.target.value))}
                  />
                  {targetSpp > 5000 && (
                    <div className="ml-auto">
                      <p>
                        ⚠ High SPP values may significantly increase render
                        time.
                      </p>
                      <p>32-1024 daylight without Light Sources</p>
                      <p>4096-16384 daylight with Light Sources</p>
                      <p>16384 nighttime or indoor with Light Sources</p>
                    </div>
                  )}
                </div>
                <input
                  type="range"
                  min={500}
                  max="10000"
                  id="targetSpp"
                  value={targetSpp}
                  onChange={(e) => setTargetSpp(Number(e.target.value))}
                  className="range range-primary w-full"
                  step="100"
                />
                <div className="flex justify-between px-2.5 mt-2 text-xs">
                  <span>|</span>
                  <span>|</span>
                  <span>|</span>
                  <span>|</span>
                  <span>|</span>
                </div>
                <div className="flex justify-between px-2.5 mt-2 text-xs">
                  <span>500</span>
                  <span>2500</span>
                  <span>5000</span>
                  <span>7500</span>
                  <span>10000</span>
                </div>
              </div>

              <div className="form-control w-full mb-4 menu-vertical">
                <label className="label" htmlFor="Create Dump">
                  <span className="label-text text-base font-bold">
                    Create Dump
                  </span>
                </label>

                <label className="toggle toggle-error m-2">
                  <input
                    type="checkbox"
                    checked={renderDump}
                    onChange={(e) => setRenderDump(e.target.checked)}
                  />

                  {/* OFF */}
                  <svg
                    aria-label="off"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M18 6 6 18M6 6l12 12"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>

                  {/* ON */}
                  <svg
                    aria-label="on"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M20 6 9 17l-5-5"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </label>
              </div>

              <label className="label" htmlFor="texturepack">
                <span className="label-text text-base font-bold">
                  Texture pack
                </span>
              </label>
              <div className="w-full mb-6">
                <MultiSelect
                  packs={resourcePacks}
                  value={texturepack}
                  onChange={(packs) => {
                    setTexturepack(packs);
                  }}
                />
              </div>

              {/* Submit Button with Hover text of what is missing to being enabled */}

              <div
                className="peer tooltip w-full"
                data-tip={
                  submitting
                    ? "Submitting your render job..."
                    : !sceneDescription || !octreeDescription
                      ? `Missing required fields: ${[
                          !sceneDescription && "Scene description",
                          !octreeDescription && "Octree",
                        ]
                          .filter(Boolean)
                          .join(", ")}`
                      : "Click to Submit your render job"
                }
              >
                <button
                  className={`btn btn-primary w-full ${
                    showValidation && (!sceneDescription || !octreeDescription)
                      ? "btn-error"
                      : ""
                  }`}
                  onClick={HandlecreateJob}
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="loading loading-spinner loading-md"></span>
                  ) : (
                    "Submit"
                  )}
                </button>
              </div>
            </div>
          </fieldset>
          <div>
            <LogPanel ref={logRef} />
          </div>
        </div>
      </div>
    </>
  );
}
