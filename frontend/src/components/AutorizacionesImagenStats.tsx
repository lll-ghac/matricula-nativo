import React, { useEffect, useMemo, useState } from 'react';
import { Camera, RefreshCw, Printer, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { AUTORIZACIONES_IMAGEN } from './AutorizacionImagenForm';
import { formatRut } from '../utils/rutUtils';
import { useToast } from '../context/ToastContext';

// Estadística de la autorización anual de uso de imagen (fotografías, videos, voz).
// Datos: GET /api/statistics/autorizaciones-imagen (solo matriculados del año vigente).

type Uso = 'autoriza_imagen_pedagogico' | 'autoriza_imagen_redes' | 'autoriza_imagen_prensa';
interface Conteo { si: number; no: number; sin_responder: number }
type Resumen = { total: number; impresas: number; archivadas: number; con_restriccion: number } & Record<Uso, Conteo>;
interface ResumenCurso extends Resumen { clave: string; curso: string }
interface AlumnoAut {
  id: number; rut: number | string; dv: string; nombre: string; curso: string; curso_clave: string;
  autoriza_imagen_pedagogico: boolean | null; autoriza_imagen_redes: boolean | null; autoriza_imagen_prensa: boolean | null;
  impresa: boolean; archivada: boolean;
}
interface Datos { anio: number; totales: Resumen; cursos: ResumenCurso[]; alumnos: AlumnoAut[] }

// Estados con color de estado de la app + ícono + texto (nunca solo color).
const ESTADOS = [
  { clave: 'si' as const, texto: 'Autoriza', color: 'var(--color-success)', Icono: CheckCircle2 },
  { clave: 'no' as const, texto: 'No autoriza', color: 'var(--color-error)', Icono: XCircle },
  { clave: 'sin_responder' as const, texto: 'Sin responder', color: 'var(--color-text-light, #9ca3af)', Icono: MinusCircle },
];

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
const tieneRestriccion = (a: AlumnoAut) => AUTORIZACIONES_IMAGEN.some(({ campo }) => a[campo as Uso] !== true);
const textoValor = (v: boolean | null) => (v === true ? 'Sí' : v === false ? 'No' : 'Sin responder');
const escapar = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

const BarraEstados: React.FC<{ conteo: Conteo; total: number; etiqueta: string }> = ({ conteo, total, etiqueta }) => (
  <div
    className="flex w-full h-3 rounded-full overflow-hidden"
    style={{ gap: '2px', backgroundColor: 'var(--color-card)' }}
    role="img"
    aria-label={`${etiqueta}: ${ESTADOS.map(e => `${e.texto} ${conteo[e.clave]}`).join(', ')}`}
  >
    {ESTADOS.map(e => conteo[e.clave] > 0 && (
      <div
        key={e.clave}
        title={`${e.texto}: ${conteo[e.clave]} (${pct(conteo[e.clave], total)}%)`}
        style={{ width: `${(conteo[e.clave] / Math.max(total, 1)) * 100}%`, backgroundColor: e.color, borderRadius: '4px' }}
      />
    ))}
  </div>
);

const Valor: React.FC<{ v: boolean | null }> = ({ v }) => {
  const e = v === true ? ESTADOS[0] : v === false ? ESTADOS[1] : ESTADOS[2];
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap" style={{ color: 'var(--color-text)' }}>
      <e.Icono size={15} style={{ color: e.color }} aria-hidden="true" />
      {e.texto === 'Autoriza' ? 'Sí' : e.texto === 'No autoriza' ? 'No' : '—'}
    </span>
  );
};

