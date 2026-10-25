import { Link } from 'react-router';

import { useUserQuery } from '@/entities/user/api/queries';
import { useMyProfileQuery } from '@/features/mypage';
import { NotificationBell } from '@/features/notification';
import logo from '@/shared/assets/logo/Megabox_Logo_Indigo.png';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { ROUTES } from '@/shared/constants/routes';

const BASE_URL = (import.meta.env.VITE_BASE_URL as string) || 'http://localhost:8000';

/** 모바일 상단 헤더 (lg 미만). 메뉴는 하단 탭바의 '전체'에서 연다. */
export const MobileHeader = () => {
  const { data: user } = useUserQuery();
  const { data: profile } = useMyProfileQuery();
  const avatarFallback = user?.name ? user.name.charAt(0) : '?';
  const avatarImageUrl = profile?.profile_image
    ? `${BASE_URL}/uploads/profiles/${profile.profile_image}`
    : undefined;

  return (
    <header className="lg:hidden sticky top-0 z-30 shrink-0 border-b border-gray-200/70 bg-white/90 backdrop-blur-md pt-safe">
      <div className="flex h-14 items-center justify-between px-4">
        <Link to={ROUTES.ROOT} className="flex items-center rounded-md py-2" aria-label="홈으로">
          <img src={logo} alt="MEGABOX" className="h-[22px] w-auto" />
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Link
            to={ROUTES.MYPAGE}
            aria-label="마이페이지"
            className="ml-0.5 flex size-10 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <Avatar className="size-8">
              {avatarImageUrl && (
                <AvatarImage src={avatarImageUrl} alt={user?.name} className="object-cover" />
              )}
              <AvatarFallback className="bg-mega-soft text-xs font-bold text-mega-secondary">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
};
