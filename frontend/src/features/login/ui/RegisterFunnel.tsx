import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useCheckUsernameQuery, useRegisterMutation } from '../api/queries';
import {
  registerStep1Schema,
  registerStep2Schema,
  registerStep3Schema,
  type RegisterStep1Type,
  type RegisterStep2Type,
  type RegisterStep3Type,
  type RegisterFormData,
} from '../model/schema';

import { isApiError } from '@/shared/api/error';
import { Button } from '@/shared/components/ui/button';
import { Form } from '@/shared/components/ui/form';
import RHFInput from '@/shared/components/ui/RHFInput';

type FunnelStep = 1 | 2 | 3 | 'done';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

interface RegisterFunnelProps {
  onBack: () => void;
}

// ── Auto-format helpers ────────────────────────────────────────────────────

/** XXXXXX-XXXXXXX — only digits, auto-insert dash at position 6 */
function formatSSN(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
}

/** 010-XXXX-XXXX — only digits, auto-insert dashes */
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/** YYYY-MM-DD — only digits, auto-insert dashes (4-2-2) */
function formatBirthDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

// ── Main Funnel ────────────────────────────────────────────────────────────

export function RegisterFunnel({ onBack }: RegisterFunnelProps) {
  const [step, setStep] = useState<FunnelStep>(1);
  const [formData, setFormData] = useState<Partial<RegisterFormData>>({});

  const { mutate: register, isPending } = useRegisterMutation();

  const handleComplete = (step3Data: RegisterStep3Type) => {
    const merged = { ...formData, ...step3Data } as RegisterFormData;

    register(
      {
        username: merged.username,
        password: merged.password,
        name: merged.name,
        gender: merged.gender,
        birth_date: merged.birth_date,
        ssn: merged.ssn,
        phone: merged.phone,
        email: merged.email,
        bank_name: merged.bank_name || undefined,
        account_number: merged.account_number || undefined,
        hire_date: merged.hire_date || undefined,
        health_cert_expire: merged.health_cert_expire || undefined,
        unavailable_days: merged.unavailable_days || undefined,
      },
      {
        onSuccess: () => setStep('done'),
        onError: (error) => {
          if (isApiError(error)) {
            toast.error(error.message);
          } else {
            toast.error('회원가입 신청에 실패했습니다.');
          }
        },
      },
    );
  };

  if (step === 'done') {
    return <CompletedStep onBack={onBack} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 헤더 + 진행 바 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={step === 1 ? onBack : () => setStep((s) => ((s as number) - 1) as FunnelStep)}
          className="text-mega-gray hover:text-mega transition-colors p-1 rounded-md hover:bg-mega/10"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <p className="text-xs text-mega-gray mb-1">{step} / 3단계</p>
          <div className="flex gap-1">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  s <= (step as number) ? 'bg-mega' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="w-[28px]" />
      </div>

      {step === 1 && (
        <Step1
          defaultValues={formData}
          onNext={(data) => {
            setFormData((prev) => ({ ...prev, ...data }));
            setStep(2);
          }}
        />
      )}
      {step === 2 && (
        <Step2
          defaultValues={formData}
          onNext={(data) => {
            setFormData((prev) => ({ ...prev, ...data }));
            setStep(3);
          }}
        />
      )}
      {step === 3 && (
        <Step3 defaultValues={formData} onSubmit={handleComplete} isPending={isPending} />
      )}
    </div>
  );
}

