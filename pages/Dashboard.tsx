
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SchoolEvent, Enrollment } from '../types';
import { storageService } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/formatters';
import { useEnrollmentHandler } from '../hooks/useEnrollmentHandler';
import { useDebounce } from '../hooks/useDebounce';
import { SkeletonDashboardCard } from '../components/Skeletons';
import { EmptyState } from '../components/EmptyState';
import { LoadingButton } from '../components/LoadingButton';
import { ConfirmDialog } from '../components/ConfirmDialog';

// --- Sub-component for Memoization ---
interface DashboardEventCardProps {
    event: SchoolEvent;
    hasChildren: boolean;
    onAction: (event: SchoolEvent) => void;
}

const DashboardEventCard = React.memo(({ event, hasChildren, onAction }: DashboardEventCardProps) => {
    // Helper to determine status and capacity presentation
    const singleSession = !hasChildren && event.sessions.length === 1 ? event.sessions[0] : null;
    
    // Calculate generic stats if single session
    const capacity = singleSession ? singleSession.capacity : 0;
    const filled = singleSession ? singleSession.filled : 0;
    const occupancy = capacity > 0 ? (filled / capacity) * 100 : 0;
    const isFull = capacity > 0 && filled >= capacity;
    
    // Badge Logic
    let visibilityColor = 'bg-indigo-500';
    let visibilityLabel = 'Público';
    if (event.visibility === 'course') { visibilityColor = 'bg-emerald-500'; visibilityLabel = 'Meu Curso'; }
    if (event.visibility === 'class') { visibilityColor = 'bg-purple-500'; visibilityLabel = 'Minha Turma'; }

    return (
        <div className="group bg-white dark:bg-darkcard rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col h-full relative animate-fade-in hover:-translate-y-1">
            {/* Colored accent bar */}
            <div className={`absolute top-0 left-0 w-1.5 h-full ${visibilityColor} opacity-80`}></div>
            
            <div className="p-5 flex-1 flex flex-col ml-2">
                <div className="flex justify-between items-start mb-3">
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md ${visibilityColor} bg-opacity-10 dark:bg-opacity-20 text-gray-700 dark:text-gray-200`}>
                        {visibilityLabel}
                    </span>
                    {hasChildren ? (
                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-full font-medium border border-gray-200 dark:border-gray-600">
                            Evento Principal
                        </span>
                    ) : (
                        isFull && singleSession ? (
                            <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs px-2 py-1 rounded-full font-bold flex items-center">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></span>
                                Esgotado
                            </span>
                        ) : (
                            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs px-2 py-1 rounded-full font-bold flex items-center">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                                Inscrições Abertas
                            </span>
                        )
                    )}
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight mb-2 group-hover:text-primary dark:group-hover:text-indigo-400 transition-colors">
                    {event.name}
                </h3>
                
                <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-4 flex-1">
                    {event.description}
                </p>

                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mt-auto">
                    <div className="flex items-center">
                        <div className="w-8 flex justify-center text-gray-400 dark:text-gray-500 mr-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <span className="font-medium">{event.location}</span>
                    </div>
                    
                    <div className="flex items-center">
                        <div className="w-8 flex justify-center text-gray-400 dark:text-gray-500 mr-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <span className="font-medium">
                             {hasChildren 
                                ? 'Ver programação completa' 
                                : event.sessions.length > 1 
                                    ? `${event.sessions.length} horários disponíveis`
                                    : `${formatDate(singleSession?.date)} • ${singleSession?.startTime}`
                            }
                        </span>
                    </div>
                </div>

                {/* Single Session Capacity Indicator */}
                {!hasChildren && singleSession && (
                    <div className="mt-4">
                        <div className="flex justify-between text-xs mb-1 font-medium">
                            <span className={isFull ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}>
                                {isFull ? 'Sem vagas' : `${capacity - filled} vagas restantes`}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500">{Math.round(occupancy)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : occupancy > 80 ? 'bg-amber-400' : 'bg-emerald-500'}`} 
                                style={{ width: `${occupancy}%` }}
                            ></div>
                        </div>
                    </div>
                )}
            </div>

            <button 
                onClick={() => onAction(event)}
                className="w-full py-3 text-sm font-bold text-primary dark:text-indigo-300 bg-indigo-50 dark:bg-gray-800/50 hover:bg-primary hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white transition-colors border-t border-indigo-100 dark:border-gray-700 flex justify-center items-center"
            >
                {hasChildren ? 'Explorar Evento' : 'Ver Detalhes e Inscrever'}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>
    );
});

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [selectedEvent, setSelectedEvent] = useState<SchoolEvent | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const loadData = useCallback(async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setLoading(true);
    const [availableEvents, enrollments] = await Promise.all([
        storageService.getAvailableEventsForUser(user),
        storageService.getEnrollmentsForUser(user.uid)
    ]);
    setEvents(availableEvents);
    setMyEnrollments(enrollments);
    if (showLoading) setLoading(false);
  }, [user]);

  const onActionSuccess = useCallback(() => {
      loadData(false);
      setCancelId(null);
  }, [loadData]);
  
  const { handleEnroll, handleCancel, isProcessing, conflictData, clearState } = useEnrollmentHandler(user, onActionSuccess);
  
  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterDate, setFilterDate] = useState('');
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedEvent) {
        const updated = events.find(e => e.id === selectedEvent.id);
        if (updated && JSON.stringify(updated) !== JSON.stringify(selectedEvent)) {
            setSelectedEvent(updated);
        }
    }
  }, [events, selectedEvent]);

  const parentIds = useMemo(() => {
      const ids = new Set<string>();
      events.forEach(e => {
          if (e.parentId) {
              ids.add(e.parentId);
          }
      });
      return ids;
  }, [events]);

  const filteredEvents = useMemo(() => {
      const today = new Date().toISOString().split('T')[0];

      return events.filter(evt => {
          if (evt.parentId) return false;

          const matchesSearch = evt.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
                                evt.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
          
          const children = events.filter(c => c.parentId === evt.id);
          const allSessions = [...evt.sessions, ...children.flatMap(c => c.sessions)];
          
          const matchesDate = filterDate 
              ? allSessions.some(s => s.date === filterDate) 
              : true;

          const isFutureOrActive = showPastEvents || allSessions.some(s => s.date >= today);

          return matchesSearch && matchesDate && isFutureOrActive;
      });
  }, [events, debouncedSearchTerm, filterDate, showPastEvents]);

  useEffect(() => {
      setCurrentPage(1);
  }, [debouncedSearchTerm, filterDate, showPastEvents]);

  const paginatedEvents = useMemo(() => {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      return filteredEvents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEvents, currentPage]);

  const getEnrollment = (eventId: string, sessionId: string) => {
      return myEnrollments.find(e => e.eventId === eventId && e.sessionId === sessionId);
  };

  const handleEventAction = useCallback((event: SchoolEvent) => {
      if (parentIds.has(event.id)) {
          navigate(`/event/${event.id}`);
      } else {
          clearState(); 
          setSelectedEvent(event);
      }
  }, [parentIds, navigate, clearState]);

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Dashboard de Eventos</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Explore e inscreva-se nas atividades disponíveis para seu perfil.</p>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-darkcard p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col lg:flex-row gap-4 items-end transition-colors duration-200">
          <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Buscar Evento</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                </div>
                <input 
                    type="text" 
                    placeholder="Nome, descrição, local..." 
                    className="pl-10 w-full border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white py-2.5 transition-colors"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
          </div>
          <div className="w-full lg:w-48">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Data Específica</label>
              <input 
                type="date" 
                className="w-full border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white py-2.5 transition-colors"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
              />
          </div>
          <div className="w-full lg:w-auto pb-2">
             <label className="flex items-center space-x-2 cursor-pointer">
                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input 
                        type="checkbox" 
                        name="toggle" 
                        id="toggle" 
                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                        checked={showPastEvents}
                        onChange={(e) => setShowPastEvents(e.target.checked)}
                        style={{right: showPastEvents ? '0' : 'auto', left: showPastEvents ? 'auto' : '0', borderColor: showPastEvents ? '#4F46E5' : '#E5E7EB'}}
                    />
                    <label htmlFor="toggle" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${showPastEvents ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}></label>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mostrar Passados</span>
             </label>
          </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonDashboardCard key={i} />)}
        </div>
      ) : filteredEvents.length === 0 ? (
          <EmptyState 
            title="Nenhum evento encontrado"
            description={events.length === 0 
                ? "Não há eventos disponíveis para o seu curso ou turma no momento." 
                : showPastEvents 
                    ? "Nenhum evento corresponde aos filtros de busca."
                    : "Não há eventos futuros correspondentes. Tente ativar 'Mostrar Passados'."
            }
            action={!showPastEvents && events.length > 0 ? {
                label: "Ver histórico de eventos",
                onClick: () => setShowPastEvents(true)
            } : undefined}
          />
      ) : (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedEvents.map(event => (
                    <DashboardEventCard 
                        key={event.id} 
                        event={event} 
                        hasChildren={parentIds.has(event.id)}
                        onAction={handleEventAction}
                    />
                ))}
            </div>
            
            <Pagination 
                currentPage={currentPage}
                totalItems={filteredEvents.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
            />
        </>
      )}

      <Modal 
        isOpen={!!selectedEvent} 
        onClose={() => setSelectedEvent(null)} 
        title={selectedEvent ? selectedEvent.name : ''}
      >
        <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{selectedEvent?.description}</p>
            </div>
            
            {conflictData && (
                <div className="bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-400 p-4 rounded-r-md animate-slide-in">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">Conflito de Horário</h3>
                            <div className="mt-2 text-sm text-amber-700 dark:text-amber-200">
                                <p className="mb-2">Você já possui compromisso neste horário:</p>
                                <div className="bg-white dark:bg-gray-800 bg-opacity-50 p-2 rounded border border-amber-200 dark:border-amber-700">
                                    <p className="font-semibold">{conflictData.name}</p>
                                    <p className="text-xs">{conflictData.time}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                    <span className="bg-primary h-6 w-1 rounded mr-2"></span>
                    Selecione uma Sessão
                </h4>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {selectedEvent?.sessions.map(session => {
                        const enrollment = getEnrollment(selectedEvent.id, session.id);
                        const enrolled = !!enrollment;
                        const full = session.filled >= session.capacity;
                        const occupancy = (session.filled / session.capacity) * 100;
                        const isPast = session.date < new Date().toISOString().split('T')[0];
                        
                        return (
                            <div key={session.id} className={`relative border rounded-lg p-4 transition-all duration-200 
                                ${enrolled 
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500' 
                                    : full || isPast 
                                        ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-70' 
                                        : 'border-gray-200 dark:border-gray-700 hover:border-primary hover:shadow-md bg-white dark:bg-darkcard'
                                }`}>
                                <div className="flex flex-col sm:flex-row justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-gray-900 dark:text-white text-lg">{formatDate(session.date)}</span>
                                            {enrolled && <span className="bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Inscrito</span>}
                                            {isPast && !enrolled && <span className="bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Encerrado</span>}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-4">
                                            <span className="flex items-center">🕒 {session.startTime} - {session.endTime}</span>
                                        </div>
                                        
                                        <div className="mt-3 flex items-center gap-3">
                                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${full ? 'bg-red-500' : occupancy > 80 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(occupancy, 100)}%` }}></div>
                                            </div>
                                            <span className={`text-xs font-bold w-24 text-right ${full ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                                {full ? 'ESGOTADO' : `${session.capacity - session.filled} vagas`}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center">
                                        {enrolled ? (
                                            <button 
                                                onClick={() => enrollment && setCancelId(enrollment.id)}
                                                className="w-full sm:w-auto bg-white dark:bg-gray-800 border border-red-300 text-red-600 dark:text-red-400 font-bold py-2 px-4 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-sm"
                                            >
                                                Cancelar
                                            </button>
                                        ) : (
                                            <LoadingButton
                                                onClick={() => selectedEvent && handleEnroll(selectedEvent, session.id)}
                                                isLoading={isProcessing}
                                                disabled={full || isPast}
                                                className={`w-full sm:w-auto ${full || isPast ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed hover:bg-gray-300' : ''}`}
                                            >
                                                {isPast ? 'Encerrado' : full ? 'Lotado' : 'Garantir Vaga'}
                                            </LoadingButton>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
      </Modal>

      <ConfirmDialog 
        isOpen={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={() => cancelId && handleCancel(cancelId)}
        title="Cancelar Inscrição"
        message="Tem certeza que deseja cancelar sua inscrição? A vaga será liberada imediatamente."
        confirmText="Sim, Cancelar"
        isProcessing={isProcessing}
      />
    </div>
  );
};
