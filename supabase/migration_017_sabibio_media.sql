-- MIGRATION 017: Public SabiBio media bucket

INSERT INTO storage.buckets (id, name, public)
VALUES ('sabibio-media', 'sabibio-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;
