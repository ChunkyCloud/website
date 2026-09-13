import React from "react";
import AccordionSection from "../../components/Join/AccordionSection";
import Link from "next/link";

const renderNodeReadme = "https://github.com/ChunkyCloud/render-node#readme";
const serverReadme = "https://github.com/ChunkyCloud/server#readme";

const DocsPage = () => {
  return (
    <div
      className="hero min-h-screen relative"
      style={{
        backgroundImage: "url(/images/boscawinks-Give_that_back.png)",
      }}
    >
      <fieldset className="fieldset bg-base-200/95 border-base-300 rounded-box border p-8 shadow mb-8">
        <legend className="fieldset-legend text-3xl font-bold">
          Start rendering with ChunkyCloud
        </legend>
        <div className="mt-4 p-4 rounded-lg border-2">
          <div className="max-w-3xl mb-8 mx-auto px-4 py-10 prose prose-neutral dark:prose-invert">
            <h2>Join the render farm</h2>
            <p>
              Contribute computing power from your PC or server to help others
              render their scenes. Your machine becomes a <em>render node</em>,
              rendering tasks with Chunky as part of the farm.
            </p>
            <p>
              This guide covers the basics. For the latest requirements,
              commands, and configuration options, check the{" "}
              <a
                href={renderNodeReadme}
                target="_blank"
                rel="noopener noreferrer"
              >
                render node README
              </a>
              . If anything differs, follow the README.
            </p>

            <h3>1. Create a node token</h3>
            <p>
              Sign in and create a render node token in your{" "}
              <Link href="/account">account</Link>. This token is the API key
              your node uses to connect to ChunkyCloud.
            </p>
            <p>
              <strong>
                Use a separate token for each render node process.
              </strong>{" "}
              Only one process may run per API key. Create another token if you
              want to run an additional node.
            </p>

            <h3>2. Download the render node</h3>
            <p>
              Install <strong>Java 17 or newer</strong>, then download the JAR
              file from the{" "}
              <a
                href="https://github.com/ChunkyCloud/render-node/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
              >
                latest release
              </a>
              . Keep your node up to date to stay compatible with the server. If
              you prefer Docker, see the command below.
            </p>

            <h3>3. Start the node</h3>
            <p>
              Open a terminal in the folder containing the downloaded JAR.
              Replace <code>DOWNLOADED_FILE.jar</code> with its filename and{" "}
              <code>YOUR_NODE_TOKEN</code> with your token:
            </p>
            <pre className="bg-base-200 p-4 rounded-md overflow-x-auto text-sm">
              <code>
                {"java -jar DOWNLOADED_FILE.jar --api-key YOUR_NODE_TOKEN"}
              </code>
            </pre>
            <p>
              The node connects to <code>https://api.chunkycloud.net</code> by
              default. It polls for tasks, downloads the required scene data and
              resource packs, renders with Chunky, and uploads the results.
            </p>
            <p>
              To adjust resource usage, add <code>--thread-count 4</code> to use
              four render threads or <code>--cpu-load 50</code> to set the
              maximum Chunky CPU load to 50%. The defaults are two threads and
              100% CPU load. Use <code>--api URL</code> to connect to another
              ChunkyCloud server with a token issued by that server.
            </p>
            <p>
              You can also supply the token through the <code>API_KEY</code>{" "}
              environment variable or <code>--api-key-file</code>. For the full
              option list and cache settings, see the{" "}
              <a
                href={`${renderNodeReadme.replace("#readme", "")}#configuration`}
                target="_blank"
                rel="noopener noreferrer"
              >
                configuration reference
              </a>
              .
            </p>

            <h2>Frequently asked questions</h2>
            <AccordionSection
              Title="Can I use Docker?"
              Content={
                <>
                  <p>
                    Yes. Replace <code>YOUR_NODE_TOKEN</code> with your token
                    and run:
                  </p>
                  <pre className="bg-base-200 p-4 rounded-md overflow-x-auto text-sm">
                    <code>
                      {
                        "docker run --rm -e API_KEY=YOUR_NODE_TOKEN -v chunkycloud-render-node-data:/opt/cc-rendernode/data ghcr.io/chunkycloud/render-node:latest"
                      }
                    </code>
                  </pre>
                  <p>
                    The volume preserves downloaded resource packs and cached
                    scene data across container restarts. For Docker secrets and
                    further details, see the{" "}
                    <a
                      href="https://github.com/ChunkyCloud/render-node#docker"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Docker instructions in the README
                    </a>
                    .
                  </p>
                </>
              }
            />
            <AccordionSection
              Title="My render node throws errors but did work just fine until recently. Why?"
              Content={
                <p>
                  ChunkyCloud requires all render nodes to use the latest
                  version. Download the{" "}
                  <a
                    href="https://github.com/ChunkyCloud/render-node/releases/latest"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    latest release
                  </a>{" "}
                  or update to the latest Docker image. If that does not solve
                  the issue, please reach out to us on Discord.
                </p>
              }
            />
            <AccordionSection
              Title="Where does the node store its files?"
              Content="By default, the node creates cc_jobs for temporary task data, cc_texturepacks for resource packs, cc_cache for downloaded resources, and cc_chunky for Chunky settings in its working directory. The Docker command above stores these directories in the mounted volume."
            />
            <AccordionSection
              Title="Can I run my own ChunkyCloud?"
              Content={
                <p>
                  You will soon be able to host your own ChunkyCloud. This can
                  be used to e.g. setup your own private render farm.
                </p>
              }
            />
          </div>
        </div>
      </fieldset>
    </div>
  );
};

export default DocsPage;
