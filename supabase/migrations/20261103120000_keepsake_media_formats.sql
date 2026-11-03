alter table public.log_media
  add column if not exists codec text;

update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/jpeg',
    'video/mp4',
    'video/quicktime',
    'video/x-m4v',
    'video/webm',
    'video/3gpp'
  ]::text[]
where id = 'log-media';
