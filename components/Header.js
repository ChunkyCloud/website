import styles from "./Header.module.css";

export default function Header({ title, breadcrumbs = [] }) {
  return (
    <div className={styles.header}>
      <a href="/">ChunkyCloud</a> /
      {breadcrumbs.map(({ link, title }) => (
        <>
          {link ? (
            <a key={title} href={link}>
              {title}
            </a>
          ) : (
            <span key={title}>{title}</span>
          )}{" "}
          /
        </>
      ))}{" "}
      <span>{title}</span>
    </div>
  );
}
