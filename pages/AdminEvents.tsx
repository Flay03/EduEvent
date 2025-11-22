import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SchoolEvent, EventSession, Course, ClassGroup } from '../types';
import { storageService } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { formatDate } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';

// --- Memoized Row Component ---
interface AdminEventRowProps {
    evt: SchoolEvent;
    onOpenSubEvent: (evt: SchoolEvent) => void;
    onManageEnrollments: (evt: SchoolEvent) => void;
    onEdit: (evt: SchoolEvent) => void;
    onDelete: (evt: SchoolEvent) => void;
}

const AdminEventRow = React.memo(({ evt, onOpenSubEvent, onManageEnrollments, onEdit, onDelete }: AdminEventRowProps) => {
    const isChild = !!evt.parentId;
    const isParent = !isChild;
    
    return (
        <li className={`px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition ${isChild ? 'bg-gray-50/50 pl-12 border-l-4 border-indigo-100' : ''}`}>
            <div>
                <h3 className={`font-medium text-primary flex items-center ${isChild ? 'text-base' : 'text-lg'}`}>
                    {isChild && <span className="text-gray-400 mr-2">↳</span>}
                    {evt.name}
                </h3>
                <div className="text-sm text-gray-500 mt-1">
                    <span className="mr-3">📅 {evt.sessions.length} sessões</span> 
                    <span>👁️ {evt.visibility === 'public' ? 'Público' : evt.visibility === 'course' ? 'Por Curso' : 'Por Turma'}</span>
                </div>
            </div>
            
            <div className="flex items-center space-x-2">
                {isParent && (
                    <button 
                        onClick={() => onOpenSubEvent(evt)}
                        className="text-indigo-600 hover:text-white hover:bg-indigo-600 p-2 rounded-full transition border border-transparent hover:border-indigo-600"
                        title="Adicionar Sub-evento vinculado"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                )}
                
                <button 
                    onClick={() => onManageEnrollments(evt)} 
                    className="text-emerald-600 hover:text-white hover:bg-emerald-600 p-2 rounded-full transition border border-transparent hover:border-emerald-600"
                    title="Gerenciar Inscritos e Exportar"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                </button>

                <button 
                    onClick={() => onEdit(evt)} 
                    className="text-blue-600 hover:text-white hover:bg-blue-600 p-2 rounded-full transition border border-transparent hover:border-blue-600" 
                    title="Editar Evento"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>

                <div className="h-6 w-px bg-gray-200 mx-2"></div>

                <button 
                    onClick={() => onDelete(evt)} 
                    className="text-red-600 hover:text-white hover:bg-red-600 p-2 rounded-full transition border border-transparent hover:border-red-600"
                    title="Excluir Evento"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </li>
    );
});


