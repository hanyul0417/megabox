import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Pencil,
  User,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  useChangePasswordMutation,
  useMyMonthlyAttendanceQuery,
  useMyProfileQuery,
  useUpdateMyProfileMutation,
  useUploadAvatarMutation,
} from '@/features/mypage';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Separator } from '@/shared/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { ROUTES } from '@/shared/constants/routes';

const BASE_URL = (import.meta.env.VITE_BASE_URL as string) || 'http://localhost:8000';

function getAvatarUrl(filename: string | null | undefined): string | undefined {
  if (!filename) return undefined;
  return `${BASE_URL}/uploads/profiles/${filename}`;
}

function formatTime(t: string | null | undefined): string {
  if (!t) return '-';
  return t.slice(0, 5);
}

function formatHours(h: number | null | undefined): string {
  if (h == null) return '-';
  return `${h.toFixed(1)}h`;
}

// ── 프로필 탭 ─────────────────────────────────────────
function ProfileTab() {
  const { data: profile, isLoading } = useMyProfileQuery();
  const { mutate: uploadAvatar, isPending: isUploading } = useUploadAvatarMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) {
    return <div className="flex justify-center py-12 text-muted-foreground text-sm">불러오는 중...</div>;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAvatar(file);
    e.target.value = '';
  };

  const avatarUrl = getAvatarUrl(profile?.profile_image);
  const fallback = profile?.name ? profile.name.charAt(0) : '?';

  return (
    <div className="space-y-6">
      {/* Avatar section */}
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="relative">
          <Avatar className="size-24 ring-4 ring-white shadow-lg">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={profile?.name} />}
            <AvatarFallback className="text-2xl font-bold bg-[#1a0f3c] text-white">
              {fallback}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute -bottom-1 -right-1 flex items-center justify-center size-8 rounded-full bg-[#1a0f3c] text-white shadow-md hover:bg-[#2d1a6e] transition-colors disabled:opacity-60"
          >
            <Camera className="size-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900">{profile?.name ?? '-'}</p>
          <Badge variant="secondary" className="mt-1 text-xs">
            {profile?.position ?? '-'}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Info grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: '아이디', value: profile?.username },
          { label: '성별', value: profile?.gender },
          { label: '생년월일', value: profile?.birth_date },
          { label: '입사일', value: profile?.hire_date },
          { label: '연락처', value: profile?.phone },
          { label: '이메일', value: profile?.email },
          { label: '은행', value: profile?.bank_name },
          { label: '계좌번호', value: profile?.account_number },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-1 p-3 rounded-lg bg-gray-50">
            <span className="text-xs text-muted-foreground font-medium">{label}</span>
            <span className="text-sm font-medium text-gray-900">{value ?? '-'}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        카메라 아이콘을 눌러 프로필 사진을 변경할 수 있습니다 (최대 5MB, jpg/png/webp/gif)
      </p>
    </div>
  );
}

