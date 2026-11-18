import React, { useState, useEffect } from 'react';
import { GraduationCap, Search, Eye, Trash2, FileText, Download, List, Loader2, UserX, BookOpen, User, Users, Heart } from 'lucide-react';
import { formatBirthDate, formatDateTime } from '../utils/dateUtils';
import PDFReceipt from './PDFReceipt';
import EditStudentModal from './EditStudentModal';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

interface Student {
  id: number;
  rut: number;
  dv: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  // Información legacy (mantener compatibilidad)
  curso_base: string;
  letra: string;
  // Información normalizada del curso
  curso?: {
    id: number;
    codigo: string;
    nombre_completo: string;
    nivel_educativo: string;
    grado: string;
    letra: string;
    capacidad_maxima: number;
    alumnos_matriculados: number;
    cupos_disponibles: number;
  };
  estado: string;
  creado_en: string;
  creado_por: string;
  actualizado_por?: string;
  fecha_nacimiento?: string;
}

interface StudentListProps {
  onStudentSelect?: (student: any) => void;
  onEditStudent?: (studentId: string) => void;
  onEditAcademicInfo?: (studentId: string) => void;
  onEditStudentData?: (studentId: string) => void;
  onEditNEE?: (studentId: string) => void;
  onViewReceipt?: (studentId: string) => void;
}

