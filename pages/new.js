import { useState, useCallback } from "react";
import { useRouter } from "next/router";

export default function CreateJob() {
  const router = useRouter();
  const [sceneDescription, setSceneDescription] = useState();
  const [octree, setOctree] = useState();
  const [emitterGrid, setEmitterGrid] = useState();
  const [emitterGridRequired, setEmitterGridRequired] = useState(false);
  const [targetSpp, setTargetSpp] = useState(500);
  const [texturepack, setTexturepack] = useState(null);
  const [apiKey, setApiKey] = useState("");

  const handleSceneDescriptionChange = useCallback(async (e) => {
    const file = e.target.files[0];
    if (file?.type === "application/json") {
      setSceneDescription(file);
      const json = JSON.parse(await file.text());
      setEmitterGridRequired(
        json.emitterSamplingStrategy != null &&
          json.emitterSamplingStrategy !== "NONE"
      );
    } else {
      setEmitterGridRequired(false);
    }
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
    router,
  ]);

  return (
    <>
      <h1>Create new render job</h1>
      <p>
        To create a new render job, please select your scene files below and
        fill out the required fields.
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
        />
        <br />
        <label htmlFor="octree">Octree*: </label>
        <input
          type="file"
          id="octree"
          accept=".octree2"
          onChange={(e) => setOctree(e.target.files[0])}
        />
        <br />
        {emitterGridRequired && (
          <>
            <label htmlFor="sceneDescription">Emitter grid*: </label>
            <input
              type="file"
              id="sceneDescription"
              accept=".emittergrid"
              onChange={(e) => setEmitterGrid(e.target.files[0])}
            />
            <br />
          </>
        )}
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
          <option value="chromahills-1.16-v1.zip">Chromahills 1.16 v1</option>
          <option value="faithful-1.16.4">Faithful 1.16.4</option>
        </select>
        <br />
        <button onClick={handleSubmit} disabled={submitting}>
          Create job
        </button>
      </p>
    </>
  );
}
