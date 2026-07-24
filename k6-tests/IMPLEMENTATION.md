# 📊 Implementación de Sistema de Testing con k6 - Resumen

**Fecha:** Noviembre 2024
**Sistema:** Matrícula Escolar
**Versión:** 1.0.0

---

## ✅ ¿Qué se implementó?

Se integró un **sistema completo de testing de performance** usando **k6**, **InfluxDB** y **Grafana** que permite:

✅ Simular **50+ usuarios matriculando simultáneamente**
✅ **Visualizar métricas en tiempo real** con dashboards profesionales
✅ **Medir tiempos de respuesta** (p50, p95, p99)
✅ **Detectar cuellos de botella** antes de producción
✅ **Encontrar límites de capacidad** del sistema
✅ **Detectar memory leaks** con tests prolongados
✅ **Probar resiliencia** ante picos de tráfico

---

## 📁 Archivos Creados

### **Infraestructura (Docker)**

```
docker-compose.testing.yml          # Stack InfluxDB + Grafana
```

### **Tests de k6**

```
k6-tests/
├── scenarios/
│   ├── smoke.test.js              # Verificación básica (2 min)
│   ├── load-matricula.test.js     # 50 usuarios (14 min) ⭐
│   ├── stress.test.js             # Hasta 200 usuarios (16 min)
│   ├── spike.test.js              # Pico repentino (6 min)
│   └── soak.test.js               # Resistencia (1 hora)
├── utils/
│   ├── config.js                  # Configuración centralizada
│   ├── auth.js                    # Helpers de autenticación
│   └── data-generator.js          # Generador de datos chilenos
├── data/
│   └── README.md
├── reports/                       # Reportes generados (gitignored)
├── run-test.sh                    # Script para ejecutar tests ⭐
├── .gitignore
└── README.md                      # Documentación completa ⭐
```

### **Configuración de Grafana**

```
grafana/
├── dashboards/
│   └── README.md                  # Guía de dashboards
└── provisioning/
    ├── datasources/
    │   └── influxdb.yml           # Auto-config InfluxDB
    └── dashboards/
        └── dashboard.yml          # Auto-config dashboards
```

### **Automatización (Makefile)**

```
Makefile                           # Comandos make para todo ⭐
```

### **Scripts de Utilidad**

```
quickstart-testing.sh              # Setup automático ⭐
```

### **Documentación**

```
TESTING.md                         # Guía rápida ⭐
k6-tests/README.md                 # Documentación completa ⭐
K6_TESTING_IMPLEMENTATION.md       # Este archivo
```

---

## 🧪 Tests Implementados

### 1. **Smoke Test** 🔥
- **Propósito:** Verificación básica
- **Usuarios:** 1-5 VUs
- **Duración:** 2 minutos
- **Comando:** `make test-smoke`

### 2. **Load Test** ⚡ (Principal)
- **Propósito:** Simular período de matrícula
- **Usuarios:** 10-50 VUs concurrentes
- **Duración:** 14 minutos
- **Comando:** `make test-load`
- **Escenario:**
  - 2 min: Rampa 0 → 10 usuarios
  - 5 min: Rampa 10 → 50 usuarios
  - 5 min: Mantener 50 usuarios
  - 2 min: Descenso 50 → 0

### 3. **Stress Test** 💥
- **Propósito:** Encontrar límite de capacidad
- **Usuarios:** 20 → 200 VUs (incremental)
- **Duración:** 16 minutos
- **Comando:** `make test-stress`

### 4. **Spike Test** ⚡
- **Propósito:** Resiliencia ante picos
- **Usuarios:** 10 → 100 VUs (repentino)
- **Duración:** 6 minutos
- **Comando:** `make test-spike`

### 5. **Soak Test** 🕐
- **Propósito:** Detectar memory leaks
- **Usuarios:** 20-30 VUs constantes
- **Duración:** 1 hora (configurable)
- **Comando:** `make test-soak`

---

## 📊 Métricas Monitoreadas

### **HTTP Generales**
- `http_req_duration` - Tiempo total (p50, p95, p99)
- `http_req_waiting` - TTFB
- `http_req_failed` - Tasa de errores
- `http_reqs` - Requests/segundo

### **Operaciones Específicas**
- `login_duration` - Tiempo de login
- `create_student_duration` - **Tiempo de matrícula** (crítica)
- `search_student_duration` - Búsqueda
- `list_students_duration` - Listar
- `check_guardian_duration` - Verificar apoderado

### **Contadores**
- `students_created` - Estudiantes creados
- `students_created_per_minute` - Tasa de matrícula
- `login_failures` - Login fallidos
- `create_student_failures` - Creaciones fallidas
- `errors` - Tasa general de errores

