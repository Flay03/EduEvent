import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SchoolEvent } from '../types';
import { storageService } from '../services/storage';
import { formatDate } from '../utils/formatters';
import { Modal } from '../components/Modal';

export const AdminEventEnrollments: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [event, setEvent] = useState<SchoolEvent | null>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

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
        if (enrollments.length === 0) return;
        
        // Prepare CSV data
        const headers = ['Nome', 'Email', 'RM', 'Data Sessão', 'Horário', 'Data Inscrição'];
        const csvContent = [
            headers.join(','),
            ...enrollments.map(row => {
                return [
                    JSON.stringify(row.user.name),
                    JSON.stringify(row.user.email),
                    JSON.stringify(row.user.rm),
                    JSON.stringify(formatDate(row.session.date)),
                    JSON.stringify(`${row.session.startTime} - ${row.session.endTime}`),
                    JSON.stringify(new Date(row.enrolledAt).toLocaleString('pt-BR'))
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
            await storageService.cancelEnrollment(deleteId);
            setDeleteId(null);
            loadData();
        }
    };

    // Filtering
    const filteredEnrollments = enrollments.filter(enr => 
        enr.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enr.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enr.user.rm?.includes(searchTerm)
    );

    if (loading) return <div className="p-8 text-center">Carregando...</div>;
    if (!event) return <div className="p-8 text-center">Evento não encontrado.</div>;

    return (
        <div className="space-y-6">
            {/* Responsive Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                    <Link to="/admin/events" className="text-gray-500 hover:text-gray-700 font-medium flex-shrink-0">
                        <span className="sr-only">Voltar</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Inscritos</h1>
                        <p className="text-sm text-gray-500 truncate max-w-[200px] sm:max-w-md">{event.name}</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                     <input 
                        type="text" 
                        placeholder="Buscar aluno..." 
                        className="flex-1 sm:w-64 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary bg-white text-gray-900"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <button 
                        onClick={handleExport}
                        disabled={enrollments.length === 0}
                        className="w-auto bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
                        title="Exportar CSV"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span className="hidden sm:inline">CSV</span>
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {filteredEnrollments.length === 0 ? (
                <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
                    {searchTerm ? "Nenhum aluno encontrado para esta busca." : "Nenhum inscrito neste evento até o momento."}
                </div>
            ) : (
                <>
                    {/* Desktop View: Table */}
                    <div className="hidden md:block bg-white shadow overflow-hidden sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aluno</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RM / Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sessão</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inscrito em</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredEnrollments.map((enr) => (
                                    <tr key={enr.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{enr.user.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{enr.user.rm || '-'}</div>
                                            <div className="text-xs text-gray-500">{enr.user.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{formatDate(enr.session.date)}</div>
                                            <div className="text-xs text-gray-500">{enr.session.startTime} - {enr.session.endTime}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(enr.enrolledAt).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button 
                                                onClick={() => setDeleteId(enr.id)}
                                                className="text-red-600 hover:text-red-900 font-bold"
                                            >
                                                Remover
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View: Cards */}
                    <div className="md:hidden space-y-4">
                        {filteredEnrollments.map((enr) => (
                            <div key={enr.id} className="bg-white shadow rounded-lg p-4 border border-gray-100">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900">{enr.user.name}</h3>
                                        <p className="text-xs text-gray-500">{enr.user.email}</p>
                                    </div>
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-medium">
                                        RM: {enr.user.rm || '-'}
                                    </span>
                                </div>

                                <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="block text-xs text-gray-400 uppercase font-bold tracking-wide">Sessão</span>
                                        <span className="block font-medium text-gray-800">{formatDate(enr.session.date)}</span>
                                        <span className="block text-xs text-gray-500">{enr.session.startTime} - {enr.session.endTime}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-gray-400 uppercase font-bold tracking-wide">Inscrito em</span>
                                        <span className="block text-gray-600">{new Date(enr.enrolledAt).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-gray-50">
                                    <button
                                        onClick={() => setDeleteId(enr.id)}
                                        className="w-full text-sm text-red-600 hover:text-red-800 font-bold border border-red-100 bg-red-50 px-3 py-2 rounded hover:bg-red-100 transition"
                                    >
                                        Remover Inscrição
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Remover Inscrição">
                <div className="space-y-4">
                    <p className="text-gray-700">
                        Tem certeza que deseja remover a inscrição deste aluno? A vaga será liberada imediatamente.
                    </p>
                    <div className="flex justify-end gap-3 mt-4">
                        <button onClick={() => setDeleteId(null)} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-gray-800">Cancelar</button>
                        <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 text-white font-bold">Confirmar Remoção</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};