# 🧪 Sistema de Testing - Matrícula Escolar

Documentación completa del sistema de testing de performance y carga del proyecto.

---

## 📊 Testing de Performance con k6

El proyecto incluye un sistema completo de **pruebas de carga** usando **k6**, **InfluxDB** y **Grafana** para:

✅ Simular 50+ usuarios matriculando simultáneamente
✅ Medir tiempos de respuesta (p95, p99)
✅ Detectar cuellos de botella
✅ Encontrar límites de capacidad
✅ Visualizar métricas en tiempo real

### 🚀 Inicio Rápido

```bash
# 1. Instalar k6
brew install k6              # macOS
# o ver: k6-tests/README.md para otras plataformas

# 2. Levantar stack de testing (InfluxDB + Grafana)
make test-infra-up

# 3. Iniciar el backend
cd backend && npm start

# 4. Ejecutar test de smoke (verificación básica)
make test-smoke

# 5. Ejecutar test de carga (50 usuarios)
make test-load

# 6. Ver resultados en Grafana
open http://localhost:3001
# Importar dashboard ID: 18030
```

---

## 📁 Estructura de Testing

```
k6-tests/
├── scenarios/              # Tests de k6
│   ├── smoke.test.js      # Verificación básica (2 min)
│   ├── load-matricula.test.js   # 50 usuarios (14 min) ⭐
│   ├── stress.test.js     # Hasta 200 usuarios (16 min)
│   ├── spike.test.js      # Pico repentino (6 min)
│   └── soak.test.js       # Resistencia (1 hora)
├── utils/                 # Utilidades compartidas
│   ├── config.js         # Configuración
│   ├── auth.js           # Autenticación
│   └── data-generator.js # Generador de datos
└── README.md             # Documentación completa
```

---

## 🧪 Tests Disponibles

### 1. **Smoke Test** 🔥
Verificación rápida antes de tests pesados

```bash
make test-smoke
```

### 2. **Load Test** ⚡ (Principal)
Simula 50 usuarios matriculando simultáneamente

```bash
make test-load
```

**Escenario:**
- 2 min: 0 → 10 usuarios
- 5 min: 10 → 50 usuarios
- 5 min: Mantener 50 usuarios
- 2 min: 50 → 0 usuarios

**Operaciones:**
- Login
- Listar estudiantes
- Buscar apoderados
- **Crear estudiantes con apoderados**
- Búsquedas
- Estadísticas

### 3. **Stress Test** 💥
Encuentra el límite de capacidad (hasta 200 usuarios)

```bash
make test-stress
```

### 4. **Spike Test** ⚡
Prueba resiliencia ante picos repentinos

```bash
make test-spike
```

### 5. **Soak Test** 🕐
Detecta memory leaks (1 hora de carga constante)

```bash
make test-soak
make test-soak-short  # Versión corta (10 min)
```

---

## 📊 Visualización en Grafana

### Dashboard Principal (k6 Official)

1. Abre **http://localhost:3001** (admin/admin)
2. **Dashboards** → **Import**
3. ID: **18030**
4. Datasource: **InfluxDB_k6**

### Métricas Monitoreadas

**Performance:**
- Response Time (p50, p95, p99)
- Request Rate (req/s)
- Error Rate (%)

**Operaciones Específicas:**
- `login_duration` - Tiempo de login
- `create_student_duration` - **Tiempo de matrícula** (crítica)
- `search_student_duration` - Búsqueda
- `students_created` - Total matriculados

**Thresholds:**
- 95% requests < 2s
- 99% requests < 5s
- Error rate < 5%
- Checks > 95%

---

## 🛠️ Comandos Útiles

### Infraestructura

```bash
make test-infra-up          # Iniciar Grafana + InfluxDB
make test-infra-down        # Detener
make test-infra-logs        # Ver logs
make test-infra-status      # Estado
```

### Ejecutar Tests

```bash
make test-smoke             # Smoke test
make test-load              # Load test ⭐
make test-stress            # Stress test
make test-spike             # Spike test
make test-soak              # Soak test
make test-all               # Todos (excepto soak)
```

### Dashboards

```bash
make grafana                # Abrir Grafana
make grafana-import-dashboard  # Ver instrucciones
```

### Verificaciones

```bash
make check-k6               # k6 instalado?
make check-api              # API corriendo?
make check-all              # Todo OK?
```

---

## 🎯 Criterios de Éxito

Un test se considera **exitoso** si cumple:

✅ **p95 < 2000ms** - 95% de requests en menos de 2 segundos
✅ **p99 < 5000ms** - 99% de requests en menos de 5 segundos
✅ **Error Rate < 5%** - Menos del 5% de errores
✅ **Checks > 95%** - 95% de validaciones pasan
✅ **Create Student p95 < 3000ms** - Matrícula en menos de 3 segundos

---

## 📈 Interpretación de Resultados

### ✅ Bueno
```
http_req_duration: p(95)=1523ms ✅
http_req_failed: 2.34% ✅
create_student_duration: p(95)=2456ms ✅
```

### ⚠️ Warning
```
http_req_duration: p(95)=2834ms ⚠️
http_req_failed: 4.89% ⚠️
```

### ❌ Problema
```
http_req_duration: p(95)=5823ms ❌
http_req_failed: 15.34% ❌
create_student_duration: p(95)=8456ms ❌
```

**Posibles causas:**
- Pool de conexiones saturado
- Base de datos lenta
- Memory leak
- CPU/RAM insuficiente

---

## 🔧 Configuración Avanzada

### Cambiar URL del API

```bash
export BASE_URL=http://192.168.1.100:5003
make test-load
```

### Ejecutar sin InfluxDB

```bash
./k6-tests/run-test.sh smoke --no-influx
```

### Guardar resultados en JSON

```bash
./k6-tests/run-test.sh load --json
# Genera: k6-tests/reports/load-TIMESTAMP.json
```

### Soak test personalizado

```bash
SOAK_DURATION=30m make test-soak
```

---

## 🐛 Troubleshooting

### API no responde
```bash
cd backend && npm start
curl http://localhost:5003/api/auth/login
```

### InfluxDB/Grafana no funcionan
```bash
make test-infra-down
make test-infra-up
```

### Login falla en tests
```bash
# Verifica credenciales en k6-tests/utils/config.js
# Default: admin/admin123
```

### Grafana no muestra datos
1. Verifica que InfluxDB esté corriendo
2. Ejecuta tests con `--out influxdb`
3. Refresca el dashboard
4. Ajusta rango de tiempo

---

## 📚 Documentación Completa

Para más detalles, ver:
- **[k6-tests/README.md](k6-tests/README.md)** - Documentación completa
- **[grafana/dashboards/README.md](grafana/dashboards/README.md)** - Dashboards y queries

---

## ⚠️ Notas Importantes

- ❌ **No ejecutar contra producción sin autorización**
- ⚠️ **Stress tests pueden saturar el servidor**
- ⏰ **Soak test toma 1 hora completa**
- ✅ **Ejecuta smoke test antes de tests pesados**
- ✅ **Monitorea recursos del servidor durante tests**

---

## 📞 Recursos

- [k6 Documentation](https://k6.io/docs/)
- [Grafana Dashboard 18030](https://grafana.com/grafana/dashboards/18030)
- [InfluxDB Flux Queries](https://docs.influxdata.com/influxdb/v2/query-data/flux/)

---

**¿Preguntas?** Revisa `k6-tests/README.md` para documentación detallada.

---

¡Happy Load Testing! 🚀
