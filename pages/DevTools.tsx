
import React, { useState } from 'react';
import { storageService } from '../services/storage';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

export const DevTools: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { addToast } = useToast();

  const handleOpenDialog = () => {
      setIsDialogOpen(true);
  };

  const executeSeed = async () => {
      setLoading(true);
      try {
        await storageService.resetAndSeedData();
        addToast('success', 'Dados gerados com sucesso! Recarregando sistema...');
        
        // Aguarda um pouco para o usuário ler antes de recarregar
        setTimeout(() => {
            window.location.reload();
        }, 2000);
      } catch (e) {
          console.error(e);
          addToast('error', 'Ocorreu um erro ao gerar os dados.');
          setLoading(false);
          setIsDialogOpen(false);
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
              onClick={handleOpenDialog}
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

      <ConfirmDialog 
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={executeSeed}
        title="Confirmar Reset"
        message="Tem certeza absoluta? Essa ação apagará todos os usuários, eventos e inscrições atuais e criará dados fictícios."
        confirmText="Sim, Resetar Tudo"
        isProcessing={loading}
      />
    </div>
  );
};
