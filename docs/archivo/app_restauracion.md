# App de Restauración de Respaldos

## Descripción General

Aplicación web independiente para gestionar la restauración de respaldos de la base de datos PostgreSQL del sistema de matrícula. Permite conectarse a servidores locales (Windows) o remotos (Ubuntu Server).

## Arquitectura

```
┌─────────────────────┐         ┌─────────────────────┐
│   Cliente Web       │   HTTP  │   Servidor Ubuntu   │
│   (React/Vite)      │ ──────> │   (API Express)     │
│   Puerto: 5180      │         │   Puerto: 5181      │
└─────────────────────┘         └─────────────────────┘
                                         │
                                         │ Docker exec
                                         ▼
                                ┌─────────────────────┐
                                │   PostgreSQL        │
                                │   (Supabase Docker) │
                                └─────────────────────┘
```

## Componentes

### 1. Cliente Web (restore-app-client)

**Tecnología:** React + Vite + TypeScript
**Puerto:** 5180
**Ubicación:** `tools/restore-app/client/`

**Funcionalidades:**
- Configurar conexión al servidor (IP, puerto, credenciales)
- Ver estado de la base de datos (conteo de tablas)
- Listar backups disponibles en el servidor
- Subir archivos de backup (.sql) desde el cliente
- Restaurar backup seleccionado
- Ver progreso y logs de restauración

### 2. API del Servidor (restore-app-server)

**Tecnología:** Node.js + Express
**Puerto:** 5181
**Ubicación:** `tools/restore-app/server/`

**Endpoints:**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/login` | Autenticación con credenciales |
| GET | `/api/health` | Estado del servidor y conexión a BD |
| GET | `/api/database/status` | Conteo de registros por tabla |
| GET | `/api/backups` | Listar backups disponibles |
| POST | `/api/backups/upload` | Subir archivo de backup |
| POST | `/api/backups/restore` | Restaurar un backup |
| GET | `/api/backups/restore/status` | Estado de restauración en progreso |

## Configuración

### Archivo de configuración del servidor

`tools/restore-app/server/config.json`

```json
{
  "port": 5181,
  "auth": {
    "username": "admin",
    "password": "restore123"
  },
  "docker": {
    "container": "supabase_db_matricula-escolar",
    "user": "postgres",
    "database": "postgres"
  },
  "backups": {
    "directory": "/ruta/a/backups/postgres"
  },
  "cors": {
    "allowedOrigins": ["http://localhost:5180", "http://192.168.1.100:5180"]
  }
}
```

### Variables de entorno alternativas

```bash
RESTORE_PORT=5181
RESTORE_USERNAME=admin
RESTORE_PASSWORD=restore123
DOCKER_CONTAINER=supabase_db_matricula-escolar
BACKUP_DIR=/home/usuario/matricula-escolar/backups/postgres
```

## Seguridad

### Autenticación
- Login con usuario/contraseña configurados
- Token JWT con expiración de 1 hora
- Todas las rutas protegidas excepto `/api/auth/login` y `/api/health`

### Red
- CORS configurado para orígenes específicos
- Recomendado: usar solo en red local/VPN
- Opcional: configurar HTTPS con certificados

### Validaciones
- Archivos de backup solo .sql
- Tamaño máximo de upload: 100MB
- Sanitización de nombres de archivo
- Validación de contenido SQL básica

## Interfaz de Usuario

### Pantalla de Login
- Campo de IP/Host del servidor
- Campo de puerto (default: 5181)
- Usuario y contraseña
- Botón "Conectar"
- Recordar última conexión

### Panel Principal

```
┌─────────────────────────────────────────────────┐
│  App Restauración - Conectado a 192.168.1.50    │
├─────────────────────────────────────────────────┤
│                                                 │
│  ESTADO DE LA BASE DE DATOS                     │
│  ┌─────────────┬─────────────┬───────────────┐  │
│  │ Alumnos     │ Apoderados  │ Relaciones    │  │
│  │ 764         │ 630         │ 764           │  │
│  └─────────────┴─────────────┴───────────────┘  │
│                                                 │
│  BACKUPS DISPONIBLES                            │
│  ┌─────────────────────────────────────────┐    │
│  │ ○ matricula_2025-11-20_12-02-18.sql     │    │
│  │   1.24 MB - 20/11/2025 12:02            │    │
│  │ ○ matricula_2025-11-19_13-19-09.sql     │    │
│  │   2.66 MB - 19/11/2025 13:19            │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  [Subir Backup]  [Restaurar Seleccionado]       │
│                                                 │
│  LOGS                                           │
│  ┌─────────────────────────────────────────┐    │
│  │ > Conectado exitosamente                │    │
│  │ > Base de datos: 764 alumnos            │    │
│  │ > 2 backups encontrados                 │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Modal de Restauración
- Confirmación con nombre del backup
- Advertencia: "Esto reemplazará todos los datos actuales"
- Barra de progreso
- Logs en tiempo real
- Resultado final con resumen de datos restaurados

