/*
  # E-Learning Platform Database Schema

  ## Overview
  This migration creates the complete database schema for a mini e-learning platform
  with user authentication, course management, lessons, and progress tracking.

  ## Tables Created

  ### 1. profiles
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text) - User's email address
  - `full_name` (text) - User's full name
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update timestamp

  ### 2. courses
  - `id` (uuid, primary key) - Unique course identifier
  - `title` (text) - Course title
  - `description` (text) - Detailed course description
  - `thumbnail_url` (text) - Course image URL
  - `category` (text) - Course category (e.g., Development, Design, Business)
  - `difficulty` (text) - Difficulty level (beginner, intermediate, advanced)
  - `duration_minutes` (integer) - Total course duration in minutes
  - `created_at` (timestamptz) - Course creation timestamp
  - `updated_at` (timestamptz) - Last course update timestamp

  ### 3. lessons
  - `id` (uuid, primary key) - Unique lesson identifier
  - `course_id` (uuid, foreign key) - References courses table
  - `title` (text) - Lesson title
  - `content` (text) - Lesson content/description
  - `order_number` (integer) - Lesson order within the course
  - `duration_minutes` (integer) - Lesson duration in minutes
  - `created_at` (timestamptz) - Lesson creation timestamp

  ### 4. user_progress
  - `id` (uuid, primary key) - Unique progress record identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `course_id` (uuid, foreign key) - References courses table
  - `lesson_id` (uuid, foreign key, nullable) - References lessons table
  - `completed` (boolean) - Completion status
  - `completed_at` (timestamptz, nullable) - Completion timestamp
  - `created_at` (timestamptz) - Progress record creation timestamp
  - `updated_at` (timestamptz) - Last progress update timestamp

  ## Security

  ### Row Level Security (RLS)
  All tables have RLS enabled with restrictive policies:

  #### profiles table
  - Users can view their own profile
  - Users can update their own profile
  - New profiles are created on signup via trigger

  #### courses table
  - All authenticated users can view courses
  - Public read access for course browsing

  #### lessons table
  - All authenticated users can view lessons
  - Public read access for lesson browsing

  #### user_progress table
  - Users can only view their own progress
  - Users can only insert their own progress records
  - Users can only update their own progress records

  ## Indexes
  - Foreign key indexes for optimal join performance
  - Composite index on user_progress (user_id, course_id, lesson_id) for fast lookups

  ## Notes
  1. All timestamps use timestamptz for timezone awareness
  2. UUIDs are used for all primary keys for security and scalability
  3. Foreign keys ensure referential integrity
  4. Default values prevent null-related issues
  5. RLS policies ensure users can only access their own progress data
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  thumbnail_url text DEFAULT '',
  category text DEFAULT 'General',
  difficulty text DEFAULT 'beginner',
  duration_minutes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view courses"
  ON courses FOR SELECT
  TO authenticated
  USING (true);

-- Create lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text DEFAULT '',
  order_number integer NOT NULL,
  duration_minutes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lessons"
  ON lessons FOR SELECT
  TO authenticated
  USING (true);

-- Create user_progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_course_id ON user_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_lesson_id ON user_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_lookup ON user_progress(user_id, course_id, lesson_id);

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', ''));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();