import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { navigate, paths } from '../../../app/navigation.js';
export default function useSignOut(onSuccess) {
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await logout();
      if (onSuccess) onSuccess();
      else navigate(paths.home);
    } catch {
      setError('ยังออกจากระบบไม่ได้ กรุณาลองอีกครั้ง');
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, signOut };
}
