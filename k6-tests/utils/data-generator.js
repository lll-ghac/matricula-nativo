/**
 * Generador de datos de prueba para tests de k6
 * Sistema de Matrícula Escolar - Performance Testing
 * Genera datos realistas para estudiantes y apoderados chilenos
 */

// Listas de datos chilenos realistas
const nombres = [
  'Matías', 'Sofía', 'Benjamín', 'Martina', 'Agustín', 'Valentina',
  'Vicente', 'Emilia', 'Tomás', 'Isidora', 'Lucas', 'Florencia',
  'Joaquín', 'Catalina', 'Diego', 'Amanda', 'Sebastián', 'Javiera',
  'Felipe', 'Constanza', 'Nicolás', 'Trinidad', 'Maximiliano', 'Fernanda',
  'Gabriel', 'Antonia', 'Cristóbal', 'Ignacia', 'Martín', 'Camila',
  'Andrés', 'Francisca', 'Daniel', 'Josefa', 'Santiago', 'Monserrat',
  'Manuel', 'Daniela', 'José', 'Maite', 'Pablo', 'Anastasia',
];

const apellidos = [
  'González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras',
  'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López',
  'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza',
  'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Ramírez',
  'Campos', 'Cortés', 'Vera', 'Alvarado', 'Núñez', 'Carrasco',
  'Bravo', 'Herrera', 'Figueroa', 'Jara', 'Castro', 'Vargas',
  'Pinto', 'Aravena', 'Sandoval', 'Vega', 'Navarrete', 'Sánchez',
];

const comunas = [
  'Santiago', 'Providencia', 'Las Condes', 'Ñuñoa', 'La Florida',
  'Maipú', 'Puente Alto', 'San Bernardo', 'Viña del Mar', 'Valparaíso',
  'Concepción', 'La Serena', 'Antofagasta', 'Temuco', 'Rancagua',
  'Talca', 'Arica', 'Puerto Montt', 'Coquimbo', 'Osorno',
  'Quilpué', 'Villa Alemana', 'Curicó', 'Chillán', 'Iquique',
];

const calles = [
  'Av. Libertador Bernardo O\'Higgins', 'Av. Providencia', 'Av. Apoquindo',
  'Av. Grecia', 'Av. Vicuña Mackenna', 'Calle Esperanza', 'Pasaje Los Aromos',
  'Calle Los Álamos', 'Av. Santa Rosa', 'Calle Huérfanos', 'Calle Ahumada',
  'Av. Pedro de Valdivia', 'Calle Ricardo Lyon', 'Av. Irarrázaval',
  'Calle Los Leones', 'Av. Las Condes', 'Calle Vitacura', 'Av. Kennedy',
];

const parentescos = [
  'Padre', 'Madre', 'Tío/a', 'Abuelo/a', 'Hermano/a Mayor', 'Tutor Legal',
];

const cursos = [
  { codigo: '1A', curso_base: '1° Básico', letra: 'A' },
  { codigo: '1B', curso_base: '1° Básico', letra: 'B' },
  { codigo: '2A', curso_base: '2° Básico', letra: 'A' },
  { codigo: '2B', curso_base: '2° Básico', letra: 'B' },
  { codigo: '3A', curso_base: '3° Básico', letra: 'A' },
  { codigo: '3B', curso_base: '3° Básico', letra: 'B' },
  { codigo: '4A', curso_base: '4° Básico', letra: 'A' },
  { codigo: '4B', curso_base: '4° Básico', letra: 'B' },
  { codigo: '5A', curso_base: '5° Básico', letra: 'A' },
  { codigo: '5B', curso_base: '5° Básico', letra: 'B' },
  { codigo: '6A', curso_base: '6° Básico', letra: 'A' },
  { codigo: '6B', curso_base: '6° Básico', letra: 'B' },
  { codigo: '7A', curso_base: '7° Básico', letra: 'A' },
  { codigo: '7B', curso_base: '7° Básico', letra: 'B' },
  { codigo: '8A', curso_base: '8° Básico', letra: 'A' },
  { codigo: '8B', curso_base: '8° Básico', letra: 'B' },
];

/**
 * Genera un RUT chileno válido con dígito verificador
 * @returns {object} { rut: number, dv: string }
 */
export function generarRUT() {
  // Generar número de RUT entre 5.000.000 y 25.000.000
  const rut = Math.floor(Math.random() * 20000000) + 5000000;

  // Calcular dígito verificador
  let suma = 0;
  let multiplo = 2;
  let rutStr = rut.toString();

  for (let i = rutStr.length - 1; i >= 0; i--) {
    suma += parseInt(rutStr.charAt(i)) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }

  const resto = suma % 11;
  const dv = 11 - resto;

  let dvFinal;
  if (dv === 11) {
    dvFinal = '0';
  } else if (dv === 10) {
    dvFinal = 'K';
  } else {
    dvFinal = dv.toString();
  }

  return { rut, dv: dvFinal };
}

/**
 * Genera un nombre aleatorio
 * @returns {string}
 */
export function generarNombre() {
  return nombres[Math.floor(Math.random() * nombres.length)];
}

/**
 * Genera un apellido aleatorio
 * @returns {string}
 */
export function generarApellido() {
  return apellidos[Math.floor(Math.random() * apellidos.length)];
}

/**
 * Genera una fecha de nacimiento aleatoria para estudiantes (entre 5 y 18 años)
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export function generarFechaNacimiento() {
  const hoy = new Date();
  const anio = hoy.getFullYear() - Math.floor(Math.random() * 13) - 5; // Entre 5 y 18 años
  const mes = Math.floor(Math.random() * 12) + 1;
  const dia = Math.floor(Math.random() * 28) + 1;

  return `${anio}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
}

/**
 * Genera un email aleatorio
 * @param {string} nombre
 * @param {string} apellido
 * @returns {string}
 */
