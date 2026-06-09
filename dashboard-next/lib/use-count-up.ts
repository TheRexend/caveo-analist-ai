"use client";
import { useEffect, useRef, useState } from "react";

// Animação count-up com ease-out cúbico (port do hook de utils.jsx).
export function useCountUp(value: number, opts: { duration?: number } = {}): number {
  const { duration = 700 } = opts;
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const displayRef = useRef(value);
  displayRef.current = display;

  useEffect(() => {
    fromRef.current = displayRef.current;
    startRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const target = value;

    const tick = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const elapsed = t - startRef.current;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = fromRef.current + (target - fromRef.current) * eased;
      setDisplay(next);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else setDisplay(target);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return display;
}
