

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { storageService } from '../services/storage';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Mudança Crítica: Usar Subscription em vez de chamada única
  useEffect(() => {
    // Inscreve-se nas mudanças de autenticação (Mock ou Firebase)
    const unsubscribe = storageService.onAuthStateChanged((updatedUser) => {
        setUser(updatedUser);
        setLoading(false); // Para o loading assim que o primeiro estado for resolvido
    });

    // Cleanup na desmontagem
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password?: string) => {
    setLoading(true);
    try {
      // O listener onAuthStateChanged vai atualizar o estado do usuário automaticamente,
      // mas mantemos a chamada aqui para tratar erros de login (senha errada, etc).
      await storageService.login(email, password);
    } catch (e) {
      console.error(e);
      setLoading(false); // Reseta loading apenas em erro
      throw e;
    }
  };

  const loginWithGoogle = async () => {
      setLoading(true);
      try {
          await storageService.loginWithGoogle();
          // Não fazemos nada aqui porque a página vai redirecionar.
          // O estado de loading persistirá até o reload.
      } catch (e) {
          console.error(e);
          setLoading(false);
          throw e;
      }
  };

  const logout = async () => {
    setLoading(true);
    await storageService.logout();
    // O listener atualizará o user para null e loading para false
  };

  const refreshProfile = async () => {
    const currentUser = await storageService.getCurrentUser();
    setUser(currentUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};