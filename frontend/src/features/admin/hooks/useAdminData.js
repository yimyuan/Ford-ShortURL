import { useCallback, useEffect, useState } from 'react';
import { getAdminSummary, listAdminUsers } from '../api.js';
import { useAuth } from '../../auth/AuthContext.jsx';
const empty = { status: 'loading', items: [], total: null, page: 1, pageSize: 10 };
export default function useAdminData({ section, page, query, filter, onPageChange }) {
  const { clearSession } = useAuth();
  const [revision, setRevision] = useState(0);
  const [records, setRecords] = useState({ ...empty, key: '' });
  const [summary, setSummary] = useState({ status: 'loading', data: null });
  const key = JSON.stringify([section, page, query, filter, revision]);
  useEffect(() => {
    if (section !== 'users') return;
    const controller = new AbortController();
    setRecords({ ...empty, key });
    listAdminUsers({ page, query, filter }, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        const last = Math.max(1, Math.ceil(data.total / data.pageSize));
        if (page > last) {
          onPageChange(last);
          return;
        }
        setRecords({ ...data, status: 'ready', key });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setRecords({
          ...empty,
          key,
          status: [401, 403].includes(error.status) ? 'unauthorized' : 'error',
          error: error.message,
        });
        if (error.status === 401) clearSession();
      });
    return () => controller.abort();
  }, [key, section, page, query, filter, clearSession, onPageChange]);
  useEffect(() => {
    if (section !== 'overview') return;
    const controller = new AbortController();
    setSummary({ status: 'loading', data: null });
    getAdminSummary({ signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setSummary({ status: 'ready', data });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setSummary({
          status: [401, 403].includes(error.status) ? 'unauthorized' : 'error',
          data: null,
        });
        if (error.status === 401) clearSession();
      });
    return () => controller.abort();
  }, [section, revision, clearSession]);
  const state = records.key === key ? records : empty;
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  const loading =
    section === 'overview'
      ? summary.status === 'loading'
      : section === 'users' && state.status === 'loading';
  return { state, summary, revision, reload, loading };
}
