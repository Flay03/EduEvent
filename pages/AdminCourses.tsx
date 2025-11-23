import React, { useState, useEffect } from 'react';
import { Course, ClassGroup } from '../types';
import { storageService } from '../services/storage';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

export const AdminCourses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  // Inputs for creation
  const [newCourseName, setNewCourseName] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  // Search Filter
  const [searchTerm, setSearchTerm] = useState('');

  // Editing State
  const [editItem, setEditItem] = useState<{type: 'course'|'class', id: string, name: string} | null>(null);

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<{type: 'course'|'class', id: string} | null>(null);
  const [processing, setProcessing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const c = await storageService.getCourses();
    const t = await storageService.getClasses();
    setCourses(c);
    setClasses(t);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddCourse = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCourseName) return;
      try {
        await storageService.addCourse(newCourseName);
        setNewCourseName('');
        addToast('success', 'Curso adicionado.');
        loadData();
      } catch (e) { addToast('error', 'Erro ao adicionar curso.'); }
  };

  const requestDeleteCourse = (id: string) => {
      setDeleteTarget({ type: 'course', id });
  };

  const handleAddClass = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newClassName || !selectedCourseId) return;
      try {
        await storageService.addClass(selectedCourseId, newClassName);
        setNewClassName('');
        addToast('success', 'Turma adicionada.');
        loadData();
      } catch (e) { addToast('error', 'Erro ao adicionar turma.'); }
  };

  const requestDeleteClass = (id: string) => {
      setDeleteTarget({ type: 'class', id });
  };

  const confirmDelete = async () => {
      if (!deleteTarget) return;
      setProcessing(true);
      try {
          if (deleteTarget.type === 'course') {
              await storageService.deleteCourse(deleteTarget.id);
          } else {
              await storageService.deleteClass(deleteTarget.id);
          }
          addToast('success', 'Item removido.');
          setDeleteTarget(null);
          loadData();
      } catch (e) { 
          addToast('error', 'Erro ao remover item.'); 
      } finally {
          setProcessing(false);
      }
  };

  // Edit Handlers
  const handleEdit = (type: 'course'|'class', id: string, name: string) => {
      setEditItem({ type, id, name });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editItem || !editItem.name) return;
      try {
          if (editItem.type === 'course') {
              await storageService.updateCourse(editItem.id, editItem.name);
          } else {
              await storageService.updateClass(editItem.id, editItem.name);
          }
          addToast('success', 'Atualizado com sucesso.');
          setEditItem(null);
          loadData();
      } catch (e) { addToast('error', 'Erro ao atualizar.'); }
  };

  // Filtering Logic
  const filteredCourses = courses.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredClasses = classes.filter(t => {
      const courseName = courses.find(c => c.id === t.courseId)?.name || '';
      const matchName = t.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCourse = courseName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchName || matchCourse;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Cursos e Turmas</h1>
          <div className="w-full sm:w-72">
              <input 
                type="text" 
                placeholder="Buscar Curso ou Turma..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
          </div>
      </div>

      {/* Cursos */}
      <div className="bg-white dark:bg-darkcard shadow rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Cursos</h2>
        
        <form onSubmit={handleAddCourse} className="flex flex-col sm:flex-row gap-4 mb-6">
            <input 
                type="text" 
                placeholder="Nome do novo curso"
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                value={newCourseName}
                onChange={e => setNewCourseName(e.target.value)}
            />
            <button type="submit" className="w-full sm:w-auto bg-primary text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-medium">
                Adicionar Curso
            </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map(c => (
                <div key={c.id} className="border border-gray-200 dark:border-gray-700 rounded-md p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 shadow-sm">
                    <span className="font-medium text-gray-800 dark:text-gray-200 break-words flex-1 pr-2">{c.name}</span>
                    <div className="flex space-x-1 flex-shrink-0">
                        <button 
                            onClick={() => handleEdit('course', c.id, c.name)}
                            className="text-blue-600 dark:text-blue-400 text-sm hover:text-white hover:bg-blue-600 dark:hover:bg-blue-500 font-medium px-2 py-1 rounded transition"
                            title="Editar"
                        >
                            ✎
                        </button>
                        <button 
                            onClick={() => requestDeleteCourse(c.id)} 
                            className="text-red-600 dark:text-red-400 text-sm hover:text-white hover:bg-red-600 dark:hover:bg-red-500 font-medium px-2 py-1 rounded transition"
                            title="Excluir"
                        >
                            ×
                        </button>
                    </div>
                </div>
            ))}
            {filteredCourses.length === 0 && <div className="text-gray-500 dark:text-gray-400 text-sm italic col-span-full">Nenhum curso encontrado.</div>}
        </div>
      </div>

      {/* Turmas */}
      <div className="bg-white dark:bg-darkcard shadow rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Turmas</h2>
        
        <form onSubmit={handleAddClass} className="flex flex-col sm:flex-row gap-4 mb-6">
            <select 
                className="w-full sm:w-1/3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(e.target.value)}
                required
            >
                <option value="">Selecione o Curso...</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input 
                type="text" 
                placeholder="Nome da Turma (ex: 2024-A)"
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                value={newClassName}
                onChange={e => setNewClassName(e.target.value)}
                required
            />
            <button type="submit" className="w-full sm:w-auto bg-secondary text-white px-4 py-2 rounded-md hover:bg-emerald-700 font-medium">
                Adicionar Turma
            </button>
        </form>

        <div className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-darkcard overflow-hidden">
            {/* Desktop Header */}
            <div className="hidden md:grid grid-cols-3 bg-gray-50 dark:bg-gray-800 px-6 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <div>Turma</div>
                <div>Curso Associado</div>
                <div className="text-right">Ações</div>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredClasses.map(t => {
                    const courseName = courses.find(c => c.id === t.courseId)?.name || 'Curso removido';
                    return (
                        <div key={t.id} className="p-4 md:px-6 md:py-4 flex flex-col md:grid md:grid-cols-3 gap-2 md:items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                            <div className="flex justify-between items-center md:block">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</span>
                                <span className="md:hidden text-xs font-bold text-gray-400 uppercase">Turma</span>
                            </div>
                            
                            <div className="flex justify-between items-center md:block">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{courseName}</span>
                                <span className="md:hidden text-xs font-bold text-gray-400 uppercase">Curso</span>
                            </div>

                            <div className="text-right mt-3 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                                <button 
                                    onClick={() => handleEdit('class', t.id, t.name)}
                                    className="text-blue-600 dark:text-blue-400 hover:text-white hover:bg-blue-600 dark:hover:bg-blue-500 text-sm font-medium border border-blue-200 dark:border-blue-900 px-3 py-1.5 rounded transition"
                                >
                                    Editar
                                </button>
                                <button 
                                    onClick={() => requestDeleteClass(t.id)} 
                                    className="text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 dark:hover:bg-red-500 text-sm font-medium border border-red-200 dark:border-red-900 px-3 py-1.5 rounded transition"
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>
                    )
                })}
                {filteredClasses.length === 0 && <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Nenhuma turma encontrada.</div>}
            </div>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message={
            <div>
                 <p>Tem certeza que deseja excluir {deleteTarget?.type === 'course' ? 'este curso' : 'esta turma'}?</p>
                 {deleteTarget?.type === 'course' && (
                  <p className="text-xs text-red-500 dark:text-red-400 font-bold mt-2 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      ⚠️ Atenção: Todas as turmas e vínculos de usuários deste curso serão removidos automaticamente.
                  </p>
                 )}
            </div>
        }
        isProcessing={processing}
      />

      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title={editItem?.type === 'course' ? 'Editar Curso' : 'Editar Turma'}>
          <form onSubmit={handleSaveEdit}>
              <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={editItem?.name || ''}
                    onChange={e => setEditItem(prev => prev ? {...prev, name: e.target.value} : null)}
                    required
                  />
              </div>
              <button type="submit" className="w-full bg-primary text-white py-2 rounded font-medium hover:bg-indigo-700">
                  Salvar
              </button>
          </form>
      </Modal>
    </div>
  );
};