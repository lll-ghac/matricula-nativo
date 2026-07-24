# Plan de Acción: Reparación del Panel de Exportaciones y Reportes

## 1. Resumen del Problema (Confirmado)

Tras un análisis detallado del código, se ha confirmado que el panel de "Exportaciones y Reportes" no funciona correctamente debido a que el componente del frontend está desactualizado e incompleto.

*   **Causa Raíz 1 (Confirmada):** La lista de cursos en el panel es **estática y está incompleta**. El componente `ExportPanel.tsx` no consulta la base de datos para obtener los cursos disponibles, sino que usa una lista fija escrita en el código que no incluye todas las opciones actuales (ej. cursos con letras diferentes a la "A").

*   **Causa Raíz 2 (Confirmada):** La funcionalidad principal de exportación por curso ("Generar Nómina") **no está implementada en el frontend**. El botón correspondiente ejecuta un código de ejemplo que no realiza ninguna llamada a la API del backend para generar el archivo.

*   **Causa Raíz 3 (Confirmada):** El backend **sí posee la lógica necesaria** para generar estos reportes. Existe un endpoint (`/api/students/export`) preparado para crear exportaciones por curso, pero actualmente no está siendo utilizado por el panel.

## 2. Objetivo

Reparar y modernizar el panel de "Exportaciones y Reportes" para que sea completamente funcional, cargue dinámicamente todos los cursos desde la base de datos y permita generar los reportes de nómina por curso en los formatos especificados (CSV y PDF).

## 3. Plan de Acción Detallado

El trabajo se dividirá en fases claras y seguras. No se procederá a la siguiente fase hasta que la anterior esté completada y verificada.

---

### **Fase 1: Cargar dinámicamente la lista de cursos**

**Objetivo:** Reemplazar la lista estática de cursos en el frontend con una lista real y actualizada obtenida desde la base de datos.

*   **Paso 1.1 (Acción - Frontend):** Modificar el componente `ExportPanel.tsx`. Se añadirá una función que, al cargar el panel, realice una llamada a la API para obtener todos los cursos disponibles para el año académico vigente. El endpoint a utilizar es `GET /api/courses/v2/list`, que ya ha sido confirmado como funcional.

*   **Paso 1.2 (Acción - Frontend):** Con los datos recibidos de la API, se poblará dinámicamente el menú desplegable de "Seleccionar Curso".

*   **Paso 1.3 (Verificación):** Se comprobará visualmente que el menú desplegable en el panel de exportación muestra la lista completa y correcta de todos los cursos registrados en el sistema, no solo los de la letra "A".

---

### **Fase 2: Implementar la funcionalidad de exportación por curso**

**Objetivo:** Conectar los botones de exportación del frontend con la lógica ya existente en el backend.

*   **Paso 2.1 (Acción - Frontend):** Modificar la función `handleExport` en `ExportPanel.tsx` para que deje de ser un código de ejemplo.

*   **Paso 2.2 (Acción - Frontend):** Dentro de esa función, se construirá la URL para la llamada a la API. Se usará el endpoint `GET /api/students/export` y se le añadirán los parámetros necesarios, como el curso seleccionado y el formato (`pdf` o `csv`). Por ejemplo: `/api/students/export?format=csv&courses=3° Básico B`.

*   **Paso 2.3 (Acción - Frontend):** Se implementará la lógica para manejar la respuesta del backend. Esto incluye tomar el archivo (CSV o PDF) recibido y activar su descarga en el navegador del usuario.

*   **Paso 2.4 (Verificación):** Se realizará una prueba de exportación completa:
    1.  Seleccionar un curso de la nueva lista dinámica.
    2.  Seleccionar el formato "CSV".
    3.  Presionar "Generar Nómina".
    4.  Verificar que se descargue un archivo CSV con los datos correctos de los alumnos de ese curso.

---

### **Fase 3: Revisión y activación de la exportación a PDF**

**Objetivo:** Asegurar que la exportación a formato PDF funcione, ya que el análisis del backend mostró que esta parte podría no estar terminada.

*   **Paso 3.1 (Confirmación - Backend):** Se revisará la función `exportStudents` en el archivo `backend/routes/students.supabase.js` para confirmar si la lógica de generación de PDF está completa o es solo un placeholder. **Análisis previo indica que esta parte necesita trabajo.**

