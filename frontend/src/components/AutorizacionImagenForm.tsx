import React from 'react';
import type { StudentData } from '../types';

type CampoAutorizacion = 'autoriza_imagen_pedagogico' | 'autoriza_imagen_redes' | 'autoriza_imagen_prensa';

export const AUTORIZACIONES_IMAGEN: { campo: CampoAutorizacion; letra: string; titulo: string; detalle: string }[] = [
  {
    campo: 'autoriza_imagen_pedagogico',
    letra: 'A',
    titulo: 'Uso pedagógico e interno',
    detalle: 'Registro de actividades en el aula, evaluaciones, portafolios, murales internos o plataformas cerradas de comunicación con apoderados.',
  },
  {
    campo: 'autoriza_imagen_redes',
    letra: 'B',
    titulo: 'Difusión institucional digital (web y redes sociales)',
    detalle: 'Publicación en el sitio web oficial y cuentas institucionales verificadas (Instagram, Facebook, YouTube) sobre actividades académicas, culturales, deportivas o conmemorativas.',
  },
  {
    campo: 'autoriza_imagen_prensa',
    letra: 'C',
    titulo: 'Material impreso y prensa',
    detalle: 'Publicación en anuarios, revistas escolares, boletines físicos o notas de prensa en medios externos.',
  },
];

interface AutorizacionImagenFormProps {
  data: Partial<StudentData>;
  onChange: (field: keyof StudentData, value: boolean) => void;
  currentYear: number;
  obligatorio: boolean;
}

const AutorizacionImagenForm: React.FC<AutorizacionImagenFormProps> = ({ data, onChange, currentYear, obligatorio }) => {
  return (
    <div className="ios-card p-6 space-y-6" data-testid="autorizacion-imagen-form">
      <div>
        <h3 className="ios-title mb-2">Autorización de uso de imagen — Año escolar {currentYear}</h3>
        <p className="ios-body" style={{ color: 'var(--color-foreground)' }}>
          Lea cada opción al apoderado/a y marque lo que responda. Lo marcado saldrá impreso en la carta de
          autorización para que el apoderado/a la revise y firme.
        </p>
        <p className="text-sm mt-2" style={{ color: 'var(--color-muted-foreground, #6b7280)' }}>
          Indíquele que cada opción es independiente y que <strong>negarse a cualquiera no afecta la matrícula,
          evaluación ni participación</strong> del estudiante. La autorización vale solo para este año escolar.
        </p>
      </div>

      {AUTORIZACIONES_IMAGEN.map(({ campo, letra, titulo, detalle }) => {
        const valor = data[campo];
        const sinResponder = valor !== true && valor !== false;
        return (
          <fieldset
            key={campo}
            className="rounded-lg border p-4"
            style={{ borderColor: obligatorio && sinResponder ? 'var(--color-warning, #f59e0b)' : 'var(--color-border, #e5e7eb)' }}
            data-testid={`autorizacion-${campo}`}
          >
            <legend className="font-semibold px-1" style={{ color: 'var(--color-foreground)' }}>
              {letra}. {titulo}{obligatorio && <span style={{ color: 'var(--color-error)' }}> *</span>}
            </legend>
            <p className="text-sm mb-3" style={{ color: 'var(--color-muted-foreground, #6b7280)' }}>{detalle}</p>
            <div className="flex flex-wrap gap-6">
              {[{ v: true, texto: 'SÍ AUTORIZO', id: 'si' }, { v: false, texto: 'NO AUTORIZO', id: 'no' }].map(op => (
                <label key={op.id} className="flex items-center gap-2 cursor-pointer" style={{ color: 'var(--color-foreground)' }}>
                  <input
                    type="radio"
                    name={campo}
                    checked={valor === op.v}
                    onChange={() => onChange(campo, op.v)}
                    data-testid={`autorizacion-${campo}-${op.id}`}
                    className="h-4 w-4"
                  />
                  <span className="font-medium">{op.texto}</span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
};

export default AutorizacionImagenForm;
