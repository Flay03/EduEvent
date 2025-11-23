
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SchoolEvent } from '../types';
import { storageService } from '../services/storage';
import { formatDate } from '../utils/formatters';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { MobileInput } from '../components/MobileInput'; // Reused for search input style

// Helper to safely format a value for CSV
const escapeCsv = (value: any): string => {
    const str = String(value == null ? '' : value);
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

export const AdminEventEnrollments: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [event, setEvent] = useState<SchoolEvent | null>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { addToast } = useToast();

    const loadData = async () => {
        if (!id) return;
        setLoading(true);
        const evt = await storageService.getEventById(id);
        setEvent(evt || null);
        const enr = await storageService.getEnrichedEnrollments(id);
        setEnrollments(enr);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const handleExport = () => {
        if (filteredEnrollments.length === 0) return;
        
        const headers = ['Nome', 'Email', 'RM', 'Data Sessão', 'Horário', 'Data Inscrição'];
        const csvContent = [
            headers.join(','),
            ...filteredEnrollments.map(row => {
                return [
                    escapeCsv(row.user.name),
                    escapeCsv(row.user.email),
                    escapeCsv(row.user.rm),
                    escapeCsv(formatDate(row.session.date)),
                    escapeCsv(`${row.session.startTime} - ${row.session.endTime}`),
                    escapeCsv(new Date(row.enrolledAt).toLocaleString('pt-BR'))
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel compatibility
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `inscritos_${event?.name.replace(/\s+/g, '_') || 'evento'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const confirmDelete = async () => {
        if (deleteId) {
            setProcessing(true);
            try {
                await storageService.cancelEnrollment(deleteId);
                addToast('success', 'Inscrição removida.');
                setDeleteId(null);
                loadData();
            } catch (e) {
                addToast('error', 'Erro ao remover inscrição.');
            } finally {
                setProcessing(false);
            }
        }
    };

    const filteredEnrollments = enrollments.filter(enr => 
        enr.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enr.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enr.user.rm?.includes(searchTerm)
    );

    if (loading) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Carregando lista de inscritos...</div>;
    if (!event) return <div className="p-8 text-center text-red-500">Evento não encontrado.</div>;

    return (
        <div className="space-y-6 pb-20"> {/* pb-20 for scrolling on mobile */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center space-x-3 pt-2">
                    <Link to="/admin/events" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 flex-shrink-0 transition-colors">
                        <span className="sr-only">Voltar</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </Link>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight truncate">Inscritos</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{event.name}</p>
                    </div>
                    <button 
                        onClick={handleExport}
                        disabled={filteredEnrollments.length === 0}
                        className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 disabled:opacity-50"
                        title="Exportar CSV"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </button>
                </div>
                
                <div className="w-full">
                     <input 
                        type="text" 
                        placeholder="Buscar por nome, RM ou email..." 
                        className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-base shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {filteredEnrollments.length === 0 ? (
                <EmptyState title="Nenhum inscrito" description={searchTerm ? "Nenhum aluno encontrado para esta busca." : "Nenhum inscrito neste evento até o momento."} />
            ) : (
                <>
                    {/* Mobile Hint for Table Scroll */}
                    <div className="md:hidden flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 mb-2 animate-pulse">
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span>Deslize a tabela para ver mais</span>
                    </div>

                    <div className="hidden md:block bg-white dark:bg-darkcard shadow overflow-hidden sm:rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aluno</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">RM / Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sessão</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Inscrito em</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-darkcard divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredEnrollments.map((enr) => (
                                    <tr key={enr.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{enr.user.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-gray-200">{enr.user.rm || '-'}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{enr.user.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-gray-200">{formatDate(enr.session.date)}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{enr.session.startTime} - {enr.session.endTime}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(enr.enrolledAt).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button 
                                                onClick={() => setDeleteId(enr.id)}
                                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 font-bold"
                                            >
                                                Remover
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="md:hidden space-y-4">
                        {filteredEnrollments.map((enr) => (
                            <div key={enr.id} className="bg-white dark:bg-darkcard shadow-sm rounded-xl p-5 border border-gray-100 dark:border-gray-700 flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{enr.user.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{enr.user.email}</p>
                                    </div>
                                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded font-bold">
                                        RM: {enr.user.rm || '-'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                                    <div>
                                        <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wide mb-1">Sessão</span>
                                        <span className="block font-medium text-gray-800 dark:text-gray-200">{formatDate(enr.session.date)}</span>
                                        <span className="block text-xs text-gray-500 dark:text-gray-400">{enr.session.startTime} - {enr.session.endTime}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wide mb-1">Inscrito em</span>
                                        <span className="block text-gray-600 dark:text-gray-300">{new Date(enr.enrolledAt).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setDeleteId(enr.id)}
                                    className="w-full h-12 text-base text-red-600 dark:text-red-400 font-bold border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition active:scale-[0.98]"
                                >
                                    Remover Inscrição
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <ConfirmDialog 
              isOpen={!!deleteId}
              onClose={() => setDeleteId(null)}
              onConfirm={confirmDelete}
              title="Remover Inscrição"
              message="Tem certeza que deseja remover a inscrição deste aluno? A vaga será liberada imediatamente."
              confirmText="Confirmar Remoção"
              isProcessing={processing}
            />
        </div>
    );
};
