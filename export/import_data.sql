-- ============================================
-- Script de Importacion de Datos
-- SQLite → PostgreSQL via Supabase
-- ============================================

-- Nota: Este script se debe ejecutar despues de copiar los CSVs
-- Los CSVs deben estar accesibles para PostgreSQL

-- ===== IMPORTAR USUARIOS =====
\copy usuarios(id, username, password_hash, nombre, rol, estado, creado_en) FROM 'export/usuarios.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- Actualizar secuencia de usuarios
SELECT setval('usuarios_id_seq', (SELECT MAX(id) FROM usuarios));

-- ===== IMPORTAR APODERADOS =====
\copy apoderados(id, rut, dv, tipo_documento, nombre, apellido_paterno, apellido_materno, parentesco, fecha_nacimiento, genero, nacionalidad, direccion, complemento_direccion, region, comuna, celular, email, creado_en, actualizado_en) FROM 'export/apoderados_ok.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- Actualizar secuencia de apoderados
SELECT setval('apoderados_id_seq', (SELECT MAX(id) FROM apoderados));

-- ===== IMPORTAR ALUMNOS =====
-- Nota: Los CSVs de alumnos ya incluyen la columna anio_matricula

-- Primero crear tabla temporal para combinar los datos
CREATE TEMP TABLE temp_alumnos (
    id INTEGER,
    rut BIGINT,
    dv TEXT,
    nombres TEXT,
    nombre_social TEXT,
    apellido_paterno TEXT,
    apellido_materno TEXT,
    fecha_nacimiento DATE,
    genero TEXT,
    nacionalidad TEXT,
    etnia TEXT,
    direccion TEXT,
    complemento_direccion TEXT,
    region TEXT,
    comuna TEXT,
    telefono TEXT,
    telefono_fijo TEXT,
    con_quien_vive TEXT,
    curso_base TEXT,
    letra TEXT,
    estado TEXT,
    pie BOOLEAN,
    beca BOOLEAN,
    tipo_beca TEXT,
    observaciones TEXT,
    creado_por TEXT,
    creado_en TIMESTAMPTZ,
    actualizado_por TEXT,
    actualizado_en TIMESTAMPTZ,
    eliminado BOOLEAN,
    motivo_eliminacion TEXT,
    pae BOOLEAN,
    religion BOOLEAN,
    tipo_religion TEXT,
    fecha_retiro DATE,
    observacion_retiro TEXT,
    anio_matricula INTEGER
);

-- Importar alumnos 2025
\copy temp_alumnos FROM 'export/alumnos_2025.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- Importar alumnos 2026
\copy temp_alumnos FROM 'export/alumnos_2026.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- Importar alumnos 2028 (si tiene datos)
\copy temp_alumnos FROM 'export/alumnos_2028.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- Insertar en tabla final
INSERT INTO alumnos (
    rut, dv, nombres, nombre_social, apellido_paterno, apellido_materno,
    fecha_nacimiento, genero, nacionalidad, etnia, direccion, complemento_direccion,
    region, comuna, telefono, telefono_fijo, con_quien_vive, curso_base, letra,
    anio_matricula, estado, fecha_retiro, observacion_retiro,
    pie, beca, tipo_beca, pae, religion, tipo_religion,
    observaciones, creado_por, creado_en, actualizado_por, actualizado_en,
    eliminado, motivo_eliminacion
)
SELECT
    rut, dv, nombres, nombre_social, apellido_paterno, apellido_materno,
    fecha_nacimiento, genero, nacionalidad, etnia, direccion, complemento_direccion,
    region, comuna, telefono, telefono_fijo, con_quien_vive, curso_base, letra,
    anio_matricula, estado, fecha_retiro, observacion_retiro,
    COALESCE(pie, false), COALESCE(beca, false), tipo_beca,
    COALESCE(pae, false), COALESCE(religion, false), tipo_religion,
    observaciones, creado_por, creado_en, actualizado_por, actualizado_en,
    COALESCE(eliminado, false), motivo_eliminacion
FROM temp_alumnos;

-- Limpiar tabla temporal
DROP TABLE temp_alumnos;

-- Actualizar secuencia de alumnos
SELECT setval('alumnos_id_seq', (SELECT MAX(id) FROM alumnos));

-- ===== IMPORTAR ALUMNO_APODERADO =====
\copy alumno_apoderado(id, alumno_id, apoderado_id, es_principal, es_suplente, parentesco) FROM 'export/alumno_apoderado.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- Actualizar secuencia
SELECT setval('alumno_apoderado_id_seq', (SELECT MAX(id) FROM alumno_apoderado));

-- ===== IMPORTAR CURSOS_ASIGNADOS =====
\copy cursos_asignados(id, usuario_id, curso_base, letra) FROM 'export/cursos_asignados.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- Actualizar secuencia
SELECT setval('cursos_asignados_id_seq', (SELECT MAX(id) FROM cursos_asignados));

-- ===== IMPORTAR ANIO_VIGENTE =====
\copy anio_vigente(id, anio, activo, creado_por, creado_en) FROM 'export/anio_vigente.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- Actualizar secuencia
SELECT setval('anio_vigente_id_seq', (SELECT MAX(id) FROM anio_vigente));

-- ===== VERIFICAR IMPORTACION =====
SELECT 'Usuarios' as tabla, COUNT(*) as registros FROM usuarios
UNION ALL
SELECT 'Apoderados', COUNT(*) FROM apoderados
UNION ALL
SELECT 'Alumnos', COUNT(*) FROM alumnos
UNION ALL
SELECT 'Alumno-Apoderado', COUNT(*) FROM alumno_apoderado
UNION ALL
SELECT 'Cursos Asignados', COUNT(*) FROM cursos_asignados
UNION ALL
SELECT 'Anio Vigente', COUNT(*) FROM anio_vigente;
