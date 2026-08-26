export interface Neighborhood {
  id: string;
  name: string;
  color: string;
  highlightColor: string;
  path: string;
  center: { x: number; y: number };
  description?: string;
  totalFeedbacks?: number;
}

export type UserRole = 'cidadao' | 'vereador' | 'lideranca';

export interface CouncilMember {
  id: string;
  name: string;
  title: string;
  party: string;
  avatar_url?: string;
  viewed: boolean;
  viewed_at?: string;
  response?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  cpf: string;
  role: UserRole;
  verified_2fa: boolean;
  avatar_url?: string;
}

export interface FeedbackImage {
  id: string;
  url: string;
  caption?: string;
}

export interface Comment {
  id: string;
  feedback_id: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  content: string;
  created_at: string;
}

export interface Feedback {
  id: string;
  neighborhood_id: string;
  neighborhood_name: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  title: string;
  description: string;
  category: 'infraestrutura' | 'saude' | 'educacao' | 'seguranca' | 'transporte' | 'cultura' | 'outro';
  images: FeedbackImage[];
  likes_count: number;
  comments_count: number;
  council_views: CouncilMember[];
  has_liked?: boolean;
  created_at: string;
}

export type FilterType = 'recent' | 'oldest' | 'popular';
export type ViewMode = 'map' | 'list' | 'metrics';
