import { Bell, Menu } from 'lucide-react';
import { Link } from 'react-router';

import { useUserQuery } from '@/entities/user/api/queries';
import { useMyProfileQuery } from '@/features/mypage';
import logo from '@/shared/assets/logo/Megabox_Logo_Indigo.png';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';

const BASE_URL = (import.meta.env.VITE_BASE_URL as string) || 'http://localhost:8000';
import { Button } from '@/shared/components/ui/button';
import { ROUTES } from '@/shared/constants/routes';

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export const MobileHeader = ({ onMenuClick }: MobileHeaderProps) => {
  const { data: user } = useUserQuery();
  const { data: profile } = useMyProfileQuery();
  const avatarFallback = user?.name ? user.name.charAt(0) : '?';
  const avatarImageUrl = profile?.profile_image
    ? `${BASE_URL}/uploads/profiles/${profile.profile_image}`
    : undefined;

  return (
    <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-white border-b border-gray-100 shadow-sm shrink-0">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-xl hover:bg-gray-100"
          onClick={onMenuClick}
          aria-label="메뉴"
        >
          <Menu className="size-5 text-gray-600" />
        </Button>
        <Link to={ROUTES.ROOT}>
          <img src={logo} alt="MegaHub" className="h-6" />
        </Link>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="size-9 rounded-xl hover:bg-gray-100">
          <Bell className="size-5 text-gray-600" />
        </Button>
        <Avatar className="size-8 ml-1">
          {avatarImageUrl && (
            <AvatarImage src={avatarImageUrl} alt={user?.name} className="object-cover" />
          )}
          <AvatarFallback className="bg-mega-secondary/15 text-mega-secondary text-xs font-semibold">
            {avatarFallback}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
};
