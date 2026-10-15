import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { listLinks } from '../api.js';
import { linkErrorMessage } from '../link-errors.js';
const defaults = { page: 1, query: '', clicks: 'all', period: 'all', sort: 'newest' };
const empty = { loading: true, items: [], total: 0, pageSize: 10, error: '' };
export default function useLinkHistory(revision) {
  const { clearSession } = useAuth();
  const [params, setParams] = useState({ ...defaults });
  const [query, setQuery] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [response, setResponse] = useState({ ...empty, key: '' });
  const key = JSON.stringify([params, revision, refresh]);
  const searching = query.trim() !== params.query;
  useEffect(() => {
    const timer = setTimeout(
      () =>
        setParams((prev) =>
          prev.query === query.trim() ? prev : { ...prev, page: 1, query: query.trim() },
        ),
      300,
    );
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    setParams((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
  }, [revision]);
  useEffect(() => {
    const controller = new AbortController();
    setResponse({ ...empty, key });
    listLinks(params.page, {
      query: params.query,
      clicks: params.clicks,
      period: params.period,
      sort: params.sort,
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        const last = Math.max(1, Math.ceil(data.total / data.pageSize));
        if (params.page > last) {
          setParams((prev) => ({ ...prev, page: last }));
          return;
        }
        setResponse({ ...data, loading: false, error: '', key });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error.status === 401) clearSession();
        setResponse({ ...empty, loading: false, error: linkErrorMessage(error), key });
      });
    return () => controller.abort();
  }, [key, clearSession]);
  return {
    state: response.key === key && !searching ? response : empty,
    page: params.page,
    setPage: (page) => setParams((prev) => ({ ...prev, page })),
    query,
    setQuery,
    clicks: params.clicks,
    period: params.period,
    sort: params.sort,
    setFilter: (name, value) => setParams((prev) => ({ ...prev, [name]: value, page: 1 })),
    hasFilters:
      !!query.trim() ||
      params.clicks !== 'all' ||
      params.period !== 'all' ||
      params.sort !== 'newest',
    clearFilters: () => {
      setQuery('');
      setParams({ ...defaults });
    },
    reload: () => setRefresh((value) => value + 1),
  };
}
