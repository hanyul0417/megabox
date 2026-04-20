import { AlertTriangle, LogOut, User, X } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Link } from 'react-router';

import { NAV_ITEMS, type NavItemConfig } from '../model/nav.config';

import NavItem from './NavItem';

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
import { ROUTES } from '@/shared/constants/routes';
import { cn } from '@/shared/lib/utils';

const BASE_URL = (import.meta.env.VITE_BASE_URL as string) || 'http://localhost:8000';

interface SideNavProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const SideNav = ({ isOpen = false, onClose }: SideNavProps) => {
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

  const handleNavClick = (path: string) => {
    void navigate(path);
    onClose?.();
  };

  const handleLogout = () => {
    logout();
    setLogoutDialogOpen(false);
  };

  const avatarFallback = user?.name ? user.name.charAt(0) : '?';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 shrink-0">
        <Link to={ROUTES.ROOT} onClick={onClose} className="flex items-center gap-2">
          <img src={logo} alt="MegaHub" className="h-7" />
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-3 h-px bg-white/10" />

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto scrollbar-hide">
        {filteredNavItems.map((item) => (
          <NavItem
            key={item.key}
            icon={item.icon}
            label={item.label}
            active={isActive(item)}
            onClick={() => handleNavClick(item.path)}
            badge={item.key === 'messages' ? (messageUnread?.count ?? 0) : undefined}
          />
        ))}
      </nav>

      {/* 관리자 메뉴 (프로필 바로 위) */}
      {adminNavItem && (
        <>
          <div className="mx-3 h-px bg-white/10" />
          <div className="px-3 py-2 shrink-0">
            <NavItem
              icon={adminNavItem.icon}
              label={adminNavItem.label}
              active={isActive(adminNavItem)}
              onClick={() => handleNavClick(adminNavItem.path)}
            />
          </div>
        </>
      )}

      {/* User section */}
      <div className="mx-3 h-px bg-white/10" />
      <div className="p-3 shrink-0">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/8 transition-colors">
          <Avatar className="size-8 shrink-0">
            {avatarImageUrl && (
              <AvatarImage src={avatarImageUrl} alt={user?.name} className="object-cover" />
            )}
            <AvatarFallback className="bg-white/20 text-white text-sm font-semibold">
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name ?? '-'}</p>
            <p className="text-xs text-white/50 truncate">{user?.position ?? ''}</p>
          </div>
          <div className="flex gap-0.5">
            <NotificationBell dark />
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
              onClick={() => {
                void navigate(ROUTES.MYPAGE);
                onClose?.();
              }}
              title="마이페이지"
            >
              <User className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
              onClick={() => setLogoutDialogOpen(true)}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar - always visible */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[240px] bg-nav-bg flex-col z-40 shadow-xl">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 w-[240px] bg-nav-bg flex flex-col z-50 lg:hidden',
          'transition-transform duration-300 ease-in-out shadow-2xl',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarContent />
      </aside>

      {/* Logout dialog */}
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
                  <p className="text-xs leading-relaxed text-red-400">현재 세션이 종료되며 로그인 페이지로 이동합니다.</p>
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

export default SideNav;
