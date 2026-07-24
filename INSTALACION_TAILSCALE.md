# Guía de Instalación de Tailscale
**Fecha:** 26 de Diciembre de 2025
**Servidor:** Producción (192.16.1.130)
**Sistema:** Ubuntu 24.04 (noble)

---

## 📋 Requisitos Previos

- Acceso sudo al servidor
- Conexión a Internet
- Cuenta de Tailscale (crear en https://tailscale.com si no tienes una)

---

## 🚀 Instalación Paso a Paso

### Paso 1: Agregar repositorio de Tailscale

```bash
# Agregar la llave GPG de Tailscale
curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/noble.noarmor.gpg | sudo tee /usr/share/keyrings/tailscale-archive-keyring.gpg >/dev/null

# Agregar el repositorio de Tailscale
curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/noble.tailscale-keyring.list | sudo tee /etc/apt/sources.list.d/tailscale.list
```

### Paso 2: Instalar Tailscale

```bash
# Actualizar lista de paquetes
sudo apt update

# Instalar Tailscale
sudo apt install -y tailscale
```

### Paso 3: Iniciar Tailscale

```bash
# Iniciar Tailscale y autenticarte
sudo tailscale up
```

Este comando mostrará una URL que debes abrir en un navegador para autenticar el dispositivo en tu red Tailscale.

---

## ⚙️ Configuración Opcional

### Habilitar acceso como exit node (opcional)

Si quieres que este servidor actúe como exit node para enrutar todo el tráfico:

```bash
sudo tailscale up --advertise-exit-node
```

### Habilitar acceso a subredes locales (recomendado)

Para permitir que otros dispositivos en Tailscale accedan a la red local (192.16.1.0/24):

```bash
sudo tailscale up --advertise-routes=192.16.1.0/24
```

**Nota:** Después debes aprobar las rutas en el panel de administración de Tailscale.

### Deshabilitar key expiration (recomendado para servidores)

Para que el servidor no requiera re-autenticación periódica:

```bash
sudo tailscale set --operator=$USER
tailscale up --auth-key=<tu-auth-key>
```

O desde el panel web de Tailscale:
1. Ve a https://login.tailscale.com/admin/machines
2. Encuentra tu servidor
3. Click en los 3 puntos → "Disable key expiry"

---

## 🔍 Verificación

### Verificar estado de Tailscale

```bash
# Ver estado del servicio
sudo systemctl status tailscaled

# Ver estado de la conexión
tailscale status

# Ver tu IP de Tailscale
tailscale ip -4
```

### Ver dispositivos conectados

```bash
tailscale status
```

### Hacer ping a otro dispositivo en Tailscale

```bash
# Por nombre
ping <nombre-dispositivo>

# Por IP de Tailscale (usualmente en el rango 100.x.x.x)
ping 100.x.x.x
```

---

## 🌐 Acceso al Sistema de Matrículas vía Tailscale

Una vez instalado Tailscale:

### Opción 1: Acceso directo por IP local (si se configuraron rutas de subred)

```
http://192.16.1.130
```

### Opción 2: Acceso por IP de Tailscale

```
http://<tailscale-ip>:80
```

**Para encontrar la IP de Tailscale del servidor:**
```bash
tailscale ip -4
```

### Opción 3: Acceso por nombre de máquina (MagicDNS)

Si tienes MagicDNS habilitado (por defecto en Tailscale):

```
http://<nombre-servidor>.tailnet-xxxx.ts.net
```

---

## 🔒 Seguridad y Firewall

### Ventajas de Tailscale vs Nginx + Trust Proxy

- ✅ **Encriptación punto a punto**: Todo el tráfico está cifrado con WireGuard
- ✅ **Sin puertos expuestos públicamente**: No necesitas abrir puerto 80/443 al mundo
- ✅ **Autenticación centralizada**: Control de acceso desde el panel de Tailscale
- ✅ **IPs reales**: No necesitas `trust proxy` porque cada dispositivo tiene su IP única
- ✅ **Zero-trust**: Cada conexión es autenticada individualmente
- ✅ **Multi-plataforma**: Clientes para Windows, Mac, Linux, iOS, Android

### Configurar Firewall (UFW)

Si ya no usarás acceso público, puedes cerrar los puertos:

```bash
# Ver reglas actuales
sudo ufw status

# Opcional: Cerrar acceso público a puerto 80 (mantener solo Tailscale)
# ⚠️ SOLO HACER ESTO SI ESTÁS SEGURO
# sudo ufw delete allow 80/tcp

# Permitir puerto de Tailscale (usualmente no necesario, Tailscale maneja esto)
# Ya está configurado por defecto
```

---

## 📊 Monitoreo

### Ver logs de Tailscale

```bash
# Ver logs del servicio
sudo journalctl -u tailscaled -f

# Ver logs de conexión
sudo tailscale debug logs
```

### Ver métricas

```bash
# Ver estadísticas de tráfico
tailscale netcheck
```

---

## 🛠️ Solución de Problemas

### Tailscale no se conecta

```bash
# Reiniciar el servicio
sudo systemctl restart tailscaled

# Verificar estado
sudo systemctl status tailscaled

# Ver logs de error
sudo journalctl -u tailscaled -n 50
```

### No puedo acceder desde otro dispositivo

1. Verificar que ambos dispositivos estén en la misma tailnet
2. Verificar firewall local:
   ```bash
   sudo ufw status
   ```
3. Hacer ping para verificar conectividad:
   ```bash
   ping <nombre-dispositivo>
   ```

### Re-autenticar dispositivo

```bash
sudo tailscale up --force-reauth
```

---

## 📱 Instalar Tailscale en Otros Dispositivos

### Windows/Mac/Linux

Descargar desde: https://tailscale.com/download

### Android/iOS

Buscar "Tailscale" en Google Play o App Store

### Configuración de cliente

1. Instalar Tailscale
2. Iniciar sesión con la misma cuenta
3. Automáticamente se agregará a tu red

---

## 🎯 Casos de Uso

### Caso 1: Acceso desde Casa al Servidor de Producción

1. Instalar Tailscale en tu laptop/PC
2. Conectarte a la misma tailnet
3. Acceder a `http://192.16.1.130` directamente (si configuraste rutas de subred)

### Caso 2: Acceso desde Celular

1. Instalar app de Tailscale en tu celular
2. Conectarte a la tailnet
3. Acceder desde el navegador móvil

### Caso 3: Equipo de Trabajo Remoto

1. Cada miembro instala Tailscale
2. Todos se conectan a la misma tailnet
3. Acceso seguro sin VPN tradicional

---

## 🔧 Configuración Avanzada

### Configurar Tailscale como systemd service (ya viene configurado)

```bash
sudo systemctl enable tailscaled
sudo systemctl start tailscaled
```

### Configurar auto-updates

```bash
sudo tailscale set --auto-update
```

### Configurar hostname personalizado

```bash
sudo tailscale up --hostname=matricula-produccion
```

---

## 📚 Recursos

- **Documentación oficial:** https://tailscale.com/kb/
- **Panel de administración:** https://login.tailscale.com/admin/
- **Estado del servicio:** https://status.tailscale.com/
- **Comunidad:** https://github.com/tailscale/tailscale/discussions

---

## ✅ Checklist de Instalación

- [ ] Agregar repositorio de Tailscale
- [ ] Instalar Tailscale
- [ ] Autenticar dispositivo (`tailscale up`)
- [ ] Verificar estado (`tailscale status`)
- [ ] Configurar nombre de host (opcional)
- [ ] Deshabilitar key expiry
- [ ] Configurar rutas de subred (opcional)
- [ ] Probar conectividad desde otro dispositivo
- [ ] Documentar IP de Tailscale del servidor
- [ ] Instalar Tailscale en dispositivos cliente
- [ ] Verificar acceso al sistema de matrículas

---

## 📝 Notas Posteriores a la Instalación

### IP de Tailscale de este servidor

Una vez instalado, ejecutar:
```bash
tailscale ip -4
```

Y documentar aquí la IP: `100.___.___.___`

### Nombre de la tailnet

Documentar el nombre de la tailnet: `___________`

### Dispositivos autorizados

Lista de dispositivos que tienen acceso:
1. ________________
2. ________________
3. ________________

---

**Instalación realizada por:** _______________
**Fecha:** _______________
**IP de Tailscale asignada:** _______________
**Notas adicionales:** _______________

---

**Fin de la guía**
