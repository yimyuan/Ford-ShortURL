import { useEffect, useRef, useState } from 'react';
import { getLink, getLinkQr, saveLinkQr } from '../api.js';
import { defaultQrStyle, qrStyleError, qrStyleWarning, sameQrStyle } from '../qr-style.js';
import { linkErrorMessage } from '../link-errors.js';
import useQrCode from './useQrCode.js';

export default function useQrDesigner(link) {
  const [draft, setDraft] = useState({ ...defaultQrStyle });
  const [saved, setSaved] = useState({ ...defaultQrStyle });
  const [version, setVersion] = useState('0');
  const [ready, setReady] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState('');
  const alive = useRef(true);
  const downloadRequest = useRef(null);
  const inFlight = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      downloadRequest.current?.abort();
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setReady(false);
    setError('');
    setNotice('');
    setConfirming(false);
    getLink(link.id, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        const style = { ...defaultQrStyle, ...data.qrStyle };
        setDraft(style);
        setSaved(style);
        setVersion(data.qrVersion || '0');
        setReady(true);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(linkErrorMessage(failure));
      });
    return () => controller.abort();
  }, [link.id, epoch]);
  const validation = qrStyleError(draft);
  const preview = useQrCode(link.id, (id, options) => getLinkQr(id, { ...options, style: draft }));
  useEffect(() => {
    preview.clear();
    if (!ready || validation) return;
    const timer = setTimeout(() => preview.load(), 250);
    return () => {
      clearTimeout(timer);
      preview.clear();
    };
  }, [ready, draft.dark, draft.light, draft.size, draft.shape, validation, epoch]);
  function change(next) {
    if (saving || confirming) return;
    setDraft((current) => ({ ...current, ...next }));
    setError('');
    setNotice('');
  }
  async function save() {
    if (inFlight.current || !confirming || !ready || validation) return;
    inFlight.current = true;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const data = await saveLinkQr(link.id, draft, version);
      if (!alive.current) return;
      if (!data?.qrStyle || !/^\d+$/.test(data.qrVersion) || qrStyleError(data.qrStyle))
        throw new Error('Invalid QR response');
      setSaved(data.qrStyle);
      setVersion(data.qrVersion);
      setNotice('บันทึกแบบ QR แล้ว');
    } catch (failure) {
      if (alive.current) setError(linkErrorMessage(failure));
    } finally {
      inFlight.current = false;
      if (alive.current) {
        setSaving(false);
        setConfirming(false);
      }
    }
  }
  async function download(format) {
    if (downloadRequest.current || validation || !ready) return;
    const controller = new AbortController();
    downloadRequest.current = controller;
    setDownloading(format);
    setError('');
    try {
      const blob = await getLinkQr(link.id, { style: draft, format, signal: controller.signal });
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `shorturl-${link.shortCode}-${draft.size}.${format}`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      if (!controller.signal.aborted) setError(linkErrorMessage(failure));
    } finally {
      downloadRequest.current = null;
      if (alive.current) setDownloading('');
    }
  }
  return {
    draft,
    ready,
    error,
    notice,
    validation,
    warning: qrStyleWarning(draft),
    preview,
    confirming,
    setConfirming,
    saving,
    downloading,
    change,
    save,
    download,
    dirty: !sameQrStyle(draft, saved),
    reload: () => setEpoch((value) => value + 1),
  };
}
