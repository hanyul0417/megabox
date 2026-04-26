import { AlertTriangle, ChevronDown, LogOut, User, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { NAV_ITEMS, type NavItemConfig } from '../model/nav.config';

import { useUserQuery } from '@/entities/user/api/queries';
import { useLogoutMutation } from '@/features/login/api/queries';
import { useUnreadCountQuery } from '@/features/message';
import { useMyProfileQuery } from '@/features/mypage';
import { NotificationBell } from '@/features/notification';
import logo from '@/shared/assets/logo/Logo_white.png';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { ROUTES } from '@/shared/constants/routes';
import { cn } from '@/shared/lib/utils';

const BASE_URL = (import.meta.env.VITE_BASE_URL as string) || 'http://localhost:8000';

const TopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: user } = useUserQuery();
  const { data: profile } = useMyProfileQuery();
  const { mutate: logout } = useLogoutMutation();
  const { data: messageUnread } = useUnreadCountQuery();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const avatarImageUrl = profile?.profile_image
    ? `${BASE_URL}/uploads/profiles/${profile.profile_image}`
    : undefined;

  const avatarFallback = user?.name ? user.name.charAt(0) : '?';

  const isActive = (item: NavItemConfig) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  const allVisibleItems = NAV_ITEMS.filter((item) => {
    if (!item.requiredRoles) return true;
    if (!user) return false;
    return item.requiredRoles.includes(user.position);
  });

  const filteredNavItems = allVisibleItems.filter((item) => item.key !== 'admin');
  const adminNavItem = allVisibleItems.find((item) => item.key === 'admin');

  const handleLogout = () => {
    logout();
    setLogoutDialogOpen(false);
  };

  return (
    <>
      {/* TopNav: 데스크탑(lg+)에서만 표시 */}
      <header className="hidden lg:flex fixed top-0 left-0 right-0 h-[60px] z-40 bg-nav-bg border-b border-white/10 shadow-[0_1px_0_0_rgba(255,255,255,0.05)] items-center px-6 gap-2">
        {/* 로고 영역 */}
        <Link
          to={ROUTES.ROOT}
          className="flex items-center gap-2 mr-4 shrink-0"
        >
          <img src={logo} alt="MegaBox" className="h-8" />
          <span className="text-white font-bold text-base">MegaBox</span>
        </Link>

        {/* Nav items */}
        <nav className="flex items-center gap-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            const unreadBadge =
              item.key === 'messages' ? (messageUnread?.count ?? 0) : undefined;

            return (
              <button
                key={item.key}
                onClick={() => void navigate(item.path)}
                className={cn(
                  'relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                  active
                    ? 'text-white bg-white/15'
                    : 'text-white/60 hover:text-white hover:bg-white/10',
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.label}</span>

                {/* 쪽지 미읽음 배지 */}
                {unreadBadge != null && unreadBadge > 0 && (
                  <span className="min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold leading-4 text-center">
                    {unreadBadge > 9 ? '9+' : unreadBadge}
                  </span>
                )}

                {/* 활성 상태 하단 강조선 */}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-mega-secondary rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* 관리자 메뉴 */}
        {adminNavItem && (
          <div className="flex items-center border-l border-white/15 pl-3">
            <button
              onClick={() => void navigate(adminNavItem.path)}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                isActive(adminNavItem)
                  ? 'text-white bg-white/15'
                  : 'text-white/60 hover:text-white hover:bg-white/10',
              )}
            >
              <adminNavItem.icon className="size-4 shrink-0" />
              <span>{adminNavItem.label}</span>
              {isActive(adminNavItem) && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-mega-secondary rounded-full" />
              )}
            </button>
          </div>
        )}

        {/* 알림벨 */}
        <NotificationBell dark />

        {/* 사용자 드롭다운 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all duration-150 outline-none">
              <Avatar className="size-7 shrink-0">
                {avatarImageUrl && (
                  <AvatarImage src={avatarImageUrl} alt={user?.name} className="object-cover" />
                )}
                <AvatarFallback className="bg-white/20 text-white text-xs font-semibold">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-white max-w-[80px] truncate">
                {user?.name ?? '-'}
              </span>
              <ChevronDown className="size-3.5 text-white/50" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-52 rounded-xl shadow-xl border border-gray-100 p-1"
          >
            {/* 이름 / 직급 표시 */}
            <div className="px-3 py-2.5">
              <p className="text-sm font-semibold text-gray-800 truncate">{user?.name ?? '-'}</p>
              <p className="text-xs text-gray-400 truncate">{user?.position ?? ''}</p>
            </div>

            <DropdownMenuSeparator />

            {/* 마이페이지 */}
            <DropdownMenuItem
              className="gap-2 rounded-lg cursor-pointer"
              onClick={() => void navigate(ROUTES.MYPAGE)}
            >
              <User className="size-4 text-gray-500" />
              <span>마이페이지</span>
            </DropdownMenuItem>

            {/* 로그아웃 */}
            <DropdownMenuItem
              className="gap-2 rounded-lg cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-50"
              onClick={() => setLogoutDialogOpen(true)}
            >
              <LogOut className="size-4" />
              <span>로그아웃</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* 로그아웃 확인 다이얼로그 */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent showCloseButton={false} className="p-0 overflow-hidden max-w-sm rounded-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-400 to-red-500 px-6 py-5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LogOut className="text-white size-5" />
            </div>
            <DialogTitle className="text-white font-bold">로그아웃</DialogTitle>
            <DialogClose className="ml-auto text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10 p-1">
              <X className="size-5" />
            </DialogClose>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-5 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm mb-1 text-red-600">로그아웃 하시겠습니까?</p>
                  <p className="text-xs leading-relaxed text-red-400">
                    현재 세션이 종료되며 로그인 페이지로 이동합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 pb-6 gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setLogoutDialogOpen(false)}
              className="flex-1 rounded-xl h-10"
            >
              취소
            </Button>
            <Button
              onClick={handleLogout}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl h-10 shadow-sm"
            >
              로그아웃
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TopNav;
