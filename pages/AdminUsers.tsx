import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { User, UserRole, Course, ClassGroup } from '../types';
import { storageService } from '../services/storage';
import { Modal } from '../components/Modal';
import { formatDate } from '../utils/formatters';
import { useDebounce } from '../hooks/useDebounce';
import { SkeletonUserTableRow, SkeletonUserMobileCard } from '../components/Skeletons';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadingButton } from '../components/LoadingButton';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { getUserFriendlyError } from '../utils/errorMessages';

// --- Desktop Row Component ---
interface UserTableRowProps {
    user: User;
    courseName: string;
    className: string;
    onEdit: (user: User) => void;
    onRequestRoleChange: (user: User) => void;
    onRequestDelete: (user: User) => void;
    onViewEnrollments: (user: User) => void;
}

const UserTableRow = React.memo(({ user, courseName, className, onEdit, onRequestRoleChange, onRequestDelete, onViewEnrollments }: UserTableRowProps) => (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-primary dark:text-indigo-300 font-bold">
                    {user.name ? user.name.charAt(0) : user.email.charAt(0).toUpperCase()}
                </div>
                <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name || 'Sem nome'}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                </div>
            </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm text-gray-900 dark:text-white">{courseName}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{className}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
            {user.rm || '-'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
                {user.role}
            </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
            <button onClick={() => onViewEnrollments(user)} className="text-cyan-600 hover:text-cyan-900 dark:text-cyan-400 dark:hover:text-cyan-300" title="Ver Inscrições">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button onClick={() => onEdit(user)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">Editar</button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button onClick={() => onRequestRoleChange(user)} className="text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300">
                {user.role === UserRole.ADMIN ? 'Virar User' : 'Virar Admin'}
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button onClick={() => onRequestDelete(user)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">Excluir</button>
        </td>
    </tr>
));

// --- Mobile Card Component ---
const UserMobileCard = React.memo(({ user, courseName, className, onEdit, onRequestRoleChange, onRequestDelete, onViewEnrollments }: UserTableRowProps) => (
    <div className="bg-white dark:bg-darkcard shadow rounded-lg p-4 flex flex-col space-y-3 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-primary dark:text-indigo-300 font-bold">
                    {user.name ? user.name.charAt(0) : user.email.charAt(0).toUpperCase()}
                </div>
                <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{user.name || 'Sem nome'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                </div>
            </div>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
                {user.role}
            </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm border-t border-b border-gray-100 dark:border-gray-700 py-2">
            <div>
                <span className="text-gray-500 dark:text-gray-400 text-xs block">Curso</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{courseName}</span>
            </div>
            <div>
                <span className="text-gray-500 dark:text-gray-400 text-xs block">Turma</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{className}</span>
            </div>
            <div>
                <span className="text-gray-500 dark:text-gray-400 text-xs block">RM</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{user.rm || '-'}</span>
            </div>
        </div>

        <div className="flex justify-end space-x-2 pt-1 overflow-x-auto">
            <button 
                onClick={() => onViewEnrollments(user)}
                className="text-cyan-600 dark:text-cyan-400 text-sm font-medium border border-cyan-100 dark:border-cyan-900 px-2 py-1 rounded hover:bg-cyan-50 dark:hover:bg-cyan-900/30 flex items-center"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Agenda
            </button>
            <button 
                onClick={() => onEdit(user)}
                className="text-indigo-600 dark:text-indigo-400 text-sm font-medium border border-indigo-100 dark:border-indigo-900 px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
            >
                Editar
            </button>
            <button 
                onClick={() => onRequestRoleChange(user)}
                className="text-amber-600 dark:text-amber-400 text-sm font-medium border border-amber-100 dark:border-amber-900 px-2 py-1 rounded hover:bg-amber-50 dark:hover:bg-amber-900/30"
            >
                {user.role === UserRole.ADMIN ? 'User' : 'Admin'}
            </button>
            <button 
                onClick={() => onRequestDelete(user)}
                className="text-red-600 dark:text-red-400 text-sm font-medium border border-red-100 dark:border-red-900 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
            >
                Excluir
            </button>
        </div>
    </div>
));

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const { addToast } = useToast();

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<any[]>([undefined]); // Cursors for each page start
  const [hasNextPage, setHasNextPage] = useState(true);
  const ITEMS_PER_PAGE = 15;

  // Filters
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(localSearchTerm, 300);
  const [filters, setFilters] = useState({
    searchTerm: '',
    role: '',
    courseId: '',
    classId: ''
  });

  // Edit State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', rm: '', courseId: '', classId: '' });
  const [actionLoading, setActionLoading] = useState(false);

  // Enrollment View State
  const [viewingEnrollmentsUser, setViewingEnrollmentsUser] = useState<User | null>(null);
  const [userEnrollments, setUserEnrollments] = useState<any[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  // Action Confirmation State
  const [pendingAction, setPendingAction] = useState<{type: 'DELETE' | 'ROLE', user: User} | null>(null);

  const fetchUsers = useCallback(async (page: number) => {
    setLoading(true);
    const cursor = cursors[page - 1];
    const { data, nextCursor } = await storageService.getUsers({
        limit: ITEMS_PER_PAGE,
        cursor: cursor,
        filters: filters
    });
    setUsers(data);
    setHasNextPage(!!nextCursor);
    if (nextCursor && cursors.length <= page) {
        setCursors(prev => [...prev, nextCursor]);
    }
    setLoading(false);
  }, [cursors, filters]);
  
  const loadMeta = async () => {
      setLoadingMeta(true);
      const [c, t] = await Promise.all([
          storageService.getCourses(),
          storageService.getClasses()
      ]);
      setCourses(c);
      setClasses(t);
      setLoadingMeta(false);
  };

  useEffect(() => {
    loadMeta();
  }, []);
  
  // Update main filter state only when debounced search term changes
  useEffect(() => {
      setFilters(prev => ({...prev, searchTerm: debouncedSearchTerm}));
  }, [debouncedSearchTerm]);
  
  useEffect(() => {
    // Reset and fetch when filters change
    setCursors([undefined]);
    setCurrentPage(1);
    fetchUsers(1);
  }, [filters]);

  const handleNextPage = () => {
      if (!hasNextPage) return;
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchUsers(nextPage);
  };

  const handlePrevPage = () => {
      if (currentPage === 1) return;
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      fetchUsers(prevPage);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetData = () => {
      setCurrentPage(1);
      setCursors([undefined]);
      fetchUsers(1);
  };

  // Callbacks
  const requestDelete = useCallback((user: User) => setPendingAction({ type: 'DELETE', user }), []);
  const requestRoleChange = useCallback((user: User) => setPendingAction({ type: 'ROLE', user }), []);
  const handleEdit = useCallback((user: User) => {
      setEditingUser(user);
      setEditForm({
          name: user.name || '',
          rm: user.rm || '',
          courseId: user.courseId || '',
          classId: user.classId || ''
      });
      setActionLoading(false);
  }, []);

  const handleViewEnrollments = useCallback(async (user: User) => {
      setViewingEnrollmentsUser(user);
      setLoadingEnrollments(true);
      try {
          const details = await storageService.getUserEnrollmentsDetails(user.uid);
          setUserEnrollments(details);
      } catch (e) { console.error(e); setUserEnrollments([]); } 
      finally { setLoadingEnrollments(false); }
  }, []);

  const handleRemoveEnrollment = async (enrollmentId: string) => {
      if (!viewingEnrollmentsUser) return;
      await storageService.cancelEnrollment(enrollmentId);
      addToast('success', 'Inscrição removida.');
      handleViewEnrollments(viewingEnrollmentsUser);
  };

  const confirmAction = async () => {
      if (!pendingAction) return;
      setActionLoading(true);
      try {
          if (pendingAction.type === 'DELETE') {
              await storageService.deleteUser(pendingAction.user.uid);
              addToast('success', 'Usuário excluído.');
          } else if (pendingAction.type === 'ROLE') {
              const newRole = pendingAction.user.role === UserRole.ADMIN ? UserRole.USER : UserRole.ADMIN;
              await storageService.updateUserRole(pendingAction.user.uid, newRole);
              addToast('success', `Role alterada para ${newRole}.`);
          }
          setPendingAction(null);
          resetData();
      } catch (e: any) {
          const msg = getUserFriendlyError(e);
          addToast('error', msg);
      } finally {
          setActionLoading(false);
      }
  };

  const saveEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;
      setActionLoading(true);
      try {
          await storageService.updateUserProfile(editingUser.uid, editForm);
          setEditingUser(null);
          addToast('success', 'Perfil atualizado.');
          resetData();
      } catch (err: any) { 
          const msg = getUserFriendlyError(err);
          addToast('error', msg);
      } finally {
          setActionLoading(false);
      }
  };

  const getCourseName = useCallback((id?: string) => courses.find(c => c.id === id)?.name || '-', [courses]);
  const getClassName = useCallback((id?: string) => classes.find(c => c.id === id)?.name || '-', [classes]);

  const availableClassesForFilter = useMemo(() => {
      if (!filters.courseId) return [];
      return classes.filter(c => c.courseId === filters.courseId);
  }, [classes, filters.courseId]);

  return (
      <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciamento de Usuários</h1>
              
              <div className="bg-white dark:bg-darkcard p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Buscar</label>
                      <input 
                        type="text" placeholder="Nome, Email ou RM..."
                        className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        value={localSearchTerm} onChange={e => setLocalSearchTerm(e.target.value)}
                      />
                  </div>
                  <div className="w-full md:w-40">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Perfil</label>
                      <select className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        value={filters.role} onChange={e => handleFilterChange('role', e.target.value)}>
                          <option value="">Todos</option>
                          <option value={UserRole.ADMIN}>Admin</option>
                          <option value={UserRole.USER}>User</option>
                      </select>
                  </div>
                  <div className="w-full md:w-48">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Curso</label>
                      <select className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        value={filters.courseId} onChange={e => { setFilters({...filters, courseId: e.target.value, classId: ''}); }}>
                          <option value="">Todos os Cursos</option>
                          {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                  </div>
                  <div className="w-full md:w-48">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Turma</label>
                      <select className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700"
                        value={filters.classId} onChange={e => handleFilterChange('classId', e.target.value)} disabled={!filters.courseId}>
                          <option value="">Todas as Turmas</option>
                          {availableClassesForFilter.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                  </div>
              </div>
          </div>
          
          <div className="bg-white dark:bg-darkcard shadow overflow-x-auto sm:rounded-lg border border-gray-200 dark:border-gray-700">
              {/* Desktop Table */}
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 hidden md:table">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Usuário</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Curso/Turma</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">RM</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Role</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-darkcard divide-y divide-gray-200 dark:divide-gray-700">
                      {loading ? (
                         <>
                            {Array.from({ length: 5 }).map((_, i) => <SkeletonUserTableRow key={i} />)}
                         </>
                      ) : users.length === 0 ? (
                          <tr><td colSpan={5} className="p-0"><EmptyState title="Nenhum usuário" description="Tente ajustar os filtros." /></td></tr>
                      ) : (
                         users.map(user => (
                            <UserTableRow key={user.uid} user={user} 
                              courseName={getCourseName(user.courseId)} className={getClassName(user.classId)}
                              onEdit={handleEdit} onRequestRoleChange={requestRoleChange}
                              onRequestDelete={requestDelete} onViewEnrollments={handleViewEnrollments} />
                        ))
                      )}
                  </tbody>
              </table>
              {/* Mobile Card View */}
              <div className="md:hidden p-4 space-y-4 bg-gray-50 dark:bg-darkbg">
                  {loading ? (
                     <>
                        {Array.from({ length: 5 }).map((_, i) => <SkeletonUserMobileCard key={i} />)}
                     </>
                  ) : users.length === 0 ? (
                    <EmptyState title="Nenhum usuário" description="Tente ajustar os filtros." />
                  ) : (
                    users.map(user => (
                        <UserMobileCard key={user.uid} user={user}
                          courseName={getCourseName(user.courseId)} className={getClassName(user.classId)}
                          onEdit={handleEdit} onRequestRoleChange={requestRoleChange}
                          onRequestDelete={requestDelete} onViewEnrollments={handleViewEnrollments}/>
                    ))
                  )}
              </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <button onClick={handlePrevPage} disabled={currentPage === 1 || loading} className="px-4 py-2 bg-white dark:bg-darkcard border dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">Anterior</button>
            <span className="text-sm text-gray-500 dark:text-gray-400">Página {currentPage}</span>
            <button onClick={handleNextPage} disabled={!hasNextPage || loading} className="px-4 py-2 bg-white dark:bg-darkcard border dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">Próximo</button>
          </div>
          
          <ConfirmDialog 
            isOpen={!!pendingAction}
            onClose={() => setPendingAction(null)}
            onConfirm={confirmAction}
            title="Confirmar Ação"
            message={pendingAction?.type === 'DELETE' 
                ? `Tem certeza que deseja excluir ${pendingAction.user.name}?`
                : `Deseja alterar o perfil de ${pendingAction?.user.name} para ${pendingAction?.user.role === UserRole.ADMIN ? 'USUÁRIO' : 'ADMIN'}?`
            }
            isProcessing={actionLoading}
            variant={pendingAction?.type === 'DELETE' ? 'danger' : 'primary'}
          />

          <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Editar Usuário">
              <form onSubmit={saveEdit} className="space-y-4">
                  <div>
                      <label className="text-gray-700 dark:text-gray-300">Nome Completo</label>
                      <input type="text" className="mt-1 w-full border dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} required/>
                  </div>
                  <div>
                      <label className="text-gray-700 dark:text-gray-300">RM</label>
                      <input type="text" className="mt-1 w-full border dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          value={editForm.rm} onChange={e => setEditForm({...editForm, rm: e.target.value})}/>
                  </div>
                  <div>
                      <label className="text-gray-700 dark:text-gray-300">Curso</label>
                      <select className="mt-1 w-full border dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          value={editForm.courseId} onChange={e => setEditForm({...editForm, courseId: e.target.value, classId: ''})}>
                          <option value="">Selecione...</option>
                          {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="text-gray-700 dark:text-gray-300">Turma</label>
                      <select className="mt-1 w-full border dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          value={editForm.classId} onChange={e => setEditForm({...editForm, classId: e.target.value})} disabled={!editForm.courseId}>
                          <option value="">Selecione...</option>
                          {classes.filter(c => c.courseId === editForm.courseId).map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                      </select>
                  </div>
                  <LoadingButton type="submit" isLoading={actionLoading} className="w-full">Salvar</LoadingButton>
              </form>
          </Modal>

          <Modal isOpen={!!viewingEnrollmentsUser} onClose={() => setViewingEnrollmentsUser(null)} title={`Agenda: ${viewingEnrollmentsUser?.name}`}>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {loadingEnrollments ? ( <div className="text-center py-8 text-gray-500 dark:text-gray-400">Carregando...</div>
                    ) : userEnrollments.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-300">Nenhuma inscrição.</div>
                    ) : (
                        <ul className="divide-y divide-gray-200 dark:divide-gray-600">
                            {userEnrollments.map((enr, idx) => (
                                <li key={idx} className="py-3 flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-sm text-gray-900 dark:text-white">{enr.eventName}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            📅 {formatDate(enr.sessionDate)} • ⏰ {enr.sessionTime}
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemoveEnrollment(enr.enrollmentId)}
                                        className="text-red-500 dark:text-red-400 text-xs font-bold border dark:border-red-900 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30">Remover</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
          </Modal>
      </div>
  );
};