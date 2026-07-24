/**
 * Utility functions for consistent date formatting across the application
 */

/**
 * Formats a date string to DD-MM-YYYY format, handling timezone issues
 * @param dateString - Date string in various formats (YYYY-MM-DD, ISO, etc.)
 * @returns Formatted date string as DD-MM-YYYY or fallback message
 */
export const formatDate = (dateString?: string): string => {
  if (!dateString || typeof dateString !== 'string') return 'No especificado';

  try {
    // Si la fecha está en formato YYYY-MM-DD, parsearla manualmente para evitar problemas de zona horaria
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      return `${day}-${month}-${year}`;
    }

    // Si la fecha ya está en formato DD-MM-YYYY, devolverla tal cual
    if (dateString.match(/^\d{2}-\d{2}-\d{4}$/)) {
      return dateString;
    }

    // Si la fecha está en formato YYYY-MM-DD HH:mm:ss, extraer solo la fecha
    if (dateString.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
      const [datePart] = dateString.split(' ');
      const [year, month, day] = datePart.split('-');
      return `${day}-${month}-${year}`;
    }

    // ISO string con zona horaria (ej: "1982-03-22T03:00:00.000Z" o "T00:00:00.000Z")
    // Usar componentes UTC para evitar desfase de un día en timezones negativas (Chile UTC-4)
    if (dateString.match(/^\d{4}-\d{2}-\d{2}T/)) {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'No especificado';
      const day   = date.getUTCDate().toString().padStart(2, '0');
      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const year  = date.getUTCFullYear();
      return `${day}-${month}-${year}`;
    }

    // Cualquier otro formato no reconocido
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'No especificado';

    const day   = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year  = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
  } catch (error) {
    console.warn('Error formatting date:', dateString, error);
    return 'No especificado';
  }
};

/**
 * Formats a date string specifically for birth dates (alias for formatDate)
 * @param dateString - Date string in various formats
 * @returns Formatted birth date as DD-MM-YYYY or 'S/F' for birth dates
 */
export const formatBirthDate = (dateString?: string): string => {
  if (!dateString) return 'S/F';
  
  const result = formatDate(dateString);
  return result === 'No especificado' ? 'S/F' : result;
};

/**
 * Formats a datetime string to include both date and time
 * @param dateTimeString - DateTime string in various formats
 * @returns Formatted datetime string as DD-MM-YYYY HH:mm or fallback message
 */
export const formatDateTime = (dateTimeString?: string): string => {
  if (!dateTimeString || typeof dateTimeString !== 'string') return 'No especificado';
  
  try {
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return 'No especificado';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  } catch (error) {
    console.warn('Error formatting datetime:', dateTimeString, error);
    return 'No especificado';
  }
};

/**
 * Converts DD-MM-YYYY date format to YYYY-MM-DD for HTML date inputs
 * @param ddmmyyyyDate - Date string in DD-MM-YYYY format
 * @returns Date string in YYYY-MM-DD format for HTML inputs, or empty string if invalid
 */
export const convertToISO = (ddmmyyyyDate?: string): string => {
  if (!ddmmyyyyDate || typeof ddmmyyyyDate !== 'string') return '';
  
  // Handle DD-MM-YYYY format
  const ddmmyyyyMatch = ddmmyyyyDate.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return `${year}-${month}-${day}`;
  }
  
  // If already in YYYY-MM-DD format, return as-is
  const yyyymmddMatch = ddmmyyyyDate.match(/^\d{4}-\d{2}-\d{2}$/);
  if (yyyymmddMatch) {
    return ddmmyyyyDate;
  }
  
  return '';
};

/**
 * Converts YYYY-MM-DD date format to DD-MM-YYYY for database storage
 * @param isoDate - Date string in YYYY-MM-DD format (from HTML date input)
 * @returns Date string in DD-MM-YYYY format for database, or empty string if invalid
 */
export const convertFromISO = (isoDate?: string): string => {
  if (!isoDate || typeof isoDate !== 'string') return '';
  
  // Handle YYYY-MM-DD format
  const yyyymmddMatch = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch;
    return `${day}-${month}-${year}`;
  }
  
  // If already in DD-MM-YYYY format, return as-is
  const ddmmyyyyMatch = isoDate.match(/^\d{2}-\d{2}-\d{4}$/);
  if (ddmmyyyyMatch) {
    return isoDate;
  }
  
  return '';
};