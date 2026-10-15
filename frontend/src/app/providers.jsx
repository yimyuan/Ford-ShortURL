import { AuthProvider } from '../features/auth/AuthContext.jsx';
import PasswordChangeGate from '../features/auth/components/PasswordChangeGate.jsx';
export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <PasswordChangeGate>{children}</PasswordChangeGate>
    </AuthProvider>
  );
}
