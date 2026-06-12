"use client";
import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const KEY = "caveo-theme";

/** Tema claro/escuro persistido em localStorage; aplica a classe `dark` no <html>. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>("light");

  // hidrata a partir do armazenamento / preferência do SO
  useEffect(() => {
    const stored = (typeof localStorage !== "undefined"
      ? (localStorage.getItem(KEY) as Theme | null)
      : null);
    const initial =
      stored ??
      (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
  }, []);

  // aplica e persiste
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* ignora storage indisponível */
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return [theme, toggle];
}
