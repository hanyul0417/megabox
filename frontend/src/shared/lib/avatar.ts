const BASE_URL = (import.meta.env.VITE_BASE_URL as string) || 'http://localhost:8000';

export function getProfileImageUrl(filename: string | null | undefined): string | undefined {
  if (!filename) return undefined;
  return `${BASE_URL}/uploads/profiles/${filename}`;
}

const DEFAULT_AVATAR = {
  male: `${import.meta.env.BASE_URL}icons/icon-m.png`,
  female: `${import.meta.env.BASE_URL}icons/icon-w.png`,
} as const;

/**
 * 성별 기본 프로필 아이콘 URL
 * - "남" / "여" (백엔드 GenderEnum 값) 및 male/female 등 영문 값도 허용
 * - 성별 정보가 없으면 undefined → 호출부에서 기존 이니셜 표시로 대체
 */
export function getDefaultAvatarUrl(gender: string | null | undefined): string | undefined {
  if (!gender) return undefined;
  const g = gender.trim().toLowerCase();
  if (g === '남' || g === 'male' || g === 'm') return DEFAULT_AVATAR.male;
  if (g === '여' || g === 'female' || g === 'f' || g === 'w') return DEFAULT_AVATAR.female;
  return undefined;
}

/** 프로필 사진이 있으면 사진, 없으면 성별 기본 아이콘 URL */
export function getAvatarSrc(
  profileImage: string | null | undefined,
  gender: string | null | undefined,
): string | undefined {
  return getProfileImageUrl(profileImage) ?? getDefaultAvatarUrl(gender);
}

/**
 * 상대경로 업로드 URL을 절대경로로 변환
 * - "/uploads/..." → "http://백엔드주소/uploads/..."
 * - 이미 http(s)로 시작하면 그대로 반환
 */
export function getUploadUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return `${BASE_URL}${path}`;
  return path;
}
