export interface SocialPost {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  mentions: string[];
  expires_at?: string | Date;
  approved_at?: string | Date;
  approved_by?: string;
  created_at: string | Date;
  updated_at: string | Date;
  user_profile?: {
    full_name: string;
    avatar_url: string;
  };
  approved_by_profile?: {
    full_name: string;
    avatar_url: string;
  };
  comment_count?: number;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string | Date;
  updated_at: string | Date;
  user_profile?: {
    full_name: string;
    avatar_url: string;
  };
}

export interface PostApproval {
  id: string;
  post_id: string;
  user_id: string;
  approved: boolean;
  created_at: string | Date;
}

export interface CreatePostRequest {
  content: string;
  image_url?: string;
  expires_at?: string | Date;
}

export interface CreateCommentRequest {
  content: string;
}
