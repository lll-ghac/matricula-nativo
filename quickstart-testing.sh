#!/bin/bash

##############################################################################
# Quick Start Script - Sistema de Testing k6
# Sistema de Matrícula Escolar
##############################################################################

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  🚀 Quick Start - Sistema de Testing con k6${NC}"
echo -e "${CYAN}  Sistema de Matrícula Escolar${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo ""

# Función para verificar comando
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✅ $1 está instalado${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 NO está instalado${NC}"
        return 1
    fi
}

# Función para esperar Enter
wait_enter() {
    echo ""
    read -p "Presiona Enter para continuar..."
    echo ""
}

# PASO 1: Verificar prerrequisitos
echo -e "${BLUE}═══ Paso 1: Verificando Prerrequisitos ═══${NC}"
echo ""

PREREQUISITES_OK=true

echo -e "${YELLOW}Verificando Docker...${NC}"
if check_command docker; then
    docker --version
else
    echo -e "${RED}Docker es necesario para InfluxDB y Grafana${NC}"
    echo "Instala Docker desde: https://www.docker.com/get-started"
    PREREQUISITES_OK=false
fi

echo ""
echo -e "${YELLOW}Verificando Docker Compose...${NC}"
if check_command docker-compose; then
    docker-compose --version
else
    echo -e "${RED}Docker Compose es necesario${NC}"
    PREREQUISITES_OK=false
fi

echo ""
echo -e "${YELLOW}Verificando k6...${NC}"
if check_command k6; then
    k6 version
else
    echo -e "${YELLOW}k6 NO está instalado. Se puede instalar ahora.${NC}"
    echo ""
    echo "Opciones de instalación:"
    echo "  - macOS:   brew install k6"
    echo "  - Linux:   Ver k6-tests/README.md"
    echo "  - Windows: choco install k6"
    echo ""
    read -p "¿Quieres que intente instalar k6 automáticamente? (macOS/Linux) [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo "Instalando k6 con Homebrew..."
            brew install k6
        else
            echo "Instalando k6 en Linux..."
            make install-k6 || {
                echo -e "${RED}Error instalando k6. Instala manualmente.${NC}"
                PREREQUISITES_OK=false
            }
        fi
    else
        PREREQUISITES_OK=false
    fi
fi

echo ""
echo -e "${YELLOW}Verificando Node.js...${NC}"
if check_command node; then
    node --version
else
    echo -e "${RED}Node.js es necesario para el backend${NC}"
    PREREQUISITES_OK=false
fi

echo ""
echo -e "${YELLOW}Verificando npm...${NC}"
if check_command npm; then
    npm --version
else
    echo -e "${RED}npm es necesario${NC}"
    PREREQUISITES_OK=false
fi

if [ "$PREREQUISITES_OK" = false ]; then
    echo ""
    echo -e "${RED}❌ Faltan prerrequisitos. Instálalos y vuelve a ejecutar este script.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Todos los prerrequisitos están instalados${NC}"
wait_enter

# PASO 2: Levantar Stack de Testing
clear
echo -e "${BLUE}═══ Paso 2: Levantando Stack de Testing ═══${NC}"
echo ""
echo "Iniciando InfluxDB y Grafana con Docker Compose..."
echo ""

docker-compose -f docker-compose.testing.yml up -d

echo ""
echo -e "${GREEN}✅ Stack de testing iniciado${NC}"
echo ""
echo -e "${CYAN}Servicios disponibles:${NC}"
echo "  - InfluxDB: http://localhost:8086"
echo "  - Grafana:  http://localhost:3001 (admin/admin)"
echo ""
echo "Esperando a que los servicios estén listos (10 segundos)..."
sleep 10

echo -e "${GREEN}✅ Servicios listos${NC}"
wait_enter

# PASO 3: Verificar Backend
clear
echo -e "${BLUE}═══ Paso 3: Verificando Backend ═══${NC}"
echo ""

if curl -s -f http://localhost:5003/api/auth/login > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend está corriendo en http://localhost:5003${NC}"
else
    echo -e "${YELLOW}⚠️  Backend NO está corriendo${NC}"
    echo ""
    echo "Para iniciar el backend, abre otra terminal y ejecuta:"
    echo ""
    echo -e "${CYAN}  cd backend${NC}"
    echo -e "${CYAN}  npm install${NC}"
    echo -e "${CYAN}  npm start${NC}"
    echo ""
    read -p "¿El backend ya está corriendo? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${YELLOW}Inicia el backend y vuelve a ejecutar este script.${NC}"
        echo "O continúa manualmente siguiendo k6-tests/TESTING.md"
        exit 1
    fi
fi

wait_enter

