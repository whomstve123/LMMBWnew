-- Add email and promotional consent columns to face_track_mappings table
-- Run this in Supabase SQL Editor

ALTER TABLE face_track_mappings 
ADD COLUMN IF NOT EXISTS user_email TEXT,
ADD COLUMN IF NOT EXISTS promotional_consent BOOLEAN DEFAULT false;

-- Add index for email lookups
CREATE INDEX IF NOT EXISTS idx_face_track_mappings_user_email ON face_track_mappings(user_email);

-- Add comments
COMMENT ON COLUMN face_track_mappings.user_email IS 'User email address for track delivery';
COMMENT ON COLUMN face_track_mappings.promotional_consent IS 'Whether user consented to promotional emails';
