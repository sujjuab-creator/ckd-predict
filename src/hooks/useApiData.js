import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads data from one or more existing apiService calls.
 * `loader` must return a promise that resolves to the value to store.
 * Errors are surfaced as a readable message – no fallback/mock data is used.
 */
export default function useApiData(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const value = await loaderRef.current();
      setData(value);
    } catch (err) {
      setError(err?.message || 'Unable to load data from the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload, setData };
}

/** Turns an apiService response into its data or throws the backend error. */
export function unwrap(res, fallbackMessage = 'Request failed.') {
  if (res && res.ok && res.data && res.data.success !== false) return res.data;
  const msg = res?.data?.error || fallbackMessage;
  throw new Error(msg);
}
