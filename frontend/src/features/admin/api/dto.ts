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

// 요일별 불가 시간대
export interface UnavailableTimeSlot {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

export interface UnavailableDayConfig {
  all_day: boolean;
  slots: UnavailableTimeSlot[];
}

// key: "0"=일, "1"=월, ..., "6"=토
export type UnavailableTimes = Partial<Record<string, UnavailableDayConfig>>;

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
  annual_leave_hours?: number;
  unavailable_days?: number[];
  unavailable_times?: UnavailableTimes;
  health_cert_expire?: string;
  profile_image?: string | null;
  weekend_dayoff_limit?: number | null;
  employment_reported?: boolean;
  insure_hire_month?: boolean;
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
  annual_leave_hours?: number;
  unavailable_days?: number[];
  unavailable_times?: UnavailableTimes;
  health_cert_expire?: string;
  weekend_dayoff_limit?: number | null;
}

export interface UpdateAdminUserRequestDTO {
  name?: string;
  position?: string;
  gender?: string;
  birth_date?: string | null;
  ssn?: string;
  password?: string;
  phone?: string;
  email?: string;
  bank_name?: string;
  account_number?: string;
  hire_date?: string | null;
  retire_date?: string | null;
  is_active?: boolean;
  wage?: number;
  annual_leave_hours?: number;
  unavailable_days?: number[];
  unavailable_times?: UnavailableTimes;
  health_cert_expire?: string | null;
  weekend_dayoff_limit?: number | null;
  employment_reported?: boolean;
  insure_hire_month?: boolean;
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
  profile_image?: string | null;
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

export interface SyncAllDefaultWagesResponseDTO {
  total: number;
  inserted: number;
  updated: number;
}

// 급여 지급일
export interface PayDateResponseDTO {
  id: number;
  year: number;
  month: number;
  pay_date: string; // "YYYY-MM-DD"
}

export interface PayDateCreateDTO {
  year: number;
  month: number;
  pay_date: string;
}

export interface PayDateUpdateDTO {
  pay_date: string;
}

export interface AutoPayDateRequestDTO {
  year: number;
  month: number;
  payment_day?: number;
}

// 시급 일괄 적용
export interface BulkUpdateWageRequestDTO {
  wage: number;
  zero_only: boolean;
}

export interface BulkUpdateWageResponseDTO {
  updated_count: number;
}

// 시프트 프리셋
export interface ShiftPresetDTO {
  id: number;
  label: string;
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
  border_color: string; // hex e.g. "#e5e7eb"
  font_color: string; // hex e.g. "#374151"
  sort_order: number;
}

export interface CreateShiftPresetRequestDTO {
  label: string;
  start_time: string;
  end_time: string;
  border_color: string;
  font_color: string;
  sort_order: number;
}

export interface UpdateShiftPresetRequestDTO {
  label?: string;
  start_time?: string;
  end_time?: string;
  border_color?: string;
  font_color?: string;
  sort_order?: number;
}

// 유니폼
export interface UniformWithUserDTO {
  user_id: number;
  name: string;
  position: string;
  gender?: string | null;
  is_active: boolean;
  hat?: string | null;
  belt?: string | null;
  top_style?: string | null;
  top_size?: string | null;
  short_sleeve_style?: string | null;
  short_sleeve_size?: string | null;
  bottom_style?: string | null;
  bottom_size?: string | null;
  necktie?: string | null;
}

export interface UpdateUniformRequestDTO {
  hat?: string | null;
  belt?: string | null;
  top_style?: string | null;
  top_size?: string | null;
  short_sleeve_style?: string | null;
  short_sleeve_size?: string | null;
  bottom_style?: string | null;
  bottom_size?: string | null;
  necktie?: string | null;
}

export interface UniformStockDTO {
  item_key: string;
  category: string;
  variant: string;
  quantity: number;
  issued: number;
  remaining: number;
}

export interface UpdateUniformStockRequestDTO {
  quantity: number;
}

// 휴무 한도 설정
export type AnnualLeavePayMethod = 'scheduled' | 'daily_avg' | 'daily_avg_min_scheduled';

export interface DayoffSettingDTO {
  monthly_limit: number;
  default_annual_leave_hours: number;
  annual_leave_pay_method: AnnualLeavePayMethod;
}

export interface UpdateDayoffSettingRequestDTO {
  monthly_limit: number;
  default_annual_leave_hours?: number;
  annual_leave_pay_method?: AnnualLeavePayMethod;
}

// 직원별 급여 이력
export interface UserPayrollHistoryDTO {
  payroll_id: number;
  year: number;
  month: number;
  wage?: number;
  // 근무 요약
  total_work_days?: number;
  total_work_hours?: number;
  // 시간 항목
  day_hours?: number;
  night_hours?: number;
  weekly_allowance_hours?: number;
  annual_leave_hours?: number;
  holiday_hours?: number;
  // 급여 항목
  day_wage?: number;
  night_wage?: number;
  weekly_allowance_pay?: number;
  annual_leave_pay?: number;
  holiday_pay?: number;
  gross_pay?: number;
  // 공제 항목
  insurance_health?: number;
  insurance_care?: number;
  insurance_employment?: number;
  insurance_pension?: number;
  total_deduction?: number;
  net_pay?: number;
}

// 직원 소프트 삭제
export interface DeleteAdminUserRequestDTO {
  admin_password: string;
  delete_reason?: string;
}

export interface DeletedUserDTO {
  id: number;
  username: string;
  name: string;
  position: string;
  hire_date?: string;
  deleted_at: string; // ISO datetime
  delete_reason?: string;
  days_remaining: number; // 복구 가능 잔여일 (0이면 당일)
}

export interface DeletedUsersResponseDTO {
  total: number;
  items: DeletedUserDTO[];
}

// 직원 영구 삭제
export interface PurgeUserRequestDTO {
  admin_password: string;
}

export interface PurgeDeletedCountsDTO {
  schedules: number;
  attendance_events: number;
  payrolls: number;
  posts: number;
  comments: number;
  day_off_requests: number;
  shift_requests: number;
}

export interface PurgeUserResultDTO {
  name: string;
  username: string;
  deleted_counts: PurgeDeletedCountsDTO;
}

// 체크리스트
export interface ChecklistItemDTO {
  id: number;
  day_of_week: number; // 0=월 ~ 6=일
  content: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ChecklistItemWithStatusDTO {
  id: number;
  content: string;
  sort_order: number;
  is_checked: boolean;
}

export interface CreateChecklistItemRequestDTO {
  day_of_week: number;
  content: string;
  sort_order?: number;
}

export interface UpdateChecklistItemRequestDTO {
  content?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface ChecklistToggleResponseDTO {
  item_id: number;
  checked: boolean;
}

// 키오스크 공지사항
export interface KioskNoticeDTO {
  id: number;
  content: string;
  start_date: string; // "YYYY-MM-DD"
  end_date: string;   // "YYYY-MM-DD"
  is_active: boolean;
  sort_order: number;
  created_at: string; // ISO datetime
}

export interface CreateKioskNoticeRequestDTO {
  content: string;
  start_date: string;
  end_date: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateKioskNoticeRequestDTO {
  content?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  sort_order?: number;
}