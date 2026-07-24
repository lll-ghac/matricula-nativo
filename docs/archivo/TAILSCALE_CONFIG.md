# Configuración de Tailscale - Sistema de Matrículas
**Fecha de instalación:** 26 de Diciembre de 2025
**Servidor:** Producción (192.16.1.130)
**Versión Tailscale:** 1.92.3

---

## 📋 Información de Configuración

### Datos del Dispositivo

| Parámetro | Valor |
|-----------|-------|
| **Hostname** | `matricula-produccion` |
| **IP Tailscale (IPv4)** | `100.75.184.31` |
| **IP Tailscale (IPv6)** | `fd7a:115c:a1e0::f701:b883` |
| **IP Local** | `192.168.1.121` |
| **Usuario Tailscale** | `lindalibreyloca.tienda@gmail.com` |
| **Servidor DERP** | Dallas (149.6ms latency) |

### Servicios Expuestos

| Servicio | Puerto Local | URL Tailscale |
|----------|--------------|---------------|
| **Sistema de Matrículas (Frontend)** | 5173 | `http://100.75.184.31` |
| **Backend API** | 5003 | `http://100.75.184.31/api` |
| **Supabase Studio** | 54323 | `http://100.75.184.31:54323` |
| **PostgreSQL** | 54322 | `100.75.184.31:54322` |

---

## 🔗 Acceso al Sistema

### Desde Cualquier Dispositivo en la Tailnet

**Opción 1: Por IP de Tailscale (Recomendado)**
```
http://100.75.184.31
```

**Opción 2: Por Hostname (MagicDNS)**
```
http://matricula-produccion
```

**Opción 3: Por FQDN**
```
http://matricula-produccion.tail-scale.ts.net
```

### Acceso a Servicios Específicos

**Supabase Studio:**
```
http://100.75.184.31:54323
```

**PostgreSQL directo:**
```
Host: 100.75.184.31
Port: 54322
Database: postgres
User: postgres
```

---

## ⚙️ Configuración Actual

### Opciones Habilitadas

- ✅ Servicio Tailscale activo y habilitado al arranque
- ✅ MagicDNS habilitado
- ✅ Hostname personalizado: `matricula-produccion`
- ✅ IPv4 y IPv6 funcionando
- ✅ Conexión a servidor DERP: Dallas

### Opciones NO Configuradas (Opcionales)

- ⏸️ Exit node (no configurado)
- ⏸️ Rutas de subred anunciadas (no configurado)
- ⏸️ Key expiry deshabilitado (pendiente - recomendado)

---

## 🔐 Configuración de Seguridad Recomendada

### Paso 1: Deshabilitar Expiración de Clave (Recomendado para Servidores)

Para evitar que el servidor requiera re-autenticación cada 90 días:

**Opción A: Desde el Panel Web**
1. Ir a https://login.tailscale.com/admin/machines
2. Buscar `matricula-produccion`
3. Click en los 3 puntos → "Disable key expiry"

**Opción B: Desde la CLI (si tienes API key)**
```bash
tailscale up --auth-key=<tu-auth-key>
```

### Paso 2: Configurar ACLs (Control de Acceso)