export function generarEmail(nombre, apellido) {
  const dominios = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com'];
  const dominio = dominios[Math.floor(Math.random() * dominios.length)];
  const nombreNormalizado = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const apellidoNormalizado = apellido.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const numero = Math.floor(Math.random() * 999);

  return `${nombreNormalizado}.${apellidoNormalizado}${numero}@${dominio}`;
}

/**
 * Genera un número de teléfono chileno
 * @returns {string}
 */
export function generarTelefono() {
  const prefijo = Math.random() > 0.5 ? '+569' : '9'; // Celular
  const numero = Math.floor(Math.random() * 90000000) + 10000000;
  return `${prefijo}${numero}`;
}

/**
 * Genera una dirección aleatoria
 * @returns {object} { direccion: string, comuna: string }
 */
export function generarDireccion() {
  const calle = calles[Math.floor(Math.random() * calles.length)];
  const numero = Math.floor(Math.random() * 9000) + 100;
  const comuna = comunas[Math.floor(Math.random() * comunas.length)];

  return {
    direccion: `${calle} ${numero}`,
    comuna: comuna,
  };
}

/**
 * Genera un curso aleatorio
 * @returns {object} { codigo: string, curso_base: string, letra: string }
 */
export function generarCurso() {
  return cursos[Math.floor(Math.random() * cursos.length)];
}

/**
 * Genera datos completos de un apoderado
 * @param {string} tipoDocumento - 'RUT', 'DNI' o 'Pasaporte'
 * @returns {object} Datos del apoderado
 */
export function generarApoderado(tipoDocumento = 'RUT') {
  const nombre = generarNombre();
  const apellidoPaterno = generarApellido();
  const apellidoMaterno = generarApellido();
  const { direccion, comuna } = generarDireccion();
  const rutData = generarRUT();

  const apoderado = {
    tipo_documento: tipoDocumento,
    nombre: nombre,
    apellido_paterno: apellidoPaterno,
    apellido_materno: apellidoMaterno,
    telefono: generarTelefono(),
    email: generarEmail(nombre, apellidoPaterno),
    direccion: direccion,
    comuna: comuna,
  };

  // Agregar documento según el tipo
  if (tipoDocumento === 'RUT') {
    apoderado.rut = rutData.rut;
    apoderado.dv = rutData.dv;
  } else if (tipoDocumento === 'DNI') {
    apoderado.dni = (Math.floor(Math.random() * 90000000) + 10000000).toString();
  } else if (tipoDocumento === 'Pasaporte') {
    apoderado.pasaporte = `P${Math.floor(Math.random() * 9000000) + 1000000}`;
  }

  return apoderado;
}

/**
 * Genera datos completos de un estudiante con apoderados
 * @returns {object} Datos completos del estudiante
 */
export function generarEstudiante() {
  const nombre = generarNombre();
  const apellidoPaterno = generarApellido();
  const apellidoMaterno = generarApellido();
  const rutData = generarRUT();
  const curso = generarCurso();
  const { direccion, comuna } = generarDireccion();

  // Generar apoderado principal y suplente
  const apoderadoPrincipal = {
    ...generarApoderado('RUT'),
    relacion: parentescos[Math.floor(Math.random() * 2)], // Padre o Madre principalmente
    es_principal: true,
    orden: 1,
  };

  const apoderadoSuplente = {
    ...generarApoderado('RUT'),
    relacion: parentescos[Math.floor(Math.random() * parentescos.length)],
    es_principal: false,
    orden: 2,
  };

  return {
    // Datos del estudiante
    rut: rutData.rut,
    dv: rutData.dv,
    nombres: nombre,
    apellido_paterno: apellidoPaterno,
    apellido_materno: apellidoMaterno,
    fecha_nacimiento: generarFechaNacimiento(),
    curso_base: curso.curso_base,
    letra: curso.letra,
    direccion: direccion,
    comuna: comuna,
    telefono_contacto: generarTelefono(),

    // Estado y configuraciones
    estado: 'Matriculado',
    tiene_nee: Math.random() > 0.9, // 10% tiene NEE
    participa_pie: Math.random() > 0.85, // 15% participa en PIE
    tiene_pae: Math.random() > 0.7, // 30% tiene PAE
    tiene_beca: Math.random() > 0.8, // 20% tiene beca

    // Apoderados - NUEVO FORMATO: array con ambos apoderados
    apoderados: [apoderadoPrincipal, apoderadoSuplente],
  };
}

/**
 * Genera un lote de estudiantes
 * @param {number} cantidad - Número de estudiantes a generar
 * @returns {Array} Array de estudiantes
 */
export function generarLoteEstudiantes(cantidad) {
  const estudiantes = [];
  for (let i = 0; i < cantidad; i++) {
    estudiantes.push(generarEstudiante());
  }
  return estudiantes;
}

/**
 * Genera parámetros de búsqueda aleatorios
 * @returns {object} Parámetros de búsqueda
 */
export function generarBusqueda() {
  const opciones = [
    { searchTerm: nombres[Math.floor(Math.random() * nombres.length)] },
    { searchTerm: apellidos[Math.floor(Math.random() * apellidos.length)] },
    { searchTerm: generarRUT().rut.toString() },
  ];

  return opciones[Math.floor(Math.random() * opciones.length)];
}

export default {
  generarRUT,
  generarNombre,
  generarApellido,
  generarFechaNacimiento,
  generarEmail,
  generarTelefono,
  generarDireccion,
  generarCurso,
  generarApoderado,
  generarEstudiante,
  generarLoteEstudiantes,
  generarBusqueda,
};
