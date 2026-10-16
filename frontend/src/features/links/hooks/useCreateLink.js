import { useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { createLink } from '../api.js';
import { linkErrorMessage } from '../link-errors.js';
import { createCreationIntent } from '../creation-intent.js';
export default function useCreateLink({ onCreated, onUnauthenticated }) {
  const { clearSession, user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const inFlight = useRef(false);
  const intent = useRef(null);
  if (!intent.current) {
    let storage;
    try {
      storage = globalThis.sessionStorage;
    } catch {
      /* unavailable */
    }
    intent.current = createCreationIntent(storage);
  }
  async function createUrl(value, customCode = '') {
    if (inFlight.current) return;
    inFlight.current = true;
    setCreating(true);
    setError('');
    setResult(null);
    try {
      const key = intent.current.key(user.id, value.trim(), customCode);
      const link = await createLink(value.trim(), customCode, key);
      intent.current.clear();
      setResult(link);
      setRevision((previous) => previous + 1);
      await onCreated?.(link);
    } catch (failure) {
      if (['REQUEST_LINK_DELETED', 'IDEMPOTENCY_CONFLICT'].includes(failure.code))
        intent.current.clear();
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
