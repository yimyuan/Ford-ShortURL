import { useState } from 'react';
import useAdminData from './useAdminData.js';
import { adminSections } from '../navigation.js';
import { getAdminMetrics } from '../metrics.js';
export default function useAdminWorkspace() {
  const [section, setSection] = useState('overview');
  const [query, setQueryValue] = useState('');
  const [filter, setFilterValue] = useState('all');
  const [page, setPage] = useState(1);
  const data = useAdminData({ section, page, query, filter, onPageChange: setPage });
  function navigate(next) {
    setSection(next);
    setQueryValue('');
    setFilterValue('all');
    setPage(1);
  }
  function setQuery(value) {
    setQueryValue(value);
    setPage(1);
  }
  function setFilter(value) {
    setFilterValue(value);
    setPage(1);
  }
  return {
    ...data,
    section,
    current: adminSections.find((item) => item.id === section),
    query,
    setQuery,
    filter,
    setFilter,
    page,
    setPage,
    navigate,
    metrics: getAdminMetrics(data.summary),
    unauthorized:
      section === 'overview'
        ? data.summary.status === 'unauthorized'
        : section === 'users' && data.state.status === 'unauthorized',
    ready:
      ['history', 'links'].includes(section) ||
      (section === 'overview' ? data.summary.status === 'ready' : data.state.status === 'ready'),
  };
}
