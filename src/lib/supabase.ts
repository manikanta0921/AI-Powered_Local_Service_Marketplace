import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  user_type: 'consumer' | 'provider';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
};

export type ServiceCategory = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  created_at: string;
};

export type ServiceProvider = {
  id: string;
  user_id: string;
  category_id: string;
  bio?: string;
  experience_years: number;
  hourly_rate?: number;
  latitude: number;
  longitude: number;
  address?: string;
  is_available: boolean;
  verification_status: 'pending' | 'verified' | 'rejected';
  rating_average: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
};

export type ServiceRequest = {
  id: string;
  consumer_id: string;
  category_id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  address?: string;
  budget_min?: number;
  budget_max?: number;
  status: 'open' | 'matched' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
};

export type ServiceMatch = {
  id: string;
  request_id: string;
  provider_id: string;
  distance_km?: number;
  ai_score?: number;
  status: 'suggested' | 'accepted' | 'rejected' | 'completed';
  created_at: string;
};

export type Review = {
  id: string;
  match_id: string;
  provider_id: string;
  consumer_id: string;
  rating: number;
  comment?: string;
  created_at: string;
};
