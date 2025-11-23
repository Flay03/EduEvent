
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SchoolEvent, EventSession, Course, ClassGroup } from '../types';
import { storageService } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
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
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<any[]>([undefined]);
  const [hasNextPage, setHasNextPage] = useState(true);
  const ITEMS_PER_PAGE = 10;
  
  // Filters
  const [filters, setFilters] = useState({
      searchTerm: '',
      visibility: '',
      course: ''
  });
  
  // Interface Control
  const [modalTitle, setModalTitle] = useState('');
  const [sessionTab, setSessionTab] = useState<'manual' | 'recurring'>('manual');
  const [targetParentName, setTargetParentName] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [dateLimits, setDateLimits] = useState<{min: string, max: string} | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isParentDelete, setIsParentDelete] = useState(false);

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

  const fetchEvents = useCallback(async (page: number) => {
    setLoading(true);
    const cursor = cursors[page - 1];
    const { data, nextCursor } = await storageService.getEvents({
        limit: ITEMS_PER_PAGE,
        cursor,
        filters
    });
    // NOTE: Performance trade-off. With pagination, we can't easily show children
    // right after parents if they are on different pages. This view shows a flat list.
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
    setCursors([undefined]);
    setCurrentPage(1);
    fetchEvents(1);
  }, [filters]);

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
      setTargetParentName(null); setSessionTab('manual'); setGenError(null); setDateLimits(null);
  };

  const handleOpenNewEvent = () => {
      resetForm();
      setModalTitle('Criar Novo Evento Principal');
      setIsModalOpen(true);
  };

  const handleOpenSubEvent = useCallback((parentEvent: SchoolEvent) => {
      resetForm();
      setModalTitle(`Adicionar Sub-evento para: ${parentEvent.name}`);
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

      const start = new Date(`${startDate}T12:00:00Z`); const end = new Date(`${endDate}T12:00:00Z`);
      if (start > end) { setGenError("A data de início deve ser anterior à de fim."); return; }
      
      const newSessions: EventSession[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          if (daysOfWeek.includes(d.getUTCDay())) {
              newSessions.push({
                  id: `sess_${d.getTime()}`, date: d.toISOString().split('T')[0],
                  startTime, endTime, capacity, filled: 0
              });
          }
      }
      if (newSessions.length > 100) { setGenError("Limite de 100 sessões por vez atingido."); return; }
      if (!newSessions.length) { setGenError("Nenhuma data encontrada no intervalo."); return; }
      setFormData(prev => ({ ...prev, sessions: [...(prev.sessions || []), ...newSessions] }));
  };

  const removeSession = (index: number) => {
      setFormData(prev => ({ ...prev, sessions: prev.sessions?.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sessions?.length) { setGenError("Nome e ao menos uma sessão são obrigatórios."); return; }
    setLoading(true);
    try {
        if (formData.id) await storageService.updateEvent(formData as SchoolEvent);
        else {
            await storageService.createEvent({
                ...formData, id: `evt_${Date.now()}`, createdAt: new Date().toISOString(), createdBy: user?.uid || ''
            } as SchoolEvent);
        }
        setIsModalOpen(false); resetForm(); resetData();
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const confirmDelete = async () => {
    if (deleteId) {
        await storageService.deleteEvent(deleteId);
        setDeleteId(null); resetData();
    }
  }

  const toggleCourse = (id: string) => setFormData(prev => ({ ...prev, allowedCourses: prev.allowedCourses?.includes(id) ? prev.allowedCourses.filter(c => c !== id) : [...(prev.allowedCourses || []), id] }));
  const toggleClass = (id: string) => setFormData(prev => ({ ...prev, allowedClasses: prev.allowedClasses?.includes(id) ? prev.allowedClasses.filter(c => c !== id) : [...(prev.allowedClasses || []), id] }));
  const toggleDayOfWeek = (day: number) => setRecurringConfig(prev => ({ ...prev, daysOfWeek: prev.daysOfWeek.includes(day) ? prev.daysOfWeek.filter(d => d !== day) : [...prev.daysOfWeek, day] }));

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Eventos</h1>
        <div className="flex flex-col xl:flex-row gap-2 w-full lg:w-auto items-center">
            <div className="w-full xl:w-64">
                <input type="text" placeholder="Buscar evento..." 
                    className="w-full border-gray-300 rounded-md bg-white text-gray-900"
                    value={filters.searchTerm} onChange={e => handleFilterChange('searchTerm', e.target.value)} />
            </div>
            <div className="flex gap-2 w-full xl:w-auto">
                <select className="w-full border-gray-300 rounded-md bg-white text-gray-900"
                    value={filters.visibility} onChange={e => handleFilterChange('visibility', e.target.value)}>
                    <option value="">Visibilidade</option>
                    <option value="public">Público</option><option value="course">Por Curso</option><option value="class">Por Turma</option>
                </select>
                <select className="w-full border-gray-300 rounded-md bg-white text-gray-900"
                    value={filters.course} onChange={e => handleFilterChange('course', e.target.value)}>
                    <option value="">Todos os Cursos</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            <button onClick={handleOpenNewEvent} className="w-full xl:w-auto bg-primary text-white px-6 py-2 rounded-md font-bold whitespace-nowrap">
            + Novo Evento
            </button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {loading && <li className="px-6 py-12 text-center text-gray-500">Carregando eventos...</li>}
          {!loading && events.map((evt) => (
              <AdminEventRow key={evt.id} evt={evt}
                onOpenSubEvent={handleOpenSubEvent} onManageEnrollments={handleManageEnrollments}
                onEdit={handleEditEvent} onDelete={requestDelete} />
          ))}
          {!loading && events.length === 0 && (
            <li className="px-6 py-12 text-center text-gray-500">Nenhum evento encontrado.</li>
          )}
        </ul>
      </div>

      <div className="flex justify-between items-center mt-4">
        <button onClick={handlePrevPage} disabled={currentPage === 1 || loading} className="px-4 py-2 bg-white border rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50">Anterior</button>
        <span className="text-sm text-gray-500">Página {currentPage}</span>
        <button onClick={handleNextPage} disabled={!hasNextPage || loading} className="px-4 py-2 bg-white border rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50">Próximo</button>
      </div>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirmar Exclusão">
          <div>
              <p>Tem certeza que deseja excluir este evento?</p>
              {isParentDelete && <p className="text-red-600 font-bold">Atenção: Todos os sub-eventos vinculados também serão excluídos.</p>}
              <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => setDeleteId(null)} className="px-4 py-2 bg-gray-100 rounded">Cancelar</button>
                  <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 rounded text-white font-bold">Confirmar</button>
              </div>
          </div>
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalTitle}>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto px-1">
            <input type="text" required placeholder="Nome do Evento" className="w-full border rounded p-2 bg-white text-gray-900"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            
            <div className={targetParentName ? 'opacity-50 pointer-events-none' : ''}>
                <select value={formData.visibility} onChange={e => setFormData({...formData, visibility: e.target.value as any})}
                    className="w-full border rounded p-2 bg-white text-gray-900" disabled={!!targetParentName}>
                    <option value="public">Público</option><option value="course">Restrito a Cursos</option><option value="class">Restrito a Turmas</option>
                </select>
                {formData.visibility === 'course' && <div className="p-2 border rounded max-h-40 overflow-y-auto">{courses.map(c => <div key={c.id}><input type="checkbox" id={`c_${c.id}`} checked={formData.allowedCourses?.includes(c.id)} onChange={() => toggleCourse(c.id)}/><label htmlFor={`c_${c.id}`}>{c.name}</label></div>)}</div>}
                {formData.visibility === 'class' && <div className="p-2 border rounded max-h-40 overflow-y-auto">{courses.map(c => <div key={c.id}><strong>{c.name}</strong>{classes.filter(cl => cl.courseId === c.id).map(cl => <div key={cl.id}><input type="checkbox" id={`cl_${cl.id}`} checked={formData.allowedClasses?.includes(cl.id)} onChange={() => toggleClass(cl.id)}/><label htmlFor={`cl_${cl.id}`}>{cl.name}</label></div>)}</div>)}</div>}
            </div>

            <textarea placeholder="Descrição" className="w-full border rounded p-2 bg-white text-gray-900" rows={2}
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            <input type="text" placeholder="Local" className="w-full border rounded p-2 bg-white text-gray-900"
                value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />

            <div className="border-t pt-4">
                <h4>Gerenciar Sessões</h4>
                {dateLimits && <div className="bg-blue-100 p-2 rounded text-sm">Restrição de Data Ativa: {formatDate(dateLimits.min)} a {formatDate(dateLimits.max)}.</div>}
                
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-t-md">
                    <button type="button" onClick={() => setSessionTab('manual')} className={`flex-1 py-2 text-sm rounded-md ${sessionTab === 'manual' ? 'bg-white text-primary shadow' : 'text-gray-500'}`}>Manual</button>
                    <button type="button" onClick={() => setSessionTab('recurring')} className={`flex-1 py-2 text-sm rounded-md ${sessionTab === 'recurring' ? 'bg-white text-primary shadow' : 'text-gray-500'}`}>Recorrência</button>
                </div>

                {sessionTab === 'manual' && (
                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-b-md border">
                        <input type="date" className="border p-1 rounded text-sm bg-white text-gray-900" value={tempSession.date} min={dateLimits?.min} max={dateLimits?.max} onChange={e => setTempSession({...tempSession, date: e.target.value})} />
                        <input type="number" placeholder="Capacidade" className="border p-1 rounded text-sm bg-white text-gray-900" value={tempSession.capacity} onChange={e => setTempSession({...tempSession, capacity: parseInt(e.target.value)})} />
                        <input type="time" className="border p-1 rounded text-sm bg-white text-gray-900" value={tempSession.startTime} onChange={e => setTempSession({...tempSession, startTime: e.target.value})} />
                        <input type="time" className="border p-1 rounded text-sm bg-white text-gray-900" value={tempSession.endTime} onChange={e => setTempSession({...tempSession, endTime: e.target.value})} />
                        <button type="button" onClick={handleAddSession} className="col-span-2 mt-2 bg-white border border-primary text-primary py-2 rounded text-sm">+ Adicionar Sessão</button>
                    </div>
                )}

                {sessionTab === 'recurring' && (
                    <div className="bg-indigo-50 p-3 rounded-b-md space-y-3 border">
                        <div className="grid grid-cols-2 gap-2">
                            <input type="date" className="w-full border p-1 rounded text-sm bg-white text-gray-900" value={recurringConfig.startDate} min={dateLimits?.min} max={endOfYear} onChange={e => setRecurringConfig({...recurringConfig, startDate: e.target.value})} />
                            <input type="date" className="w-full border p-1 rounded text-sm bg-white text-gray-900" value={recurringConfig.endDate} min={dateLimits?.min} max={endOfYear} onChange={e => setRecurringConfig({...recurringConfig, endDate: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                             <input type="time" className="w-full border p-1 rounded text-sm bg-white text-gray-900" value={recurringConfig.startTime} onChange={e => setRecurringConfig({...recurringConfig, startTime: e.target.value})} />
                             <input type="time" className="w-full border p-1 rounded text-sm bg-white text-gray-900" value={recurringConfig.endTime} onChange={e => setRecurringConfig({...recurringConfig, endTime: e.target.value})} />
                             <input type="number" className="w-full border p-1 rounded text-sm bg-white text-gray-900" value={recurringConfig.capacity} onChange={e => setRecurringConfig({...recurringConfig, capacity: parseInt(e.target.value)})} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day, i) => (
                                <button key={day} type="button" onClick={() => toggleDayOfWeek(i)} className={`text-xs px-3 py-1.5 rounded border ${recurringConfig.daysOfWeek.includes(i) ? 'bg-primary text-white' : 'bg-white'}`}>{day}</button>
                            ))}
                        </div>
                        {genError && <div className="text-xs text-red-600 p-2 rounded">{genError}</div>}
                        <button type="button" onClick={handleGenerateRecurring} className="w-full bg-primary text-white py-2 rounded text-sm">Gerar Sessões</button>
                    </div>
                )}
                
                <div className="mt-4 space-y-2">
                    <h5 className="text-xs font-bold text-gray-500">Sessões Geradas ({formData.sessions?.length || 0})</h5>
                    <div className="max-h-40 overflow-y-auto space-y-1 border rounded p-2 bg-gray-50">
                        {formData.sessions?.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Nenhuma sessão</p>}
                        {formData.sessions?.slice().sort((a,b) => a.date.localeCompare(b.date)).map((s, i) => (
                            <div key={i} className="text-xs bg-white border p-2 rounded flex justify-between items-center">
                                <span>{formatDate(s.date)} | {s.startTime}-{s.endTime} | {s.capacity} vagas</span>
                                <button type="button" onClick={() => removeSession(i)} className="text-red-500">×</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="pt-4">
                {genError && <div className="mb-2 text-sm text-red-600 text-center">{genError}</div>}
                <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-3 rounded-md disabled:opacity-50 font-bold">{loading ? 'Salvando...' : 'Confirmar'}</button>
            </div>
        </form>
      </Modal>
    </div>
  );
};