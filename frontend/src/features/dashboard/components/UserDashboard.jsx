import useUserDashboard from '../hooks/useUserDashboard.js';
import DashboardOverview from './DashboardOverview.jsx';
export default function UserDashboard() {
  return <DashboardOverview model={useUserDashboard()} />;
}
