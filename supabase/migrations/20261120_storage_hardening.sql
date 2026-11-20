-- DÁBLIO | Endurecimento do Storage
-- Limita tamanho e formatos aceitos nos buckets de imagens.
-- Não altera políticas RLS nem permissões de leitura existentes.

update storage.buckets
set file_size_limit = 15728640,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('galerias', 'portfolio');

-- O vídeo demonstrativo permanece MP4, com limite de 50 MB.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['video/mp4']
where id = 'site-demo';