En el panel de Tailscale (https://login.tailscale.com/admin/acls), puedes configurar quién puede acceder a qué servicios.

Ejemplo de ACL básico:
```json
{
  "acls": [
    {
      "action": "accept",
      "src": ["autogroup:members"],
      "dst": ["matricula-produccion:80,443,5003,54322,54323"]
    }
  ]
}
```

### Paso 3: Configurar Tags (Opcional)

Los tags ayudan a organizar y aplicar políticas:

```bash
sudo tailscale up --advertise-tags=tag:production,tag:matricula
```

---

## 🌐 Configuración de Rutas de Subred (Opcional)

Si quieres que otros dispositivos en Tailscale puedan acceder a la red local 192.168.1.0/24:

### Habilitar en el Servidor

```bash
echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward
echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf

sudo tailscale up --advertise-routes=192.168.1.0/24
```

### Aprobar en el Panel Web

1. Ir a https://login.tailscale.com/admin/machines
2. Buscar `matricula-produccion`
3. Click en "Edit route settings"
4. Aprobar la ruta `192.168.1.0/24`

---

## 📱 Instalar Tailscale en Dispositivos Cliente

### Windows / macOS / Linux
Descargar desde: https://tailscale.com/download

### Android / iOS
Buscar "Tailscale" en Google Play o App Store

### Configuración
1. Instalar Tailscale
2. Iniciar sesión con la cuenta `lindalibreyloca.tienda@gmail.com`
3. Automáticamente se conectará a la misma tailnet
4. Acceder a `http://100.75.184.31` o `http://matricula-produccion`

---

## 🔍 Comandos de Verificación

### Ver Estado de Tailscale
```bash
tailscale status
```

### Ver IPs Asignadas
```bash
tailscale ip -4  # IPv4
tailscale ip -6  # IPv6
```

### Verificar Conectividad
```bash
tailscale netcheck
```

### Ver Logs
```bash
sudo journalctl -u tailscaled -f
```

### Hacer Ping a Otro Dispositivo
```bash
tailscale ping <nombre-dispositivo>
```

---

## 🛠️ Solución de Problemas

### No puedo conectarme al servidor

1. **Verificar que Tailscale esté corriendo:**
   ```bash
   sudo systemctl status tailscaled
   ```

2. **Verificar estado de conexión:**
   ```bash
   tailscale status
   ```

3. **Verificar que el servidor está en la misma tailnet:**
   ```bash
   tailscale status | grep matricula-produccion
   ```

### Reiniciar Tailscale

```bash
sudo systemctl restart tailscaled
```

### Re-autenticar Dispositivo

```bash
sudo tailscale up --force-reauth
```

---

## 📊 Monitoreo

### Ver Tráfico en Tiempo Real
```bash
sudo tailscale debug watch-ipn
```

### Ver Conexiones Activas
```bash
tailscale status --active
```

### Ver Información Detallada
```bash
tailscale status --json | jq
```

---

## 🔄 Actualización de Tailscale

### Actualizar a la Última Versión

```bash
sudo apt update
sudo apt upgrade tailscale
```

### Habilitar Actualizaciones Automáticas

```bash
sudo tailscale set --auto-update
```

---

## 🚨 Comandos de Emergencia

### Desconectar Temporalmente
```bash
sudo tailscale down
```

### Reconectar
```bash
sudo tailscale up
```

### Eliminar Dispositivo Completamente
```bash
sudo tailscale logout
```

---

## 📝 Notas Adicionales

### Ventajas de Tailscale vs Acceso Público

- ✅ **Seguridad:** Encriptación WireGuard punto a punto
- ✅ **Privacidad:** No expone servicios públicamente
- ✅ **Simplicidad:** No requiere configurar VPN tradicional
- ✅ **Performance:** Conexiones directas peer-to-peer cuando es posible
- ✅ **Multi-plataforma:** Clientes para todos los sistemas operativos
- ✅ **Zero-trust:** Autenticación individual por dispositivo

### Consideraciones

- ⚠️ Requiere que cada usuario/dispositivo tenga Tailscale instalado
- ⚠️ Depende del servicio de Tailscale (aunque usa coordinación DERP, las claves no se comparten)
- ⚠️ Latencia adicional si no hay conexión directa (relay via DERP)

---

## 🔗 Referencias

- **Panel de Administración:** https://login.tailscale.com/admin/
- **Documentación Oficial:** https://tailscale.com/kb/
- **Estado del Servicio:** https://status.tailscale.com/
- **Comunidad GitHub:** https://github.com/tailscale/tailscale

---

## ✅ Checklist Post-Instalación

- [x] Tailscale instalado
- [x] Servicio iniciado y habilitado
- [x] Dispositivo autenticado
- [x] Hostname configurado
- [x] Conectividad verificada
- [ ] Key expiry deshabilitado (recomendado)
- [ ] ACLs configuradas (opcional)
- [ ] Rutas de subred configuradas (opcional)
- [ ] Tailscale instalado en dispositivos cliente
- [ ] Prueba de acceso desde otro dispositivo

---

**Instalado por:** Claude Code (Automatizado)
**Fecha:** 26 de Diciembre de 2025
**Versión:** 1.92.3
**Estado:** ✅ Operacional

---

## 🔧 Configuración del Frontend para Tailscale

### Problema Inicial
Después de instalar Tailscale, los usuarios podían hacer login pero no cargaban los datos de estudiantes/apoderados al acceder desde dispositivos remotos vía Tailscale.

### Causa Raíz
El frontend estaba configurado para conectarse a Supabase usando `localhost` (127.0.0.1:54321), lo cual solo funciona cuando se accede desde el mismo servidor. Al acceder desde un dispositivo remoto vía Tailscale, el navegador intentaba conectarse al localhost del dispositivo cliente, no del servidor.

### Solución Aplicada
Se creó el archivo `/home/ghac/matriculav5/frontend/.env` con la configuración de Tailscale:

```bash
# Configuración para acceso vía Tailscale
# IP de Tailscale del servidor
VITE_SUPABASE_URL=http://100.75.184.31:54321
VITE_SUPABASE_ANON_KEY=<redactado — clave demo pública de Supabase, no es un secreto real, pero se saca para evitar falsos positivos de escaneo>
```

### Verificación
- ✅ Frontend reiniciado con `pm2 restart matricula-frontend --update-env`
- ✅ Frontend accesible en `http://100.75.184.31:5173`
- ✅ Configuración de Supabase apunta a IP de Tailscale
- ✅ Variables de entorno cargadas correctamente

### Pruebas Requeridas
El usuario debe verificar desde un dispositivo remoto conectado a Tailscale:
1. Acceder a `http://100.75.184.31`
2. Hacer login
3. Verificar que se carguen correctamente:
   - Lista de estudiantes
   - Lista de apoderados
   - Todas las funcionalidades del sistema

**Fecha de configuración:** 26 de Diciembre de 2025

---

**Fin del documento**
