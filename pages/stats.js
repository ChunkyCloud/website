import Head from "next/head";
import { useEffect, useState } from "react";

function useStats(initialStats) {
  const [stats, setStats] = useState(initialStats);
  useEffect(() => {
    let stale = false;
    async function loadStats() {
      const res = await fetch(`https://api.chunkycloud.lemaik.de/stats`);
      if (res.status === 200) {
        const json = await res.json();
        if (!stale) {
          setStats(json);
        }
      }
    }
    const interval = setInterval(() => loadStats(), 30000);
    return () => {
      stale = true;
      setStats(null);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);
  return stats;
}

export async function getStaticProps(context) {
  const res = await fetch(`https://api.chunkycloud.lemaik.de/stats`);
  const data = await res.json();

  return {
    props: {
      initialStats: data,
    },
    revalidate: 1,
  };
}

export default function Stats({ initialStats }) {
  const stats = useStats(initialStats);

  return (
    <div>
      <Head>
        <title>Statistics – ChunkyCloud</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <h1>ChunkyCloud statistics</h1>
      {stats && (
        <>
          <h2>Queues</h2>
          <table>
            <thead>
              <tr>
                <th>Step</th>
                <th>Pending</th>
                <th>In Progress</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Region processing</th>
                <td>{stats.tasks.preparePending.toLocaleString()}</td>
                <td>{stats.tasks.prepareRunning.toLocaleString()}</td>
              </tr>
              <tr>
                <th>Rendering</th>
                <td>{stats.tasks.pending.toLocaleString()}</td>
                <td>{stats.tasks.running.toLocaleString()}</td>
              </tr>
              <tr>
                <th>Merging dumps</th>
                <td>{stats.tasks.mergePending.toLocaleString()}</td>
                <td>{stats.tasks.mergeRunning.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          <h2>Today</h2>
          <table>
            <tbody>
              <tr>
                <th>Jobs created</th>
                <td>{stats.today.jobsCreated.toLocaleString()}</td>
              </tr>
              <tr>
                <th>Jobs finished</th>
                <td>{stats.today.jobsFinished.toLocaleString()}</td>
              </tr>
              <tr>
                <th>Dumps merged</th>
                <td>{stats.today.dumpsMerged.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          <h2>Render nodes ({stats.renderNodes.length.toLocaleString()})</h2>
          <table>
            <thead>
              <th>Name</th>
              <th>Render threads</th>
              <th>Status</th>
            </thead>
            <tbody>
              {stats.renderNodes.map((node, i) => (
                <tr key={i}>
                  <td>{node.name}</td>
                  <td>{node.threads}</td>
                  <td>{node.status}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th>Total render threads</th>
                <td colSpan={2}>
                  {stats.renderNodes.reduce(
                    (sum, node) => sum + node.threads,
                    0
                  )}{" "}
                  (
                  {stats.renderNodes.reduce(
                    (sum, node) =>
                      node.status === "working" ? sum + node.threads : sum,
                    0
                  )}{" "}
                  working)
                </td>
              </tr>
            </tfoot>
          </table>
          <h2>
            Region processing nodes (
            {stats.prepareNodes.length.toLocaleString()})
          </h2>
          <table>
            <thead>
              <th>Name</th>
              <th>Status</th>
            </thead>
            <tbody>
              {stats.prepareNodes.map((node, i) => (
                <tr key={i}>
                  <td>{node.name}</td>
                  <td>{node.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <hr />
      <h2>How ChunkyCloud works</h2>
      <p>
        A scene that is to be rendered is called a <em>render job</em>. Render
        jobs get split up into one or many <em>tasks</em> that are rendered on
        the <em>render nodes</em>. The number of tasks a job is split into
        depends on its resolution and samples per pixel.
      </p>
      <p>
        Instead of starting with an octree and an emittergrid, scenes can also
        be created from region files. ChunkyMap can use this so it doesn't need
        to construct the octree on a Minecraft server. New jobs that are created
        from region files are put in the <em>region processing queue</em> first
        and added to the <em>render queue</em> after a{" "}
        <em>region processing node</em> has created the scene files.
      </p>
      <p>
        When a <em>task</em> is done, it needs to be merged with the part of the{" "}
        <em>job</em> that is already done. This is done by a single{" "}
        <em>dump processor</em> that also has a queue of dumps waiting to be
        merged.
      </p>
      <p>
        If a job gets cancelled, it is not removed from the queues. The nodes
        will check if it is cancelled and just skip them in that case.
      </p>
    </div>
  );
}
