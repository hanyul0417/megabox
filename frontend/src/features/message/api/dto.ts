export interface MessageResponse {
  id: number;
  sender_id: number;
  sender_name: string;
  sender_position: string;
  receiver_id: number;
  receiver_name: string;
  receiver_position: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface MessageCreateDTO {
  receiver_id: number;
  content: string;
}

export interface UserSearchResultDTO {
  id: number;
  name: string;
  position: string;
}

export interface UnreadCountDTO {
  count: number;
}
