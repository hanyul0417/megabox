const BASE_URL = (import.meta.env.VITE_BASE_URL as string) || 'http://localhost:8000';

export function getProfileImageUrl(filename: string | null | undefined): string | undefined {
  if (!filename) return undefined;
  return `${BASE_URL}/uploads/profiles/${filename}`;
}
