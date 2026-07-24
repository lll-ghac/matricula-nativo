/**
 * Utilidades para validación de teléfonos en Chile
 *
 * Formatos válidos para Chile:
 * - Celulares: +569 XXXX XXXX, 9 XXXX XXXX, 9XXXXXXXX
 * - Teléfonos fijos: +56 XX XXX XXXX, XX XXX XXXX, XXXXXXXX
 *
 * Esta validación es flexible y acepta varios formatos comunes
 */

export interface PhoneValidationResult {
  isValid: boolean;
  message?: string;
  formatted?: string;
}

/**
 * Valida y formatea un número celular chileno
 * @param phone - Número de teléfono a validar
 * @returns Resultado de la validación
 */
export const validateChileanCellPhone = (phone: string): PhoneValidationResult => {
  if (!phone || phone.trim() === '') {
    return {
      isValid: false,
      message: 'El teléfono celular es obligatorio'
    };
  }

  // Limpiar el número (quitar espacios, guiones, paréntesis)
  const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');

  // Validar celular chileno
  // Formatos aceptados:
  // - 569XXXXXXXX (con código país)
  // - 9XXXXXXXX (8 dígitos después del 9)

  if (cleanPhone.startsWith('569')) {
    // Formato con código país +56
    if (cleanPhone.length === 11 && /^569[0-9]{8}$/.test(cleanPhone)) {
      return {
        isValid: true,
        formatted: `+${cleanPhone}` // Formato sin espacios como +5691234567
      };
    }
  } else if (cleanPhone.startsWith('9')) {
    // Formato nacional (9 + 8 dígitos)
    if (cleanPhone.length === 9 && /^9[0-9]{8}$/.test(cleanPhone)) {
      return {
        isValid: true,
        formatted: `+569${cleanPhone.substring(1)}` // Convertir a formato internacional sin espacios
      };
    }
  }

  return {
    isValid: false,
    message: 'Formato de celular inválido. Escriba solo números, se formateará automáticamente'
  };
};

/**
 * Valida un teléfono fijo chileno
 * @param phone - Número de teléfono a validar
 * @returns Resultado de la validación
 */
export const validateChileanLandline = (phone: string): PhoneValidationResult => {
  if (!phone || phone.trim() === '') {
    return {
      isValid: true // Teléfono fijo es opcional
    };
  }

  // Limpiar el número
  const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');

  // Validar teléfono fijo chileno
  // Formatos aceptados:
  // - 56XXXXXXXX (con código país, 8-9 dígitos después del 56)
  // - XXXXXXXX (8-9 dígitos directos)

  if (cleanPhone.startsWith('56')) {
    // Formato con código país +56
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && /^56[0-9]{8,9}$/.test(cleanPhone)) {
      const localNumber = cleanPhone.substring(2);
      return {
        isValid: true,
        formatted: `+56 ${localNumber.substring(0, 2)} ${localNumber.substring(2, 5)} ${localNumber.substring(5)}`
      };
    }
  } else if (/^[2-8][0-9]{7,8}$/.test(cleanPhone)) {
    // Formato nacional (8-9 dígitos, no empieza con 9)
    return {
      isValid: true,
      formatted: `${cleanPhone.substring(0, 2)} ${cleanPhone.substring(2, 5)} ${cleanPhone.substring(5)}`
    };
  }

  return {
    isValid: false,
    message: 'Formato de teléfono fijo inválido. Use: 22 XXX XXXX o +56 22 XXX XXXX'
  };
};

/**
 * Formatea un número de teléfono para mostrar
 * @param phone - Número de teléfono
 * @param isCellPhone - Si es celular o fijo
 * @returns Número formateado o el original si no se puede formatear
 */
export const formatPhoneDisplay = (phone: string, isCellPhone: boolean = true): string => {
  if (!phone) return '';

  const validation = isCellPhone
    ? validateChileanCellPhone(phone)
    : validateChileanLandline(phone);

  return validation.formatted || phone;
};

/**
 * Formatea automáticamente el input de celular mientras se escribe
 * Limita a 12 dígitos máximo y formatea como +5691234567
 * @param value - Valor actual del input
 * @returns Valor formateado y limitado
 */
export const formatCellPhoneInput = (value: string): string => {
  // Limpiar solo números
  const numbers = value.replace(/\D/g, '');

  // Limitar a 12 dígitos máximo
  const limited = numbers.substring(0, 12);

  if (limited.length === 0) return '';

  // Si empieza con 569, mantener así
  if (limited.startsWith('569')) {
    // Limitar a 11 dígitos total (569 + 8 dígitos)
    const finalNumbers = limited.substring(0, 11);
    return `+${finalNumbers}`;
  }

  // Si empieza con 56, asumir que quiere agregar 9
  if (limited.startsWith('56') && limited.length >= 3) {
    // Si el tercer dígito no es 9, agregarlo
    if (limited[2] !== '9') {
      const withNine = '569' + limited.substring(2);
      // Limitar a 11 dígitos total
      const finalNumbers = withNine.substring(0, 11);
      return `+${finalNumbers}`;
    } else {
      // Ya tiene 569, limitar a 11 dígitos
      const finalNumbers = limited.substring(0, 11);
      return `+${finalNumbers}`;
    }
  }

  // Si empieza con 9, agregar 56 adelante
  if (limited.startsWith('9')) {
    const withPrefix = '569' + limited.substring(1);
    // Limitar a 11 dígitos total
    const finalNumbers = withPrefix.substring(0, 11);
    return `+${finalNumbers}`;
  }

  // Si es cualquier otro número, asumir que empezará con 9
  if (limited.length > 0) {
    const withFullPrefix = '569' + limited;
    // Limitar a 11 dígitos total
    const finalNumbers = withFullPrefix.substring(0, 11);
    return `+${finalNumbers}`;
  }

  return '';
};

/**
 * Ejemplos de formatos válidos para mostrar al usuario
 */
export const PHONE_FORMAT_EXAMPLES = {
  cellPhone: [
    '+5691234567',
    'Se formatea automáticamente'
  ],
  landline: [
    '22 123 4567',
    '+56 22 123 4567',
    '221234567'
  ]
};