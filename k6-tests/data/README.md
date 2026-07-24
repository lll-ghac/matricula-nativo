# Datos de Prueba para Tests de k6

Este directorio contiene datos realistas para generar estudiantes y apoderados chilenos.

## 📁 Archivos

Los generadores de datos en `utils/data-generator.js` ya incluyen arrays de nombres, apellidos y otros datos chilenos realistas directamente en el código.

No es necesario cargar archivos JSON externos, lo que hace los tests más portables y rápidos.

## 🎲 Datos Generados

### Nombres (42 opciones)
Incluye nombres comunes en Chile como:
- Matías, Sofía, Benjamín, Martina, Agustín, Valentina, etc.

### Apellidos (42 opciones)
Incluye apellidos comunes en Chile como:
- González, Muñoz, Rojas, Díaz, Pérez, Soto, Contreras, etc.

### Comunas (25 opciones)
Incluye ciudades principales de Chile:
- Santiago, Providencia, Las Condes, Viña del Mar, Valparaíso, etc.

### Cursos (16 opciones)
Desde 1° Básico A hasta 8° Básico B

### RUTs
Se generan RUTs válidos con dígito verificador correcto entre 5.000.000 y 25.000.000

## 📊 Estadísticas de Datos Generados

Cada estudiante generado incluye:
- RUT válido (con dígito verificador)
- Nombres y apellidos realistas
- Fecha de nacimiento (entre 5 y 18 años)
- Dirección y comuna
- Teléfono de contacto
- Apoderado principal (con RUT válido)
- Apoderado suplente (con RUT válido)
- Email generado automáticamente
- Configuraciones (NEE, PIE, PAE, becas)

## 🔧 Personalización

Si quieres agregar más nombres, apellidos o comunas, edita directamente:
`k6-tests/utils/data-generator.js`

Los arrays están claramente documentados al inicio del archivo.
