#!/bin/bash

##############################################################################
# Script para ejecutar tests de k6 con InfluxDB
# Sistema de Matrícula Escolar - Performance Testing
##############################################################################

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
BASE_URL="${BASE_URL:-http://localhost:5003}"
INFLUX_URL="${INFLUX_URL:-http://localhost:8086/api/v2/write?org=matricula&bucket=k6}"
K6_WEB_DASHBOARD="${K6_WEB_DASHBOARD:-true}"

# Función para mostrar ayuda
show_help() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  📊 k6 Test Runner - Sistema de Matrícula Escolar${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Uso: ./run-test.sh [TEST_TYPE] [OPTIONS]"
    echo ""
    echo "Test Types:"
    echo "  smoke      - Test rápido de verificación (1-5 VUs, 2 min)"
    echo "  load       - Test de carga normal (50 VUs, 14 min) ⭐"
    echo "  stress     - Test de estrés (hasta 200 VUs, 16 min)"
    echo "  spike      - Test de pico repentino (100 VUs, 6 min)"
    echo "  soak       - Test de resistencia (30 VUs, 1 hora)"
    echo ""
    echo "Options:"
    echo "  --no-influx     No enviar métricas a InfluxDB"
    echo "  --json          Guardar resultados en JSON"
    echo "  --html          Generar reporte HTML (requiere k6-reporter)"
    echo "  --base-url URL  URL del API (default: $BASE_URL)"
    echo ""
    echo "Ejemplos:"
    echo "  ./run-test.sh smoke"
    echo "  ./run-test.sh load"
    echo "  ./run-test.sh stress --json"
    echo "  ./run-test.sh load --base-url http://192.168.1.100:5003"
    echo ""
}

# Función para verificar k6
check_k6() {
    if ! command -v k6 &> /dev/null; then
        echo -e "${RED}❌ Error: k6 no está instalado${NC}"
        echo ""
        echo "Instala k6:"
        echo "  - macOS:   brew install k6"
        echo "  - Linux:   https://k6.io/docs/get-started/installation/"
        echo "  - Windows: choco install k6"
        echo ""
        exit 1
    fi
}

# Función para verificar que el API esté corriendo
check_api() {
    echo -e "${YELLOW}🔍 Verificando API en $BASE_URL...${NC}"
    if curl -s -f "$BASE_URL/api/auth/login" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ API disponible${NC}"
    else
        echo -e "${RED}❌ Error: API no responde en $BASE_URL${NC}"
        echo ""
        echo "Asegúrate de que el backend esté corriendo:"
        echo "  cd backend && npm start"
        echo ""
        exit 1
    fi
}

# Función para verificar InfluxDB
check_influxdb() {
    if [ "$USE_INFLUX" = true ]; then
        echo -e "${YELLOW}🔍 Verificando InfluxDB...${NC}"
        if curl -s -f "http://localhost:8086/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ InfluxDB disponible${NC}"
        else
            echo -e "${YELLOW}⚠️  Warning: InfluxDB no responde${NC}"
            echo ""
            echo "Para visualización en tiempo real, inicia el stack de testing:"
            echo "  docker-compose -f docker-compose.testing.yml up -d"
            echo ""
            echo "Continuando sin InfluxDB..."
            USE_INFLUX=false
        fi
    fi
}

# Función para ejecutar test
run_test() {
    local test_type=$1
    local test_file="k6-tests/scenarios/${test_type}.test.js"

    if [ ! -f "$test_file" ]; then
        echo -e "${RED}❌ Error: Test file no encontrado: $test_file${NC}"
        exit 1
    fi

    # Construir comando k6
    local k6_cmd="k6 run"

    # Agregar salida a InfluxDB si está habilitado
    if [ "$USE_INFLUX" = true ]; then
        k6_cmd="$k6_cmd --out influxdb=$INFLUX_URL"
    fi

    # Agregar salida JSON si está habilitado
    if [ "$OUTPUT_JSON" = true ]; then
        local json_file="k6-tests/reports/${test_type}-$(date +%Y%m%d-%H%M%S).json"
        k6_cmd="$k6_cmd --out json=$json_file"
        echo -e "${BLUE}📄 JSON output: $json_file${NC}"
    fi

    # Variables de entorno
    k6_cmd="$k6_cmd -e BASE_URL=$BASE_URL"
    k6_cmd="$k6_cmd -e TEST_ENV=${TEST_ENV:-local}"

    # Archivo de test
    k6_cmd="$k6_cmd $test_file"

    # Mostrar información del test
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  🚀 Ejecutando Test: ${test_type}${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}API:${NC} $BASE_URL"
    echo -e "${GREEN}InfluxDB:${NC} $([ "$USE_INFLUX" = true ] && echo "Habilitado ✅" || echo "Deshabilitado")"
    echo -e "${GREEN}Grafana:${NC} $([ "$USE_INFLUX" = true ] && echo "http://localhost:3001" || echo "N/A")"
    echo ""
    echo -e "${YELLOW}Comando:${NC} $k6_cmd"
    echo ""

    # Ejecutar k6
    eval $k6_cmd

    # Mensaje final
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✅ Test completado: ${test_type}${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"

    if [ "$USE_INFLUX" = true ]; then
        echo ""
        echo -e "${BLUE}📊 Revisa los resultados en Grafana:${NC}"
        echo -e "   ${YELLOW}http://localhost:3001${NC}"
        echo ""
    fi
}

# Parse argumentos
TEST_TYPE=""
USE_INFLUX=true
OUTPUT_JSON=false
OUTPUT_HTML=false

while [[ $# -gt 0 ]]; do
    case $1 in
        smoke|load|stress|spike|soak)
            TEST_TYPE=$1
            shift
            ;;
        --no-influx)
            USE_INFLUX=false
            shift
            ;;
        --json)
            OUTPUT_JSON=true
            shift
            ;;
        --html)
            OUTPUT_HTML=true
            shift
            ;;
        --base-url)
            BASE_URL=$2
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Argumento desconocido: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Validar que se especificó un test
if [ -z "$TEST_TYPE" ]; then
    echo -e "${RED}❌ Error: Debes especificar un tipo de test${NC}"
    show_help
    exit 1
fi

# Ejecutar verificaciones
check_k6
check_api
check_influxdb

# Ejecutar test
run_test "$TEST_TYPE"
