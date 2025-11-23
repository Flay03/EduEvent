
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SchoolEvent, EventSession, Course, ClassGroup } from '../types';
import { storageService } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { formatDate } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';
import { SkeletonListItem } from '../components/Skeletons';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadingButton } from '../components/LoadingButton';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../components/Toast';

// --- Memoized Row Component ---
interface AdminEventRowProps {
    evt: SchoolEvent;
    isNested?: boolean; // New prop for hierarchy styling
    onOpenSubEvent: (evt: SchoolEvent) => void;
    onManageEnrollments: (evt: SchoolEvent) => void;
    onEdit: (evt: SchoolEvent) => void;
    onDelete: (evt: SchoolEvent) => void;
}

const AdminEventRow = React.memo(({ evt, isNested, onOpenSubEvent, onManageEnrollments, onEdit, onDelete }: AdminEventRowProps) => {
    // Is Parent if it has no parentId (it's a root)
    const isParent = !evt.parentId;
    
    // Stats for Visual Bar
    const totalCapacity = evt.sessions.reduce((acc, s) => acc + s.capacity, 0);
    const totalFilled = evt.sessions.reduce((acc, s) => acc + s.filled, 0);
    const occupancy = totalCapacity > 0 ? (totalFilled / totalCapacity) * 100 : 0;
    const isFull = totalCapacity > 0 && totalFilled >= totalCapacity;

    // Badge Colors
    let badgeClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    let badgeLabel = 'Público';
    if (evt.visibility === 'course') { badgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'; badgeLabel = 'Curso'; }
    if (evt.visibility === 'class') { badgeClass = 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'; badgeLabel = 'Turma'; }

    // Conditional Styling for nested rows
    const rowBaseClasses = "relative transition-all duration-200 border-b border-gray-100 dark:border-gray-700 last:border-0";
    const nestedClasses = "bg-gray-50/80 hover:bg-gray-100 dark:bg-gray-800/40 dark:hover:bg-gray-800";
    const rootClasses = "bg-white hover:bg-gray-50 dark:bg-darkcard dark:hover:bg-gray-800/60";

    return (
        <li className={`${rowBaseClasses} ${isNested ? nestedClasses : rootClasses}`}>
            
            {/* Tree Connector for Nested Items */}
            {isNested && (
                <div className="absolute left-0 top-0 bottom-0 w-12 flex justify-center">
                    {/* Vertical Line */}
                    <div className="w-px bg-gray-300 dark:bg-gray-600 h-full absolute left-6 -top-1/2"></div>
                    {/* Horizontal Curve */}
                    <div className="absolute top-1/2 left-6 w-4 h-px bg-gray-300 dark:bg-gray-600"></div>
                </div>
            )}

            <div className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between ${isNested ? 'pl-14' : ''}`}>
                <div className="mb-4 sm:mb-0 flex-1 pr-4">
                    <div className="flex items-center gap-2">
                        {isNested && <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">Sub</span>}
                        <h3 className={`font-medium text-gray-900 dark:text-white ${isParent ? 'text-lg' : 'text-base'}`}>
                            {evt.name}
                        </h3>
                    </div>
                    
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 flex flex-wrap gap-3 items-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                            {badgeLabel}
                        </span>
                        <span className="flex items-center text-gray-400 dark:text-gray-500" title="Sessões cadastradas">
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            {evt.sessions.length} sessões
                        </span> 
                    </div>

                    {/* Occupancy Visual Bar */}
                    <div className="mt-3 w-full max-w-[200px]">
                         <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1 uppercase font-bold tracking-wide">
                             <span>Ocupação</span>
                             <span className={isFull ? "text-red-600 dark:text-red-400" : ""}>{totalFilled}/{totalCapacity}</span>
                         </div>
                         <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                             <div 
                                className={`h-1.5 rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : occupancy > 80 ? 'bg-amber-400' : 'bg-primary'}`} 
                                style={{ width: `${Math.min(occupancy, 100)}%` }}
                             ></div>
                         </div>
                    </div>
                </div>
                
                <div className="flex items-center justify-end space-x-1 opacity-80 hover:opacity-100">
                    {isParent && (
                        <button 
                            onClick={() => onOpenSubEvent(evt)}
                            className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 p-2 rounded-md transition"
                            title="Adicionar Sub-evento vinculado"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                    )}
                    
                    <button 
                        onClick={() => onManageEnrollments(evt)} 
                        className="text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 p-2 rounded-md transition"
                        title="Gerenciar Inscritos e Exportar"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </button>

                    <button 
                        onClick={() => onEdit(evt)} 
                        className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2 rounded-md transition" 
                        title="Editar Evento"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002 2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>

                    <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

                    <button 
                        onClick={() => onDelete(evt)} 
                        className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-md transition"
                        title="Excluir Evento"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </li>
    );
});


export const AdminEvents: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<any[]>([undefined]);
  const [hasNextPage, setHasNextPage] = useState(true);
  const ITEMS_PER_PAGE = 10;
  
  // Filters
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(localSearchTerm, 300);
  const [filters, setFilters] = useState({
      searchTerm: '',
      visibility: '',
      course: ''
  });
  
  // Interface Control
  const [modalTitle, setModalTitle] = useState('');
  const [modalTab, setModalTab] = useState<'details' | 'sessions'>('details'); 
  const [sessionGenTab, setSessionGenTab] = useState<'manual' | 'recurring'>('manual');
  
  const [targetParentName, setTargetParentName] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [dateLimits, setDateLimits] = useState<{min: string, max: string} | null>(null);
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isParentDelete, setIsParentDelete] = useState(false);
  const [processingDelete, setProcessingDelete] = useState(false);

  const [formData, setFormData] = useState<Partial<SchoolEvent>>({
    name: '', description: '', location: '', visibility: 'public',
    allowedCourses: [], allowedClasses: [], sessions: [], parentId: undefined
  });
  const [tempSession, setTempSession] = useState<Partial<EventSession>>({
      date: '', startTime: '', endTime: '', capacity: 30
  });
  const [recurringConfig, setRecurringConfig] = useState({
      startDate: '', endDate: '', startTime: '', endTime: '', capacity: 30, daysOfWeek: [] as number[]
  });

  const currentYear = new Date().getFullYear();
  const endOfYear = `${currentYear + 2}-12-31`;
  const MAX_SESSION_GEN_LIMIT = 50;

  const fetchEvents = useCallback(async (page: number) => {
    setLoading(true);
    const cursor = cursors[page - 1];
    const { data, nextCursor } = await storageService.getEvents({
        limit: ITEMS_PER_PAGE,
        cursor,
        filters
    });
    setEvents(data);
    setHasNextPage(!!nextCursor);
    if (nextCursor && cursors.length <= page) {
        setCursors(prev => [...prev, nextCursor]);
    }
    setLoading(false);
  }, [cursors, filters]);

  const fetchMeta = async () => {
      const [c, t] = await Promise.all([storageService.getCourses(), storageService.getClasses()]);
      setCourses(c);
      setClasses(t);
  }

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
      setFilters(prev => ({...prev, searchTerm: debouncedSearchTerm}));
  }, [debouncedSearchTerm]);

  useEffect(() => {
    setCursors([undefined]);
    setCurrentPage(1);
    fetchEvents(1);
  }, [filters]);

  // --- LOGICA DE HIERARQUIA VISUAL ---
  // Organiza os eventos em memória para que Filhos fiquem sempre abaixo dos Pais
  // independentemente da ordenação por data de criação.
  const organizedEvents = useMemo(() => {
    const roots: SchoolEvent[] = [];
    const childrenMap: Record<string, SchoolEvent[]> = {};
    const allIds = new Set(events.map(e => e.id));

    // 1. Separation Pass
    events.forEach(evt => {
        if (evt.parentId && allIds.has(evt.parentId)) {
            // É um filho e o pai está na lista atual
            if (!childrenMap[evt.parentId]) childrenMap[evt.parentId] = [];
            childrenMap[evt.parentId].push(evt);
        } else {
            // É um Pai, OU é um filho cujo pai está em outra página (tratar como raiz visual)
            roots.push(evt);
        }
    });

    // 2. Sort Roots (by creation date desc - newer first)
    roots.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    // 3. Sort Children (by date asc - oldest session first usually makes sense, or created asc)
    Object.values(childrenMap).forEach(list => {
        list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    });

    return { roots, childrenMap };
  }, [events]);

  const handleNextPage = () => {
    if (!hasNextPage) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchEvents(nextPage);
  };

  const handlePrevPage = () => {
    if (currentPage === 1) return;
    const prevPage = currentPage - 1;
    setCurrentPage(prevPage);
    fetchEvents(prevPage);
  };
  
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({...prev, [key]: value}));
  };

  const resetData = () => {
      setCurrentPage(1);
      setCursors([undefined]);
      fetchEvents(1);
  };

  const resetForm = () => {
      setFormData({ 
          name: '', description: '', location: '', sessions: [], visibility: 'public', 
          allowedCourses: [], allowedClasses: [], parentId: undefined 
      });
      setTempSession({ date: '', startTime: '', endTime: '', capacity: 30 });
      setRecurringConfig({ startDate: '', endDate: '', startTime: '', endTime: '', capacity: 30, daysOfWeek: [] });
      setTargetParentName(null); setSessionGenTab('manual'); setGenError(null); setDateLimits(null);
      setModalTab('details');
  };

  const handleOpenNewEvent = () => {
      resetForm();
      setModalTitle('Criar Novo Evento');
      setIsModalOpen(true);
  };

  const handleOpenSubEvent = useCallback((parentEvent: SchoolEvent) => {
      resetForm();
      setModalTitle(`Adicionar Sub-evento`);
      setTargetParentName(parentEvent.name);
      
      if (parentEvent.sessions?.length) {
          const dates = parentEvent.sessions.map(s => s.date).sort();
          setDateLimits({ min: dates[0], max: dates[dates.length - 1] });
      }
      
      setFormData({
          parentId: parentEvent.id, visibility: parentEvent.visibility,
          allowedCourses: parentEvent.allowedCourses, allowedClasses: parentEvent.allowedClasses,
          location: parentEvent.location, sessions: [], name: '', description: ''
      });
      setIsModalOpen(true);
  }, []);

  const handleEditEvent = useCallback((event: SchoolEvent) => {
    resetForm(); setFormData({ ...event }); setModalTitle('Editar Evento'); setIsModalOpen(true);
  }, []); 

  const requestDelete = useCallback((event: SchoolEvent) => {
      setDeleteId(event.id); setIsParentDelete(!event.parentId);
  }, []);

  const handleManageEnrollments = useCallback((event: SchoolEvent) => {
      navigate(`/admin/events/${event.id}/enrollments`);
  }, [navigate]);

  const handleAddSession = () => {
    if(!tempSession.date || !tempSession.startTime || !tempSession.endTime) return;
    if (dateLimits && (tempSession.date < dateLimits.min || tempSession.date > dateLimits.max)) {
        setGenError(`A data deve estar entre ${formatDate(dateLimits.min)} e ${formatDate(dateLimits.max)}.`); return;
    }
    // Lógica de Validação de Horário (Inicio < Fim)
    if (tempSession.startTime >= tempSession.endTime) {
        setGenError("O horário de término deve ser após o horário de início.");
        return;
    }

    const newSession: EventSession = {
        id: `sess_${Date.now()}`, date: tempSession.date!, startTime: tempSession.startTime!,
        endTime: tempSession.endTime!, capacity: tempSession.capacity || 30, filled: 0
    };
    setFormData(prev => ({ ...prev, sessions: [...(prev.sessions || []), newSession] }));
    setTempSession({ date: '', startTime: '', endTime: '', capacity: 30 }); setGenError(null);
  };

  const handleGenerateRecurring = () => {
      setGenError(null);
      const { startDate, endDate, startTime, endTime, capacity, daysOfWeek } = recurringConfig;
      if (!startDate || !endDate || !startTime || !endTime || !daysOfWeek.length) { setGenError("Preencha todos os campos."); return; }
      if (dateLimits && (startDate < dateLimits.min || endDate > dateLimits.max)) { setGenError(`O intervalo deve estar entre ${formatDate(dateLimits.min)} e ${formatDate(dateLimits.max)}.`); return; }
      if (endDate > endOfYear) { setGenError(`A geração é limitada até ${formatDate(endOfYear)}.`); return; }

      // Validação de horário na recorrência
      if (startTime >= endTime) { setGenError("O horário de término deve ser após o horário de início."); return; }

      const start = new Date(`${startDate}T12:00:00Z`); const end = new Date(`${endDate}T12:00:00Z`);
      if (start > end) { setGenError("A data de início deve ser anterior à de fim."); return; }
      
      const newSessions: EventSession[] = [];
      const loopDate = new Date(start);
      let safetyCounter = 0;

      while(loopDate <= end) {
          safetyCounter++;
          if (safetyCounter > 1000) break;

          if (daysOfWeek.includes(loopDate.getUTCDay())) {
              newSessions.push({
                  id: `sess_${loopDate.getTime()}_${newSessions.length}`,
                  date: loopDate.toISOString().split('T')[0],
                  startTime, endTime, capacity, filled: 0
              });
          }
          loopDate.setDate(loopDate.getDate() + 1);
      }

      if (newSessions.length > MAX_SESSION_GEN_LIMIT) { 
          setGenError(`Limite de segurança excedido. Tente gerar menos de ${MAX_SESSION_GEN_LIMIT} sessões por vez.`); 
          return; 
      }
      
      if (!newSessions.length) { setGenError("Nenhuma data encontrada no intervalo para os dias selecionados."); return; }
      
      setFormData(prev => ({ ...prev, sessions: [...(prev.sessions || []), ...newSessions] }));
      addToast('success', `${newSessions.length} sessões geradas.`);
  };

  const removeSession = (index: number) => {
      setFormData(prev => ({ ...prev, sessions: prev.sessions?.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sessions?.length) { 
        setGenError("Nome e ao menos uma sessão são obrigatórios."); 
        if(formData.name && !formData.sessions?.length) setModalTab('sessions');
        return; 
    }
    setLoading(true);
    try {
        if (formData.id) {
            await storageService.updateEvent(formData as SchoolEvent);
            addToast('success', 'Evento atualizado com sucesso!');
        } else {
            await storageService.createEvent({
                ...formData, id: `evt_${Date.now()}`, createdAt: new Date().toISOString(), createdBy: user?.uid || ''
            } as SchoolEvent);
            addToast('success', 'Evento criado com sucesso!');
        }
        setIsModalOpen(false); resetForm(); resetData();
    } catch (error) { 
        console.error(error);
        addToast('error', 'Erro ao salvar evento.');
    } finally { setLoading(false); }
  };

  const confirmDelete = async () => {
    if (deleteId) {
        setProcessingDelete(true);
        try {
            await storageService.deleteEvent(deleteId);
            addToast('success', 'Evento removido com sucesso!');
            setDeleteId(null); resetData();
        } catch(e) {
            console.error(e);
            addToast('error', 'Erro ao excluir evento.');
        } finally {
            setProcessingDelete(false);
        }
    }
  }

  const toggleCourse = (id: string) => setFormData(prev => ({ ...prev, allowedCourses: prev.allowedCourses?.includes(id) ? prev.allowedCourses.filter(c => c !== id) : [...(prev.allowedCourses || []), id] }));
  const toggleClass = (id: string) => setFormData(prev => ({ ...prev, allowedClasses: prev.allowedClasses?.includes(id) ? prev.allowedClasses.filter(c => c !== id) : [...(prev.allowedClasses || []), id] }));
  const toggleDayOfWeek = (day: number) => setRecurringConfig(prev => ({ ...prev, daysOfWeek: prev.daysOfWeek.includes(day) ? prev.daysOfWeek.filter(d => d !== day) : [...prev.daysOfWeek, day] }));

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciamento de Eventos</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Crie, edite e gerencie eventos e suas sessões.</p>
        </div>
        
        <div className="flex flex-col xl:flex-row gap-2 w-full lg:w-auto items-center">
            <div className="w-full xl:w-64 relative">
                <input type="text" placeholder="Buscar evento..." 
                    className="w-full pl-9 border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary focus:border-primary"
                    value={localSearchTerm} onChange={e => setLocalSearchTerm(e.target.value)} />
                 <svg className="h-5 w-5 text-gray-400 dark:text-gray-500 absolute left-2 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
            <div className="flex gap-2 w-full xl:w-auto">
                <select className="w-full border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary focus:border-primary"
                    value={filters.visibility} onChange={e => handleFilterChange('visibility', e.target.value)}>
                    <option value="">Todas Visibilidades</option>
                    <option value="public">Público</option><option value="course">Por Curso</option><option value="class">Por Turma</option>
                </select>
                <select className="w-full border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary focus:border-primary"
                    value={filters.course} onChange={e => handleFilterChange('course', e.target.value)}>
                    <option value="">Todos os Cursos</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            <button onClick={handleOpenNewEvent} className="w-full xl:w-auto bg-primary text-white px-6 py-2 rounded-md font-bold whitespace-nowrap hover:bg-indigo-700 shadow-sm transition">
            + Novo Evento
            </button>
        </div>
      </div>

      {loading ? (
             <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="bg-white dark:bg-darkcard shadow-sm rounded-lg p-0 overflow-hidden border border-gray-100 dark:border-gray-700">
                        <SkeletonListItem />
                    </div>
                ))}
             </div>
      ) : events.length === 0 ? (
        <div className="bg-white dark:bg-darkcard shadow-sm border border-gray-200 dark:border-gray-700 sm:rounded-lg p-8">
            <EmptyState title="Nenhum evento encontrado" description="Tente ajustar os filtros ou crie um novo evento." />
        </div>
      ) : (
         // RENDERIZAÇÃO DA ÁRVORE COM CARDS SEPARADOS
         <div className="space-y-4">
             {organizedEvents.roots.map((root) => {
                const children = organizedEvents.childrenMap[root.id] || [];
                return (
                    <div key={root.id} className="bg-white dark:bg-darkcard shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-shadow hover:shadow-md">
                        <ul>
                            {/* Parent Event */}
                            <AdminEventRow 
                                evt={root}
                                onOpenSubEvent={handleOpenSubEvent} 
                                onManageEnrollments={handleManageEnrollments}
                                onEdit={handleEditEvent} 
                                onDelete={requestDelete} 
                            />
                            
                            {/* Child Events (Rendered immediately after parent) */}
                            {children.map(child => (
                                <AdminEventRow 
                                    key={child.id} 
                                    evt={child}
                                    isNested={true}
                                    onOpenSubEvent={handleOpenSubEvent} 
                                    onManageEnrollments={handleManageEnrollments}
                                    onEdit={handleEditEvent} 
                                    onDelete={requestDelete} 
                                />
                            ))}
                        </ul>
                    </div>
                );
             })}
         </div>
      )}
        
      {/* Pagination Footer */}
      {events.length > 0 && (
            <div className="bg-white dark:bg-darkcard border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 flex items-center justify-between sm:px-6 shadow-sm">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                            Página <span className="font-medium">{currentPage}</span>
                        </p>
                    </div>
                    <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <button onClick={handlePrevPage} disabled={currentPage === 1 || loading} 
                                className="relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
                                Anterior
                            </button>
                            <button onClick={handleNextPage} disabled={!hasNextPage || loading} 
                                className="relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
                                Próximo
                            </button>
                        </nav>
                    </div>
                </div>
                {/* Mobile Pagination */}
                <div className="flex items-center justify-between w-full sm:hidden">
                     <button onClick={handlePrevPage} disabled={currentPage === 1 || loading} className="px-4 py-2 border dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50">Ant</button>
                     <span className="text-sm text-gray-700 dark:text-gray-200">Pág {currentPage}</span>
                     <button onClick={handleNextPage} disabled={!hasNextPage || loading} className="px-4 py-2 border dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50">Prox</button>
                </div>
            </div>
      )}

      <ConfirmDialog 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message={
            <div>
                 <p className="text-gray-700 dark:text-gray-300">Tem certeza que deseja excluir este evento?</p>
                 {isParentDelete && <p className="text-red-600 dark:text-red-400 font-bold mt-2 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-900/30">⚠️ Atenção: Todos os sub-eventos vinculados também serão excluídos.</p>}
            </div>
        }
        isProcessing={processingDelete}
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalTitle}>
        <form onSubmit={handleSubmit} className="flex flex-col h-[70vh] sm:h-[60vh]">
            {/* Modal Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-600 mb-4">
                <button
                    type="button"
                    onClick={() => setModalTab('details')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${modalTab === 'details' ? 'border-primary text-primary dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                    1. Detalhes Gerais
                </button>
                <button
                    type="button"
                    onClick={() => setModalTab('sessions')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${modalTab === 'sessions' ? 'border-primary text-primary dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                    2. Sessões ({formData.sessions?.length || 0})
                </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto px-1 pb-4">
                
                {/* TAB 1: DETAILS */}
                {modalTab === 'details' && (
                    <div className="space-y-4 animate-fade-in">
                        {targetParentName && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-md text-sm mb-4">
                                Vinculado ao evento pai: <strong>{targetParentName}</strong>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Evento *</label>
                            <input type="text" required placeholder="Ex: Feira de Ciências" className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary focus:border-primary"
                                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        
                        <div className={targetParentName ? 'opacity-50 pointer-events-none' : ''}>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Visibilidade</label>
                            <select value={formData.visibility} onChange={e => setFormData({...formData, visibility: e.target.value as any})}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary focus:border-primary" disabled={!!targetParentName}>
                                <option value="public">Público (Todos podem ver)</option>
                                <option value="course">Restrito a Cursos</option>
                                <option value="class">Restrito a Turmas</option>
                            </select>

                            {formData.visibility === 'course' && (
                                <div className="mt-2 p-3 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800/50 max-h-40 overflow-y-auto">
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase">Selecione os cursos permitidos:</p>
                                    {courses.map(c => (
                                        <div key={c.id} className="flex items-center mb-1">
                                            <input type="checkbox" id={`c_${c.id}`} checked={formData.allowedCourses?.includes(c.id)} onChange={() => toggleCourse(c.id)} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"/>
                                            <label htmlFor={`c_${c.id}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300">{c.name}</label>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {formData.visibility === 'class' && (
                                <div className="mt-2 p-3 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800/50 max-h-40 overflow-y-auto">
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase">Selecione as turmas permitidas:</p>
                                    {courses.map(c => (
                                        <div key={c.id} className="mb-2">
                                            <strong className="text-xs text-gray-900 dark:text-gray-200 block mb-1">{c.name}</strong>
                                            <div className="pl-2">
                                                {classes.filter(cl => cl.courseId === c.id).map(cl => (
                                                    <div key={cl.id} className="flex items-center mb-1">
                                                        <input type="checkbox" id={`cl_${cl.id}`} checked={formData.allowedClasses?.includes(cl.id)} onChange={() => toggleClass(cl.id)} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"/>
                                                        <label htmlFor={`cl_${cl.id}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300">{cl.name}</label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Local</label>
                            <input type="text" placeholder="Ex: Auditório Principal" className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary focus:border-primary"
                                value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                            <textarea placeholder="Detalhes do evento..." className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-primary focus:border-primary" rows={3}
                                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                        </div>
                    </div>
                )}

                {/* TAB 2: SESSIONS */}
                {modalTab === 'sessions' && (
                    <div className="space-y-4 animate-fade-in">
                        {dateLimits && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-3 text-sm text-amber-800 dark:text-amber-300">
                                📅 <strong>Restrição de Data:</strong> Este sub-evento deve ocorrer entre {formatDate(dateLimits.min)} e {formatDate(dateLimits.max)}.
                            </div>
                        )}
                        
                        <div className="border border-gray-200 dark:border-gray-600 rounded-md overflow-hidden">
                            <div className="flex bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">
                                <button type="button" onClick={() => setSessionGenTab('manual')} className={`flex-1 py-2 text-sm font-medium ${sessionGenTab === 'manual' ? 'bg-white dark:bg-darkcard text-primary dark:text-indigo-400 border-t-2 border-primary' : 'text-gray-500 dark:text-gray-400'}`}>Adicionar Manual</button>
                                <button type="button" onClick={() => setSessionGenTab('recurring')} className={`flex-1 py-2 text-sm font-medium ${sessionGenTab === 'recurring' ? 'bg-white dark:bg-darkcard text-primary dark:text-indigo-400 border-t-2 border-primary' : 'text-gray-500 dark:text-gray-400'}`}>Gerar Recorrência</button>
                            </div>
                            
                            <div className="p-4 bg-gray-50 dark:bg-gray-800/50">
                                {sessionGenTab === 'manual' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="sm:col-span-2">
                                            <label className="text-xs text-gray-500 dark:text-gray-400">Data</label>
                                            <input type="date" className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={tempSession.date} min={dateLimits?.min} max={dateLimits?.max} onChange={e => setTempSession({...tempSession, date: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 dark:text-gray-400">Início</label>
                                            <input type="time" className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={tempSession.startTime} onChange={e => setTempSession({...tempSession, startTime: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 dark:text-gray-400">Fim</label>
                                            <input type="time" className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={tempSession.endTime} onChange={e => setTempSession({...tempSession, endTime: e.target.value})} />
                                        </div>
                                        <div className="sm:col-span-2 flex items-end gap-2">
                                             <div className="flex-1">
                                                <label className="text-xs text-gray-500 dark:text-gray-400">Vagas</label>
                                                <input type="number" className="w-full border border-gray-300 dark:border-gray-600 p-1.5 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={tempSession.capacity} onChange={e => setTempSession({...tempSession, capacity: parseInt(e.target.value)})} />
                                             </div>
                                             <button type="button" onClick={handleAddSession} className="bg-white dark:bg-gray-700 border border-primary dark:border-indigo-500 text-primary dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-gray-600 px-4 py-1.5 rounded text-sm font-medium h-[34px]">+ Adicionar</button>
                                        </div>
                                    </div>
                                )}

                                {sessionGenTab === 'recurring' && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-xs text-gray-500 dark:text-gray-400">De</label>
                                                <input type="date" className="w-full border dark:border-gray-600 p-1.5 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={recurringConfig.startDate} min={dateLimits?.min} max={endOfYear} onChange={e => setRecurringConfig({...recurringConfig, startDate: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 dark:text-gray-400">Até</label>
                                                <input type="date" className="w-full border dark:border-gray-600 p-1.5 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={recurringConfig.endDate} min={dateLimits?.min} max={endOfYear} onChange={e => setRecurringConfig({...recurringConfig, endDate: e.target.value})} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                             <input type="time" className="w-full border dark:border-gray-600 p-1.5 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={recurringConfig.startTime} onChange={e => setRecurringConfig({...recurringConfig, startTime: e.target.value})} />
                                             <input type="time" className="w-full border dark:border-gray-600 p-1.5 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={recurringConfig.endTime} onChange={e => setRecurringConfig({...recurringConfig, endTime: e.target.value})} />
                                             <input type="number" placeholder="Cap." className="w-full border dark:border-gray-600 p-1.5 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={recurringConfig.capacity} onChange={e => setRecurringConfig({...recurringConfig, capacity: parseInt(e.target.value)})} />
                                        </div>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day, i) => (
                                                <button key={day} type="button" onClick={() => toggleDayOfWeek(i)} className={`text-xs w-8 h-8 rounded-full border flex items-center justify-center transition ${recurringConfig.daysOfWeek.includes(i) ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'}`}>{day.charAt(0)}</button>
                                            ))}
                                        </div>
                                        <button type="button" onClick={handleGenerateRecurring} className="w-full bg-primary text-white py-2 rounded text-sm hover:bg-indigo-700">Gerar Sessões</button>
                                    </div>
                                )}
                                {genError && <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 p-2 rounded">{genError}</div>}
                            </div>
                        </div>

                        <div>
                            <h5 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2 flex justify-between items-center">
                                Sessões Geradas
                                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">{formData.sessions?.length || 0}</span>
                            </h5>
                            <div className="border border-gray-200 dark:border-gray-700 rounded-md max-h-48 overflow-y-auto bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                                {formData.sessions?.length === 0 && <p className="text-sm text-gray-400 text-center py-6 italic">Nenhuma sessão adicionada ainda.</p>}
                                {formData.sessions?.slice().sort((a,b) => a.date.localeCompare(b.date)).map((s, i) => (
                                    <div key={i} className="p-2.5 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900 dark:text-gray-200">{formatDate(s.date)}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{s.startTime} - {s.endTime} • {s.capacity} vagas</span>
                                        </div>
                                        <button type="button" onClick={() => removeSession(i)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sticky Footer */}
            <div className="pt-4 mt-auto border-t border-gray-200 dark:border-gray-600 flex justify-between gap-3">
                 {modalTab === 'details' ? (
                     <>
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium">Cancelar</button>
                        <button type="button" onClick={() => setModalTab('sessions')} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-indigo-700 text-sm font-medium">Próximo: Sessões &rarr;</button>
                     </>
                 ) : (
                     <>
                        <button type="button" onClick={() => setModalTab('details')} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium">&larr; Voltar</button>
                        <LoadingButton type="submit" isLoading={loading} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium shadow-sm">
                            Salvar Evento
                        </LoadingButton>
                     </>
                 )}
            </div>
        </form>
      </Modal>
    </div>
  );
};
