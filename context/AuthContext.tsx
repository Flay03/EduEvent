import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { storageService } from '../services/storage';
import { config } from '../config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This listener is the single source of truth for the user's auth state.
    // It will fire on sign-in, sign-out, and initial load.
    const unsubscribe = storageService.onAuthStateChanged((updatedUser) => {
        setUser(updatedUser);
        setLoading(false);
    });

    // Cleanup the listener on component unmount
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
          // Com Popup, a promise resolve e o listener atualiza o estado.
          // Não precisamos fazer nada além de aguardar.
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

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};