import { useEffect, useState } from 'react';
import { listAdminHistory } from '../api.js';
const initial = { query: '', action: '', from: '', to: '', page: 1 };
export default function useAdminHistory(revision) {
  const [draft, setDraft] = useState(initial);
  const [filters, setFilters] = useState(initial);
  const [data, setData] = useState({ status: 'loading', items: [], total: 0 });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData({ status: 'loading', items: [], total: 0 });
    listAdminHistory(filters, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        const last = Math.max(1, Math.ceil(result.total / result.pageSize));
        if (filters.page > last) {
          setFilters((value) => ({ ...value, page: last }));
          return;
        }
        setData({ ...result, status: 'ready' });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setData({ status: 'error', items: [], total: 0, error: error.message });
      });
    return () => controller.abort();
  }, [filters, revision, retry]);
  const field = (name, value) => setDraft((current) => ({ ...current, [name]: value }));
  const search = (event) => {
    event.preventDefault();
    setFilters({ ...draft, page: 1 });
  };
  const reset = () => {
    setDraft(initial);
    setFilters({ ...initial });
  };
  return {
    draft,
    filters,
    data,
    field,
    search,
    reset,
    retry: () => setRetry((value) => value + 1),
    setPage: (page) => setFilters((value) => ({ ...value, page })),
  };
}
