# 📑 Índice de Documentación - Testing con k6

Toda la documentación del sistema de testing está centralizada aquí.

---

## 🚀 Inicio Rápido

¿Primera vez? Sigue este orden:

1. **[TESTING.md](TESTING.md)** ⭐ - Lee esto primero
   - Guía rápida de 5 minutos
   - Comandos esenciales
   - Troubleshooting

2. **[README.md](README.md)** - Documentación completa
   - Guía detallada de uso
   - Todos los tests explicados
   - Configuración avanzada
   - Métricas monitoreadas
   - Dashboards de Grafana

3. **[IMPLEMENTATION.md](IMPLEMENTATION.md)** - Resumen técnico
   - Qué se implementó
   - Archivos creados
   - Arquitectura del sistema
   - Casos de uso

---

## 📁 Estructura del Directorio

```
k6-tests/
├── 📚 Documentación
│   ├── TESTING.md          ⭐ Empieza aquí
│   ├── README.md           📖 Guía completa
│   ├── IMPLEMENTATION.md   🔧 Detalles técnicos
│   └── INDEX.md            📑 Este archivo
│
├── 🧪 Tests (scenarios/)
│   ├── smoke.test.js       ✅ Verificación básica (2 min)
│   ├── load-matricula.test.js  ⚡ 50 usuarios (14 min)
│   ├── stress.test.js      💥 Hasta 200 usuarios (16 min)
│   ├── spike.test.js       📈 Pico repentino (6 min)
│   └── soak.test.js        🕐 Resistencia (1 hora)
│
├── 🛠️ Utilidades (utils/)
│   ├── config.js           ⚙️ Configuración
│   ├── auth.js             🔐 Autenticación
│   └── data-generator.js   🎲 Datos realistas
│
├── 📊 Datos (data/)
│   └── README.md           Info sobre datos de prueba
│
├── 📄 Reportes (reports/)
│   └── .gitkeep            Reportes generados aquí
│
└── 🚀 Scripts
    └── run-test.sh         Script para ejecutar tests
```

---

## 📚 Por Tema

### **Uso Básico**
- [TESTING.md](TESTING.md) - Inicio rápido
- [README.md#inicio-rapido](README.md#🚀-inicio-rápido-5-minutos)

### **Tests Disponibles**
- [README.md#tests-disponibles](README.md#🧪-tests-disponibles)
- Smoke: `scenarios/smoke.test.js`
- Load: `scenarios/load-matricula.test.js` ⭐
- Stress: `scenarios/stress.test.js`
- Spike: `scenarios/spike.test.js`
- Soak: `scenarios/soak.test.js`

### **Configuración**
- [README.md#configuracion-avanzada](README.md#🔧-configuración-avanzada)
- [utils/config.js](utils/config.js) - Variables y endpoints

### **Dashboards de Grafana**
- [../grafana/dashboards/README.md](../grafana/dashboards/README.md)
- [README.md#dashboards-de-grafana](README.md#🎨-dashboards-de-grafana)

### **Generación de Datos**
- [utils/data-generator.js](utils/data-generator.js)
- [data/README.md](data/README.md)

### **Troubleshooting**
- [TESTING.md#troubleshooting](TESTING.md#🐛-troubleshooting)
- [README.md#troubleshooting](README.md#🐛-troubleshooting)

---

## 🎯 Comandos Rápidos

```bash
# Levantar infraestructura
make test-infra-up

# Ejecutar tests
make test-smoke      # Verificación (2 min)
make test-load       # 50 usuarios (14 min) ⭐
make test-stress     # Límite de capacidad
make test-spike      # Pico repentino
make test-soak       # Resistencia (1 hora)

# Dashboards
make grafana         # Abrir Grafana

# Ayuda
make help            # Ver todos los comandos
```

---

## 📞 Ayuda

- **Troubleshooting**: Ver [TESTING.md](TESTING.md)
- **Dudas sobre configuración**: Ver [README.md](README.md)
- **Detalles técnicos**: Ver [IMPLEMENTATION.md](IMPLEMENTATION.md)
- **Comandos disponibles**: `make help`

---

**¿Listo para empezar?** → [TESTING.md](TESTING.md) ⭐