### **Validaciones**
- `checks` - Porcentaje de checks pasados

---

## 🎯 Thresholds (Criterios de Éxito)

```javascript
{
  // Performance
  'http_req_duration': ['p(95)<2000', 'p(99)<5000'],
  'http_req_failed': ['rate<0.05'],

  // Operaciones específicas
  'login_duration': ['p(95)<1500'],
  'create_student_duration': ['p(95)<3000', 'p(99)<6000'],
  'search_student_duration': ['p(95)<1000'],

  // Validaciones
  'errors': ['rate<0.05'],
  'checks': ['rate>0.95'],
}
```

---

## 🚀 Cómo Usar

### **Inicio Rápido (Automático)**

```bash
./quickstart-testing.sh
```

Este script interactivo:
1. Verifica prerrequisitos
2. Levanta InfluxDB + Grafana
3. Verifica el backend
4. Guía la configuración de Grafana
5. Ejecuta smoke test
6. Opcionalmente ejecuta load test

### **Inicio Manual**

```bash
# 1. Instalar k6
brew install k6  # macOS
# o ver k6-tests/README.md para otras plataformas

# 2. Levantar stack de testing
make test-infra-up

# 3. Iniciar backend (otra terminal)
cd backend && npm start

# 4. Ejecutar test
make test-load

# 5. Ver resultados
# Abrir http://localhost:3001
# Importar dashboard ID: 18030
```

---

## 🛠️ Comandos Principales (Makefile)

### **Infraestructura**
```bash
make test-infra-up          # Iniciar Grafana + InfluxDB
make test-infra-down        # Detener
make test-infra-logs        # Ver logs
make test-infra-status      # Estado
make test-infra-clean       # Limpiar volúmenes
```

### **Tests**
```bash
make test-smoke             # Smoke test
make test-load              # Load test (50 usuarios) ⭐
make test-stress            # Stress test
make test-spike             # Spike test
make test-soak              # Soak test (1 hora)
make test-all               # Todos (excepto soak)
```

### **Dashboards**
```bash
make grafana                # Abrir Grafana
make influxdb               # Abrir InfluxDB
make grafana-import-dashboard  # Instrucciones
```

### **Verificaciones**
```bash
make check-k6               # k6 instalado?
make check-api              # API corriendo?
make check-all              # Todo OK?
make help                   # Ver todos los comandos
```

---

## 📈 Dashboard de Grafana

### **Dashboard Oficial de k6 (ID: 18030)**

Incluye:
- **Request Rate** - req/s en tiempo real
- **Response Time** - p50, p95, p99
- **Error Rate** - Porcentaje de errores
- **Virtual Users** - Usuarios activos
- **HTTP Status Codes** - Distribución
- **Checks** - Tasa de éxito
- **Thresholds** - Estado de umbrales

### **Cómo Importar:**

1. Abrir http://localhost:3001
2. Login: `admin` / `admin`
3. **Dashboards** → **Import**
4. ID: **18030**
5. Datasource: **InfluxDB_k6**
6. Import

---

## 🎲 Generador de Datos

El sistema incluye un generador de datos **realistas chilenos**:

### **Datos Generados**
- **RUTs válidos** con dígito verificador correcto
- **Nombres chilenos** (42 opciones)
- **Apellidos chilenos** (42 opciones)
- **Comunas** principales de Chile (25 opciones)
- **Direcciones** realistas
- **Teléfonos** chilenos (+569...)
- **Emails** generados automáticamente
- **Cursos** (1° a 8° Básico, A y B)
- **Fechas de nacimiento** (5-18 años)
- **Apoderados** con datos completos

### **Configuraciones**
- 10% tiene NEE
- 15% participa en PIE
- 30% tiene PAE
- 20% tiene beca

---

## 🔧 Características Técnicas

### **Arquitectura**
```
k6 (Tests) → InfluxDB (Métricas) → Grafana (Visualización)
```

### **Tecnologías**
- **k6**: Motor de tests (Go-based, eficiente)
- **InfluxDB 2.7**: Base de datos de series temporales
- **Grafana 10.2**: Visualización profesional
- **Docker Compose**: Orquestación de servicios

### **Características de los Tests**
- Autenticación JWT
- Generación de datos realistas
- Métricas personalizadas
- Thresholds configurables
- Tags para filtrado
- Scenarios configurables
- Setup y teardown functions
- Checks automáticos

---

## 📊 Ejemplo de Salida

