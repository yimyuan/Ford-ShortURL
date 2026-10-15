import AppProviders from './app/providers.jsx';
import AppRoutes from './app/routes.jsx';
export default function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}
