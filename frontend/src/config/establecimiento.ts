// Datos del establecimiento usados en los documentos imprimibles de matrícula
// (Carta de Compromiso y Autorización de Uso de Imagen).
// ⚠️ Completar `sostenedor` y `correoDerechos` antes de imprimir cartas reales.
export const ESTABLECIMIENTO = {
  nombre: 'Escuela República del Ecuador E-79',
  rbd: '312',
  sostenedor: '[COMPLETAR: nombre del sostenedor]',
  direccion: 'Bellavista 3957, Antofagasta',
  correoDerechos: '[COMPLETAR: correo de contacto]',
};

export const esValorPendiente = (valor: string) => valor.startsWith('[COMPLETAR');
