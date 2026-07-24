.PHONY: help test-smoke test-load test-stress test-spike test-soak test-all test-infra-up test-infra-down test-infra-logs grafana

##############################################################################
# Makefile para Sistema de Testing - Matrícula Escolar
##############################################################################

# Variables
BASE_URL ?= http://localhost:5003
COMPOSE_FILE = docker-compose.testing.yml
K6_RUNNER = k6-tests/run-test.sh

# Colores
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m # No Color

help: ## Mostrar esta ayuda
	@echo ""
	@echo "$(BLUE)═══════════════════════════════════════════════════════$(NC)"
	@echo "$(BLUE)  📊 Sistema de Testing - Matrícula Escolar$(NC)"
	@echo "$(BLUE)═══════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(GREEN)Infraestructura de Testing:$(NC)"
	@grep -E '^test-infra-[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Tests de Performance:$(NC)"
	@grep -E '^test-[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -v infra | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Dashboards:$(NC)"
	@grep -E '^grafana[a-zA-Z_-]*:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(BLUE)Ejemplos:$(NC)"
	@echo "  make test-infra-up        # Inicia Grafana + InfluxDB"
	@echo "  make test-smoke           # Ejecuta smoke test"
	@echo "  make test-load            # Ejecuta load test (50 usuarios)"
	@echo "  make test-all             # Ejecuta todos los tests"
	@echo "  make grafana              # Abre Grafana en el navegador"
	@echo ""

##############################################################################
# Infraestructura de Testing
##############################################################################

test-infra-up: ## Iniciar stack de testing (InfluxDB + Grafana)
	@echo "$(GREEN)🚀 Iniciando stack de testing...$(NC)"
	docker-compose -f $(COMPOSE_FILE) up -d
	@echo ""
	@echo "$(GREEN)✅ Stack de testing iniciado$(NC)"
	@echo ""
	@echo "$(BLUE)Servicios disponibles:$(NC)"
	@echo "  - InfluxDB: http://localhost:8086"
	@echo "  - Grafana:  http://localhost:3001 (admin/admin)"
	@echo ""
	@echo "$(YELLOW)Esperando a que los servicios estén listos...$(NC)"
	@sleep 10
	@echo "$(GREEN)✅ Servicios listos$(NC)"
	@echo ""
	@echo "$(BLUE)Próximo paso:$(NC) Importa el dashboard de k6"
	@echo "  1. Ve a http://localhost:3001"
	@echo "  2. Dashboards → Import → ID: 18030"
	@echo ""

test-infra-down: ## Detener stack de testing
	@echo "$(YELLOW)🛑 Deteniendo stack de testing...$(NC)"
	docker-compose -f $(COMPOSE_FILE) down
	@echo "$(GREEN)✅ Stack detenido$(NC)"

test-infra-logs: ## Ver logs del stack de testing
	docker-compose -f $(COMPOSE_FILE) logs -f

test-infra-clean: ## Limpiar volúmenes del stack de testing
	@echo "$(YELLOW)⚠️  Esto eliminará todos los datos de InfluxDB y Grafana$(NC)"
	@read -p "¿Estás seguro? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose -f $(COMPOSE_FILE) down -v; \
		echo "$(GREEN)✅ Volúmenes eliminados$(NC)"; \
	else \
		echo "$(YELLOW)Cancelado$(NC)"; \
	fi

test-infra-status: ## Ver estado del stack de testing
	@echo "$(BLUE)Estado de los servicios:$(NC)"
	@docker-compose -f $(COMPOSE_FILE) ps

##############################################################################
# Tests de k6
##############################################################################

test-smoke: ## Ejecutar smoke test (verificación básica, 2 min)
	@echo "$(BLUE)🔥 Ejecutando Smoke Test...$(NC)"
	@$(K6_RUNNER) smoke --base-url $(BASE_URL)

test-load: ## Ejecutar load test (50 usuarios, 14 min) ⭐
	@echo "$(BLUE)⚡ Ejecutando Load Test - 50 Usuarios...$(NC)"
	@$(K6_RUNNER) load --base-url $(BASE_URL)

test-stress: ## Ejecutar stress test (hasta 200 usuarios, 16 min)
	@echo "$(BLUE)💥 Ejecutando Stress Test...$(NC)"
	@$(K6_RUNNER) stress --base-url $(BASE_URL)

test-spike: ## Ejecutar spike test (pico repentino, 6 min)
	@echo "$(BLUE)⚡ Ejecutando Spike Test...$(NC)"
	@$(K6_RUNNER) spike --base-url $(BASE_URL)

test-soak: ## Ejecutar soak test (resistencia, 1 hora)
	@echo "$(BLUE)🕐 Ejecutando Soak Test (1 hora)...$(NC)"
	@$(K6_RUNNER) soak --base-url $(BASE_URL)

