# 🏫 Proyecto Inicial: Matrícula Escolar Web

Este proyecto inicial contiene todo lo necesario para comenzar el sistema de matrícula escolar con Bolt.new.

## 📁 Estructura

- `crear_tablas.sql`: Crea la base de datos SQLite.
- `importar_datos.py`: Importa tu CSV a `alumnos_2025` y `apoderados_ok`.
- `datos_matricula.csv`: Plantilla con tus datos.
- `matricula.db`: Base de datos generada (se crea al ejecutar).

## 🚀 Cómo usar

1. Coloca tus datos en `datos_matricula.csv`.
2. Ejecuta:
   ```bash
   python importar_datos.py

## 🛠️ Solución de Problemas y Modificaciones

Durante la ejecución inicial del script `importar_datos.py`, se identificaron y corrigieron varias incidencias para asegurar su correcto funcionamiento:

1.  **Instalación de Dependencias**: El script requiere la librería `pandas`. Si no está instalada, ejecute:
    ```bash
    pip install pandas
    ```

2.  **Corrección en `importar_datos.py`**:
    *   **Asignación de valores por defecto**: Se corrigió la forma en que se asignan valores por defecto a columnas como `letra`, `estado`, `beca`, `tipo_beca` y `observaciones`, reemplazando el uso incorrecto de `df.get()` por una lógica que verifica la existencia de la columna y asigna el valor si es necesario.
    *   **Renombrado de columna**: Se añadió el renombrado de la columna `curso_anterior` a `curso_base` para que coincida con la estructura esperada por el script.
    *   **Manejo de valores nulos**: Se implementó el llenado de valores nulos para las columnas `region`, `comuna`, `con_quien_vive` y `curso_base` con valores por defecto ('No informado' o el valor de la columna relacionada) para evitar errores de `NOT NULL` en la base de datos.

3.  **Corrección en `crear_tablas.sql`**:
    *   **Restricción UNIQUE**: Se modificó la tabla `alumnos_2026` para eliminar una subconsulta no permitida en la restricción `UNIQUE(rut, (SELECT anio FROM anio_vigente WHERE activo = 1))`, simplificándola a `UNIQUE(rut)`.

Estas modificaciones aseguran que el proceso de importación se complete sin errores de ejecución.

## 🎯 Funcionalidades Avanzadas Implementadas

### 📅 Sistema de Año Vigente

El sistema incluye una funcionalidad avanzada para gestionar múltiples años académicos:

#### **Características:**
- **Gestión Centralizada**: Un solo campo `año vigente` controla todo el sistema
- **Tablas Dinámicas**: Se crean automáticamente tablas `alumnos_YYYY` para cada año académico
- **Sincronización Automática**: Todos los comprobantes y documentos se actualizan automáticamente con el año vigente
- **Interfaz Admin**: Panel de administración para cambiar el año vigente

#### **Funcionamiento:**
1. **Backend**: Endpoint `/api/year/current` retorna el año vigente
2. **Frontend**: Todos los componentes consultan este endpoint para obtener el año actualizado
3. **Base de Datos**: 
   - Tabla `anio_vigente` con campo `year` y `activo`
   - Creación automática de `alumnos_YYYY` cuando se cambia el año

#### **Implementación Técnica:**
- **App.tsx**: Fetch del año vigente con refresh automático
- **Comprobantes**: Uso dinámico del año en PDFs y textos
- **Admin Panel**: Interfaz para cambio de año con confirmación

#### **Ejemplo de Uso:**
```typescript
// Obtener año vigente
const response = await fetch('/api/year/current');
const { year } = await response.json();

// Se refleja automáticamente en:
// - Comprobantes de matrícula
// - Headers del sistema  
// - Nombres de tablas de base de datos
```

### 🎨 Corrección de Visualización de Etnia

Se implementó una corrección para mejorar la experiencia de usuario en la visualización de etnia en todos los comprobantes.

#### **Problema Identificado:**
- Los valores de etnia `0`, `'0'`, `null` o `undefined` se mostraban como "0" en los comprobantes
- Esto generaba confusión para los usuarios

#### **Solución Implementada:**
```typescript
const formatEtnia = (etnia?: string | null): string => {
  if (!etnia || etnia === '0' || etnia.toString() === '0') {
    return 'No pertenece a ninguna etnia';
  }
  return etnia;
};
```

#### **Archivos Modificados:**
- ✅ `TextOnlyReceipt.tsx`
- ✅ `StudentReceiptText.tsx` 
- ✅ `PDFReceipt.tsx`
- ✅ `StudentReceipt.tsx`
- ✅ `StudentReceiptPlain.tsx`

#### **Resultado:**
- **Antes**: `Etnia: 0`
- **Después**: `Etnia: No pertenece a ninguna etnia`

#### **Valores de Etnia Soportados:**
```typescript
// De chilean-data.ts
export const etnias = [
  "No pertenece a ninguna etnia",  // Valor por defecto
  "Mapuche",
  "Aimara", 
  "Rapa Nui",
  "Lican Antai (Atacameña)",
  "Quechua",
  "Colla",
  "Diaguita",
  "Kawésqar (Alacalufe)",
  "Yagán (Yámana)",
  "Otra etnia"
];
```

## 💻 Comandos de Desarrollo

```bash
# Backend (Puerto 5002)
cd backend && npm start

# Frontend (Puerto 5173)  
cd frontend && npm run dev
```

## 📚 Documentación Adicional

- **[API_DOCUMENTATION.md](./backend/API_DOCUMENTATION.md)**: Documentación completa de todos los endpoints de la API
- **[MEJORAS_UX.md](./MEJORAS_UX.md)**: Registro detallado de mejoras de experiencia de usuario implementadas
- **[SECURITY.md](./SECURITY.md)**: Configuraciones y consideraciones de seguridad
- **[BD_CONFIGURACION.md](./BD_CONFIGURACION.md)**: Configuración y estructura de base de datos

## 🔍 Estructura de Archivos de Documentación

```
├── README-proyecto.md          # Este archivo - Información principal del proyecto
├── backend/
│   └── API_DOCUMENTATION.md   # Documentación de API y endpoints
├── MEJORAS_UX.md              # Registro de mejoras de experiencia de usuario  
├── SECURITY.md                # Configuraciones de seguridad
└── BD_CONFIGURACION.md        # Configuración de base de datos
```

---
*Última actualización: Enero 2025*
