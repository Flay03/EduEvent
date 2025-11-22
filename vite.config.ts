import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  resolve: {
    alias: {
      // Mapeia '@' para a raiz do projeto atual de forma simples
      '@': path.resolve('.'),
    }
  },
  // --- CONFIGURAÇÃO PARA GITHUB PAGES ---
  // Se o seu repositório for https://usuario.github.io/meu-projeto/
  // Troque '/' por '/meu-projeto/'
  base: '/EduEvent/',
});