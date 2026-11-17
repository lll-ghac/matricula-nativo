import React from 'react';
import type { StudentData } from '../../types';
import { ESTABLECIMIENTO } from '../../config/establecimiento';
import EncabezadoDocumento from './EncabezadoDocumento';
import {
  estilos, nombreCompletoAlumno, nombreCompletoApoderado, apoderadoPrincipal,
  cursoTexto, rutApoderado, datoOLinea,
} from './estilosDocumento';

interface CartaCompromisoProps {
  student: Partial<StudentData>;
  currentYear: number;
}

// Texto según "CARTA DE COMPROMISO DEL APODERADO 2026" (.docx entregado por la escuela),
// con el punto del uniforme agregado en "Cumplimiento de Normas y Compromisos Escolares".
const COMPROMISOS: { titulo: string; puntos: string[] }[] = [
  {
    titulo: 'Asistencia y puntualidad',
    puntos: [
      'Garantizar la asistencia regular del estudiante a todas las clases, evitando inasistencias injustificadas.',
      'Asegurar que mi hijo/a llegue puntualmente al establecimiento.',
      'Informar oportunamente cualquier situación que pueda afectar la asistencia o permanencia escolar.',
    ],
  },
  {
    titulo: 'Cumplimiento de Normas y Compromisos Escolares',
    puntos: [
      'Respetar el Reglamento Interno del establecimiento y velar porque mi hijo/a lo cumpla.',
      'Fomentar el uso del uniforme oficial del establecimiento: pantalón gris o falda y polera azul, como parte del cumplimiento de las normas de presentación personal.',
      'Fomentar una convivencia respetuosa y colaborativa dentro de la comunidad educativa.',
    ],
  },
  {
    titulo: 'Responsabilidad y Participación como Apoderado/a',
    puntos: [
      'Asistir a todas las reuniones de apoderados, entrevistas y citaciones efectuadas por el establecimiento.',
      'Mantener una comunicación respetuosa, clara y permanente con el profesor/a jefe y el equipo escolar.',
    ],
  },
  {
    titulo: 'Supervisión y Apoyo Escolar',
    puntos: [
      'Supervisar, controlar y apoyar el cumplimiento de las tareas escolares, estudios y trabajos de mi hijo/a.',
      'Proveer un ambiente adecuado para el aprendizaje en el hogar.',
      'Estimular hábitos de responsabilidad, orden y estudio.',
    ],
  },
  {
    titulo: 'Compromiso con el Desarrollo Integral del Estudiante',
    puntos: [
      'Acompañar y apoyar el desarrollo emocional, social y académico de mi hijo/a.',
      'Informar cualquier situación personal o familiar que pueda influir en su desempeño escolar.',
    ],
  },
];

const CartaCompromiso: React.FC<CartaCompromisoProps> = ({ student, currentYear }) => {
  const apoderado = apoderadoPrincipal(student);
  const nombreApoderado = nombreCompletoApoderado(apoderado);

  return (
    <div style={estilos.hoja} data-documento="carta-compromiso">
      <EncabezadoDocumento titulo="Carta de Compromiso del Apoderado/a" subtitulo={`Año escolar ${currentYear}`} />

      <p style={estilos.parrafo}>
        Yo, <span style={estilos.dato}>{datoOLinea(nombreApoderado, 40)}</span>, RUT:{' '}
        <span style={estilos.dato}>{datoOLinea(rutApoderado(apoderado), 14)}</span>, en calidad de apoderado/a del
        estudiante <span style={estilos.dato}>{datoOLinea(nombreCompletoAlumno(student), 36)}</span>, que ingresa al
        curso de <span style={estilos.dato}>{datoOLinea(cursoTexto(student), 20)}</span> para el año escolar{' '}
        <strong>{currentYear}</strong>, declaro por medio de la presente mi compromiso y responsabilidad con el proceso
        educativo de mi hijo/a en la {ESTABLECIMIENTO.nombre}, asumiendo las siguientes obligaciones:
      </p>

      {COMPROMISOS.map(({ titulo, puntos }) => (
        <div key={titulo}>
          <h2 style={estilos.seccion}>{titulo}</h2>
          <ul style={estilos.lista}>
            {puntos.map(p => <li key={p} style={{ marginBottom: '3px' }}>{p}</li>)}
          </ul>
        </div>
      ))}

      <p style={{ ...estilos.parrafo, marginTop: '12px' }}>
        Declaro haber leído y comprendido cada punto de este compromiso, entendiendo que su cumplimiento es fundamental
        para favorecer el aprendizaje y desarrollo integral del estudiante.
      </p>

      <div style={estilos.firmas}>
        <div style={estilos.firma}>
          <div style={estilos.lineaFirma}>Firma del Apoderado/a</div>
          <div>{nombreApoderado}</div>
        </div>
        <div style={estilos.firma}>
          <div style={estilos.lineaFirma}>Firma Profesor/a Jefe</div>
        </div>
      </div>
      <p style={{ marginTop: '24px', fontSize: '11px' }}>Fecha: ____ / ____ / ______</p>
    </div>
  );
};

export default CartaCompromiso;
