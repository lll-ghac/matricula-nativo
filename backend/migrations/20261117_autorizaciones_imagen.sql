-- Autorización anual de uso de imagen + control de documentos impresos/archivados.
-- Una fila de `alumnos` = un alumno en un año escolar → la autorización se renueva cada año.
-- Ejecutar como postgres (dueño de las tablas):
--   sudo -u postgres psql -d <bd> -v ON_ERROR_STOP=1 -f backend/migrations/20261117_autorizaciones_imagen.sql
ALTER TABLE public.alumnos
  ADD COLUMN IF NOT EXISTS autoriza_imagen_pedagogico boolean,   -- NULL = no respondido
  ADD COLUMN IF NOT EXISTS autoriza_imagen_redes      boolean,
  ADD COLUMN IF NOT EXISTS autoriza_imagen_prensa     boolean,
  ADD COLUMN IF NOT EXISTS documentos_impresos_en     timestamptz,
  ADD COLUMN IF NOT EXISTS carta_imagen_archivada     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS carta_imagen_archivada_por bigint,
  ADD COLUMN IF NOT EXISTS carta_imagen_archivada_en  timestamptz;