const StudentList: React.FC<StudentListProps> = ({ onEditStudent, onEditAcademicInfo, onEditStudentData, onEditNEE, onViewReceipt }) => {
  const toast = useToast();
  const confirm = useConfirm();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterNivelEducativo, setFilterNivelEducativo] = useState('');
  const [filterGrado, setFilterGrado] = useState('');
  const [filterLetra, setFilterLetra] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [isGeneratingList, setIsGeneratingList] = useState(false);
  const [showRetireModal, setShowRetireModal] = useState(false);
  const [studentToRetire, setStudentToRetire] = useState<Student | null>(null);
  const [retireDate, setRetireDate] = useState('');
  const [retireObservation, setRetireObservation] = useState('');
  
  // Estados para el comprobante
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptStudentData, setReceiptStudentData] = useState<any>(null);
  
  // Estados para el modal de edición
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);

  // Estado para el menú desplegable de edición
  const [openEditMenu, setOpenEditMenu] = useState<number | null>(null);

  // Sección inicial del modal de edición
  const [editSection, setEditSection] = useState<'student' | 'guardians' | 'academic' | 'nee'>('student');

  useEffect(() => {
    const initializeData = async () => {
      await fetchUserData();
      await fetchStudents();
    };
    initializeData();
  }, []);

  // Cerrar menú de edición al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openEditMenu !== null) {
        const target = event.target as HTMLElement;
        if (!target.closest('.relative')) {
          setOpenEditMenu(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openEditMenu]);

  const fetchUserData = async () => {
    try {
      // Validar token y obtener información del usuario
      const response = await fetch('/api/auth/validate-token', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const userRole = data.user.rol;
        setUserRole(userRole);
      }
    } catch (error) {
      console.error('Error al obtener datos del usuario:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar estudiantes');
      }

      const data = await response.json();
      setStudents(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (studentId: number) => {
    const confirmed = await confirm({
      title: 'Enviar a la papelera',
      message: '¿Está seguro de que desea enviar este estudiante a la papelera?',
      confirmText: 'Enviar a la papelera',
      danger: true
    });
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          motivo: 'Eliminado desde panel administrativo'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar estudiante');
      }

      // Recargar la lista de estudiantes
      fetchStudents();
      toast.success('Estudiante enviado a la papelera correctamente');
    } catch (err: any) {
      setError(err.message);
      toast.error('Error: ' + err.message);
    }
  };

  const handleRetireStudent = (student: Student) => {
    setStudentToRetire(student);
    setRetireDate('');
    setRetireObservation('');
    setShowRetireModal(true);
  };

  const handleConfirmRetire = async () => {
    if (!studentToRetire || !retireDate || !retireObservation.trim()) {
      toast.error('Por favor, complete la fecha de retiro y la observación.');
      return;
    }

    try {
      const response = await fetch(`/api/students/${studentToRetire.id}/retire`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fecha_retiro: retireDate,
          observacion_retiro: retireObservation
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cambiar estudiante a retirado');
      }

      // Cerrar modal y recargar lista
      setShowRetireModal(false);
      setStudentToRetire(null);
      setRetireDate('');
      setRetireObservation('');
      fetchStudents();
      toast.success('Estudiante cambiado a estado Retirado correctamente');
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  const handleCancelRetire = () => {
    setShowRetireModal(false);
    setStudentToRetire(null);
    setRetireDate('');
    setRetireObservation('');
  };

  const handleViewStudent = async (studentId: number) => {
    try {
      // Obtener datos del estudiante usando cookies httpOnly
      const studentResponse = await fetch(`/api/students/${studentId}`, {
        credentials: 'include'
      });

      if (!studentResponse.ok) {
        throw new Error('Error al obtener datos del estudiante');
      }

      const studentData = await studentResponse.json();
      
      // Obtener datos de los apoderados usando cookies httpOnly
      const guardiansResponse = await fetch(`/api/students/${studentId}/apoderados`, {
        credentials: 'include'
      });
      
      let guardians = [];
      if (guardiansResponse.ok) {
        guardians = await guardiansResponse.json();
      }

      // ✅ FIX: Separar apoderado principal y suplente usando tipo_relacion u orden
      const principalGuardian = guardians.find((g: any) =>
        g.tipo_relacion === 'principal' || g.orden === 1 || g.es_principal === true
      );
      const secondaryGuardian = guardians.find((g: any) =>
        g.tipo_relacion === 'suplente' || g.orden === 2 || g.es_suplente === true
      );

      // Función helper para generar lista de NEE activos - MODELO REFACTORIZADO
      const getNEEList = (student: any) => {
        // Usar el nuevo modelo relacional (array de objetos TipoNee)
        const nees = Array.isArray(student.nees) ? student.nees : [];

        if (nees.length === 0) {
          return '<p style="color: #666; font-size: 13px; margin: 0;">No se han registrado necesidades educativas especiales.</p>';
        }

        // Agrupar NEE por categoría
        const neesByCategory: { [key: string]: any[] } = {};
        nees.forEach((nee: any) => {
          const categoria = nee.categoria || 'Otras';
          if (!neesByCategory[categoria]) {
            neesByCategory[categoria] = [];
          }
          neesByCategory[categoria].push(nee);
        });

        // Renderizar categorías en una sola columna
        let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';

        Object.keys(neesByCategory).forEach(categoria => {
          const neesInCategory = neesByCategory[categoria];
          html += `
            <div style="margin-bottom: 10px;">
              <h5 style="color: #2A9D8F; font-size: 13px; font-weight: 600; margin: 0 0 6px 0;">${categoria}</h5>
              <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6;">
                ${neesInCategory.map((nee: any) => `<li>${nee.descripcion}</li>`).join('')}
              </ul>
            </div>
          `;
        });

        html += '</div>';

        // Mantener soporte para observaciones NEE (si existen en el modelo legacy)
        if (student.nee_observaciones) {
          html += `
            <div style="margin-top: 12px; padding: 10px; background: #fff3cd; border-radius: 6px; border-left: 3px solid #ffc107;">
              <h5 style="color: #856404; font-size: 12px; font-weight: 600; margin: 0 0 6px 0;">Observaciones NEE:</h5>
              <p style="color: #856404; font-size: 12px; margin: 0; line-height: 1.4;">${student.nee_observaciones}</p>
            </div>
          `;
        }

        return html;
      };

      // Crear modal con información detallada del estudiante
      // Crear modal HTML personalizado responsivo
      const modalHtml = `
        <div id="studentDetailsModal" style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
          padding: 10px;
          overflow-y: auto;
        ">
          <div style="
            background: white;
            border-radius: 10px;
            width: 100%;
            max-width: 1600px;
            max-height: calc(100vh - 20px);
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            position: relative;
            margin: auto;
          ">
            <div style="
              background: linear-gradient(135deg, #2A9D8F, #264653);
              color: white;
              padding: 12px 16px;
              border-radius: 10px 10px 0 0;
              position: sticky;
              top: 0;
              z-index: 10;
              display: flex;
              align-items: center;
              justify-content: space-between;
            ">
              <h2 style="margin: 0; font-size: 18px; font-weight: 600;">📋 Detalles del Estudiante</h2>
              <button onclick="document.getElementById('studentDetailsModal').remove()" style="
                background: rgba(255, 255, 255, 0.2);
                border: none;
                border-radius: 50%;
                width: 28px;
                height: 28px;
                color: white;
                cursor: pointer;
                font-size: 18px;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
              ">×</button>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 14px; padding: 16px;">

              <!-- Columna 1: DATOS DEL ESTUDIANTE -->
              <div style="background: #f8f9fa; border-radius: 8px; padding: 16px;">
                <h3 style="color: #2A9D8F; font-size: 16px; margin: 0 0 12px 0; font-weight: 600; border-bottom: 2px solid #2A9D8F; padding-bottom: 6px;">👤 DATOS DEL ESTUDIANTE</h3>

                <!-- Datos Personales -->
                <div style="margin-bottom: 12px;">
                  <h4 style="color: #264653; font-size: 13px; font-weight: 600; margin: 0 0 6px 0; text-transform: uppercase;">Datos Personales</h4>
                  <div style="font-size: 14px; line-height: 1.5; color: #333;">
                    <div><strong>RUT:</strong> ${studentData.rut}-${studentData.dv}</div>
                    <div><strong>Nombres:</strong> ${studentData.nombres || 'No especificado'}</div>
                    <div><strong>Apellidos:</strong> ${studentData.apellido_paterno || ''} ${studentData.apellido_materno || ''}</div>
                    <div><strong>Fecha Nac.:</strong> ${formatBirthDate(studentData.fecha_nacimiento)}</div>
                    <div><strong>Género:</strong> ${studentData.genero || 'No especificado'}</div>
                    <div><strong>Nacionalidad:</strong> ${studentData.nacionalidad || 'No especificada'}</div>
                  </div>
                </div>

                <!-- Contacto -->
                <div style="margin-bottom: 12px;">
                  <h4 style="color: #264653; font-size: 13px; font-weight: 600; margin: 0 0 6px 0; text-transform: uppercase;">Contacto</h4>
                  <div style="font-size: 14px; line-height: 1.5; color: #333;">
                    <div><strong>Dirección:</strong> ${studentData.direccion || 'No especificada'}</div>
                    <div><strong>Comuna:</strong> ${studentData.comuna || 'No especificada'}</div>
                    <div><strong>Región:</strong> ${studentData.region || 'No especificada'}</div>
                    <div><strong>Teléfono:</strong> ${studentData.telefono || 'No especificado'}</div>
                  </div>
                </div>

                <!-- Información Académica -->
                <div>
                  <h4 style="color: #264653; font-size: 13px; font-weight: 600; margin: 0 0 6px 0; text-transform: uppercase;">Información Académica</h4>
                  <div style="font-size: 14px; line-height: 1.5; color: #333;">
                    <div><strong>Curso:</strong> ${studentData.curso ? studentData.curso.nombre_completo : `${studentData.curso_base || 'No asignado'} ${studentData.letra || ''}`}</div>
                    <div><strong>Estado:</strong> ${studentData.estado_matricula || studentData.estado || 'No definido'}</div>
                    <div><strong>Religión:</strong> ${studentData.tipo_religion || 'No especificada'}</div>
                    <div><strong>PIE:</strong> ${studentData.pie ? 'Sí' : 'No'}</div>
                    <div><strong>Beca:</strong> ${studentData.beca ? (studentData.tipo_beca || 'Sí') : 'No'}</div>
                  </div>
                </div>

                <!-- Observaciones y metadata -->
                <div style="margin-top: 12px; padding: 10px; background: #e8f5f2; border-radius: 6px; border-left: 3px solid #2A9D8F;">
                  <h4 style="color: #264653; font-size: 12px; font-weight: 600; margin: 0 0 6px 0; text-transform: uppercase;">Observaciones</h4>
                  <div style="font-size: 13px; line-height: 1.4; color: #333;">
                    <div><strong>Estudiante:</strong> ${studentData.observaciones || 'Sin observaciones'}</div>
                    <div><strong>Matriculador:</strong> ${studentData.observaciones_matriculador || 'Sin observaciones'}</div>
                  </div>
                </div>

                <div style="margin-top: 10px; padding: 8px; background: #f0f0f0; border-radius: 6px; font-size: 12px; color: #666;">
                  <div><strong>Creado:</strong> ${formatDateTime(studentData.creado_en)}</div>
                  <div><strong>Por:</strong> ${studentData.creado_por || 'No especificado'}</div>
                </div>
              </div>

              <!-- Columna 2: APODERADOS -->
              <div style="background: #f8f9fa; border-radius: 8px; padding: 16px;">
                <h3 style="color: #2A9D8F; font-size: 16px; margin: 0 0 12px 0; font-weight: 600; border-bottom: 2px solid #2A9D8F; padding-bottom: 6px;">👨‍👩‍👧‍👦 APODERADOS</h3>

                <!-- Apoderado Principal -->
                <div style="margin-bottom: 14px;">
                  <h4 style="color: #264653; font-size: 13px; font-weight: 600; margin: 0 0 6px 0; text-transform: uppercase;">Apoderado Principal</h4>
                  <div style="font-size: 14px; line-height: 1.5; color: #333;">
                    ${principalGuardian ? `
                      <div><strong>RUT:</strong> ${principalGuardian.rut}-${principalGuardian.dv}</div>
                      <div><strong>Nombre:</strong> ${principalGuardian.nombre} ${principalGuardian.apellido_paterno} ${principalGuardian.apellido_materno}</div>
                      <div><strong>Parentesco:</strong> ${principalGuardian.parentesco}</div>
                      <div><strong>Teléfono:</strong> ${principalGuardian.celular || 'No especificado'}</div>
                      <div><strong>Email:</strong> ${principalGuardian.email || 'No especificado'}</div>
                      <div><strong>Dirección:</strong> ${principalGuardian.direccion || 'No especificada'}</div>
                    ` : '<div style="color: #999; font-style: italic;">No registrado</div>'}
                  </div>
                </div>

                <!-- Apoderado Suplente -->
                <div>
                  <h4 style="color: #264653; font-size: 13px; font-weight: 600; margin: 0 0 6px 0; text-transform: uppercase;">Apoderado Suplente</h4>
                  <div style="font-size: 14px; line-height: 1.5; color: #333;">
                    ${secondaryGuardian ? `
                      <div><strong>RUT:</strong> ${secondaryGuardian.rut}-${secondaryGuardian.dv}</div>
                      <div><strong>Nombre:</strong> ${secondaryGuardian.nombre} ${secondaryGuardian.apellido_paterno} ${secondaryGuardian.apellido_materno}</div>
                      <div><strong>Parentesco:</strong> ${secondaryGuardian.parentesco}</div>
                      <div><strong>Teléfono:</strong> ${secondaryGuardian.celular || 'No especificado'}</div>
                      <div><strong>Email:</strong> ${secondaryGuardian.email || 'No especificado'}</div>
                      <div><strong>Dirección:</strong> ${secondaryGuardian.direccion || 'No especificada'}</div>
                    ` : '<div style="color: #999; font-style: italic;">No registrado</div>'}
                  </div>
                </div>
              </div>

              <!-- Columna 3: NEE -->
              <div style="background: #f8f9fa; border-radius: 8px; padding: 16px;">
                <h3 style="color: #2A9D8F; font-size: 16px; margin: 0 0 12px 0; font-weight: 600; border-bottom: 2px solid #2A9D8F; padding-bottom: 6px;">💙 NEE</h3>
                ${getNEEList(studentData)}
              </div>
            </div>
          </div>
        </div>
      `;

      // Agregar modal al DOM
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = modalHtml;
      document.body.appendChild(modalContainer);

      // Cleanup al hacer clic fuera del modal
      const modal = document.getElementById('studentDetailsModal');
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            modal.remove();
          }
        });
      }
    } catch (err: any) {
      console.error('Error viewing student:', err);
      toast.error('Error al obtener datos del estudiante: ' + err.message);
    }
  };

  const handleShowReceipt = async (studentId: number) => {
    try {
      const studentResponse = await fetch(`/api/students/${studentId}`, {
        credentials: 'include'
      });

      if (!studentResponse.ok) {
        throw new Error('Error al obtener datos del estudiante');
      }

      const studentData = await studentResponse.json();

      const guardiansResponse = await fetch(`/api/students/${studentId}/apoderados`, {
        credentials: 'include'
      });

      let apoderados = [];
      if (guardiansResponse.ok) {
        apoderados = await guardiansResponse.json();
      }

      const fullStudentData = {
        ...studentData,
        apoderados: apoderados
      };

      setReceiptStudentData(fullStudentData);
      setShowReceipt(true);
    } catch (err: any) {
      console.error('Error al obtener datos del estudiante:', err);
      toast.error('Error al cargar el comprobante: ' + err.message);
    }
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setReceiptStudentData(null);
  };


  const handleViewReceipt = (studentId: number) => {
    if (onViewReceipt) {
      onViewReceipt(studentId.toString());
    } else {
      handleShowReceipt(studentId);
    }
  };

  const openEditModal = (studentId: number, section: 'student' | 'guardians' | 'academic' | 'nee') => {
    setEditSection(section);
    setEditingStudentId(studentId);
    setShowEditModal(true);
  };

  const handleEditStudentData = (studentId: number) => {
    if (onEditStudentData) {
      onEditStudentData(studentId.toString());
    } else {
      openEditModal(studentId, 'student');
    }
  };

  const handleEditStudent = (studentId: number) => {
    if (onEditStudent) {
      onEditStudent(studentId.toString());
    } else {
      openEditModal(studentId, 'guardians');
    }
  };

  const handleEditAcademicInfo = (studentId: number) => {
    if (onEditAcademicInfo) {
      onEditAcademicInfo(studentId.toString());
    } else {
      openEditModal(studentId, 'academic');
    }
  };

  const handleEditNEE = (studentId: number) => {
    if (onEditNEE) {
      onEditNEE(studentId.toString());
    } else {
      openEditModal(studentId, 'nee');
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingStudentId(null);
    fetchStudents();
  };

  const handleUpdateStudent = () => {
    fetchStudents();
  };

  const generateFullList = async () => {
    if (filteredStudents.length === 0) {
      toast.info('No hay estudiantes para generar la lista');
      return;
    }

    setIsGeneratingList(true);

    try {
      // Create a new jsPDF instance
      const jsPDF = (await import('jspdf')).default;
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Add title
      pdf.setFontSize(16);
      pdf.text('Lista Completa de Estudiantes', 105, 15, { align: 'center' });

      // Add date
      pdf.setFontSize(10);
      pdf.text(`Generado: ${new Date().toLocaleDateString()}`, 105, 22, { align: 'center' });

      // Table headers
      let y = 35;
      pdf.setFontSize(12);
      pdf.text('RUT', 10, y);
      pdf.text('Nombre', 45, y);
      pdf.text('Curso', 120, y);
      pdf.text('Estado', 160, y);

      y += 8;

      // Table content
      pdf.setFontSize(10);
      for (const student of filteredStudents) {
        if (y > 280) {
          pdf.addPage();
          y = 15;
        }

        const rutDv = `${student.rut}-${student.dv}`;
        const nombre = `${student.nombres} ${student.apellido_paterno} ${student.apellido_materno}`;
        const curso = student.curso ? student.curso.nombre_completo : `${student.curso_base} ${student.letra}`;
        const estado = student.estado;

        pdf.text(rutDv, 10, y);
        pdf.text(nombre.substring(0, 40), 45, y);
        pdf.text(curso, 120, y);
        pdf.text(estado, 160, y);

        y += 7;
      }

      // Save the PDF
      pdf.save(`Lista_Estudiantes_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el PDF');
    } finally {
      setIsGeneratingList(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    // Filter by search term
    if (searchTerm && !`${student.nombres} ${student.apellido_paterno} ${student.apellido_materno} ${student.rut}`.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Filter by course if filtering is enabled
    const studentCourseCode = student.curso ? student.curso.codigo : `${student.curso_base}-${student.letra}`;
    if (filterCourse && studentCourseCode !== filterCourse) {
      return false;
    }

    // Filter by status if filtering is enabled
    if (filterStatus && student.estado !== filterStatus) {
      return false;
    }

    // Filter by nivel educativo
    if (filterNivelEducativo && student.curso?.nivel_educativo !== filterNivelEducativo) {
      return false;
    }

    // Filter by grado
    if (filterGrado && student.curso?.grado !== filterGrado) {
      return false;
    }

    // Filter by letra
    const studentLetra = student.curso?.letra || student.letra;
    if (filterLetra && studentLetra !== filterLetra) {
      return false;
    }

    // Filtrado por curso se maneja en el backend para profesores
    return true;
  });

  // Get unique courses and states for filters
  const uniqueCourses = Array.from(new Set(students.map(s => s.curso ? s.curso.codigo : `${s.curso_base}-${s.letra}`))).sort();
  const uniqueStates = Array.from(new Set(students.map(s => s.estado))).sort();
  const uniqueNivelesEducativos = Array.from(new Set(students.map(s => s.curso?.nivel_educativo).filter(Boolean))).sort();
  const uniqueGrados = Array.from(new Set(students.map(s => s.curso?.grado).filter(Boolean))).sort();
  const uniqueLetras = Array.from(new Set(students.map(s => s.curso?.letra || s.letra).filter(Boolean))).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin" size={48} style={{color: 'var(--color-primary)'}} />
        <span className="ml-4 ios-title">Cargando estudiantes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ios-card p-6">
        <p className="ios-body" style={{color: 'var(--color-error)'}}>{error}</p>
      </div>
    );
  }

  if (showReceipt && receiptStudentData) {
    return (
      <PDFReceipt
        student={receiptStudentData}
        onBackToHome={handleCloseReceipt}
      />
    );
  }

  return (
    <div className="ios-form-section">
      <div className="mb-6">
        <h2 className="ios-title-large mb-2">
          {userRole === 'profesor' ? 'Mis Estudiantes' : 'Lista de Estudiantes'}
        </h2>
        <p className="ios-caption" style={{color: 'var(--color-text-light)'}}>
          Total: {filteredStudents.length} estudiante{filteredStudents.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="ios-card p-6 mb-6">
        <div className="ios-grid ios-grid-3 mb-4">
          <div>
            <label className="ios-form-label">
              <Search size={16} className="inline mr-2" />
              Buscar
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nombre o RUT..."
              className="ios-form-input"
            />
          </div>
          <div>
            <label className="ios-form-label">
              <GraduationCap size={16} className="inline mr-2" />
              Curso
            </label>
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="ios-form-input"
            >
              <option value="">Todos los cursos</option>
              {uniqueCourses.map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="ios-form-label">
              <List size={16} className="inline mr-2" />
              Estado
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="ios-form-input"
            >
              <option value="">Todos los estados</option>
              {uniqueStates.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Nuevos filtros: Nivel Educativo, Grado, Letra */}
        <div className="ios-grid ios-grid-3">
          <div>
            <label className="ios-form-label">
              <BookOpen size={16} className="inline mr-2" />
              Nivel Educativo
            </label>
            <select
              value={filterNivelEducativo}
              onChange={(e) => setFilterNivelEducativo(e.target.value)}
              className="ios-form-input"
            >
              <option value="">Todos los niveles</option>
              {uniqueNivelesEducativos.map(nivel => (
                <option key={nivel} value={nivel}>{nivel}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="ios-form-label">
              <GraduationCap size={16} className="inline mr-2" />
              Grado
            </label>
            <select
              value={filterGrado}
              onChange={(e) => setFilterGrado(e.target.value)}
              className="ios-form-input"
            >
              <option value="">Todos los grados</option>
              {uniqueGrados.map(grado => (
                <option key={grado} value={grado}>{grado}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="ios-form-label">
              <List size={16} className="inline mr-2" />
              Letra
            </label>
            <select
              value={filterLetra}
              onChange={(e) => setFilterLetra(e.target.value)}
              className="ios-form-input"
            >
              <option value="">Todas las letras</option>
              {uniqueLetras.map(letra => (
                <option key={letra} value={letra}>{letra}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={generateFullList}
            disabled={isGeneratingList || filteredStudents.length === 0}
            className="ios-btn ios-btn-secondary flex items-center space-x-2"
          >
            {isGeneratingList ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Descargar Lista PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="ios-card">
        {error && (
          <div className="p-4" style={{backgroundColor: 'var(--color-error)', color: 'white'}}>
            <p className="ios-body">{error}</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{backgroundColor: 'var(--color-card)'}}>
                <th className="py-4 px-4 text-left ios-caption font-semibold uppercase tracking-wider border-b" style={{color: 'var(--color-text-light)', borderColor: 'var(--color-border)'}}>RUT</th>
                <th className="py-4 px-4 text-left ios-caption font-semibold uppercase tracking-wider border-b" style={{color: 'var(--color-text-light)', borderColor: 'var(--color-border)'}}>Nombre Completo</th>
                <th className="py-4 px-4 text-left ios-caption font-semibold uppercase tracking-wider border-b" style={{color: 'var(--color-text-light)', borderColor: 'var(--color-border)'}}>Curso</th>
                <th className="py-4 px-4 text-left ios-caption font-semibold uppercase tracking-wider border-b" style={{color: 'var(--color-text-light)', borderColor: 'var(--color-border)'}}>Estado</th>
                <th className="py-4 px-4 text-left ios-caption font-semibold uppercase tracking-wider border-b" style={{color: 'var(--color-text-light)', borderColor: 'var(--color-border)'}}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center">
                    <GraduationCap size={48} className="mx-auto mb-4" style={{color: 'var(--color-text-light)'}} />
                    <p className="ios-body" style={{color: 'var(--color-text-light)'}}>
                      No se encontraron estudiantes con los filtros aplicados
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-opacity-50 border-b" style={{borderColor: 'var(--color-border)'}}>
                    <td className="py-4 px-4 ios-body font-mono" style={{color: 'var(--color-foreground)'}}>
                      {student.rut}-{student.dv}
                    </td>
                    <td className="py-4 px-4 ios-body" style={{color: 'var(--color-foreground)'}}>
                      {student.nombres} {student.apellido_paterno} {student.apellido_materno}
                    </td>
                    <td className="py-4 px-4 ios-body" style={{color: 'var(--color-foreground)'}}>
                      {student.curso ? student.curso.nombre_completo : `${student.curso_base} ${student.letra}`}
                    </td>
                    <td className="py-4 px-4 ios-body">
                      <span
                        className="px-3 py-1 ios-caption font-semibold rounded-full text-white cursor-help"
                        style={{
                          backgroundColor:
                            student.estado === 'matriculado' ? 'var(--color-success)' :
                            student.estado?.toLowerCase() === 'retirado' ? 'var(--color-warning)' :
                            'var(--color-error)'
                        }}
                        title={`Matriculado por: ${student.actualizado_por || student.creado_por || 'No disponible'}`}
                      >
                        {student.estado}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewStudent(student.id)}
                          className="ios-btn ios-btn-secondary text-xs py-2 px-2.5 flex items-center justify-center"
                          title="Ver detalles completos"
                        >
                          <Eye size={16} />
                        </button>
                        {userRole !== 'sololectura' && (
                          <>
                            <button
                              onClick={() => handleEditStudentData(student.id)}
                              className="ios-btn ios-btn-secondary text-xs py-2 px-2.5 flex items-center justify-center"
                              title="Editar Datos del Estudiante"
                            >
                              <User size={16} />
                            </button>
                            <button
                              onClick={() => handleEditStudent(student.id)}
                              className="ios-btn ios-btn-secondary text-xs py-2 px-2.5 flex items-center justify-center"
                              title="Editar Apoderados"
                            >
                              <Users size={16} />
                            </button>
                            {(userRole === 'inspector' || userRole === 'administrador') && (
                              <button
                                onClick={() => handleEditAcademicInfo(student.id)}
                                className="ios-btn ios-btn-secondary text-xs py-2 px-2.5 flex items-center justify-center"
                                title="Editar Datos Académicos"
                              >
                                <BookOpen size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleEditNEE(student.id)}
                              className="ios-btn ios-btn-secondary text-xs py-2 px-2.5 flex items-center justify-center"
                              title="Editar NEE"
                            >
                              <Heart size={16} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleViewReceipt(student.id)}
                          className="ios-btn ios-btn-secondary text-xs py-2 px-2.5 flex items-center justify-center"
                          title="Comprobante"
                        >
                          <FileText size={16} />
                        </button>
                        {(userRole === 'inspector' || userRole === 'administrador') && student.estado === 'matriculado' && (
                          <button
                            onClick={() => handleRetireStudent(student)}
                            className="ios-btn ios-btn-warning text-xs py-2 px-2.5 flex items-center justify-center"
                            title="Cambiar a Retirado"
                          >
                            <UserX size={16} />
                          </button>
                        )}
                        {userRole !== 'profesor' && userRole !== 'sololectura' && (
                          <button
                            onClick={() => handleDelete(student.id)}
                            className="ios-btn ios-btn-danger text-xs py-2 px-2.5 flex items-center justify-center"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination placeholder */}
        {filteredStudents.length > 0 && (
          <div className="p-4 border-t flex justify-between items-center">
            <p className="ios-caption" style={{color: 'var(--color-text-light)'}}>
              Mostrando {filteredStudents.length} de {students.length} estudiantes
            </p>
            {/* TODO: Add pagination if needed */}
          </div>
        )}
      </div>

      {/* Modal para cambiar a Retirado */}
      {showRetireModal && studentToRetire && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden" style={{backgroundColor: 'var(--color-card)'}}>
            {/* Header del modal */}
            <div className="border-b px-6 py-4" style={{borderColor: 'var(--color-border)'}}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{backgroundColor: 'var(--color-warning-light)'}}>
                  <UserX size={20} style={{color: 'var(--color-warning)'}} />
                </div>
                <h3 className="text-lg font-semibold" style={{color: 'var(--color-foreground)'}}>
                  Cambiar a Estado Retirado
                </h3>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="px-6 py-6">
              <div className="mb-4 text-center">
                <p className="font-medium text-lg" style={{color: 'var(--color-foreground)'}}>
                  {studentToRetire.nombres} {studentToRetire.apellido_paterno} {studentToRetire.apellido_materno}
                </p>
                <p className="text-base mt-1" style={{color: 'var(--color-secondary)'}}>
                  RUT: {studentToRetire.rut}-{studentToRetire.dv}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="ios-form-label">
                    Fecha de Retiro <span style={{color: 'var(--color-error)'}}>*</span>
                  </label>
                  <input
                    type="date"
                    value={retireDate}
                    onChange={(e) => setRetireDate(e.target.value)}
                    className="ios-form-input"
                    required
                  />
                </div>

                <div>
                  <label className="ios-form-label">
                    Observación/Motivo del Retiro <span style={{color: 'var(--color-error)'}}>*</span>
                  </label>
                  <textarea
                    value={retireObservation}
                    onChange={(e) => setRetireObservation(e.target.value)}
                    className="ios-form-input"
                    rows={3}
                    placeholder="Indique el motivo del retiro del estudiante..."
                    required
                  />
                </div>
              </div>
            </div>

            {/* Botones del modal */}
            <div className="px-6 py-4 flex gap-3 justify-end" style={{backgroundColor: 'var(--color-card-elevated)'}}>
              <button
                onClick={handleCancelRetire}
                className="ios-btn ios-btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRetire}
                className="ios-btn ios-btn-warning"
                disabled={!retireDate || !retireObservation.trim()}
              >
                Confirmar Retiro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprobante usando el mismo componente que StudentForm */}
      {showReceipt && receiptStudentData && (
        <PDFReceipt 
          student={receiptStudentData}
          onBackToHome={handleCloseReceipt}
        />
      )}

      {/* Modal de edición */}
      {showEditModal && editingStudentId && (
        <EditStudentModal
          isOpen={showEditModal}
          onClose={handleCloseEditModal}
          studentId={editingStudentId}
          onUpdate={handleUpdateStudent}
          initialSection={editSection}
        />
      )}
    </div>
  );
};

export default StudentList;