import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, RefreshCw, Printer, Download, CheckCircle2, XCircle, MinusCircle, X } from 'lucide-react';
import { AUTORIZACIONES_IMAGEN } from './AutorizacionImagenForm';
import { formatRut } from '../utils/rutUtils';
import { useToast } from '../context/ToastContext';

// Estadística de la autorización anual de uso de imagen (fotografías, videos, voz).
// Datos: GET /api/statistics/autorizaciones-imagen (matriculados del año vigente). Los conteos se
// calculan aquí a partir de la lista de alumnos, para que marcar una carta actualice todo al instante.

type Uso = 'autoriza_imagen_pedagogico' | 'autoriza_imagen_redes' | 'autoriza_imagen_prensa';
type EstadoClave = 'si' | 'no' | 'sin_responder';
interface AlumnoAut {
  id: number; rut: number | string; dv: string; nombre: string; curso: string; curso_clave: string;
  autoriza_imagen_pedagogico: boolean | null; autoriza_imagen_redes: boolean | null; autoriza_imagen_prensa: boolean | null;
  impresa: boolean; archivada: boolean;
}
interface CursoApi { clave: string; curso: string }
interface Datos { anio: number; cursos: CursoApi[]; alumnos: AlumnoAut[] }

type Filtro =
  | { tipo: 'uso'; campo: Uso; estado: EstadoClave }
  | { tipo: 'combinacion'; clave: string }
  | { tipo: 'carta'; estado: 'impresa' | 'archivada' | 'sin_imprimir' }
  | { tipo: 'pendientes' };

const USOS = AUTORIZACIONES_IMAGEN as { campo: Uso; letra: string; titulo: string; detalle: string }[];
const NOMBRE_CORTO: Record<Uso, string> = {
  autoriza_imagen_pedagogico: 'uso pedagógico',
  autoriza_imagen_redes: 'web y redes',
  autoriza_imagen_prensa: 'prensa e impresos',
};

// Estados con color de estado de la app + ícono + texto (nunca solo color).
const ESTADOS: { clave: EstadoClave; texto: string; color: string; Icono: typeof CheckCircle2 }[] = [
  { clave: 'si', texto: 'Autoriza', color: 'var(--color-success)', Icono: CheckCircle2 },
  { clave: 'no', texto: 'No autoriza', color: 'var(--color-error)', Icono: XCircle },
  { clave: 'sin_responder', texto: 'Sin responder', color: 'var(--color-text-light, #9ca3af)', Icono: MinusCircle },
];

const estadoDe = (v: boolean | null): EstadoClave => (v === true ? 'si' : v === false ? 'no' : 'sin_responder');
const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
const tieneRestriccion = (a: AlumnoAut) => USOS.some(({ campo }) => a[campo] !== true);
const tienePendiente = (a: AlumnoAut) => USOS.some(({ campo }) => a[campo] === null || a[campo] === undefined);
const respuestasCompletas = (a: AlumnoAut) => !tienePendiente(a);
const textoValor = (v: boolean | null) => (v === true ? 'Sí' : v === false ? 'No' : 'Sin responder');
const escapar = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

// Combinación de permisos: "pendiente" si falta alguna respuesta; si no, las letras autorizadas ("ABC", "A", "").
const combinacionDe = (a: AlumnoAut) => (tienePendiente(a) ? 'pendiente' : USOS.filter(u => a[u.campo] === true).map(u => u.letra).join(''));
const ORDEN_COMBINACIONES = ['ABC', 'AB', 'AC', 'A', 'BC', 'B', 'C', '', 'pendiente'];
const describirCombinacion = (clave: string) => {
  if (clave === 'pendiente') return { titulo: 'Algún uso sin responder', detalle: 'Falta registrar la autorización: no publicar hasta tenerla.' };
  const si = USOS.filter(u => clave.includes(u.letra));
  const no = USOS.filter(u => !clave.includes(u.letra));
  if (no.length === 0) return { titulo: 'Autoriza todo (A, B y C)', detalle: 'Sin restricciones de imagen.' };
  if (si.length === 0) return { titulo: 'No autoriza ningún uso', detalle: 'No fotografiar ni publicar en ningún medio.' };
  return {
    titulo: `Autoriza ${si.map(u => u.letra).join(' y ')} · no ${no.map(u => u.letra).join(' ni ')}`,
    detalle: `Sí: ${si.map(u => NOMBRE_CORTO[u.campo]).join(', ')}. No: ${no.map(u => NOMBRE_CORTO[u.campo]).join(', ')}.`,
  };
};

