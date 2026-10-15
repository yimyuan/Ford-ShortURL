import { useEffect, useRef, useState } from 'react';
import { getLinkQr } from '../api.js';
import { linkErrorMessage } from '../link-errors.js';
export default function useQrCode(id, fetchQr = getLinkQr) {
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image);
    },
    [image],
  );
  async function load() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    setImage('');
    try {
      const blob = await fetchQr(id, { signal: controller.signal });
      if (!controller.signal.aborted) setImage(URL.createObjectURL(blob));
    } catch (failure) {
      if (!controller.signal.aborted) setError(linkErrorMessage(failure));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  function clear() {
    request.current?.abort();
    setImage('');
    setLoading(false);
    setError('');
  }
  return { image, error, loading, load, clear };
}
