import { useEffect } from 'react';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { isAdmin, navigate, paths } from '../navigation.js';

export default function PublicGuard({ children }) {
  const { user } = useAuth();
  const admin = isAdmin(user);
  useEffect(() => {
    if (admin) navigate(paths.admin, { replace: true });
  }, [admin]);
  return admin ? null : children;
}
