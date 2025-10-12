/*
  # Marketplace Platform Database Schema

  ## Overview
  This migration creates the complete database structure for a local service marketplace platform
  that connects consumers with service providers using distance-based matching and AI.

  ## 1. New Tables

  ### `profiles`
  - `id` (uuid, primary key, references auth.users)
  - `email` (text, unique, not null)
  - `full_name` (text, not null)
  - `phone` (text)
  - `user_type` (text, not null) - 'consumer' or 'provider'
  - `avatar_url` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `service_categories`
  - `id` (uuid, primary key)
  - `name` (text, unique, not null) - e.g., 'Driver', 'Tailor', 'Beautician', 'Electrician'
  - `description` (text)
  - `icon` (text) - icon identifier
  - `created_at` (timestamptz)

  ### `service_providers`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles, unique)
  - `category_id` (uuid, references service_categories)
  - `bio` (text)
  - `experience_years` (integer, default 0)
  - `hourly_rate` (decimal)
  - `latitude` (decimal, not null) - for distance-based matching
  - `longitude` (decimal, not null) - for distance-based matching
  - `address` (text)
  - `is_available` (boolean, default true)
  - `verification_status` (text, default 'pending') - 'pending', 'verified', 'rejected'
  - `rating_average` (decimal, default 0)
  - `rating_count` (integer, default 0)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `service_requests`
  - `id` (uuid, primary key)
  - `consumer_id` (uuid, references profiles, not null)
  - `category_id` (uuid, references service_categories, not null)
  - `title` (text, not null)
  - `description` (text, not null)
  - `latitude` (decimal, not null) - consumer location
  - `longitude` (decimal, not null) - consumer location
  - `address` (text)
  - `budget_min` (decimal)
  - `budget_max` (decimal)
  - `status` (text, default 'open') - 'open', 'matched', 'in_progress', 'completed', 'cancelled'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `service_matches`
  - `id` (uuid, primary key)
  - `request_id` (uuid, references service_requests)
  - `provider_id` (uuid, references service_providers)
  - `distance_km` (decimal) - calculated distance
  - `ai_score` (decimal) - AI matching score (0-100)
  - `status` (text, default 'suggested') - 'suggested', 'accepted', 'rejected', 'completed'
  - `created_at` (timestamptz)

  ### `reviews`
  - `id` (uuid, primary key)
  - `match_id` (uuid, references service_matches, unique)
  - `provider_id` (uuid, references service_providers)
  - `consumer_id` (uuid, references profiles)
  - `rating` (integer, not null) - 1-5 stars
  - `comment` (text)
  - `created_at` (timestamptz)

  ### `provider_skills`
  - `id` (uuid, primary key)
  - `provider_id` (uuid, references service_providers)
  - `skill_name` (text, not null)
  - `proficiency_level` (text) - 'beginner', 'intermediate', 'expert'

  ## 2. Security

  All tables have Row Level Security (RLS) enabled with appropriate policies:

  - Profiles: Users can read all profiles, but only update their own
  - Service Categories: Public read access, admin-only writes
  - Service Providers: Public read for verified providers, providers manage their own data
  - Service Requests: Consumers manage their own requests, providers can view open requests
  - Service Matches: Consumers and matched providers can view their matches
  - Reviews: Public read, only consumers who completed service can write
  - Provider Skills: Public read, providers manage their own skills

  ## 3. Important Notes

  - PostGIS extension is enabled for advanced geospatial queries
  - Distance calculations use Earth's radius (6371 km) for accurate matching
  - All timestamps use timestamptz for proper timezone handling
  - Rating system automatically updates provider averages via triggers
  - Indexes are added on foreign keys and frequently queried columns
*/

-- Enable PostGIS extension for geospatial calculations
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  user_type text NOT NULL CHECK (user_type IN ('consumer', 'provider')),
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create service categories table
CREATE TABLE IF NOT EXISTS service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  icon text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service categories are viewable by everyone"
  ON service_categories FOR SELECT
  TO authenticated
  USING (true);

-- Create service providers table
CREATE TABLE IF NOT EXISTS service_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES service_categories(id),
  bio text,
  experience_years integer DEFAULT 0,
  hourly_rate decimal(10, 2),
  latitude decimal(10, 8) NOT NULL,
  longitude decimal(11, 8) NOT NULL,
  address text,
  is_available boolean DEFAULT true,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  rating_average decimal(3, 2) DEFAULT 0 CHECK (rating_average >= 0 AND rating_average <= 5),
  rating_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Verified providers are viewable by everyone"
  ON service_providers FOR SELECT
  TO authenticated
  USING (verification_status = 'verified');

CREATE POLICY "Providers can view own profile"
  ON service_providers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Providers can update own profile"
  ON service_providers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Providers can insert own profile"
  ON service_providers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create service requests table
