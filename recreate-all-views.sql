-- ============================================================================
-- RECREAR TODAS LAS VISTAS DEPENDIENTES DE cursos_completo
-- ============================================================================
-- Este script debe ejecutarse siempre que se modifique la vista cursos_completo
-- porque las vistas dependientes se eliminan con CASCADE
-- ============================================================================

BEGIN;

-- 1. Vista principal: cursos_completo
DROP VIEW IF EXISTS cursos_completo CASCADE;

CREATE OR REPLACE VIEW cursos_completo AS
SELECT
    c.id,
    c.codigo,
    c.anio_academico,
    c.capacidad_maxima,
    c.sala,
    c.estado,
    c.creado_por,
    c.creado_en,
    c.actualizado_por,
    c.actualizado_en,

    -- Nivel educativo
    c.nivel_educativo_id,
    ne.codigo_sige,
    ne.nombre AS nivel_educativo_nombre,

    -- Grado
    c.grado_id,
    g.codigo AS grado_codigo,
    g.nombre_corto AS grado_nombre_corto,
    g.nombre_completo AS grado_nombre,
    g.orden AS grado_orden,

    -- Letra
    c.letra_id,
    lc.letra,
    lc.orden AS letra_orden,

    -- Jornada
    c.jornada_id,
    j.nombre AS jornada,
    j.horario_inicio,
    j.horario_termino,

    -- Profesor jefe
    c.profesor_jefe_id,
    u.username AS profesor_jefe_username,
    u.nombre AS profesor_jefe_nombre,

    -- Estadísticas de alumnos
    COUNT(a.id) AS alumnos_matriculados,
    c.capacidad_maxima - COUNT(a.id) AS cupos_disponibles,
    COUNT(a.id) FILTER (WHERE a.pie = TRUE) AS alumnos_pie,
    ROUND((COUNT(a.id)::NUMERIC / c.capacidad_maxima::NUMERIC) * 100, 1) AS porcentaje_ocupacion

FROM cursos c
INNER JOIN niveles_educativos ne ON c.nivel_educativo_id = ne.id
INNER JOIN grados g ON c.grado_id = g.id
INNER JOIN letras_curso lc ON c.letra_id = lc.id
INNER JOIN jornadas j ON c.jornada_id = j.id
LEFT JOIN usuarios u ON c.profesor_jefe_id = u.id
LEFT JOIN alumnos a ON c.id = a.curso_id AND a.estado = 'matriculado'
GROUP BY
    c.id, c.codigo, c.anio_academico, c.capacidad_maxima, c.sala, c.estado,
    c.creado_por, c.creado_en, c.actualizado_por, c.actualizado_en,
    c.nivel_educativo_id, ne.codigo_sige, ne.nombre,
    c.grado_id, g.codigo, g.nombre_corto, g.nombre_completo, g.orden,
    c.letra_id, lc.letra, lc.orden,
    c.jornada_id, j.nombre, j.horario_inicio, j.horario_termino,
    c.profesor_jefe_id, u.username, u.nombre;

-- 2. Vista: cursos_por_profesor
CREATE OR REPLACE VIEW cursos_por_profesor AS
SELECT
    pc.usuario_id,
    u.nombre AS profesor_nombre,
    pc.curso_id,
    cc.codigo AS curso_codigo,
    cc.anio_academico,
    cc.nivel_educativo_nombre,
    cc.grado_nombre,
    cc.letra,
    cc.estado,
    cc.sala,
    cc.jornada,
    cc.capacidad_maxima,
    cc.alumnos_matriculados,
    cc.cupos_disponibles,
    pc.tipo_asignacion,
    pc.asignatura,
    pc.puede_matricular,
    pc.puede_editar
FROM profesor_curso pc
INNER JOIN usuarios u ON pc.usuario_id = u.id
INNER JOIN cursos_completo cc ON pc.curso_id = cc.id;

-- 3. Vista: profesores_por_curso
CREATE OR REPLACE VIEW profesores_por_curso AS
SELECT
    pc.id AS asignacion_id,
    pc.curso_id,
    cc.codigo AS curso_codigo,
    cc.anio_academico,
    pc.usuario_id,
    u.username AS profesor_username,
    u.nombre AS profesor_nombre,
    u.rol AS profesor_rol,
    pc.tipo_asignacion,
    pc.asignatura,
    pc.puede_matricular,
    pc.puede_editar,
    pc.asignado_por,
    pc.asignado_en,
    pc.observaciones
FROM profesor_curso pc
INNER JOIN usuarios u ON pc.usuario_id = u.id
INNER JOIN cursos_completo cc ON pc.curso_id = cc.id;

COMMIT;

-- Verificaciones
SELECT 'Vistas recreadas exitosamente' as mensaje;
SELECT 'Total cursos:' as tipo, COUNT(*) as total FROM cursos_completo
UNION ALL
SELECT 'Total asignaciones profesor-curso:' as tipo, COUNT(*) as total FROM profesores_por_curso
UNION ALL
SELECT 'Total cursos por profesor:' as tipo, COUNT(*) as total FROM cursos_por_profesor;
