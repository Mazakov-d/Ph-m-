import { useEffect, useState } from "react";

/** `value`, once it has stopped changing for `delayMs` (e.g. not to search at each keystroke). */
export function useDebouncedValue<Value>(value: Value, delayMs: number): Value {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    // Synchronizes with a timer (CLAUDE.md §6.2: a legitimate use of useEffect).
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
