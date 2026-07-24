# Dashboards de Grafana para k6

Este directorio contiene configuraciones para dashboards de Grafana que visualizan las métricas de los tests de k6.

## 🎨 Dashboards Disponibles

### 1. **k6 Load Testing Results** (Dashboard Oficial de k6)

El dashboard oficial de k6 para InfluxDB 2.0 es el más completo y recomendado.

**Para importarlo:**

1. Accede a Grafana: http://localhost:3001
2. Login: `admin` / `admin`
3. Ve a **Dashboards** → **Import**
4. Usa el ID: **18030** (dashboard oficial de k6 para InfluxDB v2)
5. Selecciona el datasource: **InfluxDB_k6**
6. Click en **Import**

**Características:**
- Request Rate (req/s)
- Response Time (p95, p99, p50)
- Error Rate
- Virtual Users
- Thresholds Status
- HTTP Status Codes
- Checks Pass Rate

---

### 2. **k6 Prometheus** (Alternativa)

Si prefieres usar el dashboard k6 Prometheus (ID: **19665**), sigue los mismos pasos.

---

## 📊 Paneles Personalizados

### Panel: Estudiantes Creados por Minuto

```flux
from(bucket: "k6")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r["_measurement"] == "students_created_per_minute")
  |> filter(fn: (r) => r["_field"] == "value")
  |> aggregateWindow(every: 1m, fn: sum, createEmpty: false)
```

### Panel: Tiempo de Creación de Estudiante (p95)

```flux
from(bucket: "k6")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r["_measurement"] == "create_student_duration")
  |> filter(fn: (r) => r["_field"] == "value")
  |> aggregateWindow(every: 10s, fn: (column, tables=<-) => tables |> quantile(q: 0.95, column: column))
```

### Panel: Tasa de Errores

```flux
from(bucket: "k6")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r["_measurement"] == "errors")
  |> filter(fn: (r) => r["_field"] == "value")
  |> aggregateWindow(every: 10s, fn: mean, createEmpty: false)
  |> map(fn: (r) => ({ r with _value: r._value * 100.0 }))
```

### Panel: Login Duration (p95)

```flux
from(bucket: "k6")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r["_measurement"] == "login_duration")
  |> filter(fn: (r) => r["_field"] == "value")
  |> aggregateWindow(every: 10s, fn: (column, tables=<-) => tables |> quantile(q: 0.95, column: column))
```

---

## 🚀 Configuración Rápida

### Opción 1: Dashboard Oficial de k6 (Recomendado)

```bash
# 1. Levanta el stack de testing
docker-compose -f docker-compose.testing.yml up -d

# 2. Espera a que Grafana esté listo
sleep 10

# 3. Accede a Grafana
open http://localhost:3001

# 4. Import Dashboard ID: 18030
```

### Opción 2: Crear Dashboard Personalizado

1. Accede a Grafana
2. Click en **+** → **Dashboard**
3. **Add visualization**
4. Selecciona **InfluxDB_k6** como datasource
5. Usa las queries de Flux mostradas arriba
6. Personaliza títulos, colores y umbrales

---

## 📈 Métricas Clave a Monitorear

### **Performance**
- `http_req_duration` - Tiempo total de request (p95, p99)
- `http_req_waiting` - Tiempo de espera del servidor (TTFB)
- `http_req_sending` - Tiempo enviando request
- `http_req_receiving` - Tiempo recibiendo respuesta

### **Throughput**
- `http_reqs` - Requests por segundo
- `students_created` - Estudiantes creados totales
- `students_created_per_minute` - Tasa de matrícula

### **Reliability**
- `http_req_failed` - Tasa de requests fallidos
- `errors` - Tasa general de errores
- `checks` - Porcentaje de checks pasados

### **Custom Metrics**
- `login_duration` - Tiempo de login
- `create_student_duration` - Tiempo de crear estudiante
- `search_student_duration` - Tiempo de búsqueda
- `list_students_duration` - Tiempo de listar
- `check_guardian_duration` - Tiempo de verificar apoderado

### **Contadores**
- `login_failures` - Login fallidos
- `create_student_failures` - Creaciones fallidas

---

## 🎯 Umbrales Recomendados

### Production-Ready Thresholds

```javascript
thresholds: {
  // 95% de requests < 2s, 99% < 5s
  'http_req_duration': ['p(95)<2000', 'p(99)<5000'],

  // Menos del 5% de errores
  'http_req_failed': ['rate<0.05'],
  'errors': ['rate<0.05'],

  // 95% de checks deben pasar
  'checks': ['rate>0.95'],

  // Operaciones específicas
  'login_duration': ['p(95)<1500'],
  'create_student_duration': ['p(95)<3000', 'p(99)<6000'],
  'search_student_duration': ['p(95)<1000'],
}
```

---

## 🔍 Variables de Dashboard

Para hacer el dashboard más flexible, usa estas variables:

- **Test Name**: `test_name` tag
- **Test Type**: `test_type` tag (smoke, load, stress, spike, soak)
- **Environment**: `environment` tag (local, staging, production)

---

## 💡 Tips para Análisis

### ¿Qué buscar en los gráficos?

1. **Response Time debe ser estable**
   - Si incrementa con el tiempo → Memory leak o degradación
   - Si sube con más VUs → Necesitas escalar

2. **Error Rate debe ser < 5%**
   - Picos breves son normales (GC, autoscaling)
   - Errores sostenidos indican problema

3. **Throughput debe escalar linealmente**
   - Si no escala con VUs → Bottleneck (DB, CPU)

4. **Estudiantes creados debe ser constante**
   - Si baja con el tiempo → Degradación

### Comparar Tests

Para comparar múltiples ejecuciones, usa el filtro de tiempo de Grafana y tags:

```flux
|> filter(fn: (r) => r["test_type"] == "load")
|> filter(fn: (r) => r["test_name"] == "matricula_masiva_50_usuarios")
```

---

## 📚 Recursos

- [k6 Docs - Grafana](https://k6.io/docs/results-output/real-time/influxdb/)
- [Dashboard Oficial k6](https://grafana.com/grafana/dashboards/18030)
- [InfluxDB Flux Queries](https://docs.influxdata.com/influxdb/v2/query-data/flux/)
- [Grafana Dashboard Best Practices](https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/)
