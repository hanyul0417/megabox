const BASE_URL = (import.meta.env.VITE_BASE_URL as string) || 'http://localhost:8000';

export function getProfileImageUrl(filename: string | null | undefined): string | undefined {
  if (!filename) return undefined;
  return `${BASE_URL}/uploads/profiles/${filename}`;
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
