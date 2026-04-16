import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  ChevronDown,
  CreditCard,
  Pencil,
  Phone,
  Trash2,
  User,
} from 'lucide-react';
import React, { useState } from 'react';

import type { AdminUserDTO } from '../api/dto';

import { getAvatarBg, getPositionBadgeStyle } from '@/entities/user/model/position';
import { getProfileImageUrl } from '@/shared/lib/avatar';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

interface UserTableProps {
  users: AdminUserDTO[];
  onEdit: (user: AdminUserDTO) => void;
  onDelete: (user: AdminUserDTO) => void;
  isDeletePending?: boolean;
}

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;

const formatUnavailableDays = (days?: number[]): string => {
  if (!days || days.length === 0) return '-';
  return days.map((d) => DAY_LABELS[d]).join(', ');
};

const formatWage = (wage?: number): string => {
  if (wage == null) return '-';
  return `${wage.toLocaleString('ko-KR')}원`;
};

const isHealthCertExpiringSoon = (expireDate?: string): boolean => {
  if (!expireDate) return false;
  const expire = new Date(expireDate);
  const now = new Date();
  const diffDays = Math.ceil((expire.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 30;
};

const isHealthCertExpired = (expireDate?: string): boolean => {
  if (!expireDate) return false;
  return new Date(expireDate) < new Date();
};

const getInitials = (name: string): string => {
  if (!name) return '?';
  return name.slice(0, 1);
};

// ─── 상태 설정 ────────────────────────────────────────────────────────────────

const getStatusConfig = (user: AdminUserDTO) => {
  if (user.status === 'pending')
    return { label: '가입 대기', dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
  if (user.status === 'rejected')
    return { label: '가입 거절', dot: 'bg-gray-400', text: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' };
  if (user.status === 'suspended')
    return { label: '정지', dot: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' };
  if (user.is_active)
    return { label: '재직중', dot: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
  return { label: '퇴사', dot: 'bg-red-400', text: 'text-red-600', bg: 'bg-red-50 border-red-200' };
};

// ─── 상세 패널 ────────────────────────────────────────────────────────────────

type InfoFieldProps = {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  accent?: boolean;
};

const InfoField = ({ label, value, mono = false, accent = false }: InfoFieldProps) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{label}</span>
    <span
      className={cn(
        'text-sm leading-snug break-all',
        accent ? 'text-gray-900 font-semibold' : 'text-gray-600',
        mono && 'font-mono tracking-wide',
      )}
    >
      {value || '-'}
    </span>
  </div>
);

type DetailCardProps = {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
};

const DetailCard = ({ icon, title, children, className }: DetailCardProps) => (
  <div className={cn('bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3', className)}>
    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
      <div className="size-6 rounded-lg bg-gray-50 flex items-center justify-center">{icon}</div>
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{title}</span>
    </div>
    <div className="grid grid-cols-2 gap-3">{children}</div>
  </div>
);

type DetailPanelProps = {
  user: AdminUserDTO;
  colSpan: number;
};

const DetailPanel = ({ user, colSpan }: DetailPanelProps) => {
  const healthExpired = isHealthCertExpired(user.health_cert_expire);
  const healthExpiringSoon = isHealthCertExpiringSoon(user.health_cert_expire);

  const healthValue = () => {
    if (!user.health_cert_expire) return <span className="text-gray-400">-</span>;
    if (healthExpired)
      return (
        <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-sm">
          <AlertTriangle className="size-3.5 shrink-0" />
          {user.health_cert_expire} (만료됨)
        </span>
      );
    if (healthExpiringSoon)
      return (
        <span className="inline-flex items-center gap-1 text-orange-600 font-semibold text-sm">
          <AlertTriangle className="size-3.5 shrink-0" />
          {user.health_cert_expire} (임박)
        </span>
      );
    return <span className="text-gray-600 text-sm">{user.health_cert_expire}</span>;
  };

  return (
    <tr className="border-b border-gray-100">
      <td colSpan={colSpan} className="px-4 py-3 bg-gray-50/80">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {/* 신분 정보 */}
          <DetailCard
            icon={<User className="size-3.5 text-purple-500" />}
            title="신분 정보"
          >
            <InfoField label="성별" value={user.gender ?? '-'} />
            <InfoField label="생년월일" value={user.birth_date ?? '-'} />
            <InfoField label="주민번호" value={user.ssn ?? '-'} mono accent />
            <InfoField label="계정 ID" value={user.username} mono />
          </DetailCard>

          {/* 연락 · 금융 */}
          <DetailCard
            icon={<CreditCard className="size-3.5 text-blue-500" />}
            title="연락 · 금융"
          >
            <InfoField label="이메일" value={user.email ?? '-'} />
            <InfoField label="연락처" value={user.phone ?? '-'} mono />
            <InfoField label="은행" value={user.bank_name ?? '-'} />
            <InfoField label="계좌번호" value={user.account_number ?? '-'} mono />
          </DetailCard>

          {/* 근무 정보 */}
          <DetailCard
            icon={<CalendarDays className="size-3.5 text-emerald-500" />}
            title="근무 정보"
          >
            <InfoField label="입사일" value={user.hire_date ?? '-'} />
            <InfoField label="퇴사일" value={user.retire_date ?? '-'} />
            <InfoField label="고정 불가 요일" value={formatUnavailableDays(user.unavailable_days)} />
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">보건증 만료일</span>
              {healthValue()}
            </div>
          </DetailCard>

          {/* 급여 정보 */}
          <DetailCard
            icon={<Banknote className="size-3.5 text-green-500" />}
            title="급여 정보"
          >
            <InfoField
              label="시급"
              value={user.wage ? `${user.wage.toLocaleString('ko-KR')}원` : '-'}
              accent={!!user.wage}
            />
            <InfoField
              label="주민번호 (암호화)"
              value={user.ssn ? '등록됨' : '미등록'}
            />
          </DetailCard>
        </div>
      </td>
    </tr>
  );
};

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

const UserTable = React.memo(({ users, onEdit, onDelete, isDeletePending }: UserTableProps) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleRowClick = (userId: number) => {
    setExpandedId((prev) => (prev === userId ? null : userId));
  };

  const handleEdit = (e: React.MouseEvent, user: AdminUserDTO) => {
    e.stopPropagation();
    onEdit(user);
  };

  const handleDelete = (e: React.MouseEvent, user: AdminUserDTO) => {
    e.stopPropagation();
    onDelete(user);
  };

  const TOTAL_COLS = 7;

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-md">
      <table className="w-full text-sm border-collapse">
        {/* 헤더 */}
        <thead>
          <tr className="bg-nav-bg">
            <th className="w-12 px-4 py-3.5" />
            <th className="px-4 py-3.5 text-left text-[11px] font-semibold text-white/70 uppercase tracking-widest">
              직원
            </th>
            <th className="px-4 py-3.5 text-left text-[11px] font-semibold text-white/70 uppercase tracking-widest">
              직급
            </th>
            <th className="px-4 py-3.5 text-left text-[11px] font-semibold text-white/70 uppercase tracking-widest hidden md:table-cell">
              연락처
            </th>
            <th className="px-4 py-3.5 text-left text-[11px] font-semibold text-white/70 uppercase tracking-widest hidden lg:table-cell">
              시급
            </th>
            <th className="px-4 py-3.5 text-left text-[11px] font-semibold text-white/70 uppercase tracking-widest">
              재직상태
            </th>
            <th className="px-4 py-3.5 text-right text-[11px] font-semibold text-white/70 uppercase tracking-widest w-24">
              관리
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {users.map((user, idx) => {
            const isExpanded = expandedId === user.id;
            const statusCfg = getStatusConfig(user);
            const avatarBg = getAvatarBg(user.position);
            const badgeStyle = getPositionBadgeStyle(user.position);
            const healthWarning =
              isHealthCertExpired(user.health_cert_expire) ||
              isHealthCertExpiringSoon(user.health_cert_expire);
            const profileImageUrl = getProfileImageUrl(user.profile_image);
            const isLast = idx === users.length - 1;

            return (
              <React.Fragment key={user.id}>
                <tr
                  className={cn(
                    'group cursor-pointer transition-all duration-150',
                    isExpanded
                      ? 'bg-mega/[0.03] border-b-0'
                      : 'hover:bg-gray-50/80',
                    !isExpanded && !isLast && 'border-b border-gray-100',
                  )}
                  onClick={() => handleRowClick(user.id)}
                >
                  {/* 확장 토글 */}
                  <td className="w-12 px-4 py-4">
                    <div
                      className={cn(
                        'size-6 rounded-lg flex items-center justify-center transition-all duration-200',
                        isExpanded
                          ? 'bg-mega/15 text-mega rotate-180'
                          : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200',
                      )}
                    >
                      <ChevronDown className="size-3.5" />
                    </div>
                  </td>

                  {/* 직원 (아바타 + 이름) */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {/* 아바타 */}
                      <div
                        className={cn(
                          'size-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden',
                          avatarBg,
                        )}
                      >
                        {profileImageUrl ? (
                          <img
                            src={profileImageUrl}
                            alt={user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getInitials(user.name)
                        )}
                      </div>

                      {/* 이름 + 경고 */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold text-gray-900 truncate">{user.name}</span>
                        {healthWarning && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-500 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5">
                            <AlertTriangle className="size-2.5" />
                            보건증
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 직급 */}
                  <td className="px-4 py-4">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border',
                        badgeStyle,
                      )}
                    >
                      {user.position}
                    </span>
                  </td>

                  {/* 연락처 */}
                  <td className="px-4 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Phone className="size-3 text-gray-300 shrink-0" />
                      <span className="font-mono text-xs text-gray-500 tabular-nums">
                        {user.phone ?? '-'}
                      </span>
                    </div>
                  </td>

                  {/* 시급 */}
                  <td className="px-4 py-4 hidden lg:table-cell">
                    {user.wage ? (
                      <span className="text-xs font-semibold text-gray-700 tabular-nums font-mono">
                        {formatWage(user.wage)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">-</span>
                    )}
                  </td>

                  {/* 재직상태 */}
                  <td className="px-4 py-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border',
                        statusCfg.bg,
                        statusCfg.text,
                      )}
                    >
                      <span className={cn('size-1.5 rounded-full shrink-0', statusCfg.dot)} />
                      {statusCfg.label}
                    </span>
                  </td>

                  {/* 관리 버튼 */}
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 rounded-lg text-gray-400 hover:text-mega hover:bg-mega/8 transition-all"
                        onClick={(e) => handleEdit(e, user)}
                        title="수정"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        onClick={(e) => handleDelete(e, user)}
                        disabled={isDeletePending}
                        title="삭제"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>

                {/* 확장 상세 패널 */}
                {isExpanded && <DetailPanel user={user} colSpan={TOTAL_COLS} />}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

UserTable.displayName = 'UserTable';

export default UserTable;
