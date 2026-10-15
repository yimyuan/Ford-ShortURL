import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import useSignOut from '../../auth/hooks/useSignOut.js';
import useCreateLink from '../../links/hooks/useCreateLink.js';
import { validateOriginalUrl, validateCustomCode } from '../../links/validation.js';
import { navigate, paths } from '../../../app/navigation.js';
export default function useHome() {
  const { user, status: authStatus } = useAuth();
  const [url, setUrl] = useState(() => {
    try {
      return sessionStorage.getItem('shorturl.pendingUrl') || '';
    } catch {
      return '';
    }
  });
  const [customCode, setCustomCode] = useState(() => {
    try {
      return sessionStorage.getItem('shorturl.pendingCode') || '';
    } catch {
      return '';
    }
  });
  const [mode, setMode] = useState('login');
  const [authNotice, setAuthNotice] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [pending, setPending] = useState(false);
  const [accountNotice, setAccountNotice] = useState('');
  const [namingOpen, setNamingOpen] = useState(false);
  const [nameError, setNameError] = useState('');
  const nameDialog = useRef(null);
  const dialog = useRef(null);
  const urlInput = useRef(null);
  const creation = useCreateLink({
    onCreated: async () => {
      await nameDialog.current?.close();
      setUrl('');
      setCustomCode('');
      setPending(false);
      try {
        sessionStorage.removeItem('shorturl.pendingUrl');
        sessionStorage.removeItem('shorturl.pendingCode');
      } catch {}
      navigate(paths.myLinks);
    },
    onUnauthenticated: async () => {
      await nameDialog.current?.close();
      openAuth('login', true);
    },
  });
  const {
    busy: loggingOut,
    error: logoutNotice,
    signOut,
  } = useSignOut(() => {
    setMobileMenu(false);
    setPending(false);
    creation.setResult(null);
  });
  useEffect(() => {
    try {
      if (url) sessionStorage.setItem('shorturl.pendingUrl', url);
      else sessionStorage.removeItem('shorturl.pendingUrl');
      if (customCode) sessionStorage.setItem('shorturl.pendingCode', customCode);
      else sessionStorage.removeItem('shorturl.pendingCode');
    } catch {}
  }, [url, customCode]);
  function openAuth(nextMode, forLink = false) {
    setMode(nextMode);
    setPending(forLink);
    setAuthNotice('');
    setMobileMenu(false);
    dialog.current.showModal();
  }
  async function afterLogin() {
    if (pending) {
      setPending(false);
      setAccountNotice('');
      openNameDialog();
    }
  }
  function shorten(event) {
    event.preventDefault();
    try {
      const normalized = validateOriginalUrl(url);
      creation.setError('');
      setUrl(normalized);
      setAccountNotice('');
      if (authStatus === 'loading') setAccountNotice('กำลังตรวจสอบบัญชี กรุณารอสักครู่');
      else if (user) openNameDialog();
      else openAuth('login', true);
    } catch (failure) {
      creation.setError(failure.message);
      urlInput.current?.focus();
    }
  }
  function openNameDialog() {
    setNameError('');
    creation.setError('');
    setNamingOpen(true);
    nameDialog.current?.showModal();
  }
  async function confirmCreate(event) {
    event.preventDefault();
    if (creation.creating) return;
    try {
      const normalized = validateOriginalUrl(url);
      const code = validateCustomCode(customCode);
      setNameError('');
      setCustomCode(code);
      await creation.createUrl(normalized, code);
    } catch (failure) {
      setNameError(failure.message);
    }
  }
  function closeNameDialog() {
    setNamingOpen(false);
    setNameError('');
    creation.setError('');
  }
  return {
    ...creation,
    user,
    authStatus,
    url,
    setUrl,
    customCode,
    setCustomCode,
    namingOpen,
    nameDialog,
    nameError,
    setNameError,
    confirmCreate,
    closeNameDialog,
    mode,
    setMode,
    authNotice,
    setAuthNotice,
    mobileMenu,
    setMobileMenu,
    pending,
    accountNotice: logoutNotice || accountNotice,
    dialog,
    urlInput,
    openAuth,
    afterLogin,
    shorten,
    signOut,
    loggingOut,
  };
}
