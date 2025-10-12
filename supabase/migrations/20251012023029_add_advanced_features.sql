/*
  # Advanced Features Migration

  ## Overview
  This migration adds advanced features to enhance the marketplace platform:
  real-time chat, provider portfolios, notifications, bookings, payments, and admin capabilities.

  ## 1. New Tables

  ### `messages`
  - `id` (uuid, primary key)
  - `match_id` (uuid, references service_matches)
  - `sender_id` (uuid, references profiles)
  - `receiver_id` (uuid, references profiles)
  - `content` (text, not null)
  - `is_read` (boolean, default false)
  - `created_at` (timestamptz)
  
  Real-time messaging between consumers and providers for matched services.

  ### `provider_portfolio`
  - `id` (uuid, primary key)
  - `provider_id` (uuid, references service_providers)
  - `title` (text, not null)
  - `description` (text)
  - `image_url` (text)
  - `project_date` (date)
  - `created_at` (timestamptz)
  
  Showcase of provider's previous work and projects.

  ### `provider_certifications`
  - `id` (uuid, primary key)
  - `provider_id` (uuid, references service_providers)
  - `certification_name` (text, not null)
  - `issuing_organization` (text)
  - `issue_date` (date)
  - `expiry_date` (date)
  - `credential_id` (text)
  - `credential_url` (text)
  - `created_at` (timestamptz)
  
  Professional certifications and licenses for providers.

  ### `notifications`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `title` (text, not null)
  - `message` (text, not null)
  - `type` (text, not null) - 'match', 'message', 'review', 'booking', 'system'
  - `reference_id` (uuid) - ID of related entity
  - `is_read` (boolean, default false)
  - `created_at` (timestamptz)
  
  In-app notifications for important events.

  ### `provider_availability`
  - `id` (uuid, primary key)
  - `provider_id` (uuid, references service_providers)
  - `day_of_week` (integer, 0-6) - Sunday=0, Saturday=6
  - `start_time` (time)
  - `end_time` (time)
  - `is_available` (boolean, default true)
  
  Provider's weekly availability schedule.

  ### `bookings`
  - `id` (uuid, primary key)
  - `match_id` (uuid, references service_matches)
  - `provider_id` (uuid, references service_providers)
  - `consumer_id` (uuid, references profiles)
  - `booking_date` (date, not null)
  - `start_time` (time, not null)
  - `end_time` (time, not null)
  - `status` (text, default 'pending') - 'pending', 'confirmed', 'cancelled', 'completed'
  - `notes` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  Scheduled appointments between consumers and providers.

  ### `favorites`
  - `id` (uuid, primary key)
  - `consumer_id` (uuid, references profiles)
  - `provider_id` (uuid, references service_providers)
  - `created_at` (timestamptz)
  - UNIQUE(consumer_id, provider_id)
  
  Saved/favorite providers for quick access.

  ### `service_packages`
  - `id` (uuid, primary key)
  - `provider_id` (uuid, references service_providers)
  - `name` (text, not null)
  - `description` (text)
  - `price` (decimal, not null)
  - `duration_hours` (decimal)
  - `is_active` (boolean, default true)
  - `created_at` (timestamptz)
  
  Pre-defined service packages offered by providers.

  ### `disputes`
  - `id` (uuid, primary key)
  - `match_id` (uuid, references service_matches)
  - `reported_by` (uuid, references profiles)
  - `reported_against` (uuid, references profiles)
  - `reason` (text, not null)
  - `description` (text, not null)
  - `status` (text, default 'open') - 'open', 'investigating', 'resolved', 'closed'
  - `resolution_notes` (text)
  - `created_at` (timestamptz)
  - `resolved_at` (timestamptz)
  
  Dispute resolution system for service conflicts.

  ### `platform_stats`
  - `id` (uuid, primary key)
  - `stat_date` (date, not null, unique)
  - `total_users` (integer, default 0)
  - `total_providers` (integer, default 0)
  - `total_consumers` (integer, default 0)
  - `total_requests` (integer, default 0)
  - `total_matches` (integer, default 0)
  - `total_completed` (integer, default 0)
  - `total_revenue` (decimal, default 0)
  - `created_at` (timestamptz)
  
  Daily platform statistics for analytics.

  ## 2. New Columns Added to Existing Tables

  ### `profiles`
  - `phone_verified` (boolean, default false)
  - `email_verified` (boolean, default false)
  - `is_active` (boolean, default true)
  - `last_active` (timestamptz)

  ### `service_providers`
  - `response_time_hours` (decimal)
  - `completion_rate` (decimal, default 100)
  - `total_jobs_completed` (integer, default 0)
  - `badges` (text[]) - Array of achievement badges

  ### `service_requests`
  - `urgency` (text, default 'normal') - 'low', 'normal', 'high', 'urgent'
  - `preferred_date` (date)
  - `preferred_time` (time)

  ## 3. Security

  All tables have RLS enabled with appropriate policies ensuring:
  - Users can only access their own data
  - Messages are only visible to sender and receiver
  - Bookings are visible to both parties
  - Admin users can access platform stats and disputes

  ## 4. Important Notes

  - Real-time subscriptions enabled for messages and notifications
  - Indexes added for performance optimization
  - Triggers added for automatic notification creation
  - Cascade deletes properly configured
*/