# PASO 4: Configurar Grafana
clear
echo -e "${BLUE}═══ Paso 4: Configurar Grafana ═══${NC}"
echo ""
echo "Ahora vamos a importar el dashboard de k6 en Grafana."
echo ""
echo -e "${CYAN}Pasos a seguir:${NC}"
echo ""
echo "  1. Abre Grafana: ${YELLOW}http://localhost:3001${NC}"
echo "  2. Login con: ${YELLOW}admin${NC} / ${YELLOW}admin${NC}"
echo "  3. Ve a ${YELLOW}Dashboards → Import${NC}"
echo "  4. Ingresa el ID: ${YELLOW}18030${NC}"
echo "  5. Selecciona datasource: ${YELLOW}InfluxDB_k6${NC}"
echo "  6. Click en ${YELLOW}Import${NC}"
echo ""
echo "¿Quieres abrir Grafana ahora?"
read -p "[y/N] " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v open &> /dev/null; then
        open http://localhost:3001
    elif command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:3001
    else
        echo "Abre manualmente: http://localhost:3001"
    fi
fi

echo ""
echo "Cuando hayas importado el dashboard, presiona Enter para continuar..."
read

# PASO 5: Ejecutar Smoke Test
clear
echo -e "${BLUE}═══ Paso 5: Ejecutar Smoke Test ═══${NC}"
echo ""
echo "Vamos a ejecutar un ${YELLOW}Smoke Test${NC} para verificar que todo funciona."
echo ""
echo "Este test:"
echo "  - Dura ~2 minutos"
echo "  - Usa 1-5 usuarios virtuales"
echo "  - Verifica login, listar, buscar y crear estudiantes"
echo ""
read -p "¿Ejecutar smoke test ahora? [Y/n] " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo ""
    echo -e "${CYAN}Ejecutando smoke test...${NC}"
    echo ""

    ./k6-tests/run-test.sh smoke

    echo ""
    echo -e "${GREEN}✅ Smoke test completado${NC}"
    echo ""
    echo "Revisa las métricas en Grafana: ${YELLOW}http://localhost:3001${NC}"
else
    echo ""
    echo -e "${YELLOW}Smoke test omitido.${NC}"
fi

wait_enter

# PASO 6: Información Final
clear
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Quick Start Completado${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}🎉 Todo listo para ejecutar tests de performance!${NC}"
echo ""
echo -e "${BLUE}═══ Próximos Pasos ═══${NC}"
echo ""
echo "Ejecutar tests:"
echo "  ${YELLOW}make test-smoke${NC}        # Verificación básica (2 min)"
echo "  ${YELLOW}make test-load${NC}         # 50 usuarios matriculando (14 min) ⭐"
echo "  ${YELLOW}make test-stress${NC}       # Hasta 200 usuarios (16 min)"
echo "  ${YELLOW}make test-spike${NC}        # Pico repentino (6 min)"
echo "  ${YELLOW}make test-soak${NC}         # Resistencia (1 hora)"
echo ""
echo "Ver resultados:"
echo "  ${YELLOW}Grafana:${NC}  http://localhost:3001"
echo "  ${YELLOW}InfluxDB:${NC} http://localhost:8086"
echo ""
echo "Documentación:"
echo "  ${YELLOW}k6-tests/README.md${NC}     # Documentación completa"
echo "  ${YELLOW}k6-tests/TESTING.md${NC}    # Guía rápida"
echo "  ${YELLOW}make help${NC}              # Ver todos los comandos"
echo ""
echo -e "${BLUE}═══ Comandos Útiles ═══${NC}"
echo ""
echo "  ${YELLOW}make test-infra-status${NC}  # Ver estado de servicios"
echo "  ${YELLOW}make test-infra-logs${NC}    # Ver logs"
echo "  ${YELLOW}make test-infra-down${NC}    # Detener servicios"
echo "  ${YELLOW}make check-all${NC}          # Verificar todo"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}¿Quieres ejecutar el Load Test principal (50 usuarios) ahora?${NC}"
echo -e "${YELLOW}Este test simula 50 usuarios matriculando simultáneamente (14 min)${NC}"
echo ""
read -p "[y/N] " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${CYAN}Ejecutando Load Test...${NC}"
    echo ""
    make test-load
    echo ""
    echo -e "${GREEN}✅ Load Test completado${NC}"
    echo ""
    echo "Revisa los resultados en Grafana: ${YELLOW}http://localhost:3001${NC}"
else
    echo ""
    echo -e "${GREEN}¡Perfecto! Ejecuta tests cuando estés listo.${NC}"
fi

echo ""
echo -e "${CYAN}Happy Load Testing! 🚀📊${NC}"
echo ""