export const AdminEvents: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Pagination & Filter
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVisibility, setFilterVisibility] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const ITEMS_PER_PAGE = 15;
  
  // Interface Control
  const [modalTitle, setModalTitle] = useState('');
  const [sessionTab, setSessionTab] = useState<'manual' | 'recurring'>('manual');
  const [targetParentName, setTargetParentName] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  
  const [dateLimits, setDateLimits] = useState<{min: string, max: string} | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isParentDelete, setIsParentDelete] = useState(false);

  const [metrics, setMetrics] = useState({
      totalEvents: 0,
      totalSessions: 0,
      totalCapacity: 0,
      totalFilled: 0
  });

  const [formData, setFormData] = useState<Partial<SchoolEvent>>({
    name: '',
    description: '',
    location: '',
    visibility: 'public',
    allowedCourses: [],
    allowedClasses: [],
    sessions: [],
    parentId: undefined
  });
  
  const [tempSession, setTempSession] = useState<Partial<EventSession>>({
      date: '',
      startTime: '',
      endTime: '',
      capacity: 30
  });

  const [recurringConfig, setRecurringConfig] = useState({
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      capacity: 30,
      daysOfWeek: [] as number[]
  });

  // Constants for limits
  const currentYear = new Date().getFullYear();
  const endOfYear = `${currentYear}-12-31`;

  const fetchEvents = async () => {
    const data = await storageService.getEvents();
    setEvents(data);
    
    let totalSessions = 0;
    let totalCapacity = 0;
    let totalFilled = 0;
    data.forEach(e => {
        totalSessions += e.sessions.length;
        e.sessions.forEach(s => {
            totalCapacity += s.capacity;
            totalFilled += s.filled;
        });
    });
    setMetrics({
        totalEvents: data.length,
        totalSessions,
        totalCapacity,
        totalFilled
    });
  };

  const fetchMeta = async () => {
      const c = await storageService.getCourses();
      const t = await storageService.getClasses();
      setCourses(c);
      setClasses(t);
  }

  useEffect(() => {
    fetchEvents();
    fetchMeta();
  }, []);

  // --- Filtering & Sorting Logic ---
  
  const sortedEvents = useMemo(() => {
      const parents = events.filter(e => !e.parentId);
      const children = events.filter(e => e.parentId);
      
      const result: SchoolEvent[] = [];
      parents.forEach(p => {
          result.push(p);
          children.filter(c => c.parentId === p.id).forEach(c => result.push(c));
      });
      // Add orphans or independent children
      children.filter(c => !parents.find(p => p.id === c.parentId)).forEach(c => result.push(c));
      
      return result;
  }, [events]);

  const filteredSortedEvents = useMemo(() => {
      return sortedEvents.filter(evt => {
          // 1. Text Search
          const matchesSearch = evt.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                evt.description.toLowerCase().includes(searchTerm.toLowerCase());
          
          // 2. Visibility Filter
          const matchesVisibility = filterVisibility ? evt.visibility === filterVisibility : true;

          // 3. Course Filter
          let matchesCourse = true;
          if (filterCourse) {
              if (evt.visibility === 'public') {
                  // Opcional: se filtrar por curso, esconde eventos públicos? 
                  // Geralmente sim, para focar no específico. 
                  // Se quiser mostrar públicos também, mude para true.
                  matchesCourse = false; 
              } else if (evt.visibility === 'course') {
                  matchesCourse = evt.allowedCourses?.includes(filterCourse) || false;
              } else if (evt.visibility === 'class') {
                  // Verifica se alguma das turmas permitidas pertence ao curso selecionado
                  matchesCourse = evt.allowedClasses?.some(clsId => {
                      const cls = classes.find(c => c.id === clsId);
                      return cls?.courseId === filterCourse;
                  }) || false;
              }
          }
          
          return matchesSearch && matchesVisibility && matchesCourse;
      });
  }, [sortedEvents, searchTerm, filterVisibility, filterCourse, classes]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterVisibility, filterCourse]);

  const paginatedEvents = useMemo(() => {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      return filteredSortedEvents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSortedEvents, currentPage]);


  // --- UI Actions ---

  const resetForm = () => {
      setFormData({ 
          name: '', 
          description: '', 
          location: '',
          sessions: [], 
          visibility: 'public', 
          allowedCourses: [], 
          allowedClasses: [], 
          parentId: undefined 
      });
      setTempSession({ date: '', startTime: '', endTime: '', capacity: 30 });
      setRecurringConfig({ startDate: '', endDate: '', startTime: '', endTime: '', capacity: 30, daysOfWeek: [] });
      setTargetParentName(null);
      setSessionTab('manual');
      setGenError(null);
      setDateLimits(null);
  };

  const handleOpenNewEvent = () => {
      resetForm();
      setModalTitle('Criar Novo Evento Principal');
      setIsModalOpen(true);
  };

  // Callbacks optimized for React.memo
  const handleOpenSubEvent = useCallback((parentEvent: SchoolEvent) => {
      resetForm();
      setModalTitle(`Adicionar Sub-evento para: ${parentEvent.name}`);
      setTargetParentName(parentEvent.name);
      
      if (parentEvent.sessions && parentEvent.sessions.length > 0) {
          const dates = parentEvent.sessions.map(s => s.date).sort();
          setDateLimits({
              min: dates[0],
              max: dates[dates.length - 1]
          });
      } else {
          setDateLimits(null);
      }
      
      setFormData({
          parentId: parentEvent.id,
          visibility: parentEvent.visibility,
          allowedCourses: parentEvent.allowedCourses,
          allowedClasses: parentEvent.allowedClasses,
          location: parentEvent.location,
          sessions: [],
          name: '',
          description: ''
      });
      
      setIsModalOpen(true);
  }, []);

  const handleEditEvent = useCallback((event: SchoolEvent) => {
    resetForm();
    setFormData({ ...event });
    setModalTitle('Editar Evento');
    
    if (event.parentId) {
        // Logic to find parent name if needed
    }
    setIsModalOpen(true);
  }, []); 

  const requestDelete = useCallback((event: SchoolEvent) => {
      setDeleteId(event.id);
      setIsParentDelete(!event.parentId);
  }, []);

  const handleManageEnrollments = useCallback((event: SchoolEvent) => {
      navigate(`/admin/events/${event.id}/enrollments`);
  }, [navigate]);

  // ... (Session logic remains the same) ... 
  const handleAddSession = () => {
    if(!tempSession.date || !tempSession.startTime || !tempSession.endTime) return;
    if (dateLimits && (tempSession.date! < dateLimits.min || tempSession.date! > dateLimits.max)) {
        setGenError(`A data deve estar entre ${formatDate(dateLimits.min)} e ${formatDate(dateLimits.max)} (Período do evento pai).`);
        return;
    }
    const newSession: EventSession = {
        id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: tempSession.date!,
        startTime: tempSession.startTime!,
        endTime: tempSession.endTime!,
        capacity: tempSession.capacity || 30,
        filled: 0
    };
    setFormData(prev => ({ ...prev, sessions: [...(prev.sessions || []), newSession] }));
    setTempSession({ date: '', startTime: '', endTime: '', capacity: 30 });
    setGenError(null);
  };

  const handleGenerateRecurring = () => {
      setGenError(null);
      const { startDate, endDate, startTime, endTime, capacity, daysOfWeek } = recurringConfig;
      if (!startDate || !endDate || !startTime || !endTime || daysOfWeek.length === 0) {
          setGenError("Preencha todos os campos e selecione pelo menos um dia da semana.");
          return;
      }
      if (dateLimits && (startDate < dateLimits.min || startDate > dateLimits.max || endDate < dateLimits.min || endDate > dateLimits.max)) {
         setGenError(`O intervalo deve estar contido entre ${formatDate(dateLimits.min)} e ${formatDate(dateLimits.max)}.`);
         return; 
      }
      // NEW: Limit to current year
      if (endDate > endOfYear) {
         setGenError(`Para evitar sobrecarga no sistema, a geração automática de sessões é limitada até ${formatDate(endOfYear)}.`);
         return;
      }

      const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
      const start = new Date(startYear, startMonth - 1, startDay, 12, 0, 0);
      const end = new Date(endYear, endMonth - 1, endDay, 12, 0, 0);
      const newSessions: EventSession[] = [];
      if (start > end) { setGenError("A data de início deve ser anterior à data de fim."); return; }
      
      // Safety brake: max 366 iterations (1 year)
      let safetyCount = 0;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          safetyCount++;
          if (safetyCount > 370) break;

          if (daysOfWeek.includes(d.getDay())) {
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              newSessions.push({
                  id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  date: `${year}-${month}-${day}`,
                  startTime, endTime, capacity, filled: 0
              });
          }
      }
      if (newSessions.length === 0) { setGenError("Nenhuma data encontrada."); return; }
      setFormData(prev => ({ ...prev, sessions: [...(prev.sessions || []), ...newSessions] }));
  };

  const removeSession = (index: number) => {
      setFormData(prev => ({ ...prev, sessions: prev.sessions?.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sessions?.length) { setGenError("Preencha o nome e adicione sessão."); return; }
    setLoading(true);
    try {
        if (formData.id) await storageService.updateEvent(formData as SchoolEvent);
        else {
            await storageService.createEvent({
                id: `evt_${Date.now()}`,
                name: formData.name!,
                description: formData.description || '',
                location: formData.location || 'A definir',
                visibility: formData.visibility as any || 'public',
                allowedCourses: formData.allowedCourses,
                allowedClasses: formData.allowedClasses,
                sessions: formData.sessions || [],
                parentId: formData.parentId || undefined,
                createdBy: user?.uid || '',
                createdAt: new Date().toISOString()
            });
        }
        setIsModalOpen(false);
        resetForm();
        fetchEvents();
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const confirmDelete = async () => {
    if (deleteId) {
        await storageService.deleteEvent(deleteId);
        setDeleteId(null);
        fetchEvents();
    }
  }

  // Toggle helpers
  const toggleCourse = (id: string) => {
      setFormData(prev => ({ ...prev, allowedCourses: prev.allowedCourses?.includes(id) ? prev.allowedCourses.filter(c => c !== id) : [...(prev.allowedCourses || []), id] }));
  };
  const toggleClass = (id: string) => {
      setFormData(prev => ({ ...prev, allowedClasses: prev.allowedClasses?.includes(id) ? prev.allowedClasses.filter(c => c !== id) : [...(prev.allowedClasses || []), id] }));
  };
  const toggleDayOfWeek = (dayIndex: number) => {
      setRecurringConfig(prev => ({ ...prev, daysOfWeek: prev.daysOfWeek.includes(dayIndex) ? prev.daysOfWeek.filter(d => d !== dayIndex) : [...prev.daysOfWeek, dayIndex] }));
  };

  const occupancyRate = metrics.totalCapacity > 0 ? Math.round((metrics.totalFilled / metrics.totalCapacity) * 100) : 0;

  // Compute max allowed date for inputs
  const maxDateAllowed = useMemo(() => {
      if (dateLimits) {
          // If parent limits exist, take the smaller of (Parent Max vs End of Year)
          return dateLimits.max < endOfYear ? dateLimits.max : endOfYear;
      }
      return endOfYear;
  }, [dateLimits, endOfYear]);

  return (
    <div className="container mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded shadow border-l-4 border-primary">
              <div className="text-gray-500 text-sm font-medium uppercase">Eventos Ativos</div>
              <div className="text-2xl font-bold text-gray-900">{metrics.totalEvents}</div>
          </div>
          <div className="bg-white p-4 rounded shadow border-l-4 border-blue-500">
              <div className="text-gray-500 text-sm font-medium uppercase">Total de Sessões</div>
              <div className="text-2xl font-bold text-gray-900">{metrics.totalSessions}</div>
          </div>
          <div className="bg-white p-4 rounded shadow border-l-4 border-secondary">
              <div className="text-gray-500 text-sm font-medium uppercase">Inscritos / Vagas</div>
              <div className="text-2xl font-bold text-gray-900">{metrics.totalFilled} <span className="text-gray-400 text-lg">/ {metrics.totalCapacity}</span></div>
          </div>
          <div className="bg-white p-4 rounded shadow border-l-4 border-orange-500">
              <div className="text-gray-500 text-sm font-medium uppercase">Taxa de Ocupação</div>
              <div className="text-2xl font-bold text-gray-900">{occupancyRate}%</div>
          </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Eventos</h1>
        <div className="flex flex-col xl:flex-row gap-2 w-full lg:w-auto items-center">
            <div className="w-full xl:w-64">
                <input 
                    type="text" 
                    placeholder="Buscar evento..." 
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary bg-white text-gray-900"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-2 w-full xl:w-auto">
                <div className="flex-1 xl:w-40">
                    <select 
                        className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900"
                        value={filterVisibility}
                        onChange={e => setFilterVisibility(e.target.value)}
                    >
                        <option value="">Visibilidade</option>
                        <option value="public">Público</option>
                        <option value="course">Por Curso</option>
                        <option value="class">Por Turma</option>
                    </select>
                </div>
                <div className="flex-1 xl:w-48">
                    <select 
                        className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900"
                        value={filterCourse}
                        onChange={e => setFilterCourse(e.target.value)}
                    >
                        <option value="">Todos os Cursos</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>
            <button
                onClick={handleOpenNewEvent}
                className="w-full xl:w-auto bg-primary text-white px-6 py-2 rounded-md hover:bg-indigo-700 shadow-sm transition font-bold whitespace-nowrap"
            >
            + Novo Evento
            </button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {paginatedEvents.map((evt) => (
              <AdminEventRow 
                key={evt.id}
                evt={evt}
                onOpenSubEvent={handleOpenSubEvent}
                onManageEnrollments={handleManageEnrollments}
                onEdit={handleEditEvent}
                onDelete={requestDelete}
              />
          ))}
          {paginatedEvents.length === 0 && (
            <li className="px-6 py-12 text-center text-gray-500">Nenhum evento encontrado com os filtros atuais.</li>
          )}
        </ul>
      </div>

      <Pagination 
         currentPage={currentPage}
         totalItems={filteredSortedEvents.length}
         itemsPerPage={ITEMS_PER_PAGE}
         onPageChange={setCurrentPage}
      />

      {/* Modals */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirmar Exclusão">
          <div className="p-2">
              <p className="text-gray-700">
                  Tem certeza que deseja excluir este evento e todas as suas sessões?
                  {isParentDelete && (
                      <>
                        <br/>
                        <span className="text-red-600 font-bold block mt-2">⚠ Atenção: Ao excluir um evento principal, todos os sub-eventos vinculados a ele também serão excluídos permanentemente.</span>
                      </>
                  )}
                  {!isParentDelete && <br/>}
                  <span className="text-red-500 text-sm font-bold block mt-2">Essa ação não pode ser desfeita.</span>
              </p>
              <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => setDeleteId(null)} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-gray-800">Cancelar</button>
                  <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 text-white font-bold">Confirmar Exclusão</button>
              </div>
          </div>
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalTitle}>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto px-1">
            
            <div>
                <label className="block text-sm font-medium text-gray-700">Nome do Evento</label>
                <input 
                    type="text" 
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary bg-white text-gray-900"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                />
            </div>

            <div className={targetParentName ? 'opacity-50 pointer-events-none' : ''}>
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Visibilidade {targetParentName && <span className="text-xs text-indigo-600">(Herdado do Pai: {targetParentName})</span>}
                    </label>
                    <select 
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900"
                        value={formData.visibility}
                        onChange={e => setFormData({...formData, visibility: e.target.value as any})}
                        disabled={!!targetParentName}
                    >
                        <option value="public">Público (Todos)</option>
                        <option value="course">Restrito a Cursos</option>
                        <option value="class">Restrito a Turmas</option>
                    </select>
                </div>

                {formData.visibility === 'course' && (
                    <div className="bg-gray-50 p-3 rounded border mt-2">
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Selecione os Cursos Permitidos</label>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {courses.map(c => (
                                <label key={c.id} className="flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox" 
                                        checked={formData.allowedCourses?.includes(c.id)}
                                        onChange={() => toggleCourse(c.id)}
                                        className="rounded text-primary focus:ring-primary bg-white"
                                    />
                                    <span className="text-sm">{c.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {formData.visibility === 'class' && (
                    <div className="bg-gray-50 p-3 rounded border mt-2">
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Selecione as Turmas Permitidas</label>
                        <div className="space-y-4 max-h-60 overflow-y-auto">
                            {courses.map(course => {
                                const courseClasses = classes.filter(cls => cls.courseId === course.id);
                                if (courseClasses.length === 0) return null;
                                return (
                                    <div key={course.id}>
                                        <div className="text-xs font-bold text-indigo-600 mb-1 sticky top-0 bg-gray-50 py-1">{course.name}</div>
                                        <div className="pl-2 space-y-1 border-l-2 border-indigo-100">
                                            {courseClasses.map(cls => (
                                                <label key={cls.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 rounded p-1">
                                                    <input type="checkbox" 
                                                        checked={formData.allowedClasses?.includes(cls.id)}
                                                        onChange={() => toggleClass(cls.id)}
                                                        className="rounded text-primary focus:ring-primary bg-white"
                                                    />
                                                    <span className="text-sm">{cls.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <textarea 
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary bg-white text-gray-900"
                    rows={3}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Local</label>
                <input 
                    type="text" 
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary bg-white text-gray-900"
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                />
            </div>

            <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-2">Gerenciar Sessões</h4>
                {dateLimits && (
                    <div className="mb-4 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-md">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-blue-800">Restrição de Data Ativa</h3>
                                <div className="mt-2 text-sm text-blue-700">
                                    <p>O evento pai ocorre entre <span className="font-bold whitespace-nowrap">{formatDate(dateLimits.min)}</span> e <span className="font-bold whitespace-nowrap">{formatDate(dateLimits.max)}</span>.</p>
                                    <p className="mt-1 text-xs text-blue-600">Todas as sessões deste sub-evento devem estar contidas neste intervalo.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-t-md">
                    <button type="button" onClick={() => setSessionTab('manual')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${sessionTab === 'manual' ? 'bg-white text-primary shadow' : 'text-gray-500 hover:text-gray-700'}`}>Inserção Manual</button>
                    <button type="button" onClick={() => setSessionTab('recurring')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${sessionTab === 'recurring' ? 'bg-white text-primary shadow' : 'text-gray-500 hover:text-gray-700'}`}>Gerador de Recorrência</button>
                </div>

                {sessionTab === 'manual' && (
                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-b-md border border-gray-200 border-t-0">
                        <div className="col-span-2 text-xs font-medium text-gray-500 uppercase">Data e Capacidade</div>
                        <input type="date" className="border p-1 rounded text-sm bg-white text-gray-900" value={tempSession.date} min={dateLimits?.min} max={dateLimits?.max} onChange={e => setTempSession({...tempSession, date: e.target.value})} />
                        <input type="number" placeholder="Capacidade" className="border p-1 rounded text-sm bg-white text-gray-900" value={tempSession.capacity} onChange={e => setTempSession({...tempSession, capacity: parseInt(e.target.value)})} />
                        <div className="col-span-2 text-xs font-medium text-gray-500 uppercase mt-2">Horário (Início - Fim)</div>
                        <input type="time" className="border p-1 rounded text-sm bg-white text-gray-900" value={tempSession.startTime} onChange={e => setTempSession({...tempSession, startTime: e.target.value})} />
                        <input type="time" className="border p-1 rounded text-sm bg-white text-gray-900" value={tempSession.endTime} onChange={e => setTempSession({...tempSession, endTime: e.target.value})} />
                        <button type="button" onClick={handleAddSession} className="col-span-2 mt-2 bg-white border border-primary text-primary py-2 rounded text-sm hover:bg-indigo-50 font-medium">+ Adicionar Sessão</button>
                    </div>
                )}

                {sessionTab === 'recurring' && (
                    <div className="bg-indigo-50 p-3 rounded-b-md space-y-3 border border-indigo-100 border-t-0">
                         <div className="grid grid-cols-2 gap-2">
                            <div><label className="text-xs text-gray-600 font-bold">Data Início</label><input type="date" className="w-full border p-1 rounded text-sm bg-white text-gray-900" value={recurringConfig.startDate} min={dateLimits?.min} max={maxDateAllowed} onChange={e => setRecurringConfig({...recurringConfig, startDate: e.target.value})} /></div>
                            <div><label className="text-xs text-gray-600 font-bold">Data Fim</label><input type="date" className="w-full border p-1 rounded text-sm bg-white text-gray-900" value={recurringConfig.endDate} min={dateLimits?.min} max={maxDateAllowed} onChange={e => setRecurringConfig({...recurringConfig, endDate: e.target.value})} /></div>
                        </div>
                        
                        {/* Warning about limits */}
                        <div className="text-xs text-indigo-600 italic">
                           * A geração automática é limitada ao ano corrente ({currentYear}).
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                             <div><label className="text-xs text-gray-600 font-bold">Início</label><input type="time" className="w-full border p-1 rounded text-sm bg-white text-gray-900" value={recurringConfig.startTime} onChange={e => setRecurringConfig({...recurringConfig, startTime: e.target.value})} /></div>
                             <div><label className="text-xs text-gray-600 font-bold">Fim</label><input type="time" className="w-full border p-1 rounded text-sm bg-white text-gray-900" value={recurringConfig.endTime} onChange={e => setRecurringConfig({...recurringConfig, endTime: e.target.value})} /></div>
                             <div><label className="text-xs text-gray-600 font-bold">Capacidade</label><input type="number" className="w-full border p-1 rounded text-sm bg-white text-gray-900" value={recurringConfig.capacity} onChange={e => setRecurringConfig({...recurringConfig, capacity: parseInt(e.target.value)})} /></div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-600 font-bold block mb-1">Dias da Semana</label>
                            <div className="flex flex-wrap gap-2">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day, index) => (
                                    <button key={day} type="button" onClick={() => toggleDayOfWeek(index)} className={`text-xs px-3 py-1.5 rounded border font-medium transition ${recurringConfig.daysOfWeek.includes(index) ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>{day}</button>
                                ))}
                            </div>
                        </div>
                        {genError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded">{genError}</div>}
                        <button type="button" onClick={handleGenerateRecurring} className="w-full bg-primary text-white py-2 rounded text-sm hover:bg-indigo-700 shadow-sm font-medium">Gerar Sessões Automaticamente</button>
                    </div>
                )}

                <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-center"><h5 className="text-xs font-bold text-gray-500 uppercase">Sessões Geradas ({formData.sessions?.length || 0})</h5>{(formData.sessions?.length || 0) > 0 && <button type="button" onClick={() => setFormData({...formData, sessions: []})} className="text-xs text-red-500 hover:underline">Limpar Tudo</button>}</div>
                    <div className="max-h-40 overflow-y-auto space-y-1 border rounded p-2 bg-gray-50">
                        {formData.sessions?.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Nenhuma sessão adicionada</p>}
                        {formData.sessions?.slice().sort((a,b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)).map((s, i) => (
                            <div key={i} className="text-xs bg-white border p-2 rounded flex justify-between items-center group hover:border-primary">
                                <div><span className="font-bold text-gray-800">{formatDate(s.date)}</span><span className="mx-2 text-gray-300">|</span><span>{s.startTime} - {s.endTime}</span><span className="mx-2 text-gray-300">|</span><span className="text-blue-600 font-medium">{s.capacity} vagas</span></div>
                                <button type="button" onClick={() => removeSession(i)} className="text-red-500 hover:text-red-700 font-medium">×</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="pt-4">
                {genError && <div className="mb-2 text-sm text-red-600 text-center font-bold">Existem erros no formulário, verifique acima.</div>}
                <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 disabled:opacity-50 font-bold text-sm shadow-sm">{loading ? 'Salvando...' : (formData.id ? 'Atualizar Evento' : 'Confirmar Criação do Evento')}</button>
            </div>
        </form>
      </Modal>
    </div>
  );
};