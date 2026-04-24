import { z } from 'zod';

export const DAYS_OF_WEEK = [
  { value: 0, label: '월' },
  { value: 1, label: '화' },
  { value: 2, label: '수' },
  { value: 3, label: '목' },
  { value: 4, label: '금' },
  { value: 5, label: '토' },
  { value: 6, label: '일' },
] as const;

export const userFormSchema = z.object({
  // 생성 전용 (수정 시 optional)
  username: z.string().min(2, '아이디는 2자 이상이어야 합니다.').max(30).optional(),
  password: z.string().min(4, '비밀번호는 4자 이상이어야 합니다.').optional().or(z.literal('')),
  // 기본정보
  name: z.string().min(1, '이름을 입력해주세요.'),
  position: z.string().min(1, '직급을 선택해주세요.'),
  gender: z.string().optional(),
  birth_date: z.string().optional(),
  ssn: z.string().optional(),
  // 연락처/계좌
  phone: z.string().optional(),
  email: z.union([z.email('올바른 이메일을 입력해주세요.'), z.literal('')]).optional(),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  // 근무정보
  hire_date: z.string().optional(),
  retire_date: z.string().optional(),
  is_active: z.boolean().optional(),
  wage: z.number({ message: '시급은 숫자로 입력해주세요.' }).min(0).optional(),
  annual_leave_hours: z.number({ message: '소정근로시간은 숫자로 입력해주세요.' }).min(0).optional(),
  health_cert_expire: z.string().optional(),
  // 스케줄설정
  unavailable_days: z.array(z.number()).optional(),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

// 생성 시 username/password 필수 강제
export const createUserFormSchema = userFormSchema.extend({
  username: z.string().min(2, '아이디는 2자 이상이어야 합니다.').max(30),
  password: z.string().min(4, '비밀번호는 4자 이상이어야 합니다.'),
});

export const POSITION_OPTIONS = ['크루', '리더', '미화', '관리자'] as const;

export const GENDER_OPTIONS = [
  { value: '남', label: '남' },
  { value: '여', label: '여' },
] as const;

export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'true', label: '재직중' },
  { value: 'false', label: '퇴직' },
] as const;
