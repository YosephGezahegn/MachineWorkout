/*
  # Initial Schema for Fitness Tracking Application

  1. New Tables
    - users
      - Stores user profile information
    - workouts
      - Stores workout session details
    - exercises
      - Stores individual exercise entries within workouts
    - machines
      - Stores fitness machine details
*/

-- Set up initial schema and extensions
CREATE SCHEMA IF NOT EXISTS public;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- For UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;         -- For password hashing

-- Set transaction handling
SET session_replication_role = 'replica';  -- Temporarily disable triggers for initial setup

-- Initial setup for roles and permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- Reset transaction handling
SET session_replication_role = 'origin';  -- Re-enable triggers

-- Create custom types
CREATE TYPE exercise_type AS ENUM ('cardio', 'strength', 'flexibility', 'balance');

-- Create machines table
CREATE TABLE machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type exercise_type NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create users table (extends Supabase auth.users)
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name text,
  avatar_url text,
  weight_kg numeric(5,2),
  height_cm numeric(5,2),
  fitness_level text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  _attempts INTEGER := 0;
  _max_attempts CONSTANT INTEGER := 3;
BEGIN
  WHILE _attempts < _max_attempts LOOP
    BEGIN
      INSERT INTO public.users (id)
      VALUES (NEW.id);
      
      RETURN NEW;
    EXCEPTION 
      WHEN unique_violation THEN
        -- If user already exists, do nothing
        RETURN NEW;
      WHEN transaction_rollback THEN
        -- On transaction error, retry
        _attempts := _attempts + 1;
        IF _attempts < _max_attempts THEN
          PERFORM pg_sleep(0.1); -- Small delay before retry
          CONTINUE;
        END IF;
      WHEN OTHERS THEN
        -- Log other errors but don't fail
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    END;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Ensure the function has proper permissions
REVOKE ALL ON FUNCTION handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION handle_new_user() TO postgres;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_user_profile ON auth.users;

-- Create trigger for new signups
CREATE TRIGGER create_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create workouts table
CREATE TABLE workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  total_calories integer,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create exercises table
CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid REFERENCES workouts ON DELETE CASCADE NOT NULL,
  machine_id uuid REFERENCES machines NOT NULL,
  weight_kg numeric(5,2),
  incline_degrees numeric(4,1),
  repetitions integer,
  sets integer,
  distance_meters numeric(7,2),
  duration_seconds integer,
  calories_burned numeric(7,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public machines are viewable by everyone"
  ON machines FOR SELECT
  USING (true);

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view own workouts"
  ON workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workouts"
  ON workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workouts"
  ON workouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workouts"
  ON workouts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view exercises from own workouts"
  ON exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = exercises.workout_id
      AND workouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert exercises to own workouts"
  ON exercises FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = exercises.workout_id
      AND workouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update exercises from own workouts"
  ON exercises FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = exercises.workout_id
      AND workouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete exercises from own workouts"
  ON exercises FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = exercises.workout_id
      AND workouts.user_id = auth.uid()
    )
  );

-- Create a view combining auth.users and users table
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
  u.id,
  au.email,
  u.full_name,
  u.avatar_url,
  u.weight_kg,
  u.height_cm,
  u.fitness_level,
  u.created_at,
  u.updated_at
FROM users u
JOIN auth.users au ON au.id = u.id;

-- Grant access to the view
GRANT SELECT ON user_profiles TO authenticated;

-- Create security barrier view
ALTER VIEW user_profiles SET (security_barrier = true);

-- Create security definer function for the view
CREATE OR REPLACE FUNCTION get_user_profile(user_id uuid)
RETURNS SETOF user_profiles
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT *
  FROM user_profiles
  WHERE id = user_id
  AND user_id = auth.uid();
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_profile(uuid) TO authenticated;

-- Create functions and triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_workouts_updated_at
  BEFORE UPDATE ON workouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Insert some default machines
INSERT INTO machines (name, type) VALUES
  ('Treadmill', 'cardio'),
  ('Elliptical', 'cardio'),
  ('Stationary Bike', 'cardio'),
  ('Rowing Machine', 'cardio'),
  ('Bench Press', 'strength'),
  ('Squat Rack', 'strength'),
  ('Leg Press', 'strength'),
  ('Lat Pulldown', 'strength'),
  ('Yoga Mat', 'flexibility'),
  ('Balance Board', 'balance');