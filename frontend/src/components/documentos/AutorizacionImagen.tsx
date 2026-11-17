import React from 'react';
import type { StudentData } from '../../types';
import { ESTABLECIMIENTO } from '../../config/establecimiento';
import { AUTORIZACIONES_IMAGEN } from '../AutorizacionImagenForm';
import {
  estilos, nombreCompletoAlumno, nombreCompletoApoderado, apoderadoPrincipal,
  cursoTexto, rutAlumno, rutApoderado, datoOLinea,
} from './estilosDocumento';

interface AutorizacionImagenProps {
  student: Partial<StudentData>;
  currentYear: number;
}

// Casilla impresa: "[ X ]" si corresponde, "[   ]" si no. Sin respuesta → ambas vacías (se marca a mano).
const Casilla: React.FC<{ marcada: boolean; texto: string }> = ({ marcada, texto }) => (
  <span style={{ marginRight: '28px', fontWeight: 600, whiteSpace: 'nowrap' }}>
    <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>[{marcada ? ' X ' : '   '}]</span> {texto}
  </span>
);

const AutorizacionImagen: React.FC<AutorizacionImagenProps> = ({ student, currentYear }) => {
  const apoderado = apoderadoPrincipal(student);
  const fila = (etiqueta: string, valor: string, largo = 30) => (
    <li style={{ marginBottom: '3px' }}>{etiqueta}: <span style={estilos.dato}>{datoOLinea(valor, largo)}</span></li>
  );

  return (
    <div style={estilos.hoja} data-documento="autorizacion-imagen">
      <h1 style={estilos.titulo}>Carta de Autorización Anual para el Uso de Imagen y Registros Audiovisuales de Estudiantes</h1>
      <p style={estilos.subtitulo}>Año escolar {currentYear}</p>

      <h2 style={estilos.seccion}>1. Identificación del establecimiento (Responsable del Tratamiento)</h2>
      <ul style={estilos.lista}>
        <li>Nombre del Establecimiento: <strong>{ESTABLECIMIENTO.nombre}</strong></li>
        <li>RBD: <strong>{ESTABLECIMIENTO.rbd}</strong></li>
        <li>Sostenedor: <strong>{ESTABLECIMIENTO.sostenedor}</strong></li>
        <li>Domicilio: <strong>{ESTABLECIMIENTO.direccion}</strong></li>
        <li>Correo de contacto para derechos de datos: <strong>{ESTABLECIMIENTO.correoDerechos}</strong></li>
      </ul>

      <h2 style={estilos.seccion}>2. Identificación del/la estudiante y apoderado/a</h2>
      <ul style={estilos.lista}>
        {fila('Nombre completo del/la estudiante', nombreCompletoAlumno(student), 40)}
        <li style={{ marginBottom: '3px' }}>
          RUN: <span style={estilos.dato}>{datoOLinea(rutAlumno(student), 14)}</span>{'  '}
          Curso: <span style={estilos.dato}>{datoOLinea(cursoTexto(student), 16)}</span>
        </li>
        {fila('Nombre completo del/la apoderado/a', nombreCompletoApoderado(apoderado), 40)}
        <li style={{ marginBottom: '3px' }}>
          RUN: <span style={estilos.dato}>{datoOLinea(rutApoderado(apoderado), 14)}</span>{'  '}
          Parentesco / Calidad: <span style={estilos.dato}>{datoOLinea(apoderado?.parentesco, 16)}</span>
        </li>
        <li style={{ marginBottom: '3px' }}>
          Correo electrónico: <span style={estilos.dato}>{datoOLinea(apoderado?.email, 22)}</span>{'  '}
          Teléfono: <span style={estilos.dato}>{datoOLinea(apoderado?.celular, 14)}</span>
        </li>
      </ul>

      <h2 style={estilos.seccion}>3. Objetivo y marco legal</h2>
      <p style={estilos.parrafo}>
        En cumplimiento con lo dispuesto en la Ley N° 21.430 sobre Garantías y Protección Integral de los Derechos de la
        Niñez y Adolescencia, y la Ley N° 21.719 sobre Protección de Datos Personales, el Establecimiento solicita su
        autorización previa, expresa e informada para captar, almacenar y utilizar fotografías, videos o registros de voz
        de su pupilo/a durante el año lectivo {currentYear}.
      </p>

      <h2 style={estilos.seccion}>4. Consentimiento granular por finalidad</h2>
      <p style={{ ...estilos.parrafo, fontStyle: 'italic' }}>
        (Decisión independiente para cada uso. La negativa a cualquiera de estas opciones no afectará en modo alguno la
        matrícula, evaluación ni participación del estudiante en actividades escolares).
      </p>
      {AUTORIZACIONES_IMAGEN.map(({ campo, letra, titulo, detalle }) => {
        const valor = student[campo];
        return (
          <div key={campo} style={{ margin: '0 0 10px 0' }} data-autorizacion={campo}>
            <p style={{ ...estilos.parrafo, margin: '0 0 3px 0' }}><strong>{letra}. {titulo}:</strong> {detalle}</p>
            <div style={{ paddingLeft: '16px' }}>
              <Casilla marcada={valor === true} texto="SÍ AUTORIZO" />
              <Casilla marcada={valor === false} texto="NO AUTORIZO" />
            </div>
          </div>
        );
      })}

      <h2 style={estilos.seccion}>5. Condiciones de resguardo y derechos</h2>
      <ul style={estilos.lista}>
        <li style={{ marginBottom: '4px' }}><strong>Sin fines comerciales:</strong> Las imágenes serán utilizadas exclusivamente con fines educativos, informativos e institucionales, quedando estrictamente prohibida su venta, cesión a terceros con fines comerciales o uso en campañas de marketing pagado.</li>
        <li style={{ marginBottom: '4px' }}><strong>Resguardo de identidad:</strong> En publicaciones abiertas, el establecimiento evitará asociar el rostro del menor con datos sensibles como su nombre completo, dirección o antecedentes médicos, resguardando siempre el interés superior del niño/a.</li>
        <li style={{ marginBottom: '4px' }}><strong>Derechos ARCO-P y Revocación:</strong> El/la apoderado/a podrá ejercer en cualquier momento sus derechos de acceso, rectificación, cancelación/supresión y oposición, así como revocar esta autorización de forma gratuita y sin expresión de causa, enviando un correo electrónico a {ESTABLECIMIENTO.correoDerechos} o presentando una solicitud escrita en secretaría. Una vez revocada, el establecimiento eliminará el material de sus canales activos en un plazo máximo de 30 días corridos.</li>
        <li style={{ marginBottom: '4px' }}><strong>Vigencia:</strong> Esta autorización tiene validez únicamente durante el año escolar {currentYear} y deberá ser renovada en el próximo periodo lectivo.</li>
      </ul>

      <h2 style={estilos.seccion}>6. Declaración de consentimiento y asentimiento</h2>
      <p style={estilos.parrafo}>
        Declaro haber leído y comprendido las condiciones de este documento, otorgando libremente mi decisión respecto al
        uso de la imagen de mi pupilo/a. Asimismo, declaro haber conversado esta decisión con el/la estudiante, respetando
        su opinión y asentimiento conforme a su edad y madurez.
      </p>

      <div style={{ ...estilos.firmas, marginTop: '40px' }}>
        <div style={estilos.firma}>
          <div style={estilos.lineaFirma}>Firma del/la Apoderado/a o Tutor Legal</div>
          <div>(Obligatoria para menores de 18 años)</div>
        </div>
        <div style={estilos.firma}>
          <div style={estilos.lineaFirma}>Firma / Asentimiento del/la Estudiante</div>
          <div>(Recomendada según edad y madurez)</div>
        </div>
      </div>
      <p style={{ marginTop: '20px', fontSize: '11px' }}>Fecha: ____ / ____ / {currentYear}</p>
    </div>
  );
};

export default AutorizacionImagen;
