import React, { useState, useEffect, useRef } from 'react';
import DualGuardianForm from '../components/DualGuardianForm';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { ApoderadoData } from '../types';
import { useConfirm } from '../context/ConfirmContext';

interface EditGuardiansPageProps {
  studentId: string;
  onBack: () => void;
}

const EditGuardiansPage: React.FC<EditGuardiansPageProps> = ({ studentId, onBack }) => {
  const confirm = useConfirm();
  const [principalGuardian, setPrincipalGuardian] = useState<ApoderadoData | null>(null);
  const [suplenteGuardian, setSuplenteGuardian]   = useState<ApoderadoData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [loadError, setLoadError]       = useState<string | null>(null);
  const [saveError, setSaveError]       = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [principalReplaced, setPrincipalReplaced] = useState(false);
  const [suplenteReplaced,  setSuplenteReplaced]  = useState(false);

  // RUTs originales — para detectar reemplazo vs. edición del mismo apoderado
  const originalPrincipalRut = useRef<string | null>(null);
  const originalSuplenteRut  = useRef<string | null>(null);

  useEffect(() => {
    const fetchGuardians = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/students/${studentId}/apoderados`, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Error al cargar los apoderados.');

        const guardians: ApoderadoData[] = await response.json();

        const tipoDoc = (g: ApoderadoData): string => {
          if (g.rut  && String(g.rut).trim()       !== '') return 'RUT';
          if (g.dni  && String(g.dni).trim()        !== '') return 'DNI';
          if (g.pasaporte && String(g.pasaporte).trim() !== '') return 'Pasaporte';
          return 'RUT';
        };

        const isPpal = (g: ApoderadoData) =>
          typeof g.es_principal === 'number' ? g.es_principal === 1 : g.es_principal === true;

        const fetchedPrincipal = guardians.find(isPpal)  ?? null;
        const fetchedSuplente  = guardians.find(g => !isPpal(g)) ?? null;

        const principal = fetchedPrincipal
          ? { ...fetchedPrincipal, tipo_documento: tipoDoc(fetchedPrincipal) }
          : null;
        const suplente = fetchedSuplente
          ? { ...fetchedSuplente, tipo_documento: tipoDoc(fetchedSuplente) }
          : null;

        setPrincipalGuardian(principal);
        setSuplenteGuardian(suplente);
        originalPrincipalRut.current = principal?.rut ? String(principal.rut) : null;
        originalSuplenteRut.current  = suplente?.rut  ? String(suplente.rut)  : null;
      } catch (err: any) {
        setLoadError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchGuardians();
  }, [studentId]);

  // ─── Búsqueda de apoderado por RUT ────────────────────────────────────────
  const searchGuardianByRut = async (
    rut: string | undefined,
    type: 'principal' | 'suplente'
  ): Promise<{ found: boolean; message: string } | undefined> => {

    if (!rut || String(rut).trim() === '') {
      return { found: false, message: 'Ingrese un RUT antes de buscar.' };
    }

    const originalRut = type === 'principal'
      ? originalPrincipalRut.current
      : originalSuplenteRut.current;
    const isReplacement = originalRut !== null && String(rut) !== originalRut;

    try {
      const response = await fetch(`/api/guardians/check/${rut}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      // ── 404: persona no existe en la BD ──────────────────────────────────
      if (response.status === 404) {
        const currentDv = type === 'principal'
          ? principalGuardian?.dv
          : suplenteGuardian?.dv;

        const empty: ApoderadoData = {
          rut,
          dv: currentDv || '',
          nombre: '', apellido_paterno: '', apellido_materno: '',
          parentesco: '', fecha_nacimiento: '', genero: '',
          nacionalidad: 'Chilena', celular: '', email: '',
          direccion: '', complemento_direccion: '', region: '', comuna: '',
          tipo_documento: 'RUT',
          es_principal: type === 'principal',
          es_suplente:  type === 'suplente',
        };

        if (type === 'principal') {
          setPrincipalGuardian(empty);
          setPrincipalReplaced(isReplacement);
        } else {
          setSuplenteGuardian(empty);
          setSuplenteReplaced(isReplacement);
        }

        return {
          found: false,
          message: isReplacement
            ? 'RUT no registrado. Complete los datos para ingresar un nuevo apoderado.'
            : 'RUT no encontrado en el sistema. Complete los datos para registrarlo.',
        };
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        return { found: false, message: errData.message || 'Error al buscar el apoderado.' };
      }

      // ── 200: persona encontrada ───────────────────────────────────────────
      const found: ApoderadoData = await response.json();

      if (isReplacement) {
        const nombre = [found.nombre, found.apellido_paterno, found.apellido_materno]
          .filter(Boolean).join(' ');
        const label = type === 'principal' ? 'principal' : 'suplente';
        const confirmed = (await confirm(
          `Se encontró a ${nombre} en el sistema.\n\n` +
          `¿Desea reemplazar al apoderado ${label} actual por esta persona?\n\n` +
          `El apoderado anterior no será eliminado de la base de datos.`
        ));
        if (!confirmed) return undefined; // usuario canceló — no tocar el formulario
      }

      // Poblar formulario; excluir campos de relación (son por vínculo, no por persona)
      const {
        tipo_relacion: _tr, parentesco: _p,
        es_principal: _ep, es_suplente: _es, orden: _o,
        ...base
      } = found as any;

      const populated: ApoderadoData = {
        ...base,
        parentesco:     '',   // el usuario debe confirmar el parentesco en el nuevo vínculo
        tipo_documento: found.rut ? 'RUT' : found.dni ? 'DNI' : 'Pasaporte',
        es_principal:   type === 'principal',
        es_suplente:    type === 'suplente',
      };

      if (type === 'principal') {
        setPrincipalGuardian(populated);
        setPrincipalReplaced(isReplacement);
      } else {
        setSuplenteGuardian(populated);
        setSuplenteReplaced(isReplacement);
      }

      return { found: true, message: '' };

    } catch {
      return { found: false, message: 'Error de conexión al buscar el apoderado.' };
    }
  };

  const handleSearchPrincipal = (rut?: string) => searchGuardianByRut(rut, 'principal');
  const handleSearchSuplente  = (rut?: string) => searchGuardianByRut(rut, 'suplente');

  // ─── Guardar ──────────────────────────────────────────────────────────────
  const handleSaveGuardians = async () => {
    setSaving(true);
    setSaveError(null);
    setSuccessMessage(null);

    const guardiansToSave: ApoderadoData[] = [];
    if (principalGuardian) {
      guardiansToSave.push({ ...principalGuardian, es_principal: true, es_suplente: false });
    }
    if (suplenteGuardian) {
      guardiansToSave.push({ ...suplenteGuardian, es_principal: false, es_suplente: true });
    }

    try {
      const response = await fetch(`/api/students/${studentId}/guardians`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ guardians: guardiansToSave }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al guardar los apoderados.');
      }

      setSuccessMessage('✅ Apoderados guardados correctamente.');
      setPrincipalReplaced(false);
      setSuplenteReplaced(false);
      setTimeout(() => onBack(), 1500);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="ios-card p-8 text-center">
        <Loader2 size={48} className="mx-auto mb-4 animate-spin" style={{ color: 'var(--color-primary)' }} />
        <p className="ios-title">Cargando apoderados...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="ios-card p-8 text-center" style={{ backgroundColor: 'var(--color-error-light)' }}>
        <p className="ios-title" style={{ color: 'var(--color-error)' }}>Error: {loadError}</p>
        <button onClick={onBack} className="ios-btn ios-btn-secondary mt-4">
          <ArrowLeft size={16} className="mr-2" /> Volver
        </button>
      </div>
    );
  }

  const replacedLabels = [
    principalReplaced && 'apoderado principal',
    suplenteReplaced  && 'apoderado suplente',
  ].filter(Boolean).join(' y ');

  return (
    <div className="max-w-5xl mx-auto p-10 ios-card mt-10">
      {/* Cabecera */}
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="ios-btn ios-btn-secondary mr-4">
          <ArrowLeft size={16} className="mr-2" /> Volver
        </button>
        <h2 className="ios-title-large" style={{ color: 'var(--color-foreground)' }}>
          Editar Apoderados
        </h2>
      </div>

      {/* Banner de reemplazo pendiente */}
      {(principalReplaced || suplenteReplaced) && (
        <div className="ios-card p-4 mb-4" style={{
          backgroundColor: 'var(--color-warning-light)',
          borderLeft: '4px solid var(--color-warning)'
        }}>
          <p className="ios-body" style={{ color: 'var(--color-warning)' }}>
            ⚠️ El {replacedLabels} será reemplazado al guardar.
            El apoderado anterior no se elimina de la base de datos.
          </p>
        </div>
      )}

      {/* Error al guardar */}
      {saveError && (
        <div className="ios-card p-4 mb-4" style={{
          backgroundColor: 'var(--color-error-light)',
          borderLeft: '4px solid var(--color-error)'
        }}>
          <p className="ios-body" style={{ color: 'var(--color-error)' }}>❌ {saveError}</p>
        </div>
      )}

      {/* Confirmación de guardado */}
      {successMessage && (
        <div className="ios-card p-4 mb-4" style={{
          backgroundColor: 'var(--color-success-light)',
          borderLeft: '4px solid var(--color-success)'
        }}>
          <p className="ios-body" style={{ color: 'var(--color-success)' }}>{successMessage}</p>
        </div>
      )}

      <DualGuardianForm
        principalGuardian={principalGuardian ?? {
          nombre: '', apellido_paterno: '', apellido_materno: '',
          parentesco: '', direccion: '', region: '', comuna: '',
          celular: '', es_principal: true,
        }}
        suplenteGuardian={suplenteGuardian ?? {
          nombre: '', apellido_paterno: '', apellido_materno: '',
          parentesco: '', direccion: '', region: '', comuna: '',
          celular: '', es_suplente: true,
        }}
        onPrincipalChange={(g: ApoderadoData) => setPrincipalGuardian(g)}
        onSuplenteChange={(g: ApoderadoData)  => setSuplenteGuardian(g)}
        onSearchPrincipal={handleSearchPrincipal}
        onSearchSuplente={handleSearchSuplente}
        missingFields={{}}
      />

      <div className="mt-10 flex justify-end">
        <button
          onClick={handleSaveGuardians}
          className="ios-btn ios-btn-primary"
          disabled={saving}
        >
          {saving
            ? <><Loader2 size={20} className="animate-spin mr-2" />Guardando...</>
            : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
};

export default EditGuardiansPage;
