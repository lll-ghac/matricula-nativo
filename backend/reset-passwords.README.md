# Reset de Contraseñas - Script de Utilidad

## 📋 Descripción

Este script resetea las contraseñas de los usuarios a valores por defecto usando hashes **bcrypt**.

## ⚠️ Cuándo usar este script

**SIEMPRE** después de restaurar un backup, especialmente si:

- No puedes iniciar sesión después de la restauración
- El log muestra: `❌ Login fallido: contraseña incorrecta`
- Restauraste un backup de un sistema antiguo

## 🚀 Uso

```bash
cd backend
node reset-passwords.js
```

## 🔐 Credenciales después del reset

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin | admin123 | Administrador |
| 17393845 | 17393845 | Profesor |
| 17885785 | 17885785 | Administrador |

## ❓ ¿Por qué es necesario?

### El Problema

Los backups pueden contener hashes de contraseñas en diferentes formatos:

- **Sistemas antiguos:** MD5 (32 caracteres hexadecimales)
  ```
  26bd496bc3cf227c63ec3d0798c370ab
  ```

- **Sistema actual:** bcrypt (60 caracteres con salt)
  ```
  $2b$10$abcdefghijklmnopqrstuvwxyz123456789ABCDEFGHIJKLMNOP
  ```

### La Solución

El script regenera todos los hashes usando bcrypt, asegurando compatibilidad con el backend actual.

## 🔧 Qué hace el script

1. **Genera hashes bcrypt** para cada usuario
2. **Actualiza la base de datos** con los nuevos hashes
3. **Muestra las credenciales** por defecto

## 📝 Personalización

Si necesitas agregar más usuarios o cambiar las contraseñas por defecto, edita el array `USERS_TO_RESET`:

```javascript
const USERS_TO_RESET = [
  { id: 11111111, username: 'admin', password: 'admin123' },
  { id: 17393845, username: '17393845', password: '17393845' },
  // Agregar más usuarios aquí
];
```

## 🛡️ Seguridad

**IMPORTANTE:** Después de iniciar sesión con las credenciales por defecto:

1. Ve al **Panel de Administración** → **Usuarios**
2. **Cambia todas las contraseñas** a valores seguros
3. Usa contraseñas de al menos **8 caracteres** con letras, números y símbolos

## 🐛 Solución de problemas

### Error: "Cannot find module 'bcryptjs'"
**Solución:** Asegúrate de ejecutar el script desde la carpeta `backend`:
```bash
cd backend
node reset-passwords.js
```

### Error: "No se puede conectar a la base de datos"
**Solución:** Verifica que PostgreSQL esté activo:
```bash
systemctl status postgresql
```

### Error: "must be owner of table usuarios"
**Solución:** El script usa el usuario `matricula_app` sobre PostgreSQL nativo (ver `DB_USER`/`DB_PASSWORD` en `backend/.env`). Si ves este error, verifica que esas credenciales sean correctas.

## 📚 Ver también

- [BACKUP_RESTORE.md](../BACKUP_RESTORE.md) - Guía completa de backups