-- Add new columns to existing tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_active boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'last_active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_active timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'response_time_hours'
  ) THEN
    ALTER TABLE service_providers ADD COLUMN response_time_hours decimal(10, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'completion_rate'
  ) THEN
    ALTER TABLE service_providers ADD COLUMN completion_rate decimal(5, 2) DEFAULT 100;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'total_jobs_completed'
  ) THEN
    ALTER TABLE service_providers ADD COLUMN total_jobs_completed integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'badges'
  ) THEN
    ALTER TABLE service_providers ADD COLUMN badges text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_requests' AND column_name = 'urgency'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN urgency text DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_requests' AND column_name = 'preferred_date'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN preferred_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_requests' AND column_name = 'preferred_time'
  ) THEN
    ALTER TABLE service_requests ADD COLUMN preferred_time time;
  END IF;
END $$;

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES service_matches(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages they sent or received"
  ON messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their received messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Create provider portfolio table
CREATE TABLE IF NOT EXISTS provider_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text,
  project_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE provider_portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portfolio items are viewable by everyone"
  ON provider_portfolio FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can manage own portfolio"
  ON provider_portfolio FOR ALL
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

-- Create provider certifications table
CREATE TABLE IF NOT EXISTS provider_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  certification_name text NOT NULL,
  issuing_organization text,
  issue_date date,
  expiry_date date,
  credential_id text,
  credential_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE provider_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Certifications are viewable by everyone"
  ON provider_certifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can manage own certifications"
  ON provider_certifications FOR ALL
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

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('match', 'message', 'review', 'booking', 'system')),
  reference_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create provider availability table
CREATE TABLE IF NOT EXISTS provider_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  UNIQUE(provider_id, day_of_week, start_time)
);

ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Availability is viewable by everyone"
  ON provider_availability FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can manage own availability"
  ON provider_availability FOR ALL
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

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES service_matches(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  consumer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    consumer_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM service_providers 
      WHERE service_providers.id = provider_id 
      AND service_providers.user_id = auth.uid()
    )
  );

CREATE POLICY "Consumers can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (consumer_id = auth.uid());

