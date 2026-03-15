// 공휴일
export interface HolidayDTO {
  id: number;
  label: string;
  date: string; // "YYYY-MM-DD"
}

export interface CreateHolidayRequestDTO {
  label: string;
  date: string;
}

export interface UpdateHolidayRequestDTO {
  label?: string | null;
}

// 직원
export interface AdminUserDTO {
  id: number;
  username: string;
  name: string;
  position: string;
  gender?: string;
  birth_date?: string;
  ssn?: string;
  phone?: string;
  email?: string;
  bank_name?: string;
  account_number?: string;
  hire_date?: string;
  retire_date?: string;
  is_active: boolean;
  status: string;
  wage?: number;
  unavailable_days?: number[];
  health_cert_expire?: string;
}

export type AdminUserDetailDTO = AdminUserDTO & {
  login_failed_count?: number;
  last_login_at?: string;
  last_login_failed_at?: string;
};

export interface AdminUsersResponseDTO {
  items: AdminUserDTO[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateAdminUserRequestDTO {
  username: string;
  password: string;
  name: string;
  position: string;
  gender?: string;
  birth_date?: string;
  ssn?: string;
  phone?: string;
  email?: string;
  bank_name?: string;
  account_number?: string;
  hire_date?: string;
  retire_date?: string;
  wage?: number;
  unavailable_days?: number[];
  health_cert_expire?: string;
}

export interface UpdateAdminUserRequestDTO {
  name?: string;
  position?: string;
  gender?: string;
  birth_date?: string;
  ssn?: string;
  password?: string;
  phone?: string;
  email?: string;
  bank_name?: string;
  account_number?: string;
  hire_date?: string;
  retire_date?: string;
  is_active?: boolean;
  wage?: number;
  unavailable_days?: number[];
  health_cert_expire?: string;
}

// 가입 승인 대기
export interface PendingUserDTO {
  id: number;
  username: string;
  name: string;
  gender?: string;
  birth_date?: string;
  phone?: string;
  email?: string;
  hire_date?: string;
  health_cert_expire?: string;
  unavailable_days?: number[];
}

export interface PendingUsersResponseDTO {
  total: number;
  items: PendingUserDTO[];
}

export interface RejectUserRequestDTO {
  reason?: string;
}

export interface SuspendUserRequestDTO {
  reason?: string;
}

// 4대보험 요율
export interface InsuranceRateResponseDTO {
  id: number;
  year: number;
  national_pension_rate?: number | null;
  health_insurance_rate?: number | null;
  long_term_care_rate?: number | null;
  employment_insurance_rate?: number | null;
}

export interface InsuranceRateCreateDTO {
  year: number;
  national_pension_rate: number;
  health_insurance_rate: number;
  long_term_care_rate: number;
  employment_insurance_rate: number;
}

export interface SyncHolidaysResponseDTO {
  year: number;
  saved: number;
}

// 최저임금
export interface DefaultWageResponseDTO {
  id: number;
  year: number;
  wage: number;
}

// 시급 일괄 적용
export interface BulkUpdateWageRequestDTO {
  wage: number;
  zero_only: boolean;
}

export interface BulkUpdateWageResponseDTO {
  updated_count: number;
}