## Instalación

### En el Servidor Ubuntu

```bash
# 1. Clonar o copiar la carpeta tools/restore-app/server
cd /opt/restore-app

# 2. Instalar dependencias
npm install

# 3. Configurar (editar config.json o usar variables de entorno)
nano config.json

# 4. Iniciar el servicio
node index.js

# 5. (Opcional) Configurar como servicio systemd
sudo nano /etc/systemd/system/restore-app.service
```

**Archivo systemd:**

```ini
[Unit]
Description=App Restauración de Respaldos
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/restore-app
ExecStart=/usr/bin/node index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable restore-app
sudo systemctl start restore-app
```

### En Windows (Cliente)

```bash
# 1. Ir a la carpeta del cliente
cd tools/restore-app/client

# 2. Instalar dependencias
npm install

# 3. Iniciar en modo desarrollo
npm run dev

# 4. O compilar para producción
npm run build
```

### En Windows (Servidor local para pruebas)

```bash
# 1. Ir a la carpeta del servidor
cd tools/restore-app/server

# 2. Instalar dependencias
npm install

# 3. Configurar config.json con rutas de Windows
# 4. Iniciar
node index.js
```

## Estructura de Archivos

```
tools/
└── restore-app/
    ├── client/
    │   ├── src/
    │   │   ├── components/
    │   │   │   ├── LoginForm.tsx
    │   │   │   ├── DatabaseStatus.tsx
    │   │   │   ├── BackupList.tsx
    │   │   │   ├── UploadBackup.tsx
    │   │   │   ├── RestoreModal.tsx
    │   │   │   └── LogViewer.tsx
    │   │   ├── services/
    │   │   │   └── api.ts
    │   │   ├── App.tsx
    │   │   └── main.tsx
    │   ├── package.json
    │   └── vite.config.ts
    │
    └── server/
        ├── routes/
        │   ├── auth.js
        │   ├── database.js
        │   └── backups.js
        ├── middleware/
        │   └── auth.js
        ├── utils/
        │   └── docker.js
        ├── config.json
        ├── index.js
        └── package.json
```

## Flujo de Restauración

1. **Usuario selecciona backup** (del servidor o sube uno nuevo)
2. **Confirma la operación** (modal de advertencia)
3. **API inicia restauración:**
   - Resetea la base de datos (`supabase db reset --no-seed`)
   - Vacía tablas de datos
   - Deshabilita triggers y RLS
   - Ejecuta el archivo SQL
   - Rehabilita triggers y RLS
   - Resetea secuencias
   - Resetea contraseñas de usuarios
4. **Devuelve resultado** con conteo de registros restaurados
5. **UI muestra resumen** y credenciales reseteadas

## Dependencias

### Cliente
- react
- vite
- typescript
- axios
- lucide-react (iconos)

### Servidor
- express
- jsonwebtoken
- multer (upload de archivos)
- cors
- child_process (para docker exec)

## Consideraciones

### Compatibilidad
- **Windows:** Usar rutas con backslash, Docker Desktop
- **Ubuntu:** Usar rutas con slash, Docker nativo

### Rendimiento
- Backups grandes (>50MB) pueden tardar varios minutos
- Implementar timeout extendido para restauraciones
- WebSocket opcional para progreso en tiempo real

### Respaldo previo
- Antes de restaurar, crear backup automático de seguridad
- Nombrar como `pre_restore_YYYY-MM-DD_HH-MM-SS.sql`

## Próximos Pasos

1. [ ] Crear estructura de carpetas
2. [ ] Implementar servidor Express con endpoints
3. [ ] Implementar autenticación JWT
4. [ ] Crear cliente React con componentes
5. [ ] Integrar upload de archivos
6. [ ] Implementar lógica de restauración
7. [ ] Agregar logs en tiempo real
8. [ ] Probar en Windows local
9. [ ] Probar en Ubuntu Server remoto
10. [ ] Documentar instalación paso a paso

## Tiempo Estimado de Desarrollo

- **Servidor (API):** 2-3 horas
- **Cliente (UI):** 3-4 horas
- **Integración y pruebas:** 2 horas
- **Total:** 7-9 horas de desarrollo