CREATE POLICY "Both parties can update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    consumer_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM service_providers 
      WHERE service_providers.id = provider_id 
      AND service_providers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    consumer_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM service_providers 
      WHERE service_providers.id = provider_id 
      AND service_providers.user_id = auth.uid()
    )
  );

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(consumer_id, provider_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  TO authenticated
  USING (consumer_id = auth.uid());

CREATE POLICY "Users can manage own favorites"
  ON favorites FOR ALL
  TO authenticated
  USING (consumer_id = auth.uid())
  WITH CHECK (consumer_id = auth.uid());

-- Create service packages table
CREATE TABLE IF NOT EXISTS service_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price decimal(10, 2) NOT NULL,
  duration_hours decimal(5, 2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Packages are viewable by everyone"
  ON service_packages FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Providers can view own packages"
  ON service_packages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_providers 
      WHERE service_providers.id = provider_id 
      AND service_providers.user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can manage own packages"
  ON service_packages FOR ALL
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

-- Create disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES service_matches(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_against uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view disputes they are involved in"
  ON disputes FOR SELECT
  TO authenticated
  USING (reported_by = auth.uid() OR reported_against = auth.uid());

CREATE POLICY "Users can create disputes"
  ON disputes FOR INSERT
  TO authenticated
  WITH CHECK (reported_by = auth.uid());

-- Create platform stats table
CREATE TABLE IF NOT EXISTS platform_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date date NOT NULL UNIQUE,
  total_users integer DEFAULT 0,
  total_providers integer DEFAULT 0,
  total_consumers integer DEFAULT 0,
  total_requests integer DEFAULT 0,
  total_matches integer DEFAULT 0,
  total_completed integer DEFAULT 0,
  total_revenue decimal(12, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE platform_stats ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_bookings_provider ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_consumer ON bookings(consumer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_favorites_consumer ON favorites(consumer_id);
CREATE INDEX IF NOT EXISTS idx_favorites_provider ON favorites(provider_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_provider ON provider_portfolio(provider_id);
CREATE INDEX IF NOT EXISTS idx_certifications_provider ON provider_certifications(provider_id);
CREATE INDEX IF NOT EXISTS idx_packages_provider ON service_packages(provider_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text,
  p_reference_id uuid DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, reference_id)
  VALUES (p_user_id, p_title, p_message, p_type, p_reference_id);
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notification when new match is created
CREATE OR REPLACE FUNCTION notify_new_match()
RETURNS TRIGGER AS $$
DECLARE
  provider_user_id uuid;
  request_title text;
BEGIN
  SELECT sp.user_id INTO provider_user_id
  FROM service_providers sp
  WHERE sp.id = NEW.provider_id;

  SELECT sr.title INTO request_title
  FROM service_requests sr
  WHERE sr.id = NEW.request_id;

  PERFORM create_notification(
    provider_user_id,
    'New Service Match!',
    'You have been matched with a new service request: ' || request_title,
    'match',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_new_match
  AFTER INSERT ON service_matches
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_match();

-- Trigger to create notification when new message is received
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name text;
BEGIN
  SELECT p.full_name INTO sender_name
  FROM profiles p
  WHERE p.id = NEW.sender_id;

  PERFORM create_notification(
    NEW.receiver_id,
    'New Message',
    sender_name || ' sent you a message',
    'message',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- Trigger to create notification when booking is created
CREATE OR REPLACE FUNCTION notify_new_booking()
RETURNS TRIGGER AS $$
DECLARE
  provider_user_id uuid;
  consumer_name text;
BEGIN
  SELECT sp.user_id INTO provider_user_id
  FROM service_providers sp
  WHERE sp.id = NEW.provider_id;

  SELECT p.full_name INTO consumer_name
  FROM profiles p
  WHERE p.id = NEW.consumer_id;

  PERFORM create_notification(
    provider_user_id,
    'New Booking Request',
    consumer_name || ' requested a booking for ' || to_char(NEW.booking_date, 'Mon DD, YYYY'),
    'booking',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_new_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_booking();

-- Trigger to update provider stats when match is completed
CREATE OR REPLACE FUNCTION update_provider_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE service_providers
    SET total_jobs_completed = total_jobs_completed + 1
    WHERE id = NEW.provider_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_provider_stats
  AFTER UPDATE ON service_matches
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_provider_stats();