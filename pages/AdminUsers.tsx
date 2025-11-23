import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { User, UserRole, Course, ClassGroup } from '../types';
import { storageService } from '../services/storage';
import { Modal } from '../components/Modal';
import { formatDate } from '../utils/formatters';

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
    <tr>
        <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-primary font-bold">
                    {user.name ? user.name.charAt(0) : user.email.charAt(0).toUpperCase()}
                </div>
                <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{user.name || 'Sem nome'}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                </div>
            </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm text-gray-900">{courseName}</div>
            <div className="text-sm text-gray-500">{className}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {user.rm || '-'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                {user.role}
            </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
            <button onClick={() => onViewEnrollments(user)} className="text-cyan-600 hover:text-cyan-900" title="Ver Inscrições">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </button>
            <span className="text-gray-300">|</span>
            <button onClick={() => onEdit(user)} className="text-indigo-600 hover:text-indigo-900">Editar</button>
            <span className="text-gray-300">|</span>
            <button onClick={() => onRequestRoleChange(user)} className="text-amber-600 hover:text-amber-900">
                {user.role === UserRole.ADMIN ? 'Virar User' : 'Virar Admin'}
            </button>
            <span className="text-gray-300">|</span>
            <button onClick={() => onRequestDelete(user)} className="text-red-600 hover:text-red-900">Excluir</button>
        </td>
    </tr>
));