// ── Step 1: 기본 정보 ──────────────────────────────────────────────────────
function Step1({
  defaultValues,
  onNext,
}: {
  defaultValues: Partial<RegisterFormData>;
  onNext: (data: RegisterStep1Type) => void;
}) {
  const [showPw, setShowPw] = useState(false);
  const [showPwC, setShowPwC] = useState(false);

  const form = useForm<RegisterStep1Type>({
    resolver: zodResolver(registerStep1Schema),
    defaultValues: {
      username: defaultValues.username ?? '',
      password: defaultValues.password ?? '',
      passwordConfirm: '',
      name: defaultValues.name ?? '',
      gender: defaultValues.gender ?? undefined,
      birth_date: defaultValues.birth_date ?? '',
    },
  });

  const username = form.watch('username');
  const { data: checkResult } = useCheckUsernameQuery(username);

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onNext)(e)} className="flex flex-col">
        <h3 className="font-semibold text-sm text-mega mb-4">기본 정보 입력</h3>

        {/* 아이디 */}
        <div className="flex flex-col gap-1">
          <RHFInput
            form={form}
            name="username"
            label="아이디 *"
            placeholder="영문, 숫자, _ 사용 가능 (3~50자)"
          />
          {username.length >= 3 && checkResult && (
            <p
              className={`text-xs text-right ${checkResult.available ? 'text-green-500' : 'text-red-500'}`}
            >
              {checkResult.message}
            </p>
          )}
        </div>

        {/* 비밀번호 */}
        <div className="relative">
          <RHFInput
            form={form}
            name="password"
            label="비밀번호 *"
            type={showPw ? 'text' : 'password'}
            placeholder="대문자 + 숫자 + 특수문자 포함 8자 이상"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-[34px] text-mega-gray hover:text-mega transition-colors"
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* 비밀번호 확인 */}
        <div className="relative">
          <RHFInput
            form={form}
            name="passwordConfirm"
            label="비밀번호 확인 *"
            type={showPwC ? 'text' : 'password'}
            placeholder="비밀번호를 다시 입력해주세요"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPwC((v) => !v)}
            className="absolute right-3 top-[34px] text-mega-gray hover:text-mega transition-colors"
          >
            {showPwC ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* 이름 */}
        <RHFInput form={form} name="name" label="이름 *" placeholder="실명을 입력해주세요" />

        {/* 성별 */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">성별 *</label>
          <div className="flex gap-2">
            {(
              [
                ['남', '남성'],
                ['여', '여성'],
              ] as const
            ).map(([value, label]) => {
              const selected = form.watch('gender') === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => form.setValue('gender', value, { shouldValidate: true })}
                  className={`flex-1 py-2.5 rounded-md border text-sm font-medium transition-all duration-150 ${
                    selected
                      ? 'bg-mega text-white border-mega shadow-sm'
                      : 'border-gray-200 hover:border-mega hover:text-mega'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="min-h-[1.25rem] text-xs text-right text-destructive">
            {form.formState.errors.gender?.message}
          </p>
        </div>

        {/* 생년월일 (YYYY-MM-DD, 자동 포맷) */}
        <RHFInput
          form={form}
          name="birth_date"
          label="생년월일 *"
          placeholder="YYYY-MM-DD"
          maxLength={10}
          transform={formatBirthDate}
        />

        <Button
          type="submit"
          className="mt-1 w-full bg-mega hover:bg-mega/90 active:scale-[0.98] transition-all"
          disabled={username.length >= 3 && checkResult != null && !checkResult.available}
        >
          다음
        </Button>
      </form>
    </Form>
  );
}

// ── Step 2: 인증 정보 ──────────────────────────────────────────────────────
function Step2({
  defaultValues,
  onNext,
}: {
  defaultValues: Partial<RegisterFormData>;
  onNext: (data: RegisterStep2Type) => void;
}) {
  const form = useForm<RegisterStep2Type>({
    resolver: zodResolver(registerStep2Schema),
    defaultValues: {
      ssn: defaultValues.ssn ?? '',
      phone: defaultValues.phone ?? '',
      email: defaultValues.email ?? '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onNext)(e)} className="flex flex-col">
        <h3 className="font-semibold text-sm text-mega mb-4">인증 정보 입력</h3>

        {/* 주민등록번호 */}
        <RHFInput
          form={form}
          name="ssn"
          label="주민등록번호 *"
          placeholder="XXXXXX-XXXXXXX"
          maxLength={14}
          transform={formatSSN}
        />

        {/* 연락처 */}
        <RHFInput
          form={form}
          name="phone"
          label="연락처 *"
          placeholder="010-0000-0000"
          maxLength={13}
          transform={formatPhone}
        />

        {/* 이메일 */}
        <RHFInput
          form={form}
          name="email"
          label="이메일 *"
          type="email"
          placeholder="example@email.com"
        />

        <Button
          type="submit"
          className="mt-1 w-full bg-mega hover:bg-mega/90 active:scale-[0.98] transition-all"
        >
          다음
        </Button>
      </form>
    </Form>
  );
}

// ── Step 3: 선택 정보 ──────────────────────────────────────────────────────
function Step3({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues: Partial<RegisterFormData>;
  onSubmit: (data: RegisterStep3Type) => void;
  isPending: boolean;
}) {
  const form = useForm<RegisterStep3Type>({
    resolver: zodResolver(registerStep3Schema),
    defaultValues: {
      bank_name: defaultValues.bank_name ?? '',
      account_number: defaultValues.account_number ?? '',
      hire_date: defaultValues.hire_date ?? '',
      health_cert_expire: defaultValues.health_cert_expire ?? '',
      unavailable_days: defaultValues.unavailable_days ?? [],
    },
  });

  const selectedDays = form.watch('unavailable_days') ?? [];

  const toggleDay = (dayIndex: number) => {
    const current = form.getValues('unavailable_days') ?? [];
    const next = current.includes(dayIndex)
      ? current.filter((d) => d !== dayIndex)
      : [...current, dayIndex];
    form.setValue('unavailable_days', next);
  };

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="flex flex-col">
        <h3 className="font-semibold text-sm text-mega mb-4">
          추가 정보 <span className="text-mega-gray font-normal">(선택)</span>
        </h3>

        {/* 은행 + 계좌번호 */}
        <div className="flex gap-2">
          <div className="flex-1">
            <RHFInput form={form} name="bank_name" label="은행명" placeholder="SC제일은행" />
          </div>
          <div className="flex-[2]">
            <RHFInput
              form={form}
              name="account_number"
              label="계좌번호"
              placeholder="계좌번호 입력"
            />
          </div>
        </div>

        {/* 입사일 */}
        <RHFInput
          form={form}
          name="hire_date"
          label="입사 예정일"
          placeholder="YYYY-MM-DD"
          maxLength={10}
          transform={formatBirthDate}
        />

        {/* 보건증 만료일 */}
        <RHFInput
          form={form}
          name="health_cert_expire"
          label="보건증 만료일"
          placeholder="YYYY-MM-DD"
          maxLength={10}
          transform={formatBirthDate}
        />

        {/* 고정 불가 요일 */}
        <div className="flex flex-col gap-2 mb-4">
          <label className="text-sm font-medium">고정 불가 요일</label>
          <div className="flex gap-1">
            {DAYS.map((day, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={`flex-1 py-2 rounded-md text-xs font-medium border transition-all duration-150 ${
                  selectedDays.includes(i)
                    ? 'bg-mega text-white border-mega shadow-sm'
                    : 'border-gray-200 hover:border-mega hover:text-mega'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          className="mt-1 w-full bg-mega hover:bg-mega/90 active:scale-[0.98] transition-all disabled:opacity-60"
          disabled={isPending}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              신청 중...
            </span>
          ) : (
            '가입 신청 완료'
          )}
        </Button>
      </form>
    </Form>
  );
}

// ── 완료 화면 ──────────────────────────────────────────────────────────────
function CompletedStep({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
        <CheckCircle2 size={40} className="text-green-500" />
      </div>
      <div>
        <h3 className="font-semibold text-base">가입 신청 완료!</h3>
        <p className="text-sm text-mega-gray mt-1">관리자 승인 후 로그인하실 수 있습니다.</p>
      </div>
      <Button
        variant="outline"
        className="w-full hover:border-mega hover:text-mega transition-all"
        onClick={onBack}
      >
        로그인으로 돌아가기
      </Button>
    </div>
  );
}
