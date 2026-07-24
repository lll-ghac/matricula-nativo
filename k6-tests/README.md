# 📊 Sistema de Testing de Performance con k6

Sistema completo de pruebas de carga y performance para el Sistema de Matrícula Escolar usando **k6**, **InfluxDB** y **Grafana**.

![k6](https://img.shields.io/badge/k6-latest-7D64FF?logo=k6)
![Grafana](https://img.shields.io/badge/Grafana-10.2-F46800?logo=grafana)
![InfluxDB](https://img.shields.io/badge/InfluxDB-2.7-22ADF6?logo=influxdb)

---

## 📚 Documentación

Toda la documentación está en esta carpeta:

- **[INDEX.md](INDEX.md)** - 📑 Índice visual de toda la documentación
- **[TESTING.md](TESTING.md)** - ⭐ Guía rápida de inicio (empieza aquí)
- **[README.md](README.md)** - 📖 Este archivo: Guía completa de uso
- **[IMPLEMENTATION.md](IMPLEMENTATION.md)** - 🔧 Resumen técnico de la implementación

**Documentación adicional:**
- **[grafana/dashboards/README.md](../grafana/dashboards/README.md)** - Guía de dashboards de Grafana
- **[data/README.md](data/README.md)** - Información sobre datos de prueba

**¿Primera vez?** → Lee **[TESTING.md](TESTING.md)** primero

---

## 🎯 ¿Qué es esto?

Este sistema te permite:

✅ **Simular 50+ usuarios matriculando simultáneamente**
✅ **Ver métricas en tiempo real** con dashboards de Grafana
✅ **Detectar cuellos de botella** antes de producción
✅ **Medir tiempos de respuesta** (p95, p99)
✅ **Encontrar el límite de capacidad** del sistema
✅ **Detectar memory leaks** con tests prolongados
✅ **Probar resiliencia** ante picos de tráfico

---

## 🚀 Inicio Rápido (5 minutos)

### 1. Instalar k6

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6

# O usa el Makefile
make install-k6
```

### 2. Levantar el Stack de Testing

```bash
# Opción 1: Con Docker Compose
docker-compose -f docker-compose.testing.yml up -d

# Opción 2: Con Makefile (recomendado)
make test-infra-up
```

Esto levanta:
- **InfluxDB** (base de datos de métricas) en `http://localhost:8086`
- **Grafana** (visualización) en `http://localhost:3001`

### 3. Iniciar el Backend

```bash
cd backend
npm start
```

El API debe estar corriendo en `http://localhost:5003`

### 4. Ejecutar un Test

```bash
# Opción 1: Con el script helper
./k6-tests/run-test.sh smoke

# Opción 2: Con Makefile (recomendado)
make test-smoke

# Opción 3: Directamente con k6
k6 run --out influxdb=http://localhost:8086/api/v2/write?org=matricula&bucket=k6 \
  k6-tests/scenarios/smoke.test.js
```

### 5. Ver Resultados en Grafana

1. Abre **http://localhost:3001** (usuario: `admin`, password: `admin`)
2. Ve a **Dashboards** → **Import**
3. Ingresa el ID: **18030** (dashboard oficial de k6)
4. Selecciona datasource: **InfluxDB_k6**
5. ¡Listo! 🎉

---

## 🧪 Tests Disponibles

### **1. Smoke Test** 🔥
**Propósito:** Verificación básica rápida
**Usuarios:** 1-5 VUs
**Duración:** 2 minutos
**Cuándo usar:** Antes de cada test pesado, después de cada deploy

```bash
make test-smoke
```

---

### **2. Load Test** ⚡ (Principal)
**Propósito:** Simular carga normal de matrícula
**Usuarios:** 10 → 50 VUs (concurrentes)
**Duración:** 14 minutos
**Cuándo usar:** Para validar que el sistema soporta 50 usuarios matriculando simultáneamente

```bash
make test-load
```

**Escenario:**
- 2 min: Rampa de 0 → 10 usuarios
- 5 min: Rampa de 10 → 50 usuarios
- 5 min: Mantener 50 usuarios constantes
- 2 min: Descenso de 50 → 0 usuarios

**Operaciones simuladas:**
- Login de usuarios
- Listar estudiantes
- Buscar apoderados existentes
- Crear estudiantes con 2 apoderados
- Búsquedas de estudiantes
- Consultar estadísticas

---

### **3. Stress Test** 💥
**Propósito:** Encontrar el límite de capacidad
**Usuarios:** 20 → 200 VUs (incremento progresivo)
**Duración:** 16 minutos
**Cuándo usar:** Mensualmente, para saber cuántos usuarios soporta antes de fallar

```bash
make test-stress
```

---

### **4. Spike Test** ⚡
**Propósito:** Probar resiliencia ante picos repentinos
**Usuarios:** 10 → 100 VUs (en 10 segundos)
**Duración:** 6 minutos
**Cuándo usar:** Antes de eventos importantes (apertura de matrícula, publicación de resultados)

```bash
make test-spike
```

---

### **5. Soak Test** 🕐
**Propósito:** Detectar memory leaks y degradación a largo plazo
**Usuarios:** 20-30 VUs constantes
**Duración:** 1 hora (configurable)
**Cuándo usar:** Antes de releases importantes, para detectar problemas de memoria

```bash
# Test completo (1 hora)
make test-soak

# Test corto (10 minutos)
make test-soak-short
```

---

## 📊 Métricas Monitoreadas

### **Métricas HTTP Generales**
- `http_req_duration` - Tiempo total de request (p50, p95, p99)
- `http_req_waiting` - Tiempo de espera del servidor (TTFB)
- `http_req_failed` - Tasa de requests fallidos
- `http_reqs` - Requests por segundo (throughput)

### **Métricas Personalizadas**
- `login_duration` - Tiempo de login
- `create_student_duration` - **Tiempo de crear estudiante** (métrica crítica)
- `search_student_duration` - Tiempo de búsqueda
- `list_students_duration` - Tiempo de listar estudiantes
- `check_guardian_duration` - Tiempo de verificar apoderado

### **Contadores**
- `students_created` - Total de estudiantes creados
- `students_created_per_minute` - Tasa de matrícula
- `login_failures` - Login fallidos
- `create_student_failures` - Creaciones fallidas
- `errors` - Tasa general de errores

---

## 🎨 Dashboards de Grafana

### Dashboard Principal (ID: 18030)

Incluye:
- **Request Rate** - Requests por segundo en tiempo real
- **Response Times** - p50, p95, p99
- **Error Rate** - Porcentaje de errores
- **Virtual Users** - Usuarios activos
- **HTTP Status Codes** - Distribución de códigos
- **Checks Pass Rate** - Porcentaje de validaciones exitosas
- **Thresholds** - Estado de los umbrales definidos

### Cómo Importar:

```bash
# Opción 1: Manual
# 1. Ve a http://localhost:3001
# 2. Dashboards → Import → ID: 18030

# Opción 2: Ver instrucciones
make grafana-import-dashboard
```

---

## 🎯 Thresholds (Umbrales de Éxito)

Los tests definen umbrales que **deben cumplirse** para considerarse exitosos:

```javascript
thresholds: {
  // 95% de requests < 2s, 99% < 5s
  'http_req_duration': ['p(95)<2000', 'p(99)<5000'],

  // Menos del 5% de errores
  'http_req_failed': ['rate<0.05'],
  'errors': ['rate<0.05'],

  // 95% de validaciones deben pasar
  'checks': ['rate>0.95'],

  // Operaciones específicas
  'login_duration': ['p(95)<1500'],               // Login < 1.5s
  'create_student_duration': ['p(95)<3000'],      // Matrícula < 3s
  'search_student_duration': ['p(95)<1000'],      // Búsqueda < 1s
}
```

Si algún threshold falla, **k6 retorna exit code 99** (útil para CI/CD).

---

## 📁 Estructura del Proyecto

```
k6-tests/
├── scenarios/              # Tests de k6
│   ├── smoke.test.js      # Verificación básica
│   ├── load-matricula.test.js   # Load test principal ⭐
│   ├── stress.test.js     # Test de estrés
│   ├── spike.test.js      # Test de picos
│   └── soak.test.js       # Test de resistencia
├── utils/                 # Utilidades compartidas
│   ├── config.js         # Configuración centralizada
│   ├── auth.js           # Helpers de autenticación
│   └── data-generator.js # Generador de datos realistas
├── data/                 # Datos de prueba
│   └── README.md
├── reports/              # Reportes generados (JSON)
├── run-test.sh          # Script para ejecutar tests
└── README.md            # Esta documentación
```

---

## 🛠️ Comandos Útiles (Makefile)

### Infraestructura

```bash
make test-infra-up          # Iniciar InfluxDB + Grafana
make test-infra-down        # Detener servicios
make test-infra-logs        # Ver logs
make test-infra-status      # Ver estado
make test-infra-clean       # Limpiar volúmenes
```

### Tests

```bash
make test-smoke             # Smoke test
make test-load              # Load test (50 usuarios) ⭐
make test-stress            # Stress test
make test-spike             # Spike test
make test-soak              # Soak test (1 hora)
make test-soak-short        # Soak test corto (10 min)
make test-all               # Todos (excepto soak)
```

### Dashboards

```bash
make grafana                # Abrir Grafana
make influxdb               # Abrir InfluxDB
make grafana-import-dashboard  # Instrucciones
```

### Verificaciones

```bash
make check-k6               # Verificar k6 instalado
make check-api              # Verificar API corriendo
make check-all              # Verificar todo
```

### Ayuda

```bash
make help                   # Ver todos los comandos
```

---

## 🔧 Configuración Avanzada

### Variables de Entorno

```bash
# URL del API (default: http://localhost:5003)
export BASE_URL=http://192.168.1.100:5003

# Credenciales (default: admin/admin123)
export ADMIN_USER=admin
export ADMIN_PASSWORD=admin123

# Entorno (para tags)
export TEST_ENV=staging

# Ejecutar test
make test-load
```

### Ejecutar Sin InfluxDB

```bash
# Solo output en consola
./k6-tests/run-test.sh smoke --no-influx

# O con Makefile
make test-local TEST=smoke
```

### Guardar Resultados en JSON

```bash
./k6-tests/run-test.sh load --json
# Genera: k6-tests/reports/load-20231115-143022.json
```

### Personalizar Duración del Soak Test

```bash
# 30 minutos en lugar de 1 hora
SOAK_DURATION=30m make test-soak

# O directamente
SOAK_DURATION=30m ./k6-tests/run-test.sh soak
```

---

## 📈 Interpretación de Resultados

### ✅ **Test Exitoso**

```
✓ http_req_duration..............: p(95)=1523ms p(99)=2104ms
✓ http_req_failed................: 2.34%
✓ create_student_duration........: p(95)=2456ms
✓ errors.........................: 3.12%
✓ checks.........................: 97.23%
```

**Indicadores:**
- p95 < 2s ✅
- Error rate < 5% ✅
- Checks > 95% ✅

### ❌ **Test Fallido**

```
✗ http_req_duration..............: p(95)=5823ms p(99)=12304ms
✗ http_req_failed................: 15.34%
✗ create_student_duration........: p(95)=8456ms
✗ errors.........................: 18.12%
```

**Problemas detectados:**
- Latencia muy alta (p95 > 5s)
- Muchos errores (> 15%)
- Posibles causas:
  - Pool de conexiones saturado
  - Base de datos lenta
  - Memory leak
  - CPU saturado

### 📊 **Qué Buscar en Grafana**

1. **Response Time estable**
   - Si crece con el tiempo → Memory leak
   - Si crece con VUs → Necesitas escalar

2. **Error Rate bajo (<5%)**
   - Picos breves son normales
   - Errores sostenidos = problema

3. **Throughput escalando linealmente**
   - Debería crecer con VUs
   - Si se estanca → Bottleneck

4. **Estudiantes creados constante**
   - Debe mantenerse estable
   - Si baja → Degradación

---

## 🐛 Troubleshooting

### Error: "API no está disponible"

```bash
# Verifica que el backend esté corriendo
cd backend
npm start

# O verifica con curl
curl http://localhost:5003/api/auth/login
```

### Error: "InfluxDB no responde"

```bash
# Verifica que el stack esté corriendo
docker-compose -f docker-compose.testing.yml ps

# Reinicia el stack
make test-infra-down
make test-infra-up
```

### Error: "Login failed in setup"

```bash
# Verifica las credenciales
# Edita k6-tests/utils/config.js si usas otras credenciales

# O pasa variables de entorno
export ADMIN_USER=tu_usuario
export ADMIN_PASSWORD=tu_password
```

### Grafana no muestra datos

1. Verifica que el datasource esté configurado
2. Verifica que estés ejecutando tests con `--out influxdb`
3. Refresca el dashboard
4. Ajusta el rango de tiempo en Grafana

### Tests muy lentos

```bash
# Reduce el número de VUs o duración
# Edita k6-tests/utils/config.js
# O crea un test personalizado
```

---

## 🚀 Integración con CI/CD

### GitHub Actions Example

```yaml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Diario a las 2 AM
  workflow_dispatch:

jobs:
  k6-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Start testing infrastructure
        run: |
          docker-compose -f docker-compose.testing.yml up -d
          sleep 10

      - name: Start backend
        run: |
          cd backend
          npm install
          npm start &
          sleep 5

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
            --keyserver hkp://keyserver.ubuntu.com:80 \
            --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
            sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run smoke test
        run: make test-smoke

      - name: Run load test
        run: make test-load

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: k6-reports
          path: k6-tests/reports/
```

---

## 📚 Recursos Adicionales

### Documentación Oficial
- [k6 Documentation](https://k6.io/docs/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)
- [InfluxDB Flux](https://docs.influxdata.com/influxdb/v2/query-data/flux/)

### Dashboards de k6
- [Dashboard 18030](https://grafana.com/grafana/dashboards/18030) - k6 Load Testing (InfluxDB v2)
- [Dashboard 19665](https://grafana.com/grafana/dashboards/19665) - k6 Prometheus

### Tutoriales
- [k6 Load Testing Tutorial](https://k6.io/docs/get-started/running-k6/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/load-testing-websites/)

---

## 🤝 Contribuir

Si quieres agregar más tests o mejorar los existentes:

1. Crea un nuevo archivo en `scenarios/`
2. Usa las utilidades de `utils/`
3. Define thresholds apropiados
4. Documenta el propósito y uso del test
5. Agrega comando al Makefile

---

## 📝 Notas Importantes

⚠️ **No ejecutar tests de carga contra producción sin autorización**

⚠️ **Los tests de stress pueden saturar el servidor**

⚠️ **El soak test consume recursos por 1 hora**

✅ **Ejecuta smoke test antes de cada test pesado**

✅ **Monitorea el servidor durante los tests (CPU, RAM, DB)**

✅ **Guarda los resultados de cada ejecución para comparar**

---

## 📞 Soporte

Si tienes problemas:

1. Revisa la sección de Troubleshooting
2. Verifica los logs: `make test-infra-logs`
3. Revisa la documentación de k6
4. Abre un issue en el repositorio

---

**Versión:** 1.0.0
**Última actualización:** Noviembre 2024
**Mantenedor:** Sistema de Matrícula Escolar

---

¡Happy Load Testing! 🚀📊
