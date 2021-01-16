import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Header from "../components/Header";
import styles from "../styles/New.module.css";

export async function getServerSideProps(context) {
  const res = await fetch(`https://api.chunkycloud.lemaik.de/resourcepacks`);
  const data = await res.json();

  return {
    props: {
      resourcePacks: data,
    },
  };
}

const folderDropSupported =
  typeof window !== "undefined" &&
  typeof DataTransferItem != null &&
  !!DataTransferItem.prototype.webkitGetAsEntry &&
  typeof DataTransfer === "function";

/**
 * Create a FileList that can be assigned to e.g. file input fields.
 * @param  {...File} files Files to include in the list
 * @see https://stackoverflow.com/a/47172409
 */
function createFileList(...files) {
  const dataTransfer = new DataTransfer();
  for (const file of files) {
    dataTransfer.items.add(file);
  }
  return dataTransfer.files;
}

export default function CreateJob({ resourcePacks }) {
  const router = useRouter();
  const [sceneDescription, setSceneDescription] = useState();
  const [octree, setOctree] = useState();
  const [emitterGrid, setEmitterGrid] = useState();
  const [emitterGridRequired, setEmitterGridRequired] = useState(false);
  const [targetSpp, setTargetSpp] = useState(500);
  const [texturepack, setTexturepack] = useState("");
  const [skymap, setSkymap] = useState();
  const [skymapRequired, setSkymapRequired] = useState(false);
  const [apiKey, setApiKey] = useState("");

  const sceneDescriptionRef = useRef();
  const octreeRef = useRef();
  const emitterGridRef = useRef();
  const skymapRef = useRef();

  const handleSceneDescriptionFileChange = useCallback(async (file) => {
    if (file?.type === "application/json") {
      setSceneDescription(file);
      const json = JSON.parse(await file.text());
      const newEmitterGridRequired =
        json.emitterSamplingStrategy != null &&
        json.emitterSamplingStrategy !== "NONE";
      setEmitterGridRequired(newEmitterGridRequired);
      if (!newEmitterGridRequired) {
        emitterGridRef.current.value = "";
      }
      const newSkymapRequired =
        json.sky.mode === "SKYMAP_PANORAMIC" ||
        json.sky.mode === "SKYMAP_PANORAMIC";
      setSkymapRequired(newSkymapRequired);
      if (!newSkymapRequired) {
        skymapRef.current.value = "";
      }
      // Skybox (six textures) is not supported by ChunkyCloud
    } else {
      setEmitterGridRequired(false);
      setSkymapRequired(false);
      emitterGridRef.current.value = "";
      skymapRef.current.value = "";
    }
  });

  const handleSceneDescriptionChange = useCallback((e) => {
    handleSceneDescriptionFileChange(e.target.files[0]);
  }, []);

  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("scene", sceneDescription);
      body.append("octree", octree);
      if (emitterGridRequired && emitterGrid) {
        body.append("emittergrid", emitterGrid);
      }
      body.append("targetSpp", parseInt(targetSpp, 10));
      if (texturepack) {
        body.append("texturepack", texturepack);
      }
      if (skymapRequired && skymap) {
        body.append("skymap", skymap);
      }
      const res = await fetch("https://api.chunkycloud.lemaik.de/jobs", {
        method: "POST",
        headers: {
          "X-Api-Key": apiKey,
        },
        body,
      });
      if (res.status === 201) {
        router.push(`/jobs/${(await res.json())._id}`);
      } else {
        throw new Error(await res.text());
      }
    } catch (e) {
      console.error(e);
      alert("Could not create job: " + e.message);
    } finally {
      setSubmitting(false);
    }
  }, [
    apiKey,
    emitterGrid,
    emitterGridRequired,
    octree,
    sceneDescription,
    targetSpp,
    texturepack,
    skymap,
    skymapRequired,
    router,
  ]);

  const handleFiles = useCallback(
    (files) => {
      const json = files.find((f) => f.name.endsWith(".json"));
      if (json) {
        sceneDescriptionRef.current.files = createFileList(json);
        handleSceneDescriptionFileChange(json);
        const sceneName = json.name.substring(0, json.name.length - 5);
        const octree = files.find((f) => f.name === `${sceneName}.octree2`);
        if (octree) {
          octreeRef.current.files = createFileList(octree);
          setOctree(octree);
        }
        const emitterGrid = files.find(
          (f) => f.name === `${sceneName}.emittergrid`
        );
        if (emitterGrid) {
          emitterGridRef.current.files = createFileList(emitterGrid);
          setEmitterGrid(emitterGrid);
        }
      } else {
        const octree = files.find((f) => f.name.endsWith(".octree2"));
        if (octree) {
          octreeRef.current.files = createFileList(octree);
          setOctree(octree);
        }
        const emitterGrid = files.find((f) => f.name.endsWith(".emittergrid"));
        if (emitterGrid) {
          emitterGridRef.current.files = createFileList(emitterGrid);
          setEmitterGrid(emitterGrid);
        }
      }
    },
    [handleSceneDescriptionFileChange]
  );

  const [dragging, setDragging] = useState(false);
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
  });
  const handleDragLeave = useCallback(() => {
    setDragging(false);
  });
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);

      if (folderDropSupported) {
        const folder = Array.prototype.find
          .call(
            e.dataTransfer.items,
            (item) => item.webkitGetAsEntry().isDirectory
          )
          ?.webkitGetAsEntry();
        if (folder) {
          // folder dropped
          folder.createReader().readEntries(async (entries) => {
            try {
              const files = await Promise.all(
                entries
                  .filter((entry) => entry.isFile)
                  .map(
                    (entry) =>
                      new Promise((resolve, reject) =>
                        entry.file(resolve, reject)
                      )
                  )
              );
              handleFiles(files);
            } catch (e) {
              console.error("Could not get files", e);
            }
          });
          return;
        }
      }

      // multiple files dropped
      handleFiles([...e.dataTransfer.files]);
    },
    [handleFiles]
  );

  return (
    <>
      <Head>
        <title>New render job – ChunkyCloud</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header title="New render job" />
      <div
        className={`${styles.root} ${dragging ? styles.dragging : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <h1>Create new render job</h1>
        <p>
          To create a new render job, please select your scene files below and
          fill out the required fields.
          <br />
          You can also drag and drop the files
          {folderDropSupported && " (or the scene folder)"} anywhere on this
          page.
        </p>
        <p>
          <label htmlFor="sceneDescription">API Key*: </label>
          <input
            type="text"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <br />
          <label htmlFor="sceneDescription">Scene description*: </label>
          <input
            type="file"
            id="sceneDescription"
            accept=".json"
            onChange={handleSceneDescriptionChange}
            ref={sceneDescriptionRef}
          />
          <br />
          <label htmlFor="octree">Octree*: </label>
          <input
            type="file"
            id="octree"
            accept=".octree2"
            onChange={(e) => setOctree(e.target.files[0])}
            ref={octreeRef}
          />
          <br />
          <label htmlFor="emitterGrid">
            Emitter grid{emitterGridRequired ? "*" : ""}:{" "}
          </label>
          <input
            type="file"
            id="emitterGrid"
            accept=".emittergrid"
            onChange={(e) => setEmitterGrid(e.target.files[0])}
            disabled={!emitterGridRequired}
            ref={emitterGridRef}
          />
          <br />
          <label htmlFor="skymap">Skymap{skymapRequired ? "*" : ""}: </label>
          <input
            type="file"
            id="skymap"
            accept=".png,.jpg,.hdr,.pfm"
            onChange={(e) => setSkymap(e.target.files[0])}
            disabled={!skymapRequired}
            ref={skymapRef}
          />
          <br />
          <label htmlFor="targetSpp">Samples per pixel*: </label>
          <input
            type="number"
            id="targetSpp"
            min="1"
            max="1000"
            value={targetSpp}
            onChange={(e) => setTargetSpp(e.target.value)}
          />
          <br />
          <label htmlFor="texturepack">Resourcepack: </label>
          <select
            id="texturepack"
            value={texturepack}
            onChange={(e) => setTexturepack(e.target.value || null)}
          >
            <option value="">Vanilla (1.16.4)</option>
            {resourcePacks.map(({ name, displayName }) => (
              <option key={name} value={name}>
                {displayName}
              </option>
            ))}
          </select>
          <br />
          <button onClick={handleSubmit} disabled={submitting}>
            Create job
          </button>
        </p>
      </div>
    </>
  );
}
