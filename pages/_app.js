import Head from "next/head";
import "../styles/globals.css";

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta
          name="description"
          content="Distributed rendering of Minecraft scenes with Chunky"
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
