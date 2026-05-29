import { AlertTriangle, Check, ChevronDown, LogOut, Plus, User, X, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { NAV_ITEMS, type NavItemConfig } from '../model/nav.config';
import { MAX_SHORTCUTS, SHORTCUT_GROUPS } from '../model/shortcut.config';
import { useShortcutStore } from '../model/shortcutStore';

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
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { ROUTES } from '@/shared/constants/routes';
import { cn } from '@/shared/lib/utils';

const BASE_URL = (import.meta.env.VITE_BASE_URL as string) || 'http://localhost:8000';

// ── 바로가기 Popover 내용 ──────────────────────────────────────────────────────

interface ShortcutPopoverProps {
  userId: string;
  onClose: () => void;
}

function ShortcutPopover({ userId, onClose }: ShortcutPopoverProps) {
  const shortcuts = useShortcutStore((s) => s.shortcutsByUser[userId] ?? []);
  const { toggleShortcut } = useShortcutStore();
  const isFull = shortcuts.length >= MAX_SHORTCUTS;

  return (
    <div className="w-64 p-2">
      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
        <p className="text-xs font-semibold text-gray-700">바로가기 등록</p>
        <span className="text-[10px] text-gray-400">
          {shortcuts.length}/{MAX_SHORTCUTS}
        </span>
      </div>

      {SHORTCUT_GROUPS.map((group) => (
        <div key={group.label} className="mb-2">
          <p className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            {group.label}
          </p>
          {group.items.map((dest) => {
            const added = shortcuts.some((s) => s.id === dest.id);
            const disabled = isFull && !added;
            return (
              <button
                key={dest.id}
                onClick={() => {
                  toggleShortcut(userId, { id: dest.id, label: dest.label, path: dest.path });
                  if (!added) onClose();
                }}
                disabled={disabled}
                className={cn(
                  'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-colors',
                  added
                    ? 'text-mega bg-mega/8 hover:bg-mega/12'
                    : disabled
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100',
                )}
              >
                <span>{dest.label}</span>
                {added && <Check className="size-3.5 text-mega" />}
              </button>
            );
          })}
        </div>
      ))}

      {isFull && (
        <p className="px-2 pt-1 text-[10px] text-amber-500">
          최대 {MAX_SHORTCUTS}개까지 등록할 수 있습니다.
        </p>
      )}
    </div>
  );
}

// ── 바로가기 버튼 ─────────────────────────────────────────────────────────────

interface ShortcutButtonProps {
  id: string;
  label: string;
  path: string;
  userId: string;
}

function ShortcutButton({ id, label, path, userId }: ShortcutButtonProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { removeShortcut } = useShortcutStore();

  const isActive = (() => {
    const url = new URL(path, window.location.origin);
    return (
      location.pathname === url.pathname &&
      location.search === url.search
    );
  })();

  return (
    <div className="relative group/sc">
      <button
        onClick={() => void navigate(path)}
        className={cn(
          'relative flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150',
          isActive
            ? 'text-white bg-white/15'
            : 'text-white/55 hover:text-white hover:bg-white/8',
        )}
      >
        <Zap className="size-3 shrink-0 opacity-70" />
        <span>{label}</span>
        {isActive && (
          <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-mega-secondary rounded-full" />
        )}
      </button>

      {/* 호버 시 삭제 버튼 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          removeShortcut(userId, id);
        }}
        className={cn(
          'absolute -top-1 -right-1 size-4 rounded-full bg-red-500 text-white',
          'items-center justify-center z-10',
          'hidden group-hover/sc:flex',
          'transition-all duration-100',
        )}
        title="바로가기 삭제"
      >
        <X className="size-2.5" />
      </button>
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

const TopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: user } = useUserQuery();
  const { data: profile } = useMyProfileQuery();
  const { mutate: logout } = useLogoutMutation();
  const { data: messageUnread } = useUnreadCountQuery();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [shortcutPopoverOpen, setShortcutPopoverOpen] = useState(false);

  const userId = user?.id?.toString() ?? '';
  const isAdmin = user?.position === '관리자';
  const shortcuts = useShortcutStore((s) => s.shortcutsByUser[userId] ?? []);

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
      <header
        className="hidden lg:flex fixed top-0 left-0 right-0 h-[64px] z-40 bg-nav-bg items-center px-6 gap-0"
        style={{ boxShadow: '0 1px 0 0 rgba(255,255,255,0.06), 0 4px 16px 0 rgba(0,0,0,0.3)' }}
      >
        {/* 로고 */}
        <Link to={ROUTES.ROOT} className="flex items-center shrink-0 mr-6">
          <img src={logo} alt="MegaBox" className="h-7" />
        </Link>

        {/* 구분선 */}
        <div className="w-px h-5 bg-white/10 mr-5 shrink-0" />

        {/* 메인 Nav */}
        <nav className="flex items-center gap-0.5">
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
                  'relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                  active
                    ? 'text-white bg-white/15'
                    : 'text-white/55 hover:text-white hover:bg-white/8',
                )}
              >
                <Icon className={cn('size-4 shrink-0', active ? 'opacity-100' : 'opacity-70')} />
                <span>{item.label}</span>

                {unreadBadge != null && unreadBadge > 0 && (
                  <span className="min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold leading-4 text-center">
                    {unreadBadge > 9 ? '9+' : unreadBadge}
                  </span>
                )}

                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-mega-secondary rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* 관리 메뉴 + 바로가기 */}
        {adminNavItem && (
          <div className="flex items-center border-l border-white/10 pl-4 mr-1 gap-0.5">
            {/* 관리 버튼 */}
            <button
              onClick={() => void navigate(adminNavItem.path)}
              className={cn(
                'relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                isActive(adminNavItem)
                  ? 'text-white bg-white/15'
                  : 'text-white/55 hover:text-white hover:bg-white/8',
              )}
            >
              <adminNavItem.icon
                className={cn('size-4 shrink-0', isActive(adminNavItem) ? 'opacity-100' : 'opacity-70')}
              />
              <span>{adminNavItem.label}</span>
              {isActive(adminNavItem) && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-mega-secondary rounded-full" />
              )}
            </button>

            {/* 바로가기 버튼들 */}
            {isAdmin && shortcuts.map((sc) => (
              <ShortcutButton
                key={sc.id}
                id={sc.id}
                label={sc.label}
                path={sc.path}
                userId={userId}
              />
            ))}

            {/* 바로가기 추가 버튼 */}
            {isAdmin && (
              <Popover open={shortcutPopoverOpen} onOpenChange={setShortcutPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      'flex items-center justify-center size-7 rounded-lg transition-all duration-150',
                      shortcutPopoverOpen
                        ? 'bg-white/15 text-white'
                        : 'text-white/35 hover:text-white/80 hover:bg-white/8',
                    )}
                    title="바로가기 추가"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={10}
                  className="p-0 rounded-xl shadow-2xl border border-gray-100 overflow-hidden max-h-[480px] overflow-y-auto"
                >
                  <ShortcutPopover
                    userId={userId}
                    onClose={() => setShortcutPopoverOpen(false)}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}

        {/* 우측 영역 */}
        <div className="flex items-center gap-1 border-l border-white/10 pl-3 ml-2">
          <NotificationBell dark />

          {/* 유저 드롭다운 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all duration-150 outline-none ml-0.5">
                <Avatar className="size-7 shrink-0">
                  {avatarImageUrl && (
                    <AvatarImage src={avatarImageUrl} alt={user?.name} className="object-cover" />
                  )}
                  <AvatarFallback className="bg-mega-secondary text-white text-xs font-bold">
                    {avatarFallback}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-sm font-semibold text-white max-w-[72px] truncate">
                    {user?.name ?? '-'}
                  </span>
                  <span className="text-[10px] text-white/40 mt-0.5">{user?.position ?? ''}</span>
                </div>
                <ChevronDown className="size-3.5 text-white/40 ml-0.5" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              sideOffset={10}
              className="w-52 rounded-xl shadow-2xl border border-gray-100 p-1.5"
            >
              <div className="px-3 py-2.5 mb-1">
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-8 shrink-0">
                    {avatarImageUrl && (
                      <AvatarImage src={avatarImageUrl} alt={user?.name} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-mega/10 text-mega text-xs font-bold">
                      {avatarFallback}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.name ?? '-'}</p>
                    <p className="text-xs text-gray-400">{user?.position ?? ''}</p>
                  </div>
                </div>
              </div>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuItem
                className="gap-2 rounded-lg cursor-pointer px-3 py-2"
                onClick={() => void navigate(ROUTES.MYPAGE)}
              >
                <User className="size-4 text-gray-400" />
                <span className="text-sm">마이페이지</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuItem
                className="gap-2 rounded-lg cursor-pointer px-3 py-2 text-red-500 focus:text-red-500 focus:bg-red-50"
                onClick={() => setLogoutDialogOpen(true)}
              >
                <LogOut className="size-4" />
                <span className="text-sm">로그아웃</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* 로그아웃 다이얼로그 */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent showCloseButton={false} className="p-0 overflow-hidden max-w-sm rounded-2xl">
          <div className="bg-gradient-to-r from-red-400 to-red-500 px-6 py-5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <LogOut className="text-white size-5" />
            </div>
            <DialogTitle className="text-white font-bold">로그아웃</DialogTitle>
            <DialogClose className="ml-auto text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10 p-1">
              <X className="size-5" />
            </DialogClose>
          </div>

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
