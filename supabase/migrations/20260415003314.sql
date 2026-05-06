ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS open_date date,
  ADD COLUMN IF NOT EXISTS announcement_date date;

COMMENT ON COLUMN posts.open_date IS 'Tanggal mulai pendaftaran dibuka';
COMMENT ON COLUMN posts.deadline IS 'Tanggal akhir pendaftaran';
COMMENT ON COLUMN posts.announcement_date IS 'Tanggal pengumuman hasil';