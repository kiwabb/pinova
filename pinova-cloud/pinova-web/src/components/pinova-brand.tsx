import styles from "./pinova-brand.module.css";

interface PinovaBrandProps {
  tone?: "dark" | "light";
}

const beadPositions = [
  [6, 5],
  [6, 11],
  [6, 17],
  [6, 23],
  [6, 29],
  [12, 5],
  [18, 5],
  [23, 8.5],
  [18, 12],
  [12, 12],
] as const;

export function PinovaBrand({ tone = "dark" }: PinovaBrandProps) {
  return (
    <span
      className={`${styles.brand} ${tone === "light" ? styles.light : ""}`}
    >
      <svg
        className={styles.mark}
        viewBox="0 0 32 34"
        focusable="false"
        aria-hidden="true"
      >
        {beadPositions.map(([cx, cy]) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r="2.35"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
          />
        ))}
        <circle
          className={styles.nova}
          cx="27.2"
          cy="3.2"
          r="2.25"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
        />
      </svg>
      <span className={styles.type}>
        <strong>PINOVA</strong>
        <small>COLOR MATERIAL STUDIO</small>
      </span>
    </span>
  );
}
