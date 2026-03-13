import { useUserQuery } from '@/entities/user/api/queries';
import { hasAdminAccess } from '@/entities/user/model/role';
import { AdminDashboardPage } from '@/pages/admin-dashboard';
import { HomePage } from '@/pages/home';

/**
 * 관리자는 AdminDashboardPage, 일반 유저는 HomePage 렌더링
 * app 레이어에 위치하여 FSD 레이어 의존 규칙 준수 (app -> pages)
 */
const HomeRoute = () => {
  const { data: user } = useUserQuery();
  const isAdmin = !!user && hasAdminAccess(user.position);

  if (isAdmin) {
    return <AdminDashboardPage />;
  }

  return <HomePage />;
};

export default HomeRoute;
