-- Chat: รองรับข้อความเสียงและวิดีโอสั้นใน bucket chat-attachments

UPDATE storage.buckets
SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'audio/webm',
    'audio/ogg',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/x-m4a',
    'video/webm',
    'video/mp4',
    'video/quicktime'
  ]
WHERE id = 'chat-attachments';
