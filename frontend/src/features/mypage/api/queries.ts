import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  changePassword,
  getMyMonthlyAttendance,
  getMyProfile,
  updateMyProfile,
  uploadAvatar,
} from './service';

import type { ChangePasswordDTO, UpdateMyProfileDTO } from './dto';

import { QUERY_KEYS } from '@/shared/api/queryKeys';

export function useMyProfileQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.mypage.profile(),
    queryFn: getMyProfile,
  });
}

export function useUpdateMyProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateMyProfileDTO) => updateMyProfile(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mypage.profile() });
      toast.success('정보가 수정되었습니다.');
    },
    onError: () => {
      toast.error('정보 수정에 실패했습니다.');
    },
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (data: ChangePasswordDTO) => changePassword(data),
    onSuccess: () => {
      toast.success('비밀번호가 변경되었습니다.');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail ?? '비밀번호 변경에 실패했습니다.');
    },
  });
}

export function useUploadAvatarMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mypage.profile() });
      toast.success('프로필 사진이 업데이트되었습니다.');
    },
    onError: () => {
      toast.error('프로필 사진 업로드에 실패했습니다.');
    },
  });
}

export function useMyMonthlyAttendanceQuery(year: number, month: number) {
  return useQuery({
    queryKey: QUERY_KEYS.mypage.attendance(year, month),
    queryFn: () => getMyMonthlyAttendance(year, month),
  });
}
