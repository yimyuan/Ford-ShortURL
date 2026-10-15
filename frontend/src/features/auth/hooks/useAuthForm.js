import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { authErrorMessage } from '../auth-errors.js';
import { completeLogin } from '../../../app/navigation.js';
export default function useAuthForm({ dialog, mode, setMode, setAuthNotice, onAuthenticated }) {
  const { authenticate } = useAuth();
  const [busy, setBusy] = useState(false);
  const isLogin = mode === 'login';
  function changeMode(next) {
    setMode(next);
    setAuthNotice('');
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setAuthNotice('');
    try {
      const user = await authenticate(mode, {
        email: form.get('email').trim(),
        password: form.get('password'),
      });
      await dialog.current?.close();
      if (user.mustChangePassword) return;
      await completeLogin(user, onAuthenticated);
    } catch (error) {
      setAuthNotice(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return { busy, isLogin, changeMode, submit };
}
