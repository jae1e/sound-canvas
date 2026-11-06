import { useEffect, useState } from 'react';
import { useDataVersion } from '../state/dataVersion';

/** Re-runs an async database query whenever the data version changes. */
export function useDbQuery<T>(fn: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const version = useDataVersion((s) => s.version);
  const [value, setValue] = useState<T>();
  useEffect(() => {
    let live = true;
    fn().then(
      (v) => live && setValue(v),
      () => undefined,
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps]);
  return value;
}
