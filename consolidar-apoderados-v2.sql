-- Script mejorado para consolidar apoderados duplicados
-- Maneja correctamente las relaciones duplicadas

BEGIN;

-- 1. Crear tabla temporal con el mapeo de IDs duplicados -> ID maestro
CREATE TEMP TABLE apoderado_mapping AS
SELECT
  a.id as id_duplicado,
  m.id_maestro
FROM apoderados a
INNER JOIN (
  -- Obtener el ID más bajo (maestro) para cada RUT+DV
  SELECT
    rut,
    dv,
    MIN(id) as id_maestro
  FROM apoderados
  GROUP BY rut, dv
) m ON a.rut = m.rut AND a.dv = m.dv
WHERE a.id != m.id_maestro;

-- Mostrar resumen
SELECT
  'Total apoderados duplicados a eliminar' as descripcion,
  COUNT(*) as cantidad
FROM apoderado_mapping;

-- 2. Para cada relación alumno_apoderado con un apoderado duplicado:
--    - Si ya existe una relación con el apoderado maestro: eliminar la duplicada
--    - Si no existe: actualizar al apoderado maestro

-- 2a. Eliminar relaciones donde ya existe una con el maestro
DELETE FROM alumno_apoderado aa
WHERE aa.apoderado_id IN (SELECT id_duplicado FROM apoderado_mapping)
AND EXISTS (
  SELECT 1
  FROM alumno_apoderado aa2
  INNER JOIN apoderado_mapping am ON aa.apoderado_id = am.id_duplicado
  WHERE aa2.alumno_id = aa.alumno_id
  AND aa2.apoderado_id = am.id_maestro
);

SELECT
  'Relaciones duplicadas eliminadas' as descripcion,
  COUNT(*) as cantidad
FROM alumno_apoderado aa
WHERE aa.apoderado_id NOT IN (SELECT id FROM apoderados);

-- 2b. Actualizar las relaciones restantes al apoderado maestro
UPDATE alumno_apoderado aa
SET apoderado_id = am.id_maestro
FROM apoderado_mapping am
WHERE aa.apoderado_id = am.id_duplicado;

SELECT
  'Relaciones actualizadas al maestro' as descripcion,
  COUNT(*) as cantidad
FROM alumno_apoderado aa
INNER JOIN (
  SELECT DISTINCT id_maestro FROM apoderado_mapping
) am ON aa.apoderado_id = am.id_maestro;

-- 3. Verificar que no quedan relaciones con apoderados duplicados
SELECT
  'Relaciones huérfanas (debe ser 0)' as descripcion,
  COUNT(*) as cantidad
FROM alumno_apoderado aa
WHERE aa.apoderado_id IN (SELECT id_duplicado FROM apoderado_mapping);

-- 4. Eliminar registros duplicados de apoderados
DELETE FROM apoderados
WHERE id IN (SELECT id_duplicado FROM apoderado_mapping);

SELECT
  'Apoderados eliminados' as descripcion,
  COUNT(*) as cantidad
FROM apoderado_mapping;

-- 5. Verificar resultado final
SELECT
  'Apoderados únicos restantes' as descripcion,
  COUNT(*) as cantidad
FROM apoderados;

SELECT
  'Duplicados restantes (debe ser 0)' as descripcion,
  COUNT(*) - COUNT(DISTINCT CONCAT(rut, '-', dv)) as cantidad
FROM apoderados;

COMMIT;

-- 6. Agregar UNIQUE constraint para prevenir futuros duplicados
ALTER TABLE apoderados
ADD CONSTRAINT apoderados_rut_dv_key UNIQUE (rut, dv);

-- Verificación final
SELECT
  '✅ Consolidación completada' as resultado,
  COUNT(*) as apoderados_unicos
FROM apoderados;

SELECT
  'Relaciones alumno-apoderado' as resultado,
  COUNT(*) as total_relaciones
FROM alumno_apoderado;
