import type { ReactNode } from "react";
import styles from "./overlay.module.css";

interface OverlayShellProps {
  children: ReactNode;
  closeLabel: string;
  onClose: () => void;
}

export function OverlayShell({
  children,
  closeLabel,
  onClose,
}: OverlayShellProps) {
  return (
    <div className={styles.overlay}>
      <button
        type="button"
        className={styles.backdrop}
        onClick={onClose}
        aria-label={closeLabel}
      />
      {children}
    </div>
  );
}
