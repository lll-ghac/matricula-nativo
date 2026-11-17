export const calculateDV = (rut: string | number): string => {
  const rutBody = String(rut).replace(/[^0-9]/g, '');
  if (!/^\d+$/.test(rutBody)) {
    return '';
  }

  let sum = 0;
  let multiplier = 2;

  for (let i = rutBody.length - 1; i >= 0; i--) {
    sum += parseInt(rutBody[i], 10) * multiplier;
    multiplier = multiplier < 7 ? multiplier + 1 : 2;
  }

  const remainder = sum % 11;
  const calculatedDV = 11 - remainder;

  if (calculatedDV === 11) {
    return '0';
  }
  if (calculatedDV === 10) {
    return 'K';
  }
  return String(calculatedDV);
};
// Formatea RUT con puntos y guion: (12345678, '9') → "12.345.678-9". Vacío si falta algún dato.
export const formatRut = (rut?: string | number | null, dv?: string | null): string => {
  if (!rut || !dv) return '';
  const cuerpo = String(rut).replace(/[^\d]/g, '');
  if (!cuerpo) return '';
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${String(dv).trim().toUpperCase()}`;
};
