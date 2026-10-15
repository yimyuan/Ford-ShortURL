import { useEffect, useState } from 'react';
import { listLinkOwners, listOwnerLinks } from '../api.js';
import { useAuth } from '../../auth/AuthContext.jsx';
const empty = { status: 'loading', items: [], total: 0, pageSize: 10 };
export default function useAdminLinks(revision, initialOwner = null) {
  const { clearSession } = useAuth();
  const ownerId = initialOwner?.id ?? null;
  const [selectedOwner, setSelectedOwner] = useState(initialOwner);
  const [page, setPage] = useState(1);
  const [query, setQueryValue] = useState('');
  const [filter, setFilterValue] = useState('all');
  const [refresh, setRefresh] = useState(0);
  const [response, setResponse] = useState({ ...empty, key: '' });
  const key = JSON.stringify([ownerId, page, query, filter, revision, refresh]);
  useEffect(() => {
    const controller = new AbortController();
    setResponse({ ...empty, key });
    const filters = { page, query, filter };
    const request = ownerId
      ? listOwnerLinks(ownerId, filters, { signal: controller.signal })
      : listLinkOwners(filters, { signal: controller.signal });
    request
      .then((data) => {
        if (controller.signal.aborted) return;
        const last = Math.max(1, Math.ceil(data.total / data.pageSize));
        if (page > last) {
          setPage(last);
          return;
        }
        if (data.owner) setSelectedOwner(data.owner);
        setResponse({ ...data, status: 'ready', key });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setResponse({ ...empty, status: 'error', error: error.message, key });
        if (error.status === 401) clearSession();
      });
    return () => controller.abort();
  }, [key, ownerId, page, query, filter, revision, refresh, clearSession]);
  return {
    ownerId,
    owner: ownerId && selectedOwner?.id === ownerId ? selectedOwner : null,
    page,
    setPage,
    query,
    filter,
    state: response.key === key ? response : empty,
    setQuery: (value) => {
      setQueryValue(value);
      setPage(1);
    },
    setFilter: (value) => {
      setFilterValue(value);
      setPage(1);
    },
    reload: () => setRefresh((value) => value + 1),
  };
}