// ── 내 정보 수정 탭 ───────────────────────────────────
function EditInfoTab() {
  const { data: profile } = useMyProfileQuery();
  const { mutate: updateProfile, isPending } = useUpdateMyProfileMutation();

  const [form, setForm] = useState({
    phone: '',
    email: '',
    bank_name: '',
    account_number: '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        phone: profile.phone ?? '',
        email: profile.email ?? '',
        bank_name: profile.bank_name ?? '',
        account_number: profile.account_number ?? '',
      });
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, string> = {};
    if (form.phone) payload.phone = form.phone;
    if (form.email) payload.email = form.email;
    if (form.bank_name) payload.bank_name = form.bank_name;
    if (form.account_number) payload.account_number = form.account_number;
    updateProfile(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">연락처</Label>
          <Input
            id="phone"
            placeholder="010-0000-0000"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            placeholder="example@email.com"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bank_name">은행명</Label>
          <Input
            id="bank_name"
            placeholder="국민은행"
            value={form.bank_name}
            onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="account_number">계좌번호</Label>
          <Input
            id="account_number"
            placeholder="123-456-789012"
            value={form.account_number}
            onChange={(e) => setForm((p) => ({ ...p, account_number: e.target.value }))}
          />
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-full bg-[#1a0f3c] hover:bg-[#2d1a6e]">
        {isPending ? '저장 중...' : '저장하기'}
      </Button>
    </form>
  );
}

// ── 비밀번호 변경 탭 ──────────────────────────────────
function ChangePasswordTab() {
  const { mutate: changePassword, isPending } = useChangePasswordMutation();
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.new_password !== form.confirm_password) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (form.new_password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    changePassword(
      { current_password: form.current_password, new_password: form.new_password },
      {
        onSuccess: () => {
          setForm({ current_password: '', new_password: '', confirm_password: '' });
        },
      },
    );
  };

  const PasswordField = ({
    id,
    label,
    value,
    show,
    onToggle,
    onChange,
    placeholder,
  }: {
    id: string;
    label: string;
    value: string;
    show: boolean;
    onToggle: () => void;
    onChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-700"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
        <p className="font-semibold">비밀번호 조건</p>
        <ul className="list-disc list-inside space-y-0.5 text-amber-700">
          <li>8자 이상</li>
          <li>영문 대문자 포함</li>
          <li>숫자 포함</li>
          <li>특수문자(!@#$%^&*) 포함</li>
        </ul>
      </div>

      <PasswordField
        id="current_password"
        label="현재 비밀번호"
        value={form.current_password}
        show={showCurrent}
        onToggle={() => setShowCurrent((v) => !v)}
        onChange={(v) => setForm((p) => ({ ...p, current_password: v }))}
        placeholder="현재 비밀번호 입력"
      />
      <PasswordField
        id="new_password"
        label="새 비밀번호"
        value={form.new_password}
        show={showNew}
        onToggle={() => setShowNew((v) => !v)}
        onChange={(v) => setForm((p) => ({ ...p, new_password: v }))}
        placeholder="새 비밀번호 입력"
      />
      <PasswordField
        id="confirm_password"
        label="새 비밀번호 확인"
        value={form.confirm_password}
        show={showConfirm}
        onToggle={() => setShowConfirm((v) => !v)}
        onChange={(v) => setForm((p) => ({ ...p, confirm_password: v }))}
        placeholder="새 비밀번호 재입력"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending} className="w-full bg-[#1a0f3c] hover:bg-[#2d1a6e]">
        {isPending ? '변경 중...' : '비밀번호 변경'}
      </Button>
    </form>
  );
}

// ── 근태 이력 탭 ──────────────────────────────────────
function AttendanceTab() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const { data, isLoading } = useMyMonthlyAttendanceQuery(year, month);

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    const now = new Date();
    if (year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)) return;
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };

  const records = data?.records ?? [];
  const totalHours = records.reduce((sum, r) => sum + (r.total_work_hours ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="flex items-center justify-center size-8 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-base font-semibold text-gray-900">
          {year}년 {month}월
        </span>
        <button
          onClick={nextMonth}
          className="flex items-center justify-center size-8 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-[#1a0f3c]/5 text-center">
          <p className="text-xs text-muted-foreground">근무일수</p>
          <p className="text-xl font-bold text-[#1a0f3c]">{records.length}일</p>
        </div>
        <div className="p-3 rounded-lg bg-[#1a0f3c]/5 text-center">
          <p className="text-xs text-muted-foreground">총 근무시간</p>
          <p className="text-xl font-bold text-[#1a0f3c]">{totalHours.toFixed(1)}h</p>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</div>
      ) : records.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          해당 월 근태 기록이 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1a0f3c] text-white">
                <th className="px-3 py-2.5 text-left font-medium text-xs">날짜</th>
                <th className="px-3 py-2.5 text-center font-medium text-xs">출근</th>
                <th className="px-3 py-2.5 text-center font-medium text-xs">퇴근</th>
                <th className="px-3 py-2.5 text-center font-medium text-xs">휴식</th>
                <th className="px-3 py-2.5 text-right font-medium text-xs">근무시간</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => {
                const breakStr =
                  r.break_start && r.break_end
                    ? `${formatTime(r.break_start)}~${formatTime(r.break_end)}`
                    : '-';
                return (
                  <tr
                    key={r.work_date}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    <td className="px-3 py-2 text-gray-700 font-medium whitespace-nowrap">
                      {r.work_date}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600">
                      {formatTime(r.check_in)}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600">
                      {formatTime(r.check_out)}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-500 text-xs">
                      {breakStr}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-[#1a0f3c]">
                      {formatHours(r.total_work_hours)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────
export default function MyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => void navigate(ROUTES.ROOT)}
            className="flex items-center justify-center size-8 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">마이페이지</h1>
        </div>

        <Card className="shadow-sm">
          <CardContent className="pt-0">
            <Tabs defaultValue="profile">
              <TabsList className="w-full grid grid-cols-4 mt-4 mb-6">
                <TabsTrigger value="profile" className="text-xs gap-1.5">
                  <User className="size-3.5" />
                  프로필
                </TabsTrigger>
                <TabsTrigger value="edit" className="text-xs gap-1.5">
                  <Pencil className="size-3.5" />
                  내 정보
                </TabsTrigger>
                <TabsTrigger value="password" className="text-xs gap-1.5">
                  <Lock className="size-3.5" />
                  비밀번호
                </TabsTrigger>
                <TabsTrigger value="attendance" className="text-xs gap-1.5">
                  <Clock className="size-3.5" />
                  근태
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <ProfileTab />
              </TabsContent>

              <TabsContent value="edit">
                <Card className="border-0 shadow-none">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Pencil className="size-4 text-[#1a0f3c]" />
                      내 정보 수정
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      연락처, 이메일, 계좌 정보를 수정할 수 있습니다.
                    </p>
                  </CardHeader>
                  <CardContent className="px-0 pb-0">
                    <EditInfoTab />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="password">
                <Card className="border-0 shadow-none">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <KeyRound className="size-4 text-[#1a0f3c]" />
                      비밀번호 변경
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-0 pb-0">
                    <ChangePasswordTab />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="attendance">
                <Card className="border-0 shadow-none">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="size-4 text-[#1a0f3c]" />
                      내 근태 이력
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-0 pb-0">
                    <AttendanceTab />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
