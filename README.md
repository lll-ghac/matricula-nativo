# Sistema de Matrícula Escolar v1.6.0

![Insignia Ecuador](frontend/public/InsigniaEcuador.png)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)
![React](https://img.shields.io/badge/React-19-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-✓-blue.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748.svg)

## 📋 Descripción

Sistema web completo para la gestión de matrícula escolar desarrollado con React + Node.js + PostgreSQL nativo (sin dependencias externas ni servicios en la nube). Permite administrar estudiantes, apoderados, cursos y generar reportes exportables, funcionando completamente en el servidor local del colegio.

## ✨ Características Principales

### 👥 Gestión de Estudiantes
- ✅ Registro completo de estudiantes con información académica y personal
- ✅ Búsqueda inteligente por RUT, nombre o apellido
- ✅ Estados: Inscrito, Matriculado, Retirado
- ✅ Información completa de NEE (Necesidades Educativas Especiales)
- ✅ Información PIE, becas, PAE, religión y observaciones
- ✅ Historial multi-año por estudiante
- ✅ Soft delete con auditoría completa

### 👨‍👩‍👧‍👦 Gestión de Apoderados
- ✅ Registro de apoderado principal y suplente
- ✅ Soporte para RUT, DNI y Pasaporte
- ✅ Información de contacto completa
- ✅ Relación de parentesco configurable
- ✅ Un apoderado puede tener múltiples alumnos
- ✅ Búsqueda y edición de apoderados

### 📊 Reportes y Exportaciones
- ✅ **Exportación completa CSV** con todos los estudiantes y apoderados
- ✅ Compatible con Excel, LibreOffice y Google Sheets
- ✅ Optimizada para manejar grandes volúmenes de datos (1000+ estudiantes)
- ✅ Exportación por curso individual
- ✅ Agenda escolar con información de contacto

### 🔐 Sistema de Autenticación
- ✅ Login seguro con JWT y cookies httpOnly
- ✅ Cookie de sesión (se cierra al cerrar el navegador) con techo absoluto de 8h
- ✅ Roles de usuario: Administrador, Inspector, Profesor, Solo lectura
- ✅ Control de acceso basado en roles (RBAC)
- ✅ Asignación de cursos por profesor
- ✅ Rate limiting para prevenir ataques de fuerza bruta

### 🛡️ Seguridad
- ✅ Headers de seguridad configurados (Helmet, HSTS)
- ✅ CORS restringido
- ✅ Validación de datos en frontend y backend
- ✅ Rate limiting a nivel de nginx y de aplicación
- ✅ Logging de seguridad detallado (`logs/security.log`)
- ✅ Auditoría de escrituras sobre datos sensibles

### 💾 Gestión de Backups
- ✅ Backups automáticos programados (`pg_dump` nativo)
- ✅ Backups manuales on-demand desde el panel de administración
- ✅ Restauración de backups (integrada y vía herramienta independiente `restore-app`)
- ✅ Monitoreo de la base de datos con funciones PostgreSQL
- ✅ Listado de backups disponibles con rotación automática

## 🚀 Tecnologías Utilizadas

### Frontend
- **React 19** con TypeScript
- **Tailwind CSS** para estilos responsivos
- **Lucide React** para iconografía
- **Vite** como build tool
- **React Router v7** para navegación

### Backend
- **Node.js 20+** con Express 5
- **PostgreSQL 16** nativo como base de datos (sin Docker)
- **Prisma 7** (con driver adapter `pg`) como ORM
- **JWT** para autenticación
- **bcrypt** para encriptación de contraseñas
- **express-rate-limit** para rate limiting
- **Helmet** para seguridad HTTP
- **node-cron** para tareas programadas

### Base de Datos
- **PostgreSQL 16** instalado directamente en el servidor (sin Docker ni servicios externos)
- **Prisma** como capa de acceso y fuente de verdad del esquema (`backend/prisma/schema.prisma`)
- **Índices optimizados** para búsquedas rápidas
- **Funciones y triggers** para lógica de negocio y monitoreo

## 📦 Instalación

### Prerrequisitos
- Node.js 20+
- PostgreSQL 16
- npm
- Git

### Instalación (Desarrollo / Servidor propio)

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd matricula-e79
   ```

2. **Instalar PostgreSQL 16 y crear la base de datos**
   ```bash
   apt install -y postgresql-16 postgresql-client-16

   sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
   sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS unaccent;"
   sudo -u postgres psql -c "CREATE DATABASE matricula;"
   sudo -u postgres psql -c "CREATE USER matricula_app WITH PASSWORD 'tu-password-segura';"
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE matricula TO matricula_app;"
   ```

3. **Instalar dependencias del backend**
   ```bash
   cd backend
   npm install
   ```

4. **Configurar variables de entorno del backend**
   ```bash
   # En backend/.env
   JWT_SECRET=tu-clave-secreta-muy-segura-aqui
   NODE_ENV=production
   PORT=5003
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=matricula
   DB_USER=matricula_app
   DB_PASSWORD=tu-password-segura
   ```

5. **Aplicar el esquema con Prisma**
   ```bash
   npx prisma generate
   npx prisma db push   # o npx prisma migrate deploy, según el flujo elegido
   ```

6. **Instalar dependencias del frontend**
   ```bash
   cd ../frontend
   npm install
   ```

7. **Ejecutar en desarrollo**
   ```bash
   # Terminal 1: Backend
   cd backend
   npm start

   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

8. **Acceder a la aplicación**
   - Frontend (dev): http://localhost:5173
   - Backend API: http://localhost:5003

### Despliegue en producción

En producción, el frontend se compila (`npm run build`) y se sirve como estático vía nginx, el backend corre bajo PM2 (`pm2 start server.js --name matricula-backend`), y PostgreSQL corre como servicio nativo del sistema (`systemctl enable postgresql`). No se requiere Docker en ningún punto del stack.

## 👤 Usuario por Defecto

El sistema crea un usuario administrador durante la configuración inicial:

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| admin | admin123 | Administrador |

**⚠️ IMPORTANTE:** Cambia la contraseña del administrador en producción.

## 📁 Estructura del Proyecto

```
matricula-e79/
├── backend/
│   ├── server.js                # Servidor principal Express
│   ├── routes/                  # Endpoints de la API
│   │   ├── auth.js             # Autenticación
│   │   ├── students.js         # Gestión de alumnos
│   │   ├── guardians.js        # Gestión de apoderados
│   │   ├── courses_v2.js       # Gestión de cursos
│   │   └── backups.js          # Gestión de backups
│   ├── utils/
│   │   ├── postgresBackup.js   # Sistema de backups (pg_dump nativo)
│   │   └── restoreBackupAutomatic.js
│   ├── prisma/
│   │   └── schema.prisma       # Esquema de base de datos (fuente de verdad)
│   ├── config/
│   │   └── db.js               # Cliente Prisma + adapter-pg
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/          # Componentes React
│   │   ├── hooks/               # Custom hooks
│   │   ├── pages/                # Páginas principales
│   │   └── App.tsx              # Componente principal
│   ├── package.json
│   └── vite.config.ts
├── tools/
│   └── restore-app/             # Herramienta independiente de restauración de emergencia
├── backups/postgres/            # Backups generados (.sql)
├── .gitignore
└── README.md                    # Este archivo
```

## 🗄️ Esquema de Base de Datos

El esquema completo y actualizado vive en `backend/prisma/schema.prisma` — es la fuente de verdad; se genera/actualiza vía introspección (`npx prisma db pull`) o migraciones de Prisma.

### Tablas Principales
- **usuarios** - Usuarios del sistema con roles
- **alumnos** - Estudiantes (multi-año)
- **apoderados** - Apoderados (con RUT, DNI o Pasaporte)
- **alumno_apoderado** - Relación muchos a muchos
- **cursos** - Cursos y niveles educativos

### Tablas Auxiliares
- **anio_vigente** - Control del año académico activo
- **documentos_pendientes** - Control de documentos por alumno
- **logs_importacion** - Registro de importaciones
- **backups** - Registro de backups realizados

### Características de la Base de Datos
- ✅ Índices optimizados en todas las búsquedas frecuentes
- ✅ Validaciones a nivel de aplicación (RUT, email, fechas) y de base de datos
- ✅ Triggers para lógica de negocio (año vigente único)
- ✅ Funciones de PostgreSQL para monitoreo (`get_basic_health_check`, etc.)
- ✅ Columnas de auditoría (creado_por, creado_en, actualizado_en)

## 🔧 Características Técnicas

### API Endpoints Principales

#### Autenticación
- `POST /api/auth/login` - Login de usuario
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/validate-token` - Validar sesión actual
- `GET /api/auth/token-info` - Información de expiración del token

#### Estudiantes
- `GET /api/students` - Listar estudiantes (con paginación)
- `GET /api/students/search` - Búsqueda inteligente
- `GET /api/students/:id` - Obtener estudiante por ID
- `POST /api/students` - Crear estudiante
- `PUT /api/students/:id` - Actualizar estudiante
- `DELETE /api/students/:id` - Eliminar estudiante (soft delete)
- `GET /api/students/export-complete` - Exportación completa CSV

#### Apoderados
- `GET /api/guardians/check/:rut` - Buscar apoderado por RUT
- `GET /api/guardians/:id` - Obtener apoderado por ID
- `POST /api/guardians` - Crear apoderado
- `PUT /api/guardians/:id` - Actualizar apoderado

#### Backups (administrador)
- `GET /api/admin/backup/list` - Listar backups disponibles
- `POST /api/admin/backup/create` - Crear backup manual
- `POST /api/admin/backups/restore` - Restaurar backup
- `GET /api/admin/monitor/*` - Estado de la base de datos

### Optimizaciones de Rendimiento
- **Conexión pooling** vía `pg.Pool` (driver adapter de Prisma)
- **Consultas optimizadas** con joins eficientes
- **Índices estratégicos** en columnas de búsqueda frecuente
- **Paginación** en listados grandes
- **Debouncing** en búsquedas del frontend
- **Lazy loading** de componentes React

### Seguridad Implementada
- **JWT con httpOnly cookies** (cookie de sesión) - Previene XSS
- **Rate limiting** en dos capas (nginx + Express) - Previene ataques de fuerza bruta
- **Validación de entrada** - En frontend y backend
- **Sanitización de datos** - Previene SQL injection e inyección CSV
- **Headers de seguridad** - Helmet.js + HSTS configurados
- **CORS restrictivo** - Solo orígenes permitidos
- **Hashing de contraseñas** - bcrypt con salt

## 📝 Scripts Disponibles

### Backend
```bash
npm start          # Iniciar servidor
```

### Frontend
```bash
npm run dev        # Servidor de desarrollo
npm run build      # Build para producción
npm run preview    # Previsualizar build
npm run lint       # Ejecutar ESLint
```

### Prisma
```bash
npx prisma generate    # Generar el cliente Prisma
npx prisma db pull     # Introspección: actualizar schema.prisma desde la BD real
```

## 📚 Documentación Adicional

### 📊 Testing de Performance
- **[k6-tests/INDEX.md](k6-tests/INDEX.md)** - 📑 Índice visual de documentación
- **[k6-tests/TESTING.md](k6-tests/TESTING.md)** - ⭐ Guía rápida de testing con k6 (empieza aquí)
- [k6-tests/README.md](k6-tests/README.md) - 📖 Documentación completa del sistema de testing
- [k6-tests/IMPLEMENTATION.md](k6-tests/IMPLEMENTATION.md) - 🔧 Resumen técnico de la implementación

**Testing de Carga:**
Sistema completo con k6 + Grafana + InfluxDB para simular 50+ usuarios matriculando simultáneamente. Incluye visualización en tiempo real, 5 tipos de tests (smoke, load, stress, spike, soak) y generación de datos realistas. Toda la documentación está centralizada en [k6-tests/](k6-tests/).

### Documentación histórica
Reportes de incidentes, planes de migración y evaluaciones ya resueltas quedan archivados en [`docs/archivo/`](docs/archivo/) como registro histórico — no reflejan necesariamente el estado actual del sistema.

## 🐛 Solución de Problemas

### El backend no conecta a la base de datos
```bash
# Verificar que PostgreSQL esté activo
systemctl status postgresql

# Verificar credenciales en backend/.env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
```

### Error de permisos en la base de datos
```bash
# Verificar que el rol matricula_app tenga los GRANT necesarios
sudo -u postgres psql -d matricula -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO matricula_app;"
```

### El esquema de Prisma no coincide con la base de datos
```bash
# Regenerar schema.prisma desde la BD real
cd backend
npx prisma db pull
npx prisma generate
```

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🏫 Desarrollado para Instituciones Educacionales

Este sistema fue diseñado específicamente para instituciones educacionales chilenas que necesitan una solución completa, segura y autónoma (sin dependencias de conectividad a internet) para la gestión de matrícula escolar.

### Características destacadas para colegios:
✅ Cumple con normativas chilenas (RUT, formato de datos, Ley 19.628)
✅ Soporte completo para NEE y PIE
✅ Gestión multi-año de estudiantes
✅ Sistema de backups automáticos
✅ Exportación compatible con SIGE
✅ Funciona completamente en el servidor local del colegio, sin depender de servicios en la nube

---

**Versión:** 1.6.0
**Última actualización:** Julio 2026
**Estado:** Producción estable — PostgreSQL 16 nativo + Prisma, sin Docker