### **Test Exitoso** ✅
```
scenarios: (100.00%) 1 scenario, 50 max VUs, 14m30s max duration

✓ Login exitoso
✓ Token recibido
✓ Listar: status 200
✓ Crear: status exitoso
✓ Crear: retorna ID

checks.........................: 97.23% ✓ 1458  ✗ 42
data_received..................: 12 MB  14 kB/s
data_sent......................: 8.2 MB 9.7 kB/s
http_req_duration..............: avg=1.2s  p(95)=1.8s  p(99)=2.3s
http_req_failed................: 2.34%  ✓ 35    ✗ 1465
http_reqs......................: 1500   17.8/s
students_created...............: 342
create_student_duration........: avg=2.1s  p(95)=2.8s  p(99)=3.4s
vus............................: 0      min=0   max=50
vus_max........................: 50     min=50  max=50
```

---

## ⚠️ Consideraciones Importantes

### **Antes de Ejecutar**
- ✅ Ejecuta smoke test primero
- ✅ Verifica que el backend esté corriendo
- ✅ Monitorea recursos del servidor (CPU, RAM, DB)
- ✅ No ejecutes contra producción sin autorización

### **Durante los Tests**
- 📊 Monitorea Grafana en tiempo real
- 🔍 Observa logs del backend si hay errores
- 💾 Verifica uso de memoria y conexiones DB
- ⏱️ Los tests de larga duración (soak) toman tiempo

### **Después de los Tests**
- 📈 Analiza p95 y p99 de response times
- ❌ Revisa tasa de errores (debe ser < 5%)
- 🎯 Compara contra thresholds definidos
- 💾 Guarda resultados para comparaciones futuras

---

## 🔍 Troubleshooting

### **k6 no encontrado**
```bash
# macOS
brew install k6

# Linux
make install-k6

# Windows
choco install k6
```

### **API no responde**
```bash
cd backend && npm start
curl http://localhost:5003/api/auth/login
```

### **InfluxDB/Grafana no funcionan**
```bash
make test-infra-down
make test-infra-up
docker-compose -f docker-compose.testing.yml ps
```

### **Grafana no muestra datos**
1. Verifica que InfluxDB esté corriendo
2. Ejecuta tests con InfluxDB output
3. Refresca dashboard
4. Ajusta rango de tiempo

---

## 📚 Documentación

### **Archivos de Documentación**
- **[TESTING.md](TESTING.md)** - Guía rápida
- **[k6-tests/README.md](k6-tests/README.md)** - Documentación completa
- **[grafana/dashboards/README.md](grafana/dashboards/README.md)** - Dashboards
- **[Makefile](Makefile)** - Todos los comandos (ver `make help`)

### **Recursos Externos**
- [k6 Documentation](https://k6.io/docs/)
- [Dashboard 18030](https://grafana.com/grafana/dashboards/18030)
- [InfluxDB Flux](https://docs.influxdata.com/influxdb/v2/query-data/flux/)

---

## 🎯 Casos de Uso Recomendados

### **1. Antes de un Release**
```bash
make test-smoke    # Verificación rápida
make test-load     # Validar capacidad
make test-soak-short  # 10 min para memory leaks
```

### **2. Planificación de Capacidad**
```bash
make test-stress   # Encontrar límite
# Analizar en qué punto el sistema falla
```

### **3. Antes de Período de Matrícula**
```bash
make test-spike    # Probar picos repentinos
make test-load     # Validar 50 usuarios concurrentes
```

### **4. Investigar Problemas de Performance**
```bash
make test-load     # Con Grafana abierto
# Identificar endpoints lentos
```

### **5. CI/CD Integration**
```bash
# En GitHub Actions o similar
make test-smoke || exit 1
```

---

## 🎉 Resumen

Se implementó un **sistema profesional de testing de performance** que:

✅ **No afecta el código existente** - Todo es externo y opcional
✅ **Fácil de usar** - Un comando para todo (`make test-load`)
✅ **Visualización profesional** - Dashboards de Grafana en tiempo real
✅ **Datos realistas** - Generador de datos chilenos
✅ **Bien documentado** - READMEs completos y ejemplos
✅ **Automatizado** - Scripts y Makefile
✅ **Listo para CI/CD** - Puede integrarse a pipelines
✅ **Escalable** - Fácil agregar más tests

---

## 📞 Próximos Pasos

1. **Ejecutar quickstart:** `./quickstart-testing.sh`
2. **Revisar TESTING.md** para guía rápida
3. **Ejecutar smoke test** para validar setup
4. **Ejecutar load test** para ver métricas reales
5. **Importar dashboard** en Grafana (ID: 18030)
6. **Analizar resultados** y ajustar thresholds si necesario
7. **Integrar a CI/CD** (opcional)

---

**¿Preguntas?** Revisa `k6-tests/README.md` o `TESTING.md`

**¡Happy Load Testing!** 🚀📊

---

**Implementado por:** Claude (Anthropic)
**Fecha:** Noviembre 2024
**Versión:** 1.0.0
