import UserLayout from '../../../app/layouts/UserLayout.jsx';
import UserDashboard from '../components/UserDashboard.jsx';
export default function UserDashboardPage() {
  return (
    <UserLayout title="ภาพรวมของฉัน" activePage="dashboard">
      <UserDashboard />
    </UserLayout>
  );
}
