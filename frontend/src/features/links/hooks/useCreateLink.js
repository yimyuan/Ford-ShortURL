import { useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { createLink } from '../api.js';
import { linkErrorMessage } from '../link-errors.js';
export default function useCreateLink({ onCreated, onUnauthenticated }) {
  const { clearSession } = useAuth();
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const inFlight = useRef(false);
  async function createUrl(value, customCode = '') {
    if (inFlight.current) return;
    inFlight.current = true;
    setCreating(true);
    setError('');
    setResult(null);
    try {
      const link = await createLink(value.trim(), customCode);
      setResult(link);
      setRevision((previous) => previous + 1);
      await onCreated?.(link);
    } catch (failure) {
      setError(linkErrorMessage(failure));
      if (failure.status === 401) {
        clearSession();
        await onUnauthenticated?.();
      }
    } finally {
      inFlight.current = false;
      setCreating(false);
    }
  }
  return { creating, result, setResult, error, setError, revision, createUrl };
}