test-soak-short: ## Ejecutar soak test corto (10 minutos)
	@echo "$(BLUE)🕐 Ejecutando Soak Test Corto (10 min)...$(NC)"
	SOAK_DURATION=10m $(K6_RUNNER) soak --base-url $(BASE_URL)

test-all: test-smoke test-load test-stress test-spike ## Ejecutar todos los tests (excepto soak)
	@echo ""
	@echo "$(GREEN)═══════════════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)  ✅ Todos los tests completados$(NC)"
	@echo "$(GREEN)═══════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(BLUE)📊 Revisa los resultados en Grafana:$(NC)"
	@echo "   http://localhost:3001"
	@echo ""

test-local: ## Ejecutar test sin InfluxDB (solo consola)
	@echo "$(BLUE)Running test locally without InfluxDB...$(NC)"
	@$(K6_RUNNER) $(TEST) --no-influx --base-url $(BASE_URL)

##############################################################################
# Dashboards y Visualización
##############################################################################

grafana: ## Abrir Grafana en el navegador
	@echo "$(BLUE)🌐 Abriendo Grafana...$(NC)"
	@which open > /dev/null && open http://localhost:3001 || \
	which xdg-open > /dev/null && xdg-open http://localhost:3001 || \
	echo "$(YELLOW)Abre manualmente: http://localhost:3001$(NC)"

grafana-import-dashboard: ## Instrucciones para importar dashboard de k6
	@echo ""
	@echo "$(BLUE)═══════════════════════════════════════════════════════$(NC)"
	@echo "$(BLUE)  📊 Importar Dashboard de k6 en Grafana$(NC)"
	@echo "$(BLUE)═══════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(GREEN)Pasos:$(NC)"
	@echo "  1. Ve a http://localhost:3001"
	@echo "  2. Login: admin / admin"
	@echo "  3. Dashboards → Import"
	@echo "  4. Ingresa el ID: $(YELLOW)18030$(NC)"
	@echo "  5. Selecciona datasource: $(YELLOW)InfluxDB_k6$(NC)"
	@echo "  6. Click en $(YELLOW)Import$(NC)"
	@echo ""
	@echo "$(BLUE)Dashboard Oficial de k6:$(NC)"
	@echo "  https://grafana.com/grafana/dashboards/18030"
	@echo ""

influxdb: ## Abrir InfluxDB en el navegador
	@echo "$(BLUE)🌐 Abriendo InfluxDB...$(NC)"
	@which open > /dev/null && open http://localhost:8086 || \
	which xdg-open > /dev/null && xdg-open http://localhost:8086 || \
	echo "$(YELLOW)Abre manualmente: http://localhost:8086$(NC)"
	@echo ""
	@echo "$(BLUE)Credenciales:$(NC)"
	@echo "  Usuario: admin"
	@echo "  Password: adminpass123"
	@echo "  Org: matricula"
	@echo "  Bucket: k6"

##############################################################################
# Utilidades
##############################################################################

check-k6: ## Verificar instalación de k6
	@echo "$(BLUE)Verificando k6...$(NC)"
	@which k6 > /dev/null && echo "$(GREEN)✅ k6 instalado: $$(k6 version)$(NC)" || \
	(echo "$(YELLOW)❌ k6 no está instalado$(NC)" && \
	 echo "" && \
	 echo "Instala k6:" && \
	 echo "  - macOS:   brew install k6" && \
	 echo "  - Linux:   https://k6.io/docs/get-started/installation/" && \
	 echo "  - Windows: choco install k6")

check-api: ## Verificar que el API esté corriendo
	@echo "$(BLUE)Verificando API en $(BASE_URL)...$(NC)"
	@curl -s -f $(BASE_URL)/api/auth/login > /dev/null && \
		echo "$(GREEN)✅ API disponible$(NC)" || \
		(echo "$(YELLOW)❌ API no responde$(NC)" && \
		 echo "" && \
		 echo "Inicia el backend:" && \
		 echo "  cd backend && npm start")

check-all: check-k6 check-api test-infra-status ## Verificar todo el stack

##############################################################################
# Instalación
##############################################################################

install-k6: ## Instalar k6 (macOS/Linux)
	@echo "$(BLUE)Instalando k6...$(NC)"
	@if [[ "$$(uname)" == "Darwin" ]]; then \
		brew install k6; \
	elif [[ "$$(uname)" == "Linux" ]]; then \
		sudo gpg -k; \
		sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69; \
		echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list; \
		sudo apt-get update; \
		sudo apt-get install k6; \
	else \
		echo "$(YELLOW)Sistema operativo no soportado. Instala manualmente: https://k6.io/docs/get-started/installation/$(NC)"; \
	fi

##############################################################################
# Default
##############################################################################

.DEFAULT_GOAL := help
