import type {
  AttendanceDailySummaryDTO,
  ChangePasswordDTO,
  MyMonthlyAttendanceDTO,
  MyProfileDTO,
  UpdateMyProfileDTO,
} from './dto';

import { apiClient } from '@/shared/api/apiClients';

export const getMyProfile = () =>
  apiClient.get<MyProfileDTO>({ url: '/api/auth/me/profile' });

export const updateMyProfile = (data: UpdateMyProfileDTO) =>
  apiClient.patch<MyProfileDTO>({ url: '/api/auth/me/profile', data });

export const changePassword = (data: ChangePasswordDTO) =>
  apiClient.post<{ message: string }>({ url: '/api/auth/change-password', data });

export const uploadAvatar = (file: File) =>
  // interceptors.ts의 multipart/form-data 변환 로직을 활용
  // Content-Type: multipart/form-data 설정 시 data 객체를 자동으로 FormData로 변환
  apiClient.post<MyProfileDTO>({
    url: '/api/auth/me/avatar',
    data: { file },
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getMyMonthlyAttendance = (year: number, month: number) =>
  apiClient.get<MyMonthlyAttendanceDTO>({
    url: '/api/workstatus/my/monthly',
    params: { year, month },
  });

export type { AttendanceDailySummaryDTO, MyMonthlyAttendanceDTO, MyProfileDTO };
