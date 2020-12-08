import Head from "next/head";
import styles from "../styles/Home.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>ChunkyCloud</title>
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Welcome to ChunkyCloud!</h1>

        <p className={styles.description}>
          A distributed rendering service for{" "}
          <a href="https://chunky.lemaik.de/">Chunky</a>.
        </p>

        <div className={styles.grid}>
          <a href="/new" className={styles.card}>
            <h3>Create a new job &rarr;</h3>
            <p>Upload your scene and render it on a distributed server farm.</p>
          </a>

          <a href="/stats" className={styles.card}>
            <h3>Statistics &rarr;</h3>
            <p>See how ChunkyCloud is doing and some numbers</p>
          </a>

          <a
            href="/stats"
            className={styles.card}
            style={{ opacity: 0.5, pointerEvents: "none" }}
          >
            <h3>Render with us &rarr;</h3>
            <p>
              Get the render node software and add your PC to the server farm.
            </p>
          </a>
        </div>
      </main>

      <footer className={styles.footer}>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          &copy; ChunkyCloud and its contributors
        </a>
      </footer>
    </div>
  );
}