const describirFiltro = (f: Filtro): string => {
  if (f.tipo === 'uso') {
    const u = USOS.find(x => x.campo === f.campo)!;
    return `${u.letra}. ${u.titulo} — ${ESTADOS.find(e => e.clave === f.estado)!.texto}`;
  }
  if (f.tipo === 'combinacion') return describirCombinacion(f.clave).titulo;
  if (f.tipo === 'pendientes') return 'Algún uso sin responder';
  return { impresa: 'Carta impresa', archivada: 'Carta firmada y archivada', sin_imprimir: 'Sin carta impresa' }[f.estado];
};

const cumpleFiltro = (a: AlumnoAut, f: Filtro | null, soloRestringidos: boolean) => {
  if (!f) return !soloRestringidos || tieneRestriccion(a);
  if (f.tipo === 'uso') return estadoDe(a[f.campo]) === f.estado;
  if (f.tipo === 'combinacion') return combinacionDe(a) === f.clave;
  if (f.tipo === 'pendientes') return tienePendiente(a);
  if (f.estado === 'impresa') return a.impresa;
  if (f.estado === 'archivada') return a.archivada;
  return !a.impresa;
};

// Número clicable que filtra la lista de abajo.
const NumeroFiltro: React.FC<{ valor: number; onClick: () => void; titulo: string; className?: string; testid?: string }> = ({ valor, onClick, titulo, className, testid }) => (
  <button
    type="button"
    onClick={onClick}
    title={`${titulo}: ver lista`}
    data-testid={testid}
    className={`font-semibold underline decoration-dotted underline-offset-2 hover:opacity-80 ${className || ''}`}
    style={{ color: 'var(--color-text)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
  >
    {valor}
  </button>
);

const BarraEstados: React.FC<{ conteo: Record<EstadoClave, number>; total: number; etiqueta: string }> = ({ conteo, total, etiqueta }) => (
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
  const e = ESTADOS.find(x => x.clave === estadoDe(v))!;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap" style={{ color: 'var(--color-text)' }}>
      <e.Icono size={15} style={{ color: e.color }} aria-hidden="true" />
      {v === true ? 'Sí' : v === false ? 'No' : '—'}
    </span>
  );
};

const AutorizacionesImagenStats: React.FC = () => {
  const toast = useToast();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [cursoFiltro, setCursoFiltro] = useState('todos');
  const [filtro, setFiltro] = useState<Filtro | null>(null);
  const [soloRestringidos, setSoloRestringidos] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [guardandoId, setGuardandoId] = useState<number | null>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  const cargar = async () => {
    setCargando(true);
    setError('');
    try {
      const r = await fetch('/api/statistics/autorizaciones-imagen', { credentials: 'include' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || 'Error al cargar');
      setDatos({ anio: j.anio, cursos: j.cursos.map((c: CursoApi) => ({ clave: c.clave, curso: c.curso })), alumnos: j.alumnos });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  // Aplica un filtro desde un número clicable y lleva la vista a la lista.
  const verLista = (f: Filtro | null, curso = 'todos') => {
    setFiltro(f);
    setCursoFiltro(curso);
    if (f) setSoloRestringidos(false);
    setTimeout(() => listaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const resumen = useMemo(() => {
    const vacio = () => ({
      total: 0, impresas: 0, archivadas: 0, con_restriccion: 0, pendientes: 0,
      usos: Object.fromEntries(USOS.map(u => [u.campo, { si: 0, no: 0, sin_responder: 0 }])) as Record<Uso, Record<EstadoClave, number>>,
    });
    const totales = vacio();
    const porCurso = new Map<string, ReturnType<typeof vacio>>();
    const combinaciones = new Map<string, number>();
    (datos?.alumnos || []).forEach(a => {
      const destinos = [totales];
      if (!porCurso.has(a.curso_clave)) porCurso.set(a.curso_clave, vacio());
      destinos.push(porCurso.get(a.curso_clave)!);
      destinos.forEach(r => {
        r.total++;
        USOS.forEach(u => { r.usos[u.campo][estadoDe(a[u.campo])]++; });
        if (a.impresa) r.impresas++;
        if (a.archivada) r.archivadas++;
        if (tieneRestriccion(a)) r.con_restriccion++;
        if (tienePendiente(a)) r.pendientes++;
      });
      const c = combinacionDe(a);
      combinaciones.set(c, (combinaciones.get(c) || 0) + 1);
    });
    return { totales, porCurso, combinaciones };
  }, [datos]);

  const alumnosFiltrados = useMemo(() => {
    if (!datos) return [];
    const q = busqueda.trim().toLowerCase();
    return datos.alumnos.filter(a =>
      (cursoFiltro === 'todos' || a.curso_clave === cursoFiltro) &&
      cumpleFiltro(a, filtro, soloRestringidos) &&
      (!q || a.nombre.toLowerCase().includes(q) || String(a.rut).includes(q))
    );
  }, [datos, cursoFiltro, filtro, soloRestringidos, busqueda]);

  const tituloLista = () => {
    const partes = [filtro ? describirFiltro(filtro) : soloRestringidos ? 'Con alguna restricción' : 'Todos los alumnos'];
    if (cursoFiltro !== 'todos') partes.push(datos?.cursos.find(c => c.clave === cursoFiltro)?.curso || '');
    return partes.join(' · ');
  };

  const marcarCarta = async (a: AlumnoAut, archivada: boolean) => {
    setGuardandoId(a.id);
    try {
      const r = await fetch(`/api/students/${a.id}/carta-imagen`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archivada }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || j.error || 'No se pudo guardar');
      setDatos(prev => prev && { ...prev, alumnos: prev.alumnos.map(x => (x.id === a.id ? { ...x, archivada } : x)) });
      toast.success(archivada ? `Carta de ${a.nombre} marcada como recibida.` : `Se quitó la marca de carta recibida de ${a.nombre}.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGuardandoId(null);
    }
  };

  const filasExportables = () => alumnosFiltrados.map(a => [
    a.nombre, formatRut(a.rut, a.dv), a.curso, ...USOS.map(u => textoValor(a[u.campo])),
    a.archivada ? 'Archivada' : a.impresa ? 'Impresa' : 'Pendiente',
  ]);
  const encabezados = ['Alumno', 'RUT', 'Curso', ...USOS.map(u => `${u.letra}. ${u.titulo}`), 'Carta'];

  const exportarCsv = () => {
    if (!datos) return;
    const celda = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const contenido = [encabezados, ...filasExportables()].map(f => f.map(celda).join(';')).join('\r\n');
    const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `autorizaciones_imagen_${datos.anio}_${tituloLista().replace(/[^\wÀ-ÿ]+/g, '_').slice(0, 60)}.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
  };

  const imprimirLista = () => {
    if (!datos) return;
    const ventana = window.open('', '_blank', 'width=900,height=700');
    if (!ventana) {
      toast.error('Por favor, permite las ventanas emergentes para imprimir');
      return;
    }
    const filas = filasExportables().map(f => `<tr>${f.map(c => `<td>${escapar(c)}</td>`).join('')}</tr>`).join('');
    ventana.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Autorizaciones de imagen ${datos.anio}</title>
      <style>@page{size:letter;margin:12mm}body{font-family:Arial,sans-serif;font-size:11px;color:#000}
      h1{font-size:15px;margin:0 0 2px}p{margin:0 0 8px;color:#444}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #bbb;padding:4px 6px;text-align:left}th{background:#eee}</style></head><body>
      <h1>Autorización de uso de imagen — Año ${datos.anio}</h1>
      <p>${escapar(tituloLista())} · ${alumnosFiltrados.length} alumno(s) · Impreso ${new Date().toLocaleString('es-CL')}</p>
      <table><thead><tr>${encabezados.map(h => `<th>${escapar(h)}</th>`).join('')}</tr></thead>
      <tbody>${filas || `<tr><td colspan="${encabezados.length}">Sin alumnos para este filtro.</td></tr>`}</tbody></table>
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

  const { totales, porCurso, combinaciones } = resumen;
  const textoSec = { color: 'var(--color-text-secondary)' };
  const borde = { borderBottom: '1px solid var(--color-border)' };

  return (
    <div className="space-y-6" data-testid="estadistica-autorizaciones">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Camera size={32} style={{ color: 'var(--color-primary)' }} />
          <div>
            <h3 className="ios-title">Autorizaciones de uso de imagen — Año {datos.anio}</h3>
            <p className="text-sm" style={textoSec}>Fotografías, videos y registros de voz · {totales.total} alumnos matriculados</p>
          </div>
        </div>
        <button className="ios-btn ios-btn-secondary flex items-center gap-2" onClick={cargar} data-testid="autorizaciones-actualizar">
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      {/* Leyenda única */}
      <div className="flex flex-wrap gap-5 text-sm" style={textoSec}>
        {ESTADOS.map(e => (
          <span key={e.clave} className="inline-flex items-center gap-1.5">
            <e.Icono size={16} style={{ color: e.color }} aria-hidden="true" /> {e.texto}
          </span>
        ))}
        <span>· Los números subrayados abren la lista de alumnos.</span>
      </div>

      {/* Resumen por uso */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {USOS.map(({ campo, letra, titulo }) => {
          const c = totales.usos[campo];
          return (
            <div key={campo} className="ios-card p-5 space-y-3" data-testid={`resumen-${campo}`}>
              <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{letra}. {titulo}</p>
              <p style={{ color: 'var(--color-text)' }}>
                <span className="text-3xl font-bold">{pct(c.si, totales.total)}%</span>
                <span className="text-sm ml-2" style={textoSec}>autoriza ({c.si} de {totales.total})</span>
              </p>
              <BarraEstados conteo={c} total={totales.total} etiqueta={`${letra}. ${titulo}`} />
              <div className="grid grid-cols-3 gap-2 text-sm">
                {ESTADOS.map(e => (
                  <div key={e.clave}>
                    <NumeroFiltro valor={c[e.clave]} titulo={`${letra} ${e.texto}`} testid={`num-${campo}-${e.clave}`} onClick={() => verLista({ tipo: 'uso', campo, estado: e.clave })} />
                    <div style={textoSec}>{e.texto}</div>
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
          { valor: totales.pendientes, texto: 'Con algún uso sin responder', detalle: 'Faltan respuestas o la carta', f: { tipo: 'pendientes' } as Filtro },
          { valor: totales.impresas, texto: 'Cartas impresas', detalle: 'Desde el sistema', f: { tipo: 'carta', estado: 'impresa' } as Filtro },
          { valor: totales.archivadas, texto: 'Cartas firmadas y archivadas', detalle: 'Recibidas, en carpeta física', f: { tipo: 'carta', estado: 'archivada' } as Filtro },
          { valor: totales.total - totales.impresas, texto: 'Sin carta impresa', detalle: 'Pendientes de imprimir', f: { tipo: 'carta', estado: 'sin_imprimir' } as Filtro },
        ].map(t => (
          <div key={t.texto} className="ios-card p-4">
            <NumeroFiltro valor={t.valor} titulo={t.texto} className="text-2xl" onClick={() => verLista(t.f)} />
            <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{t.texto}</div>
            <div className="text-xs" style={textoSec}>{t.detalle}</div>
          </div>
        ))}
      </div>

      {/* Qué se puede hacer con cada alumno: combinaciones de permisos */}
      <div className="ios-card p-4">
        <h4 className="font-semibold" style={{ color: 'var(--color-text)' }}>Qué se puede hacer con la imagen de cada alumno</h4>
        <p className="text-xs mb-3" style={textoSec}>Para quien sube fotos al sitio web, redes o prepara el anuario. A = uso pedagógico · B = web y redes · C = prensa e impresos.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="tabla-autorizaciones-combinaciones">
            <tbody>
              {ORDEN_COMBINACIONES.filter(k => (combinaciones.get(k) || 0) > 0).map(k => {
                const d = describirCombinacion(k);
                return (
                  <tr key={k || 'ninguno'} style={{ ...borde, color: 'var(--color-text)' }}>
                    <td className="py-2 pr-3 font-medium">{d.titulo}</td>
                    <td className="py-2 px-3" style={textoSec}>{d.detalle}</td>
                    <td className="py-2 pl-3 text-right"><NumeroFiltro valor={combinaciones.get(k) || 0} titulo={d.titulo} onClick={() => verLista({ tipo: 'combinacion', clave: k })} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Desglose por curso */}
      <div className="ios-card p-4">
        <h4 className="font-semibold" style={{ color: 'var(--color-text)' }}>Por curso</h4>
        <p className="text-xs mb-3" style={textoSec}>"Pendientes" = alumnos con algún uso sin responder: las cartas que hay que ir a buscar a la sala.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="tabla-autorizaciones-cursos">
            <thead>
              <tr style={{ ...textoSec, ...borde }}>
                <th className="text-left py-2 pr-3">Curso</th>
                <th className="text-right py-2 px-2">Alumnos</th>
                <th className="text-right py-2 px-2">Pendientes</th>
                {USOS.map(u => <th key={u.campo} className="text-left py-2 px-2" title={u.titulo}>{u.letra} (sí / no / —)</th>)}
                <th className="text-right py-2 px-2">Con restricción</th>
                <th className="text-right py-2 pl-2">Archivadas</th>
              </tr>
            </thead>
            <tbody>
              {datos.cursos.map(c => {
                const r = porCurso.get(c.clave);
                if (!r) return null;
                return (
                  <tr key={c.clave} style={{ ...borde, color: 'var(--color-text)', backgroundColor: cursoFiltro === c.clave ? 'var(--color-primary-light)' : undefined }}>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <button type="button" className="font-medium underline decoration-dotted underline-offset-2" style={{ color: 'var(--color-text)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }} onClick={() => verLista(null, c.clave)} title="Ver alumnos del curso">
                        {c.curso}
                      </button>
                    </td>
                    <td className="py-2 px-2 text-right">{r.total}</td>
                    <td className="py-2 px-2 text-right"><NumeroFiltro valor={r.pendientes} titulo={`Pendientes ${c.curso}`} onClick={() => verLista({ tipo: 'pendientes' }, c.clave)} /></td>
                    {USOS.map(u => {
                      const k = r.usos[u.campo];
                      return <td key={u.campo} className="py-2 px-2 whitespace-nowrap">{k.si} / {k.no} / {k.sin_responder}</td>;
                    })}
                    <td className="py-2 px-2 text-right">{r.con_restriccion}</td>
                    <td className="py-2 pl-2 text-right">{r.archivadas}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lista de alumnos */}
      <div ref={listaRef} className="ios-card p-4 space-y-3" style={{ scrollMarginTop: '1rem' }}>
        <div className="flex flex-wrap items-end gap-3">
          <h4 className="font-semibold mr-auto" style={{ color: 'var(--color-text)' }}>Alumnos</h4>
          <select className="ios-form-input" style={{ width: 'auto' }} value={cursoFiltro} onChange={e => setCursoFiltro(e.target.value)} data-testid="autorizaciones-filtro-curso">
            <option value="todos">Todos los cursos</option>
            {datos.cursos.map(c => <option key={c.clave} value={c.clave}>{c.curso}</option>)}
          </select>
          <input className="ios-form-input" style={{ width: '14rem' }} placeholder="Buscar nombre o RUT" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          {!filtro && (
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text)' }}>
              <input type="checkbox" checked={soloRestringidos} onChange={e => setSoloRestringidos(e.target.checked)} data-testid="autorizaciones-solo-restringidos" />
              Solo con restricción
            </label>
          )}
          <button className="ios-btn ios-btn-secondary flex items-center gap-2" onClick={exportarCsv} data-testid="autorizaciones-exportar">
            <Download size={16} /> Exportar CSV
          </button>
          <button className="ios-btn ios-btn-secondary flex items-center gap-2" onClick={imprimirLista} data-testid="autorizaciones-imprimir">
            <Printer size={16} /> Imprimir lista
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm" style={textoSec}>
          <span>Mostrando: <strong style={{ color: 'var(--color-text)' }}>{tituloLista()}</strong> · {alumnosFiltrados.length} alumno(s)</span>
          {(filtro || cursoFiltro !== 'todos') && (
            <button type="button" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }} onClick={() => { setFiltro(null); setCursoFiltro('todos'); setSoloRestringidos(true); }} data-testid="autorizaciones-quitar-filtro">
              <X size={12} /> Quitar filtros
            </button>
          )}
        </div>
        <p className="text-xs" style={textoSec}>
          "Sin responder" cuenta como restricción: no hay autorización registrada. "Marcar recibida" se activa cuando las 3 respuestas están registradas (Editar → Autorizaciones).
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="tabla-autorizaciones-alumnos">
            <thead>
              <tr style={{ ...textoSec, ...borde }}>
                <th className="text-left py-2 pr-3">Alumno</th>
                <th className="text-left py-2 px-2">RUT</th>
                <th className="text-left py-2 px-2">Curso</th>
                {USOS.map(u => <th key={u.campo} className="text-left py-2 px-2" title={u.titulo}>{u.letra}. {u.titulo.split(' (')[0]}</th>)}
                <th className="text-left py-2 pl-2">Carta</th>
              </tr>
            </thead>
            <tbody>
              {alumnosFiltrados.slice(0, 500).map(a => (
                <tr key={a.id} style={{ ...borde, color: 'var(--color-text)' }}>
                  <td className="py-2 pr-3">{a.nombre}</td>
                  <td className="py-2 px-2 whitespace-nowrap">{formatRut(a.rut, a.dv)}</td>
                  <td className="py-2 px-2 whitespace-nowrap">{a.curso}</td>
                  {USOS.map(u => <td key={u.campo} className="py-2 px-2"><Valor v={a[u.campo]} /></td>)}
                  <td className="py-2 pl-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span>{a.archivada ? 'Recibida y archivada' : a.impresa ? 'Impresa' : 'Sin imprimir'}</span>
                      {a.archivada ? (
                        <button type="button" className="text-xs underline" style={{ ...textoSec, background: 'none', border: 'none', cursor: 'pointer' }} disabled={guardandoId === a.id} onClick={() => marcarCarta(a, false)} data-testid={`carta-deshacer-${a.id}`}>
                          deshacer
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="ios-btn ios-btn-secondary text-xs"
                          style={{ padding: '2px 8px' }}
                          disabled={guardandoId === a.id || !respuestasCompletas(a)}
                          title={respuestasCompletas(a) ? 'La carta firmada fue devuelta y archivada' : 'Primero registre las 3 respuestas (Editar → Autorizaciones)'}
                          onClick={() => marcarCarta(a, true)}
                          data-testid={`carta-recibida-${a.id}`}
                        >
                          Marcar recibida
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {alumnosFiltrados.length > 500 && (
            <p className="text-xs mt-2" style={textoSec}>
              Se muestran 500 de {alumnosFiltrados.length}. Filtre por curso para ver el resto (imprimir y exportar incluyen todos).
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AutorizacionesImagenStats;
