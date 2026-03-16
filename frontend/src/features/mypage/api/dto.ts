export interface MyProfileDTO {
  id: number;
  username: string;
  name: string;
  position: string;
  gender?: string | null;
  birth_date?: string | null;
  phone?: string | null;
  email?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  hire_date?: string | null;
  profile_image?: string | null;
}

export interface UpdateMyProfileDTO {
  phone?: string;
  email?: string;
  bank_name?: string;
  account_number?: string;
}

export interface ChangePasswordDTO {
  current_password: string;
  new_password: string;
}

export interface AttendanceDailySummaryDTO {
  user_id: number;
  user_name?: string | null;
  position?: string | null;
  work_date: string;
  check_in?: string | null;
  break_start?: string | null;
  break_end?: string | null;
  check_out?: string | null;
  total_work_hours?: number | null;
  day_hours?: number | null;
  night_hours?: number | null;
}

export interface MyMonthlyAttendanceDTO {
  records: AttendanceDailySummaryDTO[];
  total: number;
}
