import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Wand2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useCurrentDefaultWageQuery } from '../api/queries';
import { usePhoneInput } from '../model/usePhoneInput';
import { useSsnInput } from '../model/useSsnInput';
import {
  createUserFormSchema,
  DAYS_OF_WEEK,
  EMPLOYMENT_STATUS_OPTIONS,
  GENDER_OPTIONS,
  POSITION_OPTIONS,
  userFormSchema,
} from '../model/user.schema';

import type {
  AdminUserDTO,
  CreateAdminUserRequestDTO,
  UpdateAdminUserRequestDTO,
} from '../api/dto';
import type { UserFormValues } from '../model/user.schema';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Spinner } from '@/shared/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

type UserFormDialogProps = {
  open: boolean;
  onClose: () => void;
  isPending: boolean;
} & (
  | {
      mode: 'create';
      user?: never;
      onSubmit: (data: CreateAdminUserRequestDTO) => void;
    }
  | {
      mode: 'edit';
      user: AdminUserDTO | null;
      onSubmit: (memberId: number, data: UpdateAdminUserRequestDTO) => void;
    }
);

const UserFormDialog = ({
  open,
  mode,
  user,
  onClose,
  onSubmit,
  isPending,
}: UserFormDialogProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const { data: currentDefaultWage } = useCurrentDefaultWageQuery();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(mode === 'create' ? createUserFormSchema : userFormSchema),
    defaultValues:
      mode === 'create'
        ? {
            username: '',
            password: '',
            name: '',
            position: '',
            gender: '',
            birth_date: '',
            ssn: '',
            phone: '',
            email: '',
            bank_name: '',
            account_number: '',
            hire_date: '',
            wage: undefined,
            annual_leave_hours: undefined,
            health_cert_expire: '',
            unavailable_days: [],
          }
        : {},
  });

  const position = watch('position');
  const gender = watch('gender');
  const isActive = watch('is_active');
  const phone = watch('phone');
  const ssn = watch('ssn');
  const unavailableDays = watch('unavailable_days') ?? [];

  const handlePhoneChange = usePhoneInput(setValue);
  const handleSsnChange = useSsnInput(setValue);

  useEffect(() => {
    if (mode === 'edit' && user) {
      reset({
        name: user.name,
        position: user.position,
        gender: user.gender ?? '',
        birth_date: user.birth_date ?? '',
        ssn: user.ssn ?? '',
        phone: user.phone ?? '',
        email: user.email ?? '',
        bank_name: user.bank_name ?? '',
        account_number: user.account_number ?? '',
        hire_date: user.hire_date ?? '',
        retire_date: user.retire_date ?? '',
        is_active: user.is_active,
        wage: user.wage,
        annual_leave_hours: user.annual_leave_hours,
        health_cert_expire: user.health_cert_expire ?? '',
        unavailable_days: user.unavailable_days ?? [],
        password: '',
      });
    }
  }, [mode, user, reset]);

  const handleClose = () => {
    reset();
    setShowPassword(false);
    onClose();
  };

  const handleUnavailableDayToggle = (dayValue: number) => {
    const current = unavailableDays;
    const updated = current.includes(dayValue)
      ? current.filter((d) => d !== dayValue)
      : [...current, dayValue];
    setValue('unavailable_days', updated, { shouldValidate: true });
  };

  const handleFormSubmit = (values: UserFormValues) => {
    if (mode === 'create') {
      onSubmit({
        username: values.username!,
        password: values.password!,
        name: values.name,
        position: values.position,
        gender: values.gender || undefined,
        birth_date: values.birth_date || undefined,
        ssn: values.ssn || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
        bank_name: values.bank_name || undefined,
        account_number: values.account_number || undefined,
        hire_date: values.hire_date || undefined,
        retire_date: values.retire_date || undefined,
        wage: values.wage,
        annual_leave_hours: values.annual_leave_hours,
        unavailable_days: values.unavailable_days,
        health_cert_expire: values.health_cert_expire || undefined,
      });
    } else {
      if (!user) return;
      onSubmit(user.id, {
        name: values.name,
        position: values.position,
        gender: values.gender || undefined,
        birth_date: values.birth_date || null,
        ssn: values.ssn || undefined,
        password: values.password || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
        bank_name: values.bank_name || undefined,
        account_number: values.account_number || undefined,
        hire_date: values.hire_date || null,
        retire_date: values.retire_date || null,
        is_active: values.is_active,
        wage: values.wage,
        annual_leave_hours: values.annual_leave_hours,
        unavailable_days: values.unavailable_days,
        health_cert_expire: values.health_cert_expire || null,
      });
    }
  };

  const isCreate = mode === 'create';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2 border-b border-border">
          <DialogTitle className="text-base font-semibold">
            {isCreate ? '직원 추가' : '직원 정보 수정'}
          </DialogTitle>
          {!isCreate && user && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {user.name} ({user.username})
            </p>
          )}
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(handleFormSubmit)(e)}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="w-full mb-5 bg-muted/60">
              <TabsTrigger value="basic" className="flex-1 text-xs">
                기본정보
              </TabsTrigger>
              <TabsTrigger value="contact" className="flex-1 text-xs">
                연락처/계좌
              </TabsTrigger>
              <TabsTrigger value="work" className="flex-1 text-xs">
                근무정보
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex-1 text-xs">
                스케줄설정
              </TabsTrigger>
            </TabsList>

            {/* ── 기본정보 탭 ── */}
            <TabsContent value="basic" className="space-y-4">
              {/* 계정 정보 (생성 전용) */}
              {isCreate && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    계정 정보
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="username" className="text-xs font-medium">
                        아이디 <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="username"
                        placeholder="아이디 입력"
                        className="h-9"
                        {...register('username')}
                      />
                      {errors.username && (
                        <p className="text-destructive text-xs">{errors.username.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-xs font-medium">
                        비밀번호 <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="비밀번호 입력"
                          className="h-9 pr-9"
                          {...register('password')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="text-destructive text-xs">{errors.password.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 비밀번호 변경 (수정 전용) */}
              {!isCreate && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    비밀번호 변경
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-medium">
                      새 비밀번호{' '}
                      <span className="text-muted-foreground font-normal">(변경할 경우에만 입력)</span>
                    </Label>
                    <div className="relative max-w-xs">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="새 비밀번호 입력"
                        className="h-9 pr-9"
                        {...register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-destructive text-xs">{errors.password.message}</p>
                    )}
                  </div>
                </div>
              )}

              {/* 인적사항 */}
              <div className="grid grid-cols-2 gap-3">
                {/* 이름 */}
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-medium">
                    이름 <span className="text-destructive">*</span>
                  </Label>
                  <Input id="name" placeholder="이름 입력" className="h-9" {...register('name')} />
                  {errors.name && (
                    <p className="text-destructive text-xs">{errors.name.message}</p>
                  )}
                </div>

                {/* 직급 */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    직급 <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={position}
                    onValueChange={(v) => setValue('position', v, { shouldValidate: true })}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="직급 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITION_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.position && (
                    <p className="text-destructive text-xs">{errors.position.message}</p>
                  )}
                </div>

                {/* 성별 */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">성별</Label>
                  <Select
                    value={gender}
                    onValueChange={(v) => setValue('gender', v, { shouldValidate: true })}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="성별 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((g) => (
                        <SelectItem key={g.value} value={g.value}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 생년월일 */}
                <div className="space-y-1.5">
                  <Label htmlFor="birth_date" className="text-xs font-medium">
                    생년월일
                  </Label>
                  <Input
                    id="birth_date"
                    type="date"
                    className="h-9"
                    {...register('birth_date')}
                  />
                </div>
              </div>

              {/* 주민등록번호 */}
              <div className="space-y-1.5">
                <Label htmlFor="ssn" className="text-xs font-medium">
                  주민등록번호
                </Label>
                <Input
                  id="ssn"
                  placeholder="000000-0000000"
                  maxLength={14}
                  className="h-9 font-mono tracking-wider"
                  value={ssn ?? ''}
                  onChange={handleSsnChange}
                />
                <p className="text-xs text-muted-foreground">숫자만 입력하면 자동으로 형식이 맞춰집니다.</p>
                {errors.ssn && (
                  <p className="text-destructive text-xs">{errors.ssn.message}</p>
                )}
              </div>
            </TabsContent>

            {/* ── 연락처/계좌 탭 ── */}
            <TabsContent value="contact" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* 연락처 */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-medium">
                    연락처
                  </Label>
                  <Input
                    id="phone"
                    placeholder="010-0000-0000"
                    className="h-9"
                    value={phone ?? ''}
                    onChange={handlePhoneChange}
                  />
                </div>

                {/* 이메일 */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium">
                    이메일
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    className="h-9"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-destructive text-xs">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  급여 계좌
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="bank_name" className="text-xs font-medium">
                      은행명
                    </Label>
                    <Input
                      id="bank_name"
                      placeholder="예) 국민은행"
                      className="h-9"
                      {...register('bank_name')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="account_number" className="text-xs font-medium">
                      계좌번호
                    </Label>
                    <Input
                      id="account_number"
                      placeholder="계좌번호 입력"
                      className="h-9"
                      {...register('account_number')}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── 근무정보 탭 ── */}
            <TabsContent value="work" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* 입사일 */}
                <div className="space-y-1.5">
                  <Label htmlFor="hire_date" className="text-xs font-medium">
                    입사일
                  </Label>
                  <Input
                    id="hire_date"
                    type="date"
                    className="h-9"
                    {...register('hire_date')}
                  />
                </div>

                {/* 퇴사일 */}
                <div className="space-y-1.5">
                  <Label htmlFor="retire_date" className="text-xs font-medium">
                    퇴사일
                  </Label>
                  <Input
                    id="retire_date"
                    type="date"
                    className="h-9"
                    {...register('retire_date')}
                  />
                </div>

                {/* 시급 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="wage" className="text-xs font-medium">
                      시급
                    </Label>
                    {currentDefaultWage && (
                      <button
                        type="button"
                        onClick={() =>
                          setValue('wage', currentDefaultWage.wage, { shouldValidate: true })
                        }
                        className="flex items-center gap-1 text-xs text-mega-secondary hover:text-mega-secondary/80 transition-colors"
                        title={`${currentDefaultWage.year}년 최저시급 자동 입력`}
                      >
                        <Wand2 className="size-3" />
                        최저시급 자동 입력
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="wage"
                      type="number"
                      min={0}
                      placeholder={
                        currentDefaultWage
                          ? `최저시급: ${currentDefaultWage.wage.toLocaleString()}원`
                          : '시급 입력'
                      }
                      className="h-9 pr-8"
                      {...register('wage', { valueAsNumber: true })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      원
                    </span>
                  </div>
                  {errors.wage && (
                    <p className="text-destructive text-xs">{errors.wage.message}</p>
                  )}
                </div>

                {/* 소정근로시간 */}
                <div className="space-y-1.5">
                  <Label htmlFor="annual_leave_hours" className="text-xs font-medium">
                    소정근로시간
                  </Label>
                  <div className="relative">
                    <Input
                      id="annual_leave_hours"
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="예) 5.50"
                      className="h-9 pr-10"
                      {...register('annual_leave_hours', { valueAsNumber: true })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      시간
                    </span>
                  </div>
                  {errors.annual_leave_hours && (
                    <p className="text-destructive text-xs">{errors.annual_leave_hours.message}</p>
                  )}
                </div>

                {/* 보건증 만료일 */}
                <div className="space-y-1.5">
                  <Label htmlFor="health_cert_expire" className="text-xs font-medium">
                    보건증 만료일
                  </Label>
                  <Input
                    id="health_cert_expire"
                    type="date"
                    className="h-9"
                    {...register('health_cert_expire')}
                  />
                </div>
              </div>

              {/* 재직상태 (수정 전용) */}
              {!isCreate && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">재직상태</Label>
                  <Select
                    value={isActive === undefined ? '' : String(isActive)}
                    onValueChange={(v) =>
                      setValue('is_active', v === 'true', { shouldValidate: true })
                    }
                  >
                    <SelectTrigger className="h-9 w-full max-w-[200px]">
                      <SelectValue placeholder="재직상태 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>

            {/* ── 스케줄설정 탭 ── */}
            <TabsContent value="schedule" className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-medium">고정 불가 요일</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    선택한 요일에는 스케줄을 배정하지 않습니다.
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {DAYS_OF_WEEK.map((day) => {
                    const isChecked = unavailableDays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => handleUnavailableDayToggle(day.value)}
                        className={[
                          'w-10 h-10 rounded-full text-sm font-medium border transition-colors cursor-pointer',
                          isChecked
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-border hover:bg-muted',
                        ].join(' ')}
                        aria-pressed={isChecked}
                        aria-label={`${day.label}요일 고정 불가`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
                {unavailableDays.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    선택됨:{' '}
                    {DAYS_OF_WEEK.filter((d) => unavailableDays.includes(d.value))
                      .map((d) => d.label + '요일')
                      .join(', ')}
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-5 pt-4 border-t border-border gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isPending}
            >
              취소
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? <Spinner className="size-4" /> : isCreate ? '직원 추가' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserFormDialog;
