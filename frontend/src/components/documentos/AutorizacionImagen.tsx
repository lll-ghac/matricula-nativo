import React from 'react';
import type { StudentData } from '../../types';
import { AUTORIZACIONES_IMAGEN } from '../AutorizacionImagenForm';
import EncabezadoDocumento from './EncabezadoDocumento';
import {
  estilos, nombreCompletoAlumno, nombreCompletoApoderado, apoderadoPrincipal,
  cursoTexto, rutAlumno, rutApoderado, datoOLinea,
} from './estilosDocumento';

interface AutorizacionImagenProps {
  student: Partial<StudentData>;
  currentYear: number;
}

// Versión compacta para que la carta quepa en UNA hoja carta.
const hoja: React.CSSProperties = { ...estilos.hoja, fontSize: '11px', lineHeight: 1.35 };
const seccion: React.CSSProperties = { ...estilos.seccion, fontSize: '11.5px', margin: '10px 0 4px 0' };
const parrafo: React.CSSProperties = { ...estilos.parrafo, margin: '0 0 5px 0' };
const lista: React.CSSProperties = { ...estilos.lista, margin: '0 0 4px 0' };
const item: React.CSSProperties = { marginBottom: '2px' };

// Casilla impresa: "[ X ]" si corresponde, "[   ]" si no. Sin respuesta → ambas vacías (se marca a mano).
const Casilla: React.FC<{ marcada: boolean; texto: string }> = ({ marcada, texto }) => (
  <span style={{ marginRight: '28px', fontWeight: 600, whiteSpace: 'nowrap' }}>
    <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>[{marcada ? ' X ' : '   '}]</span> {texto}
  </span>
);

const AutorizacionImagen: React.FC<AutorizacionImagenProps> = ({ student, currentYear }) => {
  const apoderado = apoderadoPrincipal(student);

  return (
    <div style={hoja} data-documento="autorizacion-imagen">
      <EncabezadoDocumento
        titulo="Carta de Autorización Anual para el Uso de Imagen y Registros Audiovisuales de Estudiantes"
        subtitulo={`Año escolar ${currentYear}`}
      />

      <h2 style={{ ...seccion, marginTop: '4px' }}>1. Identificación del/la estudiante y apoderado/a</h2>
      <ul style={lista}>
        <li style={item}>Nombre completo del/la estudiante: <span style={estilos.dato}>{datoOLinea(nombreCompletoAlumno(student), 40)}</span></li>
        <li style={item}>
          RUN: <span style={estilos.dato}>{datoOLinea(rutAlumno(student), 14)}</span>{'  '}
          Curso: <span style={estilos.dato}>{datoOLinea(cursoTexto(student), 16)}</span>
        </li>
        <li style={item}>Nombre completo del/la apoderado/a: <span style={estilos.dato}>{datoOLinea(nombreCompletoApoderado(apoderado), 40)}</span></li>
        <li style={item}>
          RUN: <span style={estilos.dato}>{datoOLinea(rutApoderado(apoderado), 14)}</span>{'  '}
          Parentesco / Calidad: <span style={estilos.dato}>{datoOLinea(apoderado?.parentesco, 16)}</span>
        </li>
        <li style={item}>
          Correo electrónico: <span style={estilos.dato}>{datoOLinea(apoderado?.email, 22)}</span>{'  '}
          Teléfono: <span style={estilos.dato}>{datoOLinea(apoderado?.celular, 14)}</span>
        </li>
      </ul>

      <h2 style={seccion}>2. Consentimiento granular por finalidad</h2>
      <p style={{ ...parrafo, fontStyle: 'italic' }}>
        (Decisión independiente para cada uso. La negativa a cualquiera de estas opciones no afectará en modo alguno la
        matrícula, evaluación ni participación del estudiante en actividades escolares).
      </p>
      {AUTORIZACIONES_IMAGEN.map(({ campo, letra, titulo, detalle }) => {
        const valor = student[campo];
        return (
          <div key={campo} style={{ margin: '0 0 6px 0' }} data-autorizacion={campo}>
            <p style={{ ...parrafo, margin: '0 0 2px 0' }}><strong>{letra}. {titulo}:</strong> {detalle}</p>
            <div style={{ paddingLeft: '16px' }}>
              <Casilla marcada={valor === true} texto="SÍ AUTORIZO" />
              <Casilla marcada={valor === false} texto="NO AUTORIZO" />
            </div>
          </div>
        );
      })}

      <h2 style={seccion}>3. Condiciones de resguardo y derechos</h2>
      <ul style={lista}>
        <li style={item}><strong>Sin fines comerciales:</strong> Las imágenes serán utilizadas exclusivamente con fines educativos, informativos e institucionales, quedando estrictamente prohibida su venta, cesión a terceros con fines comerciales o uso en campañas de marketing pagado.</li>
        <li style={item}><strong>Resguardo de identidad:</strong> En publicaciones abiertas, el establecimiento evitará asociar el rostro del menor con datos sensibles como su nombre completo, dirección o antecedentes médicos, resguardando siempre el interés superior del niño/a.</li>
        <li style={item}><strong>Derechos ARCO-P y Revocación:</strong> El/la apoderado/a podrá ejercer en cualquier momento sus derechos de acceso, rectificación, cancelación/supresión y oposición, así como revocar esta autorización de forma gratuita y sin expresión de causa, presentando una solicitud escrita en la secretaría del establecimiento. Una vez revocada, el establecimiento eliminará el material de sus canales activos en un plazo máximo de 30 días corridos.</li>
        <li style={item}><strong>Vigencia:</strong> Esta autorización tiene validez únicamente durante el año escolar {currentYear} y deberá ser renovada en el próximo periodo lectivo.</li>
      </ul>

      <h2 style={seccion}>4. Declaración de consentimiento y asentimiento</h2>
      <p style={parrafo}>
        Declaro haber leído y comprendido las condiciones de este documento, otorgando libremente mi decisión respecto al
        uso de la imagen de mi pupilo/a. Asimismo, declaro haber conversado esta decisión con el/la estudiante, respetando
        su opinión y asentimiento conforme a su edad y madurez.
      </p>

      <div style={{ ...estilos.firmas, marginTop: '34px' }}>
        <div style={estilos.firma}>
          <div style={estilos.lineaFirma}>Firma del/la Apoderado/a o Tutor Legal</div>
          <div>(Obligatoria para menores de 18 años)</div>
        </div>
        <div style={estilos.firma}>
          <div style={estilos.lineaFirma}>Firma / Asentimiento del/la Estudiante</div>
          <div>(Recomendada según edad y madurez)</div>
        </div>
      </div>
      <p style={{ marginTop: '12px', fontSize: '10.5px' }}>Fecha: ____ / ____ / {currentYear}</p>
    </div>
  );
};

export default AutorizacionImagen;
