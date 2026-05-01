export interface NotificationDTO {
  id: number;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  items: NotificationDTO[];
  unread_count: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}
