"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Formats a date in the viewer's own locale and timezone. The server can't know
 * either, so it renders a neutral placeholder and the browser fills in the text.
 */
export function LocalTime({ iso, dateOnly = false }: { iso: string; dateOnly?: boolean }) {
  const text = useSyncExternalStore(
    noopSubscribe,
    () => (dateOnly ? new Date(iso).toLocaleDateString() : new Date(iso).toLocaleString()),
    () => iso.slice(0, 10),
  );
  return <time dateTime={iso}>{text}</time>;
}
