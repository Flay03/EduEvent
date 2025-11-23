import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { SchoolEvent, Enrollment } from '../types';
import { storageService } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { formatDate } from '../utils/formatters';
import { useEnrollmentHandler } from '../hooks/useEnrollmentHandler';
import { LoadingButton } from '../components/LoadingButton';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const EventDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [parentEvent, setParentEvent] = useState<SchoolEvent | null>(null);
    const [childEvents, setChildEvents] = useState<SchoolEvent[]>([]);
    const [myEnrollments, setMyEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedEventForEnroll, setSelectedEventForEnroll] = useState<SchoolEvent | null>(null);
    const [cancelId, setCancelId] = useState<string | null>(null);

    const loadData = useCallback(async (showLoading = true) => {
        if (!id || !user) return;
        if (showLoading) setLoading(true);
        try {
            const [pEvent, children, enrollments] = await Promise.all([
                storageService.getEventById(id),
                storageService.getEventsByParentId(id),
                storageService.getEnrollmentsForUser(user.uid)
            ]);
            
            if (!pEvent) {
                navigate('/dashboard');
                return;
            }

            setParentEvent(pEvent);
            setChildEvents(children);
            setMyEnrollments(enrollments);

        } catch (error) {
            console.error(error);
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [id, user, navigate]);

    const onEnrollSuccess = useCallback(() => {
        // Keeps modal open, just refreshes data silently
        loadData(false);
        setCancelId(null);
    }, [loadData]);

    const { handleEnroll, handleCancel, isProcessing, conflictData, clearState } = useEnrollmentHandler(user, onEnrollSuccess);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (selectedEventForEnroll) {
            const allEvents = [parentEvent, ...childEvents].filter(Boolean) as SchoolEvent[];
            const updatedEvent = allEvents.find(e => e.id === selectedEventForEnroll.id);
            if (updatedEvent && JSON.stringify(updatedEvent) !== JSON.stringify(selectedEventForEnroll)) {
                setSelectedEventForEnroll(updatedEvent);
            }
        }
    }, [parentEvent, childEvents, selectedEventForEnroll]);

    const getEnrollment = (eventId: string, sessionId: string) => {
        return myEnrollments.find(e => e.eventId === eventId && e.sessionId === sessionId);
    };

    const openEnrollModal = (event: SchoolEvent) => {
        clearState();
        setSelectedEventForEnroll(event);
    }

    if (loading) return <div className="p-12 text-center text-gray-500 dark:text-gray-400 font-medium">Carregando detalhes do evento...</div>;
    if (!parentEvent) return <div className="p-12 text-center text-red-500 dark:text-red-400 font-bold">Evento não encontrado.</div>;

    return (
        <div className="space-y-8 pb-12">
            <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2">
                    <li><Link to="/dashboard" className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-indigo-400 font-medium transition">Eventos</Link></li>
                    <li><span className="text-gray-300 dark:text-gray-600">/</span></li>
                    <li className="text-gray-900 dark:text-white font-semibold" aria-current="page">{parentEvent.name}</li>
                </ol>
            </nav>

            <div className="bg-white dark:bg-darkcard rounded-2xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700 relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-indigo-400"></div>
                <div className="p-8 md:p-10">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
                        <div className="flex-1">
                            <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wide mb-4 border border-indigo-100 dark:border-indigo-900/50">
                                Evento Principal
                            </div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">{parentEvent.name}</h1>
                            <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-6 max-w-4xl">{parentEvent.description}</p>
                            
                            <div className="flex flex-wrap items-center gap-6 text-gray-500 dark:text-gray-400 text-sm font-medium">
                                <div className="flex items-center bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                                    <span className="mr-2 text-xl">📍</span> {parentEvent.location}
                                </div>
                                <div className="flex items-center bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                                    <span className="mr-2 text-xl">📅</span> {parentEvent.sessions.length} Sessões Principais
                                </div>
                            </div>
                        </div>

                        {parentEvent.sessions.length > 0 && (
                            <div className="flex-shrink-0">
                                <button 
                                    onClick={() => openEnrollModal(parentEvent)}
                                    className="w-full md:w-auto bg-primary hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition transform hover:-translate-y-1 flex items-center justify-center"
                                >
                                    Ver Programação Geral
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Atividades & Sub-eventos</h2>
                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
            </div>

            {childEvents.length === 0 ? (
                <div className="bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
                    <div className="text-4xl mb-3 opacity-30">📂</div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma atividade específica cadastrada para este evento ainda.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {childEvents.map(child => {
                        const singleSession = child.sessions.length === 1 ? child.sessions[0] : null;
                        const capacity = singleSession ? singleSession.capacity : 0;
                        const filled = singleSession ? singleSession.filled : 0;
                        const occupancy = capacity > 0 ? (filled / capacity) * 100 : 0;
                        const isFull = capacity > 0 && filled >= capacity;
                        
                        // Check if enrolled in ANY session of this child event to update button state
                        const isEnrolledAny = child.sessions.some(s => getEnrollment(child.id, s.id));

                        return (
                            <div key={child.id} className="group bg-white dark:bg-darkcard rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col relative">
                                <div className="absolute top-0 left-0 w-1 h-full bg-gray-200 dark:bg-gray-700 group-hover:bg-primary transition-colors"></div>
                                <div className="p-6 flex-1 flex flex-col ml-1">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary dark:group-hover:text-indigo-400 transition-colors">{child.name}</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-3 mb-4 flex-1">{child.description}</p>
                                    
                                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mt-auto pt-4 border-t border-gray-50 dark:border-gray-700">
                                        <div className="flex items-center">
                                            <span className="w-6 text-center mr-2 text-gray-400 dark:text-gray-500">📍</span>
                                            <span className="font-medium">{child.location}</span>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="w-6 text-center mr-2 text-gray-400 dark:text-gray-500">📅</span>
                                            <span className="font-medium">
                                                {child.sessions.length > 1 
                                                    ? `${child.sessions.length} opções de horário` 
                                                    : `${formatDate(singleSession?.date)} • ${singleSession?.startTime}`
                                                }
                                            </span>
                                        </div>
                                    </div>

                                    {singleSession && (
                                        <div className="mt-4">
                                            <div className="flex justify-between text-xs mb-1 font-bold">
                                                <span className={isFull ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}>
                                                    {isFull ? 'LOTADO' : `${capacity - filled} vagas`}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                                                <div className={`h-full rounded-full ${isFull ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${occupancy}%` }}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={() => openEnrollModal(child)}
                                    className={`w-full py-3 font-bold text-sm transition-colors border-t border-gray-100 dark:border-gray-700
                                        ${isEnrolledAny 
                                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40' 
                                            : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-primary hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white text-primary dark:text-indigo-300'}`}
                                >
                                    {isEnrolledAny ? 'Gerenciar Inscrição' : (child.sessions.length > 1 ? 'Escolher Horário' : isFull ? 'Ver Detalhes' : 'Inscrever-se Agora')}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal 
                isOpen={!!selectedEventForEnroll} 
                onClose={() => setSelectedEventForEnroll(null)} 
                title={selectedEventForEnroll ? selectedEventForEnroll.name : ''}
            >
                <div className="space-y-6">
                     <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{selectedEventForEnroll?.description}</p>
                     </div>
                    
                    {conflictData && (
                        <div className="bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-400 p-4 rounded-r-md">
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
                            {selectedEventForEnroll?.sessions.map(session => {
                                const enrollment = getEnrollment(selectedEventForEnroll.id, session.id);
                                const enrolled = !!enrollment;
                                const full = session.filled >= session.capacity;
                                const occupancy = (session.filled / session.capacity) * 100;
                                
                                return (
                                    <div key={session.id} className={`relative border rounded-lg p-4 transition-all ${enrolled ? 'border-green-500 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500' : full ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-90' : 'border-gray-200 dark:border-gray-700 hover:border-primary hover:shadow-md bg-white dark:bg-darkcard'}`}>
                                        <div className="flex flex-col sm:flex-row justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-gray-900 dark:text-white text-lg">{formatDate(session.date)}</span>
                                                    {enrolled && <span className="bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Inscrito</span>}
                                                </div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-4">
                                                    <span className="flex items-center">🕒 {session.startTime} - {session.endTime}</span>
                                                </div>
                                                
                                                <div className="mt-3 flex items-center gap-3">
                                                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${full ? 'bg-red-500' : occupancy > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(occupancy, 100)}%` }}></div>
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
                                                        className="w-full sm:w-auto bg-white dark:bg-gray-800 border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 font-bold py-2 px-4 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-sm"
                                                    >
                                                        Cancelar
                                                    </button>
                                                ) : (
                                                    <LoadingButton
                                                        onClick={() => selectedEventForEnroll && handleEnroll(selectedEventForEnroll, session.id)}
                                                        isLoading={isProcessing}
                                                        disabled={full}
                                                        className={`w-full sm:w-auto ${full ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed' : ''}`}
                                                    >
                                                        {full ? 'Lotado' : 'Inscrever'}
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