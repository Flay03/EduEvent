
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storage';
import { Course, ClassGroup, User } from '../types';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { LoadingButton } from '../components/LoadingButton';
import { getUserFriendlyError } from '../utils/errorMessages';
import { MobileInput } from '../components/MobileInput';

export const ProfileCompletion: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(false);
  
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
    setLoading(true);

    try {
      const profileData: Partial<User> = {
        ...formData,
        email: user.email,
        role: user.role,
      };
      await storageService.updateUserProfile(user.uid, profileData);
      await refreshProfile();
      addToast('success', 'Perfil completado com sucesso! Bem-vindo.');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = getUserFriendlyError(err);
      addToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkbg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">Complete seu perfil</h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Precisamos de mais alguns detalhes antes de começar.
          </p>
        </div>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            
            <MobileInput
                id="name"
                name="name"
                type="text"
                required
                label="Nome Completo"
                placeholder="Ex: João da Silva"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                autoComplete="name"
            />

            <MobileInput
                id="rm"
                name="rm"
                type="text"
                required
                label="Registro de Matrícula (RM)"
                placeholder="Ex: 12345"
                value={formData.rm}
                onChange={e => setFormData({...formData, rm: e.target.value})}
                inputMode="numeric"
            />
            
            <MobileInput
                as="select"
                label="Curso"
                required
                value={formData.courseId}
                onChange={e => setFormData({...formData, courseId: e.target.value})}
            >
                <option value="">Selecione o Curso</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </MobileInput>

            <MobileInput
                as="select"
                label="Turma"
                required
                disabled={!formData.courseId}
                value={formData.classId}
                onChange={e => setFormData({...formData, classId: e.target.value})}
                className="disabled:opacity-50"
            >
                <option value="">Selecione a Turma</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </MobileInput>

          <div className="pt-4">
            <LoadingButton
              type="submit"
              isLoading={loading}
              className="w-full h-12 text-base shadow-lg"
            >
              Concluir Cadastro
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
};
