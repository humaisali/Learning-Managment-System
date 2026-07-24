import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";

/**
 * Generic data-fetching hook.
 * Usage: const { data, loading, error, refetch } = useApi("/catalog/boards");
 */
export function useApi(url, options = {}) {
  const { immediate = true, params = null } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const fetch = useCallback(
    async (overrideParams) => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(url, {
          params: overrideParams || params,
        });
        setData(response.data.data);
        return response.data.data;
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || "Something went wrong";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [url, params]
  );

  useEffect(() => {
    if (immediate && url) {
      fetch();
    }
  }, [url, immediate]);

  return { data, loading, error, refetch: fetch };
}

/**
 * Hook for mutations (POST, PUT, DELETE).
 * Usage:
 *   const { mutate, loading } = useMutation();
 *   await mutate(() => api.post("/auth/register", formData));
 */
export function useMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (apiCall) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiCall();
      return response.data;
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Something went wrong";
      const errors = err.response?.data?.errors || null;
      setError({ message, errors });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error, clearError: () => setError(null) };
}
