#!/bin/bash
# Script de instalación automatizada para Servidor Linux Local
# Sistema de Matrícula Escolar v1.0

set -e

echo "🖥️  INSTALACIÓN DEL SISTEMA DE MATRÍCULA ESCOLAR v1.0"
echo "================================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Verificar si se ejecuta como root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}❌ No ejecutes este script como root. Usa un usuario normal con sudo.${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Detectando distribución Linux...${NC}"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    echo -e "${GREEN}Sistema detectado: $OS${NC}"
else
    echo -e "${RED}No se pudo detectar la distribución Linux${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Paso 1: Actualizando sistema...${NC}"
sudo apt update && sudo apt upgrade -y

echo -e "${BLUE}🔧 Paso 2: Instalando dependencias del sistema...${NC}"
sudo apt install -y curl wget git build-essential

echo -e "${BLUE}📱 Paso 3: Instalando Node.js 18 LTS...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    echo -e "${GREEN}✅ Node.js instalado: $(node --version)${NC}"
else
    echo -e "${GREEN}✅ Node.js ya está instalado: $(node --version)${NC}"
fi

echo -e "${BLUE}🔄 Paso 4: Instalando PM2 (Process Manager)...${NC}"
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    echo -e "${GREEN}✅ PM2 instalado${NC}"
else
    echo -e "${GREEN}✅ PM2 ya está instalado${NC}"
fi

echo -e "${BLUE}🔥 Paso 5: Configurando firewall...${NC}"
sudo ufw allow 3000/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw --force enable
echo -e "${GREEN}✅ Firewall configurado (puertos 22, 3000)${NC}"

echo -e "${BLUE}📁 Paso 6: Creando directorio del proyecto...${NC}"
PROJECT_DIR="$HOME/matricula-escolar"
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

echo -e "${BLUE}📥 Paso 7: Clonando código desde GitHub...${NC}"
if [ ! -d ".git" ]; then
    git clone https://github.com/lll-ghac/matricula-e79.git .
else
    git pull origin main
fi

echo -e "${BLUE}🔧 Paso 8: Instalando dependencias del backend...${NC}"
cd backend
npm install --only=production

echo -e "${BLUE}🎨 Paso 9: Construyendo frontend...${NC}"
cd ../frontend
npm install
npm run build

echo -e "${BLUE}📋 Paso 10: Configurando variables de entorno...${NC}"
cd ../backend

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚙️  Creando archivo de configuración .env...${NC}"

    # Generar JWT secret aleatorio
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "\\n")

    # Obtener IP local del servidor
    LOCAL_IP=$(hostname -I | awk '{print $1}')

    cat > .env << EOF
# Configuración para Servidor Linux Local
PORT=3000
NODE_ENV=production
JWT_SECRET=$JWT_SECRET

# Configuración de red local
CORS_ORIGIN=http://$LOCAL_IP:3000,http://localhost:3000

# Base de datos SQLite
DATABASE_PATH=./matricula.db

# Configuración de cookies
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax

# Rate limiting
RATE_LIMIT_REQUESTS=100

# Respaldos automáticos
BACKUP_ENABLED=true
BACKUP_HOUR=23
BACKUP_RETENTION_DAYS=30
EOF

    echo -e "${GREEN}✅ Archivo .env creado con IP local: $LOCAL_IP${NC}"
else
    echo -e "${GREEN}✅ Archivo .env ya existe${NC}"
fi

echo -e "${BLUE}🚀 Paso 11: Configurando PM2...${NC}"
cd ..

cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'matricula-escolar',
    script: './backend/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF

# Crear directorio de logs
mkdir -p logs

echo -e "${BLUE}🔄 Paso 12: Iniciando aplicación...${NC}"
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo -e "${GREEN}🎉 ¡INSTALACIÓN COMPLETADA!${NC}"
echo ""
echo -e "${CYAN}📊 INFORMACIÓN DEL SERVIDOR:${NC}"
echo -e "${CYAN}════════════════════════════${NC}"
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo -e "${GREEN}🌐 URL Local: http://$LOCAL_IP:3000${NC}"
echo -e "${GREEN}🌐 URL Localhost: http://localhost:3000${NC}"
echo -e "${GREEN}📁 Directorio: $PROJECT_DIR${NC}"
echo -e "${GREEN}🔧 Usuario del sistema: $(whoami)${NC}"
echo ""
echo -e "${CYAN}📋 COMANDOS ÚTILES:${NC}"
echo -e "${CYAN}═══════════════${NC}"
echo "Ver estado:     pm2 status"
echo "Ver logs:       pm2 logs matricula-escolar"
echo "Reiniciar:      pm2 restart matricula-escolar"
echo "Parar:          pm2 stop matricula-escolar"
echo "Actualizar:     cd $PROJECT_DIR && git pull && pm2 restart matricula-escolar"
echo ""
echo -e "${GREEN}✅ El sistema está corriendo y accesible desde toda tu red local!${NC}"

# Mostrar estado final
pm2 status
EOF