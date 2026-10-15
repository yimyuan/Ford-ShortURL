import UserLayout from '../../../app/layouts/UserLayout.jsx';
import MyLinks from '../components/MyLinks.jsx';
export default function MyLinksPage() {
  return (
    <UserLayout title="ลิงก์ของฉัน" activePage="my-links">
      <MyLinks />
    </UserLayout>
  );
}
