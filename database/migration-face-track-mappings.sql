-- Face Track Mappings Table
-- This table stores the relationship between face hashes and their generated tracks
-- Ensures each unique face always gets the same unique track

CREATE TABLE IF NOT EXISTS face_track_mappings (
  id BIGSERIAL PRIMARY KEY,
  face_hash VARCHAR(255) UNIQUE NOT NULL,
  track_id VARCHAR(50) NOT NULL,
  audio_url TEXT NOT NULL,
  generated_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  CONSTRAINT unique_face_hash UNIQUE (face_hash)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_face_track_mappings_face_hash ON face_track_mappings(face_hash);
CREATE INDEX IF NOT EXISTS idx_face_track_mappings_track_id ON face_track_mappings(track_id);
CREATE INDEX IF NOT EXISTS idx_face_track_mappings_last_accessed ON face_track_mappings(last_accessed);

-- Add some helpful comments
COMMENT ON TABLE face_track_mappings IS 'Stores the mapping between facial biometric hashes and their associated generated audio tracks';
COMMENT ON COLUMN face_track_mappings.face_hash IS 'MD5 hash of facial biometric data - ensures same face always gets same track';
COMMENT ON COLUMN face_track_mappings.track_id IS 'Unique identifier for the generated track';
COMMENT ON COLUMN face_track_mappings.audio_url IS 'Public URL to the generated audio file in Supabase storage';
COMMENT ON COLUMN face_track_mappings.generated_count IS 'Number of times this face has requested their track';
COMMENT ON COLUMN face_track_mappings.created_at IS 'When this face-track mapping was first created';
COMMENT ON COLUMN face_track_mappings.last_accessed IS 'When this track was last requested';

-- Optional: Add RLS (Row Level Security) policies if needed
-- ALTER TABLE face_track_mappings ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON face_track_mappings TO anon;
-- GRANT SELECT, INSERT, UPDATE ON face_track_mappings TO authenticated;
