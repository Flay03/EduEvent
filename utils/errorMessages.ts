
export const getUserFriendlyError = (error: any): string => {
  const code = error?.code || '';
  const message = error?.message || '';

  // 1. Custom App Errors (Conflict Logic)
  if (typeof message === 'string' && message.startsWith('CONFLICT|')) {
      const parts = message.split('|');
      // Format: CONFLICT|EventName|StartTime|EndTime
      if (parts.length >= 4) {
          return `Conflito de horário! Você já possui o evento "${parts[1]}" agendado entre ${parts[2]} e ${parts[3]}.`;
      }
      return "Conflito de horário com outro evento já agendado.";
  }

  // 2. Custom Logic Errors
  if (message === "A sessão está lotada" || message.includes("capacidade máxima")) return "Que pena! Esta sessão acabou de lotar.";
  if (message.includes("já está inscrito")) return "Você já garantiu sua vaga neste evento!";
  if (message.includes("Evento não encontrado")) return "O evento que você procura não está mais disponível.";

  // 3. Firebase Auth Errors
  switch (code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
          return 'E-mail ou senha incorretos. Verifique e tente novamente.';
      case 'auth/email-already-in-use':
          return 'Este e-mail já está sendo usado por outra conta.';
      case 'auth/weak-password':
          return 'Sua senha é muito fraca. Escolha uma senha mais forte.';
      case 'auth/invalid-email':
          return 'O formato do e-mail é inválido.';
      case 'auth/user-disabled':
          return 'Esta conta foi desativada. Contate o administrador.';
      case 'auth/too-many-requests':
          return 'Muitas tentativas consecutivas. Aguarde alguns instantes.';
      case 'auth/network-request-failed':
          return 'Erro de conexão. Verifique sua internet.';
      case 'auth/popup-closed-by-user':
          return 'O login foi cancelado.';
      case 'permission-denied':
          return 'Você não tem permissão para realizar esta ação.';
      default:
          // Fallback for generic errors
          if (message) return message;
          return 'Ocorreu um erro inesperado. Tente novamente mais tarde.';
  }
};
