
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { config } from '../config';
import { LoadingButton } from '../components/LoadingButton';
import { useToast } from '../components/Toast';
import { getUserFriendlyError } from '../utils/errorMessages';
import { MobileInput } from '../components/MobileInput';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { user, loading: authLoading, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await login(email, password);
      addToast('success', 'Login realizado com sucesso!');
    } catch (err: any) {
      const msg = getUserFriendlyError(err);
      addToast('error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
      setActionLoading(true);
      try {
          await loginWithGoogle();
          addToast('success', 'Autenticado com Google!');
      } catch (err: any) {
          const msg = getUserFriendlyError(err);
          addToast('error', msg);
          setActionLoading(false);
      }
  }

  if (authLoading || (!authLoading && user)) {
    return <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-darkbg text-primary font-medium">Verificando sessão...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkbg py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-md w-full space-y-8 text-center">
        
        <div className="flex justify-start">
            <Link to="/" className="flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors font-medium p-2 -ml-2 rounded-lg active:bg-gray-100 dark:active:bg-gray-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Voltar para o início
            </Link>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-primary dark:text-indigo-400">EduEvent</h1>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">Acesse sua conta</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {config.useFirebase 
              ? "Gerencie suas inscrições e eventos em um só lugar." 
              : 'Ambiente de Demonstração (Mock)'}
          </p>
        </div>
        <form className="mt-8 space-y-2" onSubmit={handleSubmit}>
          
          <MobileInput
            id="email-address"
            name="email"
            type="email"
            autoComplete="email"
            required
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="email"
          />

          <MobileInput
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required={config.useFirebase}
            label="Senha"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            enterKeyHint="go"
          />

          <div className="pt-4">
            <LoadingButton
              type="submit"
              isLoading={actionLoading}
              className="w-full h-12 text-base shadow-lg shadow-indigo-200 dark:shadow-none"
            >
              Acessar Plataforma
            </LoadingButton>
          </div>

           <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 dark:bg-darkbg text-gray-500 dark:text-gray-400">Ou entre rapidamente com</span>
              </div>
           </div>

           <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={actionLoading}
              className="w-full h-12 flex items-center justify-center px-4 border border-gray-300 dark:border-gray-600 shadow-sm text-base font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-colors active:scale-[0.98]"
            >
              <svg className="h-5 w-5 mr-3" aria-hidden="true" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>

        </form>
        
        {!config.useFirebase && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-4 p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                <p className="font-bold mb-2">Ambiente de Teste (Mock):</p>
                <ul className="space-y-2">
                    <li onClick={() => setEmail('student@school.com')} className="cursor-pointer hover:text-primary transition-colors p-2 bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-100 dark:border-gray-700">👤 student@school.com</li>
                    <li onClick={() => setEmail('admin@school.com')} className="cursor-pointer hover:text-primary transition-colors p-2 bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-100 dark:border-gray-700">🛡️ admin@school.com</li>
                </ul>
            </div>
        )}
      </div>
    </div>
  );
};