// --- Mobile Card Component ---
const UserMobileCard = React.memo(({ user, courseName, className, onEdit, onRequestRoleChange, onRequestDelete, onViewEnrollments }: UserTableRowProps) => (
    <div className="bg-white shadow rounded-lg p-4 flex flex-col space-y-3">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-primary font-bold">
                    {user.name ? user.name.charAt(0) : user.email.charAt(0).toUpperCase()}
                </div>
                <div>
                    <div className="text-sm font-bold text-gray-900">{user.name || 'Sem nome'}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                </div>
            </div>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                {user.role}
            </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm border-t border-b border-gray-100 py-2">
            <div>
                <span className="text-gray-500 text-xs block">Curso</span>
                <span className="font-medium">{courseName}</span>
            </div>
            <div>
                <span className="text-gray-500 text-xs block">Turma</span>
                <span className="font-medium">{className}</span>
            </div>
            <div>
                <span className="text-gray-500 text-xs block">RM</span>
                <span className="font-medium">{user.rm || '-'}</span>
            </div>
        </div>

        <div className="flex justify-end space-x-2 pt-1 overflow-x-auto">
            <button 
                onClick={() => onViewEnrollments(user)}
                className="text-cyan-600 text-sm font-medium border border-cyan-100 px-2 py-1 rounded hover:bg-cyan-50 flex items-center"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Agenda
            </button>
            <button 
                onClick={() => onEdit(user)}
                className="text-indigo-600 text-sm font-medium border border-indigo-100 px-2 py-1 rounded hover:bg-indigo-50"
            >
                Editar
            </button>
            <button 
                onClick={() => onRequestRoleChange(user)}
                className="text-amber-600 text-sm font-medium border border-amber-100 px-2 py-1 rounded hover:bg-amber-50"
            >
                {user.role === UserRole.ADMIN ? 'User' : 'Admin'}
            </button>
            <button 
                onClick={() => onRequestDelete(user)}
                className="text-red-600 text-sm font-medium border border-red-100 px-2 py-1 rounded hover:bg-red-50"
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<any[]>([undefined]); // Cursors for each page start
  const [hasNextPage, setHasNextPage] = useState(true);
  const ITEMS_PER_PAGE = 15;

  // Filters
  const [filters, setFilters] = useState({
    searchTerm: '',
    role: '',
    courseId: '',
    classId: ''
  });

  // Edit State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', rm: '', courseId: '', classId: '' });
  const [editError, setEditError] = useState<string | null>(null);

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
      setEditError(null);
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
      handleViewEnrollments(viewingEnrollmentsUser);
  };

  const confirmAction = async () => {
      if (!pendingAction) return;
      if (pendingAction.type === 'DELETE') {
          await storageService.deleteUser(pendingAction.user.uid);
      } else if (pendingAction.type === 'ROLE') {
          const newRole = pendingAction.user.role === UserRole.ADMIN ? UserRole.USER : UserRole.ADMIN;
          await storageService.updateUserRole(pendingAction.user.uid, newRole);
      }
      setPendingAction(null);
      resetData();
  };

  const saveEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;
      setEditError(null);
      try {
          await storageService.updateUserProfile(editingUser.uid, editForm);
          setEditingUser(null);
          resetData();
      } catch (err: any) { setEditError(err.message); }
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
              <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
                      <input 
                        type="text" placeholder="Nome, Email ou RM..."
                        className="w-full border-gray-300 rounded-md shadow-sm bg-white text-gray-900"
                        value={filters.searchTerm} onChange={e => handleFilterChange('searchTerm', e.target.value)}
                      />
                  </div>
                  <div className="w-full md:w-40">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Perfil</label>
                      <select className="w-full border-gray-300 rounded-md shadow-sm bg-white text-gray-900"
                        value={filters.role} onChange={e => handleFilterChange('role', e.target.value)}>
                          <option value="">Todos</option>
                          <option value={UserRole.ADMIN}>Admin</option>
                          <option value={UserRole.USER}>User</option>
                      </select>
                  </div>
                  <div className="w-full md:w-48">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Curso</label>
                      <select className="w-full border-gray-300 rounded-md shadow-sm bg-white text-gray-900"
                        value={filters.courseId} onChange={e => { setFilters({...filters, courseId: e.target.value, classId: ''}); }}>
                          <option value="">Todos os Cursos</option>
                          {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                  </div>
                  <div className="w-full md:w-48">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Turma</label>
                      <select className="w-full border-gray-300 rounded-md shadow-sm bg-white text-gray-900 disabled:bg-gray-100"
                        value={filters.classId} onChange={e => handleFilterChange('classId', e.target.value)} disabled={!filters.courseId}>
                          <option value="">Todas as Turmas</option>
                          {availableClassesForFilter.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                  </div>
              </div>
          </div>
          
          <div className="bg-white shadow overflow-x-auto sm:rounded-lg">
              {/* Desktop Table */}
              <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                  <thead className="bg-gray-50">
                      <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Curso/Turma</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RM</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                      {loading && <tr><td colSpan={5} className="p-8 text-center text-gray-500">Carregando...</td></tr>}
                      {!loading && users.map(user => (
                          <UserTableRow key={user.uid} user={user} 
                            courseName={getCourseName(user.courseId)} className={getClassName(user.classId)}
                            onEdit={handleEdit} onRequestRoleChange={requestRoleChange}
                            onRequestDelete={requestDelete} onViewEnrollments={handleViewEnrollments} />
                      ))}
                      {!loading && users.length === 0 && (
                          <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum usuário encontrado.</td></tr>
                      )}
                  </tbody>
              </table>
              {/* Mobile Card View */}
              <div className="md:hidden p-4 space-y-4">
                  {loading && <div className="p-8 text-center text-gray-500">Carregando...</div>}
                  {!loading && users.map(user => (
                      <UserMobileCard key={user.uid} user={user}
                        courseName={getCourseName(user.courseId)} className={getClassName(user.classId)}
                        onEdit={handleEdit} onRequestRoleChange={requestRoleChange}
                        onRequestDelete={requestDelete} onViewEnrollments={handleViewEnrollments}/>
                  ))}
                  {!loading && users.length === 0 && <div className="p-8 text-center text-gray-500">Nenhum usuário encontrado.</div>}
              </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <button onClick={handlePrevPage} disabled={currentPage === 1 || loading} className="px-4 py-2 bg-white border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Anterior</button>
            <span className="text-sm text-gray-500">Página {currentPage}</span>
            <button onClick={handleNextPage} disabled={!hasNextPage || loading} className="px-4 py-2 bg-white border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Próximo</button>
          </div>
          
          <Modal isOpen={!!pendingAction} onClose={() => setPendingAction(null)} title="Confirmar Ação">
             <div className="space-y-4">
                  {pendingAction?.type === 'DELETE' ? (
                      <p>Tem certeza que deseja excluir <strong>{pendingAction.user.name}</strong>?</p>
                  ) : (
                      <p>Deseja alterar o perfil de <strong>{pendingAction?.user.name}</strong> para 
                          <strong> {pendingAction?.user.role === UserRole.ADMIN ? 'USUÁRIO' : 'ADMIN'}</strong>?</p>
                  )}
                  <div className="flex justify-end gap-3 mt-6">
                      <button onClick={() => setPendingAction(null)} className="px-4 py-2 bg-gray-100 rounded">Cancelar</button>
                      <button onClick={confirmAction} className="px-4 py-2 rounded text-white font-bold bg-red-600">Confirmar</button>
                  </div>
              </div>
          </Modal>

          <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Editar Usuário">
              <form onSubmit={saveEdit} className="space-y-4">
                  <div>
                      <label>Nome Completo</label>
                      <input type="text" className="mt-1 w-full border rounded-md p-2 bg-white text-gray-900"
                          value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} required/>
                  </div>
                  <div>
                      <label>RM</label>
                      <input type="text" className="mt-1 w-full border rounded-md p-2 bg-white text-gray-900"
                          value={editForm.rm} onChange={e => setEditForm({...editForm, rm: e.target.value})}/>
                  </div>
                  <div>
                      <label>Curso</label>
                      <select className="mt-1 w-full border rounded-md p-2 bg-white text-gray-900"
                          value={editForm.courseId} onChange={e => setEditForm({...editForm, courseId: e.target.value, classId: ''})}>
                          <option value="">Selecione...</option>
                          {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                  </div>
                  <div>
                      <label>Turma</label>
                      <select className="mt-1 w-full border rounded-md p-2 bg-white text-gray-900"
                          value={editForm.classId} onChange={e => setEditForm({...editForm, classId: e.target.value})} disabled={!editForm.courseId}>
                          <option value="">Selecione...</option>
                          {classes.filter(c => c.courseId === editForm.courseId).map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                      </select>
                  </div>
                  {editError && <div className="text-red-600 text-sm p-2 bg-red-50 rounded">{editError}</div>}
                  <button type="submit" className="w-full bg-primary text-white py-2 rounded font-bold">Salvar</button>
              </form>
          </Modal>

          <Modal isOpen={!!viewingEnrollmentsUser} onClose={() => setViewingEnrollmentsUser(null)} title={`Agenda: ${viewingEnrollmentsUser?.name}`}>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {loadingEnrollments ? ( <div className="text-center py-8">Carregando...</div>
                    ) : userEnrollments.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded">Nenhuma inscrição.</div>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {userEnrollments.map((enr, idx) => (
                                <li key={idx} className="py-3 flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-sm">{enr.eventName}</div>
                                        <div className="text-xs text-gray-500">
                                            📅 {formatDate(enr.sessionDate)} • ⏰ {enr.sessionTime}
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemoveEnrollment(enr.enrollmentId)}
                                        className="text-red-500 text-xs font-bold border px-2 py-1 rounded">Remover</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
          </Modal>
      </div>
  );
};