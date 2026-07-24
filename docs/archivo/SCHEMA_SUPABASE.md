# Esquema de Base de Datos - Sistema de Matrícula Escolar
## Versión 1.4.4 (Actualizado: 30-10-2025)

Este documento describe el esquema completo de la base de datos PostgreSQL/Supabase del sistema.

---

## ⚠️ IMPORTANTE: Estado Actual de la Base de Datos

**Fecha de Actualización**: 30-10-2025
**Backup Actual**: `matricula_2025-10-30_15-57-48.sql`
**Estado**: Base de datos restaurada y refactorización NEE completada

### Datos Actuales
- **765 alumnos** restaurados
- **631 apoderados** restaurados
- **2 relaciones** alumno-apoderado
- **52 tipos de NEE** catalogados
- **Columnas `nee_*` eliminadas** de tabla `alumnos`

---

## Tabla de Contenidos

1. [Tablas Principales](#tablas-principales)
2. [Tablas de Relaciones](#tablas-de-relaciones)
3. [Tablas Auxiliares](#tablas-auxiliares)
4. [Tablas NEE (Nuevo Sistema)](#tablas-nee-nuevo-sistema)
5. [Índices](#índices)
6. [Políticas RLS](#políticas-rls)
7. [Instalación desde Cero](#instalación-desde-cero)

---

## Tablas Principales

### 1. usuarios
Gestión de usuarios del sistema (profesores, inspectores, administradores).

```sql
CREATE TABLE usuarios (
  id BIGINT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK(rol IN ('profesor', 'inspector', 'administrador', 'sololectura')),
  estado TEXT NOT NULL DEFAULT 'activo',
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usuarios_username ON usuarios(username);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
```

**Roles disponibles:**
- `profesor`: Puede gestionar alumnos de sus cursos asignados
- `inspector`: Puede ver y gestionar todos los alumnos
- `administrador`: Acceso completo al sistema
- `sololectura`: Solo puede visualizar información

---

### 2. alumnos
Tabla principal de alumnos (multi-año).

⚠️ **NOTA IMPORTANTE**: Las columnas `nee_*` fueron **ELIMINADAS** el 30-10-2025. Ahora se usa el sistema normalizado con tablas `tipos_nee` y `alumno_nee`.

```sql
CREATE TABLE alumnos (
  id BIGINT PRIMARY KEY,
  anio_matricula INTEGER NOT NULL,
  rut INTEGER NOT NULL,
  dv TEXT NOT NULL,
  nombres TEXT NOT NULL,
  nombre_social TEXT,
  apellido_paterno TEXT NOT NULL,
  apellido_materno TEXT NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  genero TEXT NOT NULL,
  nacionalidad TEXT NOT NULL DEFAULT 'Chilena',
  etnia TEXT,
  direccion TEXT NOT NULL,
  complemento_direccion TEXT,
  region TEXT NOT NULL,
  comuna TEXT NOT NULL,
  telefono TEXT,
  telefono_fijo TEXT,
  con_quien_vive TEXT NOT NULL,
  curso_base TEXT NOT NULL,
  letra TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Inscrito',
  pie BOOLEAN DEFAULT FALSE,
  beca BOOLEAN DEFAULT FALSE,
  tipo_beca TEXT,
  observaciones TEXT,
  creado_por TEXT NOT NULL,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  modificado_por TEXT,
  fecha_modificacion TIMESTAMPTZ,
  eliminado BOOLEAN DEFAULT FALSE,
  motivo_eliminacion TEXT,
  pae BOOLEAN DEFAULT FALSE,
  religion BOOLEAN DEFAULT FALSE,
  tipo_religion TEXT,
  fecha_retiro DATE,
  observacion_retiro TEXT,
  es_prioritario BOOLEAN DEFAULT FALSE,
  observaciones_matriculador TEXT,

  UNIQUE(rut, anio_matricula)
);

CREATE INDEX idx_alumnos_rut ON alumnos(rut);
CREATE INDEX idx_alumnos_curso ON alumnos(curso_base, letra);
CREATE INDEX idx_alumnos_anio ON alumnos(anio_matricula);
CREATE INDEX idx_alumnos_estado ON alumnos(estado);
CREATE INDEX idx_alumnos_pie ON alumnos(pie);
CREATE INDEX idx_alumnos_es_prioritario ON alumnos(es_prioritario);
```

**Estados posibles:**
- `Inscrito`: Proceso de matrícula iniciado
- `Matriculado`: Matrícula completada
- `Retirado`: Alumno retirado del establecimiento

**Cambios importantes:**
- ❌ **Eliminadas 64 columnas `nee_*`** (refactorizadas a modelo relacional)
- ✅ Las NEE ahora se gestionan mediante las tablas `tipos_nee` y `alumno_nee`

---

### 3. apoderados
Gestión de apoderados (principales y suplentes).

```sql
CREATE TABLE apoderados (
  id BIGSERIAL PRIMARY KEY,
  rut INTEGER,
  dv TEXT,
  dni TEXT,
  pasaporte TEXT,
  tipo_documento TEXT NOT NULL CHECK(tipo_documento IN ('RUT', 'DNI', 'Pasaporte')),
  nombre TEXT NOT NULL,
  apellido_paterno TEXT NOT NULL,
  apellido_materno TEXT NOT NULL,
  fecha_nacimiento DATE,
  genero TEXT NOT NULL,
  nacionalidad TEXT NOT NULL DEFAULT 'Chilena',
  direccion TEXT NOT NULL,
  complemento_direccion TEXT,
  region TEXT NOT NULL,
  comuna TEXT NOT NULL,
  celular TEXT NOT NULL,
  email TEXT,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rut, dv),
  UNIQUE(dni),
  UNIQUE(pasaporte)
);

CREATE INDEX idx_apoderados_rut ON apoderados(rut);
CREATE INDEX idx_apoderados_dni ON apoderados(dni);
CREATE INDEX idx_apoderados_pasaporte ON apoderados(pasaporte);
```

**Tipos de documento:**
- `RUT`: Rol Único Tributario (Chile)
- `DNI`: Documento Nacional de Identidad (extranjeros)
- `Pasaporte`: Pasaporte internacional

---

## Tablas de Relaciones

### 4. alumno_apoderado
Relación muchos-a-muchos entre alumnos y apoderados.

```sql
CREATE TABLE alumno_apoderado (
  id BIGSERIAL PRIMARY KEY,
  alumno_id BIGINT NOT NULL,
  apoderado_id BIGINT NOT NULL,
  parentesco TEXT NOT NULL,
  tipo_relacion TEXT NOT NULL CHECK(tipo_relacion IN ('principal', 'suplente')),
  orden INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
  FOREIGN KEY (apoderado_id) REFERENCES apoderados(id) ON DELETE CASCADE,
  UNIQUE(alumno_id, apoderado_id)
);

CREATE INDEX idx_alumno_apoderado_alumno ON alumno_apoderado(alumno_id);
CREATE INDEX idx_alumno_apoderado_apoderado ON alumno_apoderado(apoderado_id);
CREATE INDEX idx_alumno_apoderado_tipo ON alumno_apoderado(tipo_relacion);
CREATE INDEX idx_alumno_apoderado_orden ON alumno_apoderado(alumno_id, orden);
```

**Tipos de relación:**
- `principal`: Apoderado principal (primer contacto)
- `suplente`: Apoderado suplente (contacto alternativo)

**Campo orden:**
- `1`: Primer apoderado (generalmente el principal)
- `2`: Segundo apoderado (generalmente el suplente)

---

## Tablas NEE (Nuevo Sistema)

⚠️ **Sistema Refactorizado (Octubre 2025)**: Las columnas booleanas `nee_*` fueron reemplazadas por un modelo relacional normalizado.

### 5. tipos_nee
Catálogo de tipos de Necesidades Educativas Especiales.

```sql
CREATE TABLE tipos_nee (
  id SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  categoria TEXT
);

CREATE INDEX idx_tipos_nee_codigo ON tipos_nee(codigo);
CREATE INDEX idx_tipos_nee_categoria ON tipos_nee(categoria);
```

**Datos**: 52 tipos de NEE organizados en 14 categorías:
- Sensorial (6 tipos)
- Motora (5 tipos)
- Intelectual (5 tipos)
- Espectro Autista (3 tipos)
- Lenguaje y Comunicación (2 tipos)
- Aprendizaje (6 tipos)
- Conductual (5 tipos)
- Emocional (2 tipos)
- Salud (5 tipos)
- Altas Capacidades (3 tipos)
- Socioemocional (5 tipos)
- Acceso (4 tipos)
- Otras (1 tipo)

### 6. alumno_nee
Relación muchos-a-muchos entre alumnos y tipos de NEE.

```sql
CREATE TABLE alumno_nee (
  id SERIAL PRIMARY KEY,
  alumno_id BIGINT NOT NULL,
  nee_id INTEGER NOT NULL,
  observaciones TEXT,
  FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
  FOREIGN KEY (nee_id) REFERENCES tipos_nee(id) ON DELETE CASCADE,
  UNIQUE(alumno_id, nee_id)
);

CREATE INDEX idx_alumno_nee_alumno_id ON alumno_nee(alumno_id);
CREATE INDEX idx_alumno_nee_nee_id ON alumno_nee(nee_id);
```

**Ventajas del nuevo sistema:**
- ✅ Más escalable (agregar NEE sin modificar estructura)
- ✅ Mejor rendimiento en queries
- ✅ 77% menos código en formularios
- ✅ Base de datos normalizada

---

## Tablas Auxiliares

### 7. cursos_asignados
Asignación de cursos a profesores.

```sql
CREATE TABLE cursos_asignados (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL,
  curso TEXT NOT NULL,
  letra TEXT NOT NULL,
  anio INTEGER NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  UNIQUE(usuario_id, curso, letra, anio)
);

CREATE INDEX idx_cursos_asignados_usuario_id ON cursos_asignados(usuario_id);
CREATE INDEX idx_cursos_asignados_curso ON cursos_asignados(curso, letra, anio);
```

### 8. anio_vigente
Control del año académico activo.

```sql
CREATE TABLE anio_vigente (
  id SERIAL PRIMARY KEY,
  anio INTEGER NOT NULL UNIQUE,
  es_vigente BOOLEAN NOT NULL DEFAULT FALSE,
  creado_por TEXT NOT NULL,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_anio_vigente_anio ON anio_vigente(anio);
CREATE INDEX idx_anio_vigente_es_vigente ON anio_vigente(es_vigente);
```

### 9. backups
Registro de backups realizados.

```sql
CREATE TABLE backups (
  id BIGSERIAL PRIMARY KEY,
  nombre_archivo TEXT NOT NULL,
  ruta_completa TEXT NOT NULL,
  tamano_bytes BIGINT,
  tipo TEXT NOT NULL CHECK(tipo IN ('manual', 'automatico', 'programado')),
  estado TEXT NOT NULL DEFAULT 'completado',
  creado_por TEXT,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  observaciones TEXT
);

CREATE INDEX idx_backups_fecha ON backups(fecha_creacion DESC);
CREATE INDEX idx_backups_tipo ON backups(tipo);
```

### 10. documentos_pendientes
Seguimiento de documentación faltante.

```sql
CREATE TABLE documentos_pendientes (
  id BIGSERIAL PRIMARY KEY,
  alumno_id BIGINT NOT NULL,
  tipo_documento TEXT NOT NULL,
  fecha_solicitud TIMESTAMPTZ DEFAULT NOW(),
  fecha_entrega TIMESTAMPTZ,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'entregado', 'no_aplica')),
  observaciones TEXT,
  FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE
);

CREATE INDEX idx_documentos_pendientes_alumno ON documentos_pendientes(alumno_id);
CREATE INDEX idx_documentos_pendientes_estado ON documentos_pendientes(estado);
```

### 11. logs_importacion
Registro de importaciones desde CSV.

```sql
CREATE TABLE logs_importacion (
  id BIGSERIAL PRIMARY KEY,
  archivo_nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('alumnos', 'apoderados', 'mixto')),
  registros_procesados INTEGER,
  registros_exitosos INTEGER,
  registros_fallidos INTEGER,
  errores TEXT,
  fecha_importacion TIMESTAMPTZ DEFAULT NOW(),
  usuario TEXT NOT NULL
);

CREATE INDEX idx_logs_importacion_fecha ON logs_importacion(fecha_importacion DESC);
CREATE INDEX idx_logs_importacion_tipo ON logs_importacion(tipo);
```

---

## Políticas RLS

Todas las tablas principales tienen Row Level Security habilitado:

```sql
-- Habilitar RLS
ALTER TABLE alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE apoderados ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumno_apoderado ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Política para Backend Express (service_role)
CREATE POLICY "Backend Express acceso via service_role"
  ON alumnos FOR ALL
  USING (true);

CREATE POLICY "Backend Express acceso via service_role"
  ON apoderados FOR ALL
  USING (true);

CREATE POLICY "Backend Express acceso via service_role"
  ON alumno_apoderado FOR ALL
  USING (true);
```

---

## Funciones y Triggers

### Trigger: Validar año vigente

```sql
CREATE OR REPLACE FUNCTION validar_anio_vigente()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo un año puede estar vigente a la vez
  IF NEW.es_vigente = TRUE THEN
    UPDATE anio_vigente SET es_vigente = FALSE WHERE id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_anio_vigente
  BEFORE INSERT OR UPDATE ON anio_vigente
  FOR EACH ROW
  EXECUTE FUNCTION validar_anio_vigente();
```

---

## Instalación desde Cero

### 1. Requisitos Previos

```bash
# Instalar Supabase CLI
npm install -g supabase

# Iniciar Supabase local
npx supabase start
```

### 2. Aplicar Migraciones

Las migraciones se encuentran en `supabase/migrations/`:

```bash
# Aplicar todas las migraciones
npx supabase db reset

# O aplicar manualmente
cat supabase/migrations/*.sql | npx supabase db execute
```

### 3. Cargar Datos Semilla (Opcional)

```bash
# Cargar datos iniciales
cat supabase/seed.sql | npx supabase db execute
```

### 4. Verificar Instalación

```bash
# Conectar a la base de datos
npx supabase db connect

# Verificar tablas
\dt public.*

# Contar registros
SELECT
  (SELECT COUNT(*) FROM alumnos) as alumnos,
  (SELECT COUNT(*) FROM apoderados) as apoderados,
  (SELECT COUNT(*) FROM tipos_nee) as tipos_nee;
```

---

## Restauración desde Backup

### Backup Actual Recomendado

**Archivo**: `matricula_2025-10-30_15-57-48.sql`
**Contenido**:
- 765 alumnos
- 631 apoderados
- 2 relaciones alumno-apoderado
- 52 tipos de NEE
- Estructura NEE refactorizada (SIN columnas obsoletas)

### Proceso de Restauración

```bash
# 1. Listar backups disponibles
npm run backup:list

# 2. Restaurar backup
cat "backups/postgres/matricula_2025-10-30_15-57-48.sql" | docker exec -i supabase_db_matricula-escolar psql -U postgres -d postgres

# 3. Verificar restauración
node verify-restoration.js
```

---

## Verificación del Esquema

### Verificar Estado Actual

```sql
-- Contar registros
SELECT
  (SELECT COUNT(*) FROM alumnos) as alumnos,
  (SELECT COUNT(*) FROM apoderados) as apoderados,
  (SELECT COUNT(*) FROM alumno_apoderado) as relaciones,
  (SELECT COUNT(*) FROM tipos_nee) as tipos_nee;

-- Verificar que NO existan columnas nee_* en alumnos
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'alumnos'
  AND table_schema = 'public'
  AND column_name LIKE 'nee_%';
-- Debe retornar 0 filas

-- Verificar existencia de tablas NEE
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('tipos_nee', 'alumno_nee');
-- Debe retornar 2 filas
```

### Resultado Esperado

```
✅ alumnos: 765
✅ apoderados: 631
✅ relaciones: 2
✅ tipos_nee: 52
✅ columnas nee_* en alumnos: 0
✅ tablas NEE: 2 (tipos_nee, alumno_nee)
```

---

## Notas Importantes

1. ⚠️ **Columnas NEE eliminadas**: Las 64 columnas `nee_*` fueron eliminadas. Ahora se usa `tipos_nee` y `alumno_nee`.
2. ✅ **Tabla única de alumnos**: Se usa una sola tabla `alumnos` para todos los años (campo `anio_matricula`).
3. ✅ **RLS habilitado**: Todas las tablas principales tienen políticas RLS.
4. ✅ **Backups regulares**: Crear backups antes de migraciones importantes.
5. ✅ **Verificación post-restauración**: Siempre verificar estructura después de restaurar.

---

## Documentación Relacionada

- `BD_CONFIGURACION.md`: Configuración de la base de datos
- `bd-nee.md`: Detalles de la refactorización NEE
- `MIGRACION_SUPABASE.md`: Proceso de migración desde SQLite

---

**Última Actualización**: 30-10-2025
**Versión**: 1.4.4
**Estado**: ✅ Esquema actualizado y verificado
**Backup Actual**: `matricula_2025-10-30_15-57-48.sql`
