import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storage';
import { Course, ClassGroup, User } from '../types';
import { useNavigate } from 'react-router-dom';

export const ProfileCompletion: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    rm: '',
    courseId: '',
    classId: ''
  });

  useEffect(() => {
    if (user?.isOnboarded) {
        navigate('/dashboard');
        return;
    }

    storageService.getCourses().then(setCourses);
  }, [user, navigate]);

  useEffect(() => {
    if (formData.courseId) {
      storageService.getClasses(formData.courseId).then(setClasses);
      setFormData(prev => ({ ...prev, classId: '' }));
    }
  }, [formData.courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    try {
      // FIX: Ensure essential data like email and role are persisted with the profile
      const profileData: Partial<User> = {
        ...formData,
        email: user.email,
        role: user.role,
      };
      await storageService.updateUserProfile(user.uid, profileData);
      await refreshProfile();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar perfil');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Complete seu perfil</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Precisamos de mais alguns detalhes antes de começar.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <label htmlFor="name" className="sr-only">Nome Completo</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 bg-white rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Nome Completo"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="rm" className="sr-only">Registro de Matrícula (RM)</label>
              <input
                id="rm"
                name="rm"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="RM (ex: 12345)"
                value={formData.rm}
                onChange={e => setFormData({...formData, rm: e.target.value})}
              />
            </div>
            <div className="mb-4">
              <select
                required
                className="block w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.courseId}
                onChange={e => setFormData({...formData, courseId: e.target.value})}
              >
                <option value="">Selecione o Curso</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <select
                required
                disabled={!formData.courseId}
                className="block w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                value={formData.classId}
                onChange={e => setFormData({...formData, classId: e.target.value})}
              >
                <option value="">Selecione a Turma</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded text-center font-medium">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Concluir Cadastro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};