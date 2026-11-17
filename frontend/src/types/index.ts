/**
 * Tipos centralizados para el Sistema de Matrícula Escolar
 *
 * Este archivo contiene todas las interfaces y tipos compartidos
 * para evitar duplicación y mantener consistencia en el código.
 */

// ============================================
// INTERFACES DE APODERADOS/GUARDIANS
// ============================================

/**
 * Representa un apoderado en el sistema de matrícula
 * Usado en formularios de creación de estudiantes
 */
export interface ApoderadoData {
  id?: number;
  tipo_documento?: string; // 'RUT' | 'DNI' | 'Pasaporte'
  rut?: string;
  dv?: string;
  dni?: string;
  pasaporte?: string;
  nombre?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  parentesco?: string;
  otro_parentesco?: string; // Cuando parentesco es "Otro (especificar)"
  fecha_nacimiento?: string;
  genero?: string;
  nacionalidad?: string;
  telefono?: string;
  direccion?: string;
  complemento_direccion?: string;
  region?: string;
  comuna?: string;
  celular?: string;
  email?: string;
  orden?: number;

  // Campos de persona asociada al estudiante (SIGE/MINEDUC)
  nivel_educacional?: string;
  situacion_laboral?: string;
  lugar_trabajo?: string; // "En el hogar" | "Fuera del hogar"

  // Campo normalizado (preferido)
  tipo_relacion?: 'principal' | 'suplente';

  // Campos legacy (mantener temporalmente para compatibilidad)
  es_principal?: boolean;
  es_suplente?: boolean;
}

/**
 * Alias de ApoderadoData para uso en componentes de edición
 * Mantiene compatibilidad con código existente
 */
export interface Guardian extends ApoderadoData {}

// ============================================
// INTERFACES DE NEE
// ============================================

/**
 * Representa un tipo de Necesidad Educativa Especial
 */
export interface TipoNee {
  id: number;
  codigo: string;
  descripcion: string;
  categoria: string;
}

/**
 * Categorías de NEE agrupadas
 */
export interface CategoriasNee {
  [categoria: string]: TipoNee[];
}

// ============================================
// INTERFACES DE ESTUDIANTES
// ============================================

/**
 * Representa un estudiante completo en el sistema
 * Incluye todos los campos necesarios para matrícula y gestión
 */
export interface StudentData {
  id?: number;
  rut?: string;
  dv?: string;
  nombres?: string;
  nombre_social?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  fecha_nacimiento?: string;
  genero?: string;
  nacionalidad?: string;
  etnia?: string;
  direccion?: string;
  complemento_direccion?: string;
  region?: string;
  comuna?: string;
  telefono?: string;
  telefono_fijo?: string;
  con_quien_vive?: string;
  prevision_salud_id?: number; // FK a tabla previsiones_salud
  prevision_salud?: string; // Nombre de la previsión (para mostrar)
  religion?: string; // Alias de tipo_religion para compatibilidad
  tipo_religion?: string;
  curso_base?: string;
  letra?: string;
  estado?: string;
  pie?: boolean;
  beca?: boolean;
  tipo_beca?: string;
  pae?: boolean;
  observaciones?: string;
  observaciones_matriculador?: string;
  apoderados: ApoderadoData[]; // Requerido (usar [] si vacío)

  // NEE (Modelo Refactorizado - PREFERIDO)
  nees?: number[] | TipoNee[]; // Array de IDs de NEE o array de objetos TipoNee

  // ⚠️ CAMPOS LEGACY - MANTENER TEMPORALMENTE PARA COMPATIBILIDAD
  // Estos campos serán eliminados en una futura versión
  nee_discapacidad_visual_total?: boolean;
  nee_baja_vision?: boolean;
  nee_discapacidad_auditiva_total?: boolean;
  nee_hipoacusia?: boolean;
  nee_implante_coclear?: boolean;
  nee_materiales_adaptados?: boolean;
  nee_discapacidad_motora?: boolean;
  nee_paralisis_cerebral?: boolean;
  nee_dificultad_coordinacion?: boolean;
  nee_dificultad_comunicacion?: boolean;
  nee_requiere_asistente?: boolean;
  nee_tea?: boolean;
  nee_trastornos_conducta?: boolean;
  nee_deficit_atencion?: boolean;
  nee_dificultades_aprendizaje?: boolean;
  nee_intelectual?: boolean;
  nee_otras?: boolean;
  nee_otras_descripcion?: string;
  nee_comunicacion_alternativa?: boolean;
  nee_adaptaciones_acceso?: boolean;
  nee_otra_necesidad?: boolean;

  // Campos de persona asociada al estudiante (Nuevos campos - Matrícula 2026)
  nivel_educacional_asociado?: string;
  situacion_laboral_asociado?: string;
  trabaja_principalmente_asociado?: string; // "En el hogar" | "Fuera del hogar"

  // Autorización anual de uso de imagen (null = sin responder) y control de la carta física
  autoriza_imagen_pedagogico?: boolean | null;
  autoriza_imagen_redes?: boolean | null;
  autoriza_imagen_prensa?: boolean | null;
  documentos_impresos_en?: string | null;
  carta_imagen_archivada?: boolean;
  carta_imagen_archivada_por?: number | string | null;
  carta_imagen_archivada_en?: string | null;

  // Índice dinámico para campos adicionales
  [key: string]: any;
}

// ============================================
// INTERFACES DE VALIDACIÓN
// ============================================

/**
 * Error de validación para campos individuales
 */
export interface ValidationFieldError {
  field: string;
  message: string;
}

/**
 * Error de validación específico de apoderados
 */
export interface ValidationGuardianError {
  index: number; // índice del apoderado (0 = principal, 1+ = suplentes)
  guardian?: number; // Alias para compatibilidad
  field?: string; // Campo individual
  message?: string; // Mensaje individual
  fields?: ValidationFieldError[]; // Array de errores de campos (formato alternativo)
}

// ============================================
// INTERFACES DE CATÁLOGOS
// ============================================

/**
 * Representa una previsión de salud del catálogo
 */
export interface PrevisionSalud {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
}

// ============================================
// INTERFACES DE CURSOS
// ============================================

/**
 * Representa un curso en el sistema
 */
export interface Course {
  id: number;
  nombre: string;
  base: string;
  letra: string;
  year?: number;
}

// ============================================
// INTERFACES DE USUARIOS
// ============================================

/**
 * Representa un usuario del sistema
 */
export interface UserData {
  id?: number;
  username: string;
  nombre_completo?: string;
  email?: string;
  role: 'admin' | 'matriculador' | 'viewer';
  activo?: boolean;
  fecha_creacion?: string;
}

// ============================================
// INTERFACES DE BÚSQUEDA
// ============================================

/**
 * Resultado de búsqueda de estudiante
 */
export interface SearchResult {
  id: number;
  rut: string;
  dv: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  curso_base?: string;
  letra?: string;
  estado?: string;
}

// ============================================
// TIPOS AUXILIARES
// ============================================

/**
 * Tipos de documentos de identificación válidos
 */
export type TipoDocumento = 'RUT' | 'DNI' | 'Pasaporte';

/**
 * Estados posibles de matrícula
 */
export type EstadoMatricula = 'matriculado' | 'retirado' | 'trasladado' | 'egresado';

/**
 * Roles de usuario en el sistema
 */
export type UserRole = 'admin' | 'matriculador' | 'viewer';