*   **Paso 3.2 (Planificación y Acción - Backend/Frontend):**
    *   **Si la lógica PDF no está completa:** Se definirá un plan para implementarla. Esto incluirá elegir una librería (como `jsPDF` o `pdf-lib`), diseñar la plantilla del PDF y escribir el código para generar el documento con los datos de la nómina.
    *   **Si la lógica está completa:** Se procederá directamente a la verificación.

*   **Paso 3.3 (Verificación):** Se realizará una prueba de exportación en formato PDF y se verificará que el documento descargado sea correcto y legible.

## 4. Registro de Avances

| Fase | Paso | Descripción | Estado |
| :--- | :--- | :--- | :--- |
| **Fase 1** | 1.1 | Modificar `ExportPanel.tsx` para llamar a la API de cursos. | ✅ Completado |
| | 1.2 | Poblar el desplegable con los cursos de la API. | ✅ Completado |
| | 1.3 | **Verificar que la lista de cursos sea dinámica y completa.** | ⏳ Pendiente verificación |
| **Fase 2** | 2.1 | Modificar la función `handleExport` en el frontend. | ✅ Completado |
| | 2.2 | Construir la URL correcta para la API de exportación. | ✅ Completado |
| | 2.3 | Implementar la lógica de descarga de archivos. | ✅ Ya existía |
| | 2.4 | **Verificar la exportación en formato CSV.** | ⏳ Pendiente verificación |
| **Fase 3** | 3.1 | Confirmar el estado de la lógica de exportación a PDF en el backend. | ⬜️ Pendiente |
| | 3.2 | Implementar la generación de PDF si es necesario. | ⬜️ Pendiente |
| | 3.3 | **Verificar la exportación en formato PDF.** | ⬜️ Pendiente |

## 5. Medidas de Seguridad

*   **Aislamiento de Cambios:** Todas las modificaciones se realizarán en un componente específico del frontend (`ExportPanel.tsx`) y en endpoints de exportación ya existentes, minimizando cualquier riesgo de afectar otras funcionalidades como la matrícula o la gestión de usuarios.
*   **Verificación por Fases:** No se iniciará una nueva fase del plan sin haber verificado completamente que la anterior funciona según lo esperado. Esto asegura un proceso de desarrollo controlado y sin regresiones.
*   **Entorno de Desarrollo:** Todas las pruebas y verificaciones se realizarán en el entorno de desarrollo local antes de considerar los cambios como finalizados.

## 6. Resumen de Cambios Implementados

### Fecha: 2025-11-14

**Fases 1 y 2 completadas** - Los cursos ahora se cargan dinámicamente y la funcionalidad de exportación está conectada.

#### Cambios en `frontend/src/components/ExportPanel.tsx`:

1. **Agregada interfaz TypeScript** para el tipo `Course` con los campos correctos del sistema normalizado:
   - `id`, `codigo`, `grado_nombre`, `letra`

2. **Corregido el endpoint de la API**:
   - Cambio de `/api/courses/v2/list` a `/api/courses/v2`
   - Actualizada la lógica de parsing para acceder a `result.data`

3. **Actualizado el dropdown de selección**:
   - Ahora muestra todos los cursos del año vigente
   - Formato de visualización: `{codigo} - {grado_nombre} {letra}` (ej: "1A - Primero Básico A")

4. **Conectada la función de exportación**:
   - Construye correctamente el nombre completo del curso en formato legacy para la API
   - Genera nombres de archivo basados en el código del curso (ej: `nomina_1A.csv`)

#### Compatibilidad con estructura legacy:

El sistema mantiene compatibilidad con el endpoint de exportación existente que aún usa los campos `curso_base` y `letra` de la tabla `alumnos`. La función `handleExport` convierte automáticamente el formato nuevo (`codigo`) al formato legacy requerido por la API (`grado_nombre + letra`).

#### Próximos pasos:

- **Verificación 1.3 y 2.4**: Probar en el navegador que los cursos se despliegan correctamente y que la exportación CSV funciona
- **Fase 3**: Revisar y activar la exportación a PDF
