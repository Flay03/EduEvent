import React, { useState, useEffect } from 'react';
import { Course, ClassGroup } from '../types';
import { storageService } from '../services/storage';
import { Modal } from '../components/Modal';

export const AdminCourses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(false);

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
      await storageService.addCourse(newCourseName);
      setNewCourseName('');
      loadData();
  };

  const requestDeleteCourse = (id: string) => {
      setDeleteTarget({ type: 'course', id });
  };

  const handleAddClass = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newClassName || !selectedCourseId) return;
      await storageService.addClass(selectedCourseId, newClassName);
      setNewClassName('');
      loadData();
  };

  const requestDeleteClass = (id: string) => {
      setDeleteTarget({ type: 'class', id });
  };

  const confirmDelete = async () => {
      if (!deleteTarget) return;
      
      if (deleteTarget.type === 'course') {
          await storageService.deleteCourse(deleteTarget.id);
      } else {
          await storageService.deleteClass(deleteTarget.id);
      }
      setDeleteTarget(null);
      loadData();
  };

  // Edit Handlers
  const handleEdit = (type: 'course'|'class', id: string, name: string) => {
      setEditItem({ type, id, name });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editItem || !editItem.name) return;

      if (editItem.type === 'course') {
          await storageService.updateCourse(editItem.id, editItem.name);
      } else {
          await storageService.updateClass(editItem.id, editItem.name);
      }
      setEditItem(null);
      loadData();
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
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Cursos e Turmas</h1>
          <div className="w-full sm:w-72">
              <input 
                type="text" 
                placeholder="Buscar Curso ou Turma..."
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary bg-white text-gray-900"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
          </div>
      </div>

      {/* Cursos */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Cursos</h2>
        
        <form onSubmit={handleAddCourse} className="flex flex-col sm:flex-row gap-4 mb-6">
            <input 
                type="text" 
                placeholder="Nome do novo curso"
                className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary bg-white text-gray-900"
                value={newCourseName}
                onChange={e => setNewCourseName(e.target.value)}
            />
            <button type="submit" className="w-full sm:w-auto bg-primary text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-medium">
                Adicionar Curso
            </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map(c => (
                <div key={c.id} className="border border-gray-200 rounded-md p-4 flex justify-between items-center bg-gray-50 shadow-sm">
                    <span className="font-medium text-gray-800 break-words flex-1 pr-2">{c.name}</span>
                    <div className="flex space-x-1 flex-shrink-0">
                        <button 
                            onClick={() => handleEdit('course', c.id, c.name)}
                            className="text-blue-600 text-sm hover:text-white hover:bg-blue-600 font-medium px-2 py-1 rounded transition"
                            title="Editar"
                        >
                            ✎
                        </button>
                        <button 
                            onClick={() => requestDeleteCourse(c.id)} 
                            className="text-red-600 text-sm hover:text-white hover:bg-red-600 font-medium px-2 py-1 rounded transition"
                            title="Excluir"
                        >
                            ×
                        </button>
                    </div>
                </div>
            ))}
            {filteredCourses.length === 0 && <div className="text-gray-500 text-sm italic col-span-full">Nenhum curso encontrado.</div>}
        </div>
      </div>

      {/* Turmas */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Turmas</h2>
        
        <form onSubmit={handleAddClass} className="flex flex-col sm:flex-row gap-4 mb-6">
            <select 
                className="w-full sm:w-1/3 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary bg-white text-gray-900"
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
                className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary bg-white text-gray-900"
                value={newClassName}
                onChange={e => setNewClassName(e.target.value)}
                required
            />
            <button type="submit" className="w-full sm:w-auto bg-secondary text-white px-4 py-2 rounded-md hover:bg-emerald-700 font-medium">
                Adicionar Turma
            </button>
        </form>

        <div className="border border-gray-200 rounded-md bg-white overflow-hidden">
            {/* Desktop Header */}
            <div className="hidden md:grid grid-cols-3 bg-gray-50 px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <div>Turma</div>
                <div>Curso Associado</div>
                <div className="text-right">Ações</div>
            </div>

            <div className="divide-y divide-gray-200">
                {filteredClasses.map(t => {
                    const courseName = courses.find(c => c.id === t.courseId)?.name || 'Curso removido';
                    return (
                        <div key={t.id} className="p-4 md:px-6 md:py-4 flex flex-col md:grid md:grid-cols-3 gap-2 md:items-center">
                            <div className="flex justify-between items-center md:block">
                                <span className="text-sm font-medium text-gray-900">{t.name}</span>
                                <span className="md:hidden text-xs font-bold text-gray-400 uppercase">Turma</span>
                            </div>
                            
                            <div className="flex justify-between items-center md:block">
                                <span className="text-sm text-gray-500">{courseName}</span>
                                <span className="md:hidden text-xs font-bold text-gray-400 uppercase">Curso</span>
                            </div>

                            <div className="text-right mt-3 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-gray-100 flex justify-end gap-2">
                                <button 
                                    onClick={() => handleEdit('class', t.id, t.name)}
                                    className="text-blue-600 hover:text-white hover:bg-blue-600 text-sm font-medium border border-blue-200 px-3 py-1.5 rounded transition"
                                >
                                    Editar
                                </button>
                                <button 
                                    onClick={() => requestDeleteClass(t.id)} 
                                    className="text-red-600 hover:text-white hover:bg-red-600 text-sm font-medium border border-red-200 px-3 py-1.5 rounded transition"
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>
                    )
                })}
                {filteredClasses.length === 0 && <div className="p-8 text-center text-gray-500 text-sm">Nenhuma turma encontrada.</div>}
            </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirmar Exclusão">
          <div className="space-y-4">
              <p className="text-gray-700">
                  Tem certeza que deseja excluir {deleteTarget?.type === 'course' ? 'este curso' : 'esta turma'}?
              </p>
              {deleteTarget?.type === 'course' && (
                  <p className="text-xs text-red-500 font-bold">
                      Atenção: Isso pode deixar turmas e usuários órfãos (sem curso vinculado).
                  </p>
              )}
              <div className="flex justify-end gap-3 mt-4">
                  <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-gray-800">Cancelar</button>
                  <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 text-white font-bold">Confirmar</button>
              </div>
          </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title={editItem?.type === 'course' ? 'Editar Curso' : 'Editar Turma'}>
          <form onSubmit={handleSaveEdit}>
              <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary bg-white text-gray-900"
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