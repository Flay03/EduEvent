import React, { useState } from 'react';
import { storageService } from '../services/storage';
import { Modal } from '../components/Modal';

export const DevTools: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success'|'error', msg: string} | null>(null);

  const handleOpenModal = () => {
      setFeedback(null);
      setIsModalOpen(true);
  };

  const executeSeed = async () => {
      setLoading(true);
      setFeedback(null);
      try {
        await storageService.resetAndSeedData();
        setFeedback({ type: 'success', msg: 'Dados gerados com sucesso! Recarregando sistema...' });
        
        // Aguarda um pouco para o usuário ler antes de recarregar
        setTimeout(() => {
            window.location.reload();
        }, 2000);
      } catch (e) {
          console.error(e);
          setFeedback({ type: 'error', msg: 'Ocorreu um erro ao gerar os dados.' });
          setLoading(false);
      }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto mt-10">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Ferramentas de Desenvolvimento</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Utilize esta função para popular o banco de dados local com informações de teste.</p>
            <p className="mt-2 font-bold text-red-500">
                Isso é destrutivo e sobrescreverá todos os dados existentes.
            </p>
          </div>
          <div className="mt-5">
            <button
              type="button"
              onClick={handleOpenModal}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm"
            >
              ⚠️ Resetar e Gerar Massa de Dados
            </button>
          </div>
        </div>
      </div>

      <div className="bg-indigo-50 p-4 rounded-md border border-indigo-100">
          <h4 className="font-bold text-indigo-800 mb-2">O que será gerado?</h4>
          <ul className="list-disc list-inside text-sm text-indigo-700 space-y-1">
              <li>Cursos: CC, Direito, Medicina, Design.</li>
              <li>Turmas associadas a cada curso.</li>
              <li>Usuários: 1 Admin (admin@school.com), 3 Alunos com perfis variados.</li>
              <li>Eventos Públicos e Restritos (por curso/turma).</li>
              <li>Hierarquia: Semana Acadêmica com 2 sub-eventos.</li>
          </ul>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => !loading && setIsModalOpen(false)} title="Confirmar Reset">
          <div className="space-y-4">
              <p className="text-gray-700">
                  Tem certeza absoluta? Essa ação apagará <strong>todos</strong> os usuários, eventos e inscrições atuais e criará dados fictícios.
              </p>
              
              {feedback && (
                  <div className={`p-3 rounded text-sm font-bold text-center ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {feedback.msg}
                  </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    disabled={loading}
                    className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-gray-800 disabled:opacity-50"
                  >
                      Cancelar
                  </button>
                  <button 
                    onClick={executeSeed} 
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 text-white font-bold disabled:opacity-50 flex items-center"
                  >
                      {loading && (
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                      )}
                      {loading ? 'Gerando...' : 'Sim, Resetar Tudo'}
                  </button>
              </div>
          </div>
      </Modal>
    </div>
  );
};