import { LogOut, User } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Link } from 'react-router';

import { NAV_ITEMS, type NavItemConfig } from '../model/nav.config';

import NavItem from './NavItem';

import { useUserQuery } from '@/entities/user/api/queries';
import { NotificationBell } from '@/features/notification';
import { useMyProfileQuery } from '@/features/mypage';
import { useLogoutMutation } from '@/features/login/api/queries';

const BASE_URL = (import.meta.env.VITE_BASE_URL as string) || 'http://localhost:8000';
import logo from '@/shared/assets/logo/Logo_white.png';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { ROUTES } from '@/shared/constants/routes';
import { cn } from '@/shared/lib/utils';

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
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const avatarImageUrl = profile?.profile_image
    ? `${BASE_URL}/uploads/profiles/${profile.profile_image}`
    : undefined;

  const isActive = (item: NavItemConfig) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  const filteredNavItems = NAV_ITEMS.filter((item) => {
    if (!item.requiredRoles) return true;
    if (!user) return false;
    return item.requiredRoles.includes(user.position);
  });

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
          />
        ))}
      </nav>

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
              onClick={() => { void navigate(ROUTES.MYPAGE); onClose?.(); }}
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
        <DialogContent showCloseButton={false} className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut size={18} className="text-destructive" />
              로그아웃
            </DialogTitle>
            <DialogDescription>로그아웃 하시겠습니까? 현재 세션이 종료됩니다.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              로그아웃
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SideNav;