CREATE TABLE IF NOT EXISTS service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES service_categories(id),
  title text NOT NULL,
  description text NOT NULL,
  latitude decimal(10, 8) NOT NULL,
  longitude decimal(11, 8) NOT NULL,
  address text,
  budget_min decimal(10, 2),
  budget_max decimal(10, 2),
  status text DEFAULT 'open' CHECK (status IN ('open', 'matched', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Consumers can view own requests"
  ON service_requests FOR SELECT
  TO authenticated
  USING (consumer_id = auth.uid());

CREATE POLICY "Providers can view open requests"
  ON service_requests FOR SELECT
  TO authenticated
  USING (
    status = 'open' AND 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'provider'
    )
  );

CREATE POLICY "Consumers can insert own requests"
  ON service_requests FOR INSERT
  TO authenticated
  WITH CHECK (consumer_id = auth.uid());

CREATE POLICY "Consumers can update own requests"
  ON service_requests FOR UPDATE
  TO authenticated
  USING (consumer_id = auth.uid())
  WITH CHECK (consumer_id = auth.uid());

CREATE POLICY "Consumers can delete own requests"
  ON service_requests FOR DELETE
  TO authenticated
  USING (consumer_id = auth.uid());

-- Create service matches table
CREATE TABLE IF NOT EXISTS service_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  distance_km decimal(10, 2),
  ai_score decimal(5, 2) CHECK (ai_score >= 0 AND ai_score <= 100),
  status text DEFAULT 'suggested' CHECK (status IN ('suggested', 'accepted', 'rejected', 'completed')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(request_id, provider_id)
);

ALTER TABLE service_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Consumers can view matches for own requests"
  ON service_matches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_requests 
      WHERE service_requests.id = request_id 
      AND service_requests.consumer_id = auth.uid()
    )
  );

CREATE POLICY "Providers can view own matches"
  ON service_matches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_providers 
      WHERE service_providers.id = provider_id 
      AND service_providers.user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update own matches"
  ON service_matches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_providers 
      WHERE service_providers.id = provider_id 
      AND service_providers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_providers 
      WHERE service_providers.id = provider_id 
      AND service_providers.user_id = auth.uid()
    )
  );

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid UNIQUE NOT NULL REFERENCES service_matches(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  consumer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Consumers can create reviews for completed services"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    consumer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM service_matches 
      WHERE service_matches.id = match_id 
      AND service_matches.status = 'completed'
    )
  );

-- Create provider skills table
CREATE TABLE IF NOT EXISTS provider_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  proficiency_level text CHECK (proficiency_level IN ('beginner', 'intermediate', 'expert'))
);

ALTER TABLE provider_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Provider skills are viewable by everyone"
  ON provider_skills FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can manage own skills"
  ON provider_skills FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_providers 
      WHERE service_providers.id = provider_id 
      AND service_providers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_providers 
      WHERE service_providers.id = provider_id 
      AND service_providers.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_providers_location ON service_providers(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_service_providers_category ON service_providers(category_id);
CREATE INDEX IF NOT EXISTS idx_service_providers_user ON service_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_location ON service_requests(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_service_requests_category ON service_requests(category_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_consumer ON service_requests(consumer_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_matches_request ON service_matches(request_id);
CREATE INDEX IF NOT EXISTS idx_service_matches_provider ON service_matches(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_provider ON reviews(provider_id);

-- Function to update provider rating average
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE service_providers
  SET 
    rating_average = (
      SELECT AVG(rating)::decimal(3,2)
      FROM reviews
      WHERE provider_id = NEW.provider_id
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE provider_id = NEW.provider_id
    )
  WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update provider ratings
CREATE TRIGGER trigger_update_provider_rating
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_rating();

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 decimal, lon1 decimal,
  lat2 decimal, lon2 decimal
)
RETURNS decimal AS $$
DECLARE
  earth_radius decimal := 6371; -- km
  dlat decimal;
  dlon decimal;
  a decimal;
  c decimal;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  a := sin(dlat/2) * sin(dlat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dlon/2) * sin(dlon/2);
  
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Insert default service categories
INSERT INTO service_categories (name, description, icon) VALUES
  ('Driver', 'Professional drivers for transportation services', 'car'),
  ('Tailor', 'Custom tailoring and clothing alterations', 'scissors'),
  ('Beautician', 'Beauty and grooming services', 'sparkles'),
  ('Electrician', 'Electrical installation and repair services', 'zap'),
  ('Plumber', 'Plumbing installation and repair services', 'droplet'),
  ('Carpenter', 'Woodworking and furniture services', 'hammer'),
  ('Cleaner', 'Home and office cleaning services', 'sparkles'),
  ('Tutor', 'Educational tutoring services', 'book-open')
ON CONFLICT (name) DO NOTHING;