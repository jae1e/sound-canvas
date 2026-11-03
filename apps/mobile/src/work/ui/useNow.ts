import { useEffect, useState } from 'react';

/** Current time, re-rendered every `everyMs` (default 1 s) so countdowns stay live. */
export function useNow(everyMs = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}
