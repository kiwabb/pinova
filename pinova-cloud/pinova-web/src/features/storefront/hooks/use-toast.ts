import { useCallback, useEffect, useRef, useState } from "react";

export function useToast() {
  const [message, setMessage] = useState("");
  const timerRef = useRef<number | null>(null);

  const showToast = useCallback((nextMessage: string) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setMessage(nextMessage);
    timerRef.current = window.setTimeout(() => setMessage(""), 2600);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  return { message, showToast };
}
