import Head from "next/head";
import Header from "../components/Header";
import styles from "../styles/Content.module.css";

export default function Join() {
  return (
    <div>
      <Head>
        <title>Join the render farm – ChunkyCloud</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header title="Join the render farm" />
      <div className={styles.content}>
        <h2>Join the render farm</h2>
        <p>
          ChunkyCloud is made possible by all the people that contribute their
          computing power for others to render their scenes on.
          <br />
          Under the hood, scenes get split up and rendered on multiple nodes in
          parallel and the resulting images are merged back together.
        </p>
        <p>
          This guide explains how to add a PC or server (called a{" "}
          <em>render node</em>) to ChunkyCloud.
        </p>
        <h3>1. Get an API key</h3>
        <p>
          In order to add your node, you need an <em>API key</em>. Currently,
          this process isn't automated, so ping leMaik on the Chunky Discord.
          <br />
          The API key is used to identify users and give us a way to exclude
          malicious users. In the future, it will also be used to give you
          credits for rendering that you can then use to create render jobs.
          <br />
          Until this is ready, you can render as much as you want (but please
          keep it fair).
        </p>
        <h3>2. Download the render node software</h3>
        <p>
          Once you have an API key, you are ready to add your render node.
          Download the latest version from the{" "}
          <a
            href="https://github.com/ChunkyCloud/render-node/releases/latest"
            target="_blank"
          >
            releases page
          </a>
          .<br />
          Make sure that you <strong>always use the latest version</strong>. If
          there are breaking changes, your node may not be able to connect
          anymore without being updated.
        </p>
        <h3>3. Launch the node</h3>
        <p>
          Open a command prompt in the directory that contains the{" "}
          <code>.jar</code> file and run the following command to start the node
          (change the filename accordingly).
        </p>
        <pre>
          java -Xmx8g -jar cc-rendernode-1.0.0.jar --api-key YOUR-API-KEY-HERE
        </pre>
        <p>
          You should adjust <code>-Xmx</code> to the amount of memory that you
          want to dedicate to the render node (in the example, it's 8 GB).
          Running out of memory might make your system unstable so make sure
          that you don't give it too much memory.
        </p>
        <p>
          There are a few more options:
          <br />
          <code>-t</code> sets the number of render threads, e.g. launching the
          render node with <code>-t 2</code> will only use two threads. If
          omitted, it will use as many threads as you have (logical) CPU cores.
          <br />
          <code>--name</code> can be used to give your node a name that will be
          shown on the stats page. You may want to set it to something that
          helps you or others to identify your node, e.g.{" "}
          <code>--name "leMaik's PC"</code>
        </p>
        <p>
          This will create a few working directories, download Minecraft (for
          default textures), and connect to ChunkyCloud.
          <br />
          At this point, your node is ready and will be assigned tasks as soon
          as they arrive. Look back at the command prompt, it might already be
          rendering something!
        </p>
        <p></p>
        <h2>Frequently Asked Questions</h2>
        <details>
          <summary>How do I stop the render node?</summary>
          You can stop your render node at any time by closing the command
          prompt. If you were rendering something, it will be put back into the
          queue and get rendered by another node.
        </details>
        <details>
          <summary>
            What exactly does my PC do when it's in the render farm?
          </summary>
          Your PC connects to ChunkyCloud's RabbitMQ queue to get render tasks.
          When it gets a task, it downloads all required files from the
          ChunkyCloud server, renders the scene using Chunky and then uploads
          the render dump into another RabbitMQ queue.
        </details>
        <details>
          <summary>Can I use Docker?</summary>
          Absolutely! There even is a Docker image you can use, so it's as easy
          as running
          <pre>
            docker run --name cc-node lemaik/chunkycloud-renderer:latest
            --api-key YOUR-API-KEY-HERE
          </pre>
          You can also specify the API key with an environment variable:{" "}
          <code>-e API_KEY=YOUR-API-KEY-HERE</code>
        </details>
      </div>
    </div>
  );
}