const AutorizacionesImagenStats: React.FC = () => {
  const toast = useToast();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [cursoFiltro, setCursoFiltro] = useState('todos');
  const [soloRestringidos, setSoloRestringidos] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const cargar = async () => {
    setCargando(true);
    setError('');
    try {
      const r = await fetch('/api/statistics/autorizaciones-imagen', { credentials: 'include' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || 'Error al cargar');
      setDatos(j);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const alumnosFiltrados = useMemo(() => {
    if (!datos) return [];
    const q = busqueda.trim().toLowerCase();
    return datos.alumnos.filter(a =>
      (cursoFiltro === 'todos' || a.curso_clave === cursoFiltro) &&
      (!soloRestringidos || tieneRestriccion(a)) &&
      (!q || a.nombre.toLowerCase().includes(q) || String(a.rut).includes(q))
    );
  }, [datos, cursoFiltro, soloRestringidos, busqueda]);

  const imprimirLista = () => {
    if (!datos) return;
    const ventana = window.open('', '_blank', 'width=900,height=700');
    if (!ventana) {
      toast.error('Por favor, permite las ventanas emergentes para imprimir');
      return;
    }
    const curso = cursoFiltro === 'todos' ? 'Todos los cursos' : (datos.cursos.find(c => c.clave === cursoFiltro)?.curso || '');
    const filas = alumnosFiltrados.map(a => `<tr><td>${escapar(a.nombre)}</td><td>${escapar(formatRut(a.rut, a.dv))}</td><td>${escapar(a.curso)}</td>${
      AUTORIZACIONES_IMAGEN.map(({ campo }) => `<td>${textoValor(a[campo as Uso])}</td>`).join('')}</tr>`).join('');
    ventana.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Restricciones de imagen ${datos.anio}</title>
      <style>@page{size:letter;margin:12mm}body{font-family:Arial,sans-serif;font-size:11px;color:#000}
      h1{font-size:15px;margin:0 0 2px}p{margin:0 0 8px;color:#444}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #bbb;padding:4px 6px;text-align:left}th{background:#eee}</style></head><body>
      <h1>Autorización de uso de imagen — Año ${datos.anio}</h1>
      <p>${escapar(curso)} · ${soloRestringidos ? 'Solo alumnos con alguna restricción (No o Sin responder)' : 'Todos los alumnos'} · ${alumnosFiltrados.length} alumno(s) · Impreso ${new Date().toLocaleString('es-CL')}</p>
      <table><thead><tr><th>Alumno</th><th>RUT</th><th>Curso</th>${AUTORIZACIONES_IMAGEN.map(u => `<th>${u.letra}. ${escapar(u.titulo)}</th>`).join('')}</tr></thead>
      <tbody>${filas || '<tr><td colspan="6">Sin alumnos para este filtro.</td></tr>'}</tbody></table>
      <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script></body></html>`);
    ventana.document.close();
  };

  if (cargando) {
    return <div className="ios-card p-8 text-center"><p className="ios-title">Cargando autorizaciones...</p></div>;
  }
  if (error || !datos) {
    return (
      <div className="ios-card p-8 text-center">
        <p className="ios-title mb-4" style={{ color: 'var(--color-error)' }}>Error al cargar: {error}</p>
        <button className="ios-btn ios-btn-secondary" onClick={cargar}>Reintentar</button>
      </div>
    );
  }

  const { totales } = datos;
  const sinCarta = totales.total - totales.impresas;

  return (
    <div className="space-y-6" data-testid="estadistica-autorizaciones">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Camera size={32} style={{ color: 'var(--color-primary)' }} />
          <div>
            <h3 className="ios-title">Autorizaciones de uso de imagen — Año {datos.anio}</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Fotografías, videos y registros de voz · {totales.total} alumnos matriculados
            </p>
          </div>
        </div>
        <button className="ios-btn ios-btn-secondary flex items-center gap-2" onClick={cargar} data-testid="autorizaciones-actualizar">
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      {/* Leyenda única */}
      <div className="flex flex-wrap gap-5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {ESTADOS.map(e => (
          <span key={e.clave} className="inline-flex items-center gap-1.5">
            <e.Icono size={16} style={{ color: e.color }} aria-hidden="true" /> {e.texto}
          </span>
        ))}
      </div>

      {/* Resumen por uso */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {AUTORIZACIONES_IMAGEN.map(({ campo, letra, titulo }) => {
          const c = totales[campo as Uso];
          return (
            <div key={campo} className="ios-card p-5 space-y-3" data-testid={`resumen-${campo}`}>
              <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{letra}. {titulo}</p>
              <p style={{ color: 'var(--color-text)' }}>
                <span className="text-3xl font-bold">{pct(c.si, totales.total)}%</span>
                <span className="text-sm ml-2" style={{ color: 'var(--color-text-secondary)' }}>autoriza</span>
              </p>
              <BarraEstados conteo={c} total={totales.total} etiqueta={`${letra}. ${titulo}`} />
              <div className="grid grid-cols-3 gap-2 text-sm">
                {ESTADOS.map(e => (
                  <div key={e.clave}>
                    <div className="font-semibold" style={{ color: 'var(--color-text)' }}>{c[e.clave]}</div>
                    <div style={{ color: 'var(--color-text-secondary)' }}>{e.texto}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cartas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { valor: totales.con_restriccion, texto: 'Con alguna restricción', detalle: 'No o Sin responder en A, B o C' },
          { valor: totales.impresas, texto: 'Cartas impresas', detalle: 'Desde el sistema' },
          { valor: totales.archivadas, texto: 'Cartas firmadas y archivadas', detalle: 'En carpeta física' },
          { valor: sinCarta, texto: 'Sin carta impresa', detalle: 'Pendientes de imprimir' },
        ].map(t => (
          <div key={t.texto} className="ios-card p-4">
            <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{t.valor}</div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{t.texto}</div>
            <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t.detalle}</div>
          </div>
        ))}
      </div>

      {/* Tabla por curso */}
      <div className="ios-card p-4">
        <h4 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Por curso</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="tabla-autorizaciones-cursos">
            <thead>
              <tr style={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left py-2 pr-3">Curso</th>
                <th className="text-right py-2 px-2">Alumnos</th>
                {AUTORIZACIONES_IMAGEN.map(u => (
                  <th key={u.campo} className="text-left py-2 px-2" title={u.titulo}>{u.letra} (sí / no / —)</th>
                ))}
                <th className="text-right py-2 px-2">Con restricción</th>
                <th className="text-right py-2 pl-2">Archivadas</th>
              </tr>
            </thead>
            <tbody>
              {datos.cursos.map(c => (
                <tr
                  key={c.clave}
                  className="cursor-pointer"
                  style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text)', backgroundColor: cursoFiltro === c.clave ? 'var(--color-primary-light)' : undefined }}
                  onClick={() => setCursoFiltro(cursoFiltro === c.clave ? 'todos' : c.clave)}
                  title="Ver alumnos de este curso"
                >
                  <td className="py-2 pr-3 font-medium whitespace-nowrap">{c.curso}</td>
                  <td className="py-2 px-2 text-right">{c.total}</td>
                  {AUTORIZACIONES_IMAGEN.map(u => {
                    const k = c[u.campo as Uso];
                    return <td key={u.campo} className="py-2 px-2 whitespace-nowrap">{k.si} / {k.no} / {k.sin_responder}</td>;
                  })}
                  <td className="py-2 px-2 text-right">{c.con_restriccion}</td>
                  <td className="py-2 pl-2 text-right">{c.archivadas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lista de alumnos */}
      <div className="ios-card p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <h4 className="font-semibold mr-auto" style={{ color: 'var(--color-text)' }}>
            Alumnos {soloRestringidos ? 'que NO se pueden fotografiar o publicar en algún uso' : ''}
          </h4>
          <select className="ios-form-input" style={{ width: 'auto' }} value={cursoFiltro} onChange={e => setCursoFiltro(e.target.value)} data-testid="autorizaciones-filtro-curso">
            <option value="todos">Todos los cursos</option>
            {datos.cursos.map(c => <option key={c.clave} value={c.clave}>{c.curso}</option>)}
          </select>
          <input className="ios-form-input" style={{ width: '14rem' }} placeholder="Buscar nombre o RUT" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text)' }}>
            <input type="checkbox" checked={soloRestringidos} onChange={e => setSoloRestringidos(e.target.checked)} data-testid="autorizaciones-solo-restringidos" />
            Solo con restricción
          </label>
          <button className="ios-btn ios-btn-secondary flex items-center gap-2" onClick={imprimirLista} data-testid="autorizaciones-imprimir">
            <Printer size={16} /> Imprimir lista
          </button>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          "Sin responder" cuenta como restricción: no hay autorización registrada. {alumnosFiltrados.length} alumno(s).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="tabla-autorizaciones-alumnos">
            <thead>
              <tr style={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left py-2 pr-3">Alumno</th>
                <th className="text-left py-2 px-2">RUT</th>
                <th className="text-left py-2 px-2">Curso</th>
                {AUTORIZACIONES_IMAGEN.map(u => <th key={u.campo} className="text-left py-2 px-2" title={u.titulo}>{u.letra}. {u.titulo.split(' (')[0]}</th>)}
                <th className="text-left py-2 pl-2">Carta</th>
              </tr>
            </thead>
            <tbody>
              {alumnosFiltrados.slice(0, 500).map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                  <td className="py-2 pr-3">{a.nombre}</td>
                  <td className="py-2 px-2 whitespace-nowrap">{formatRut(a.rut, a.dv)}</td>
                  <td className="py-2 px-2 whitespace-nowrap">{a.curso}</td>
                  {AUTORIZACIONES_IMAGEN.map(u => <td key={u.campo} className="py-2 px-2"><Valor v={a[u.campo as Uso]} /></td>)}
                  <td className="py-2 pl-2 whitespace-nowrap">{a.archivada ? 'Archivada' : a.impresa ? 'Impresa' : 'Pendiente'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {alumnosFiltrados.length > 500 && (
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
              Se muestran 500 de {alumnosFiltrados.length}. Filtre por curso para ver el resto (la impresión incluye todos).
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AutorizacionesImagenStats;
