import React, { useState } from 'react';
import { Trash2, RotateCcw, X } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';

const TrashManagement: React.FC = () => {
  const confirm = useConfirm();
  const [deletedStudents] = useState([
    // Mock data
    {
      id: 1,
      rut: '12345678-9',
      name: 'Juan Pérez González',
      course: '3° Básico A',
      deletedBy: 'admin',
      deletedAt: '2024-01-15',
      reason: 'Retirado por traslado'
    }
  ]);

  const handleRestore = async (studentId: number) => {
    if (!(await confirm('¿Está seguro de que desea restaurar este estudiante?'))) {
      return;
    }
    
    try {
      // TODO: Implement restore API call
      console.log('Restoring student:', studentId);
    } catch (error) {
      console.error('Error restoring student:', error);
    }
  };

  const handlePermanentDelete = async (studentId: number) => {
    if (!(await confirm('¿Está seguro de que desea eliminar PERMANENTEMENTE este estudiante? Esta acción no se puede deshacer.'))) {
      return;
    }
    
    try {
      // TODO: Implement permanent delete API call
      console.log('Permanently deleting student:', studentId);
    } catch (error) {
      console.error('Error permanently deleting student:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <Trash2 size={32} style={{color: 'var(--color-primary)'}} />
        <h3 className="ios-title">Papelera - Estudiantes Eliminados</h3>
      </div>

      {/* Warning */}
      <div className="ios-card p-6" style={{backgroundColor: 'var(--color-error)', color: 'white'}}>
        <h4 className="font-medium mb-2">⚠️ Zona de Peligro</h4>
        <p className="ios-body">
          Los estudiantes aquí han sido eliminados suavemente. Pueden ser restaurados o eliminados permanentemente.
          La eliminación permanente no se puede deshacer.
        </p>
      </div>

      {/* Deleted Students Table */}
      <div className="ios-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-100">
                <th className="py-3 px-4 text-left text-xs font-semibold text-neutral-600 uppercase">RUT</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-neutral-600 uppercase">Nombre</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-neutral-600 uppercase">Curso</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-neutral-600 uppercase">Eliminado por</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-neutral-600 uppercase">Fecha</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-neutral-600 uppercase">Motivo</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-neutral-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {deletedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center">
                    <Trash2 size={48} className="mx-auto mb-4" style={{color: 'var(--color-text-light)'}} />
                    <p className="ios-body" style={{color: 'var(--color-text-light)'}}>
                      No hay estudiantes en la papelera
                    </p>
                  </td>
                </tr>
              ) : (
                deletedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-neutral-50">
                    <td className="py-4 px-4 text-sm font-mono">{student.rut}</td>
                    <td className="py-4 px-4 text-sm">{student.name}</td>
                    <td className="py-4 px-4 text-sm">{student.course}</td>
                    <td className="py-4 px-4 text-sm">{student.deletedBy}</td>
                    <td className="py-4 px-4 text-sm">{student.deletedAt}</td>
                    <td className="py-4 px-4 text-sm">{student.reason}</td>
                    <td className="py-4 px-4 text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleRestore(student.id)}
                          className="ios-btn ios-btn-secondary text-xs py-1 px-2"
                          title="Restaurar"
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(student.id)}
                          className="ios-btn ios-btn-danger text-xs py-1 px-2"
                          title="Eliminar permanentemente"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TrashManagement;