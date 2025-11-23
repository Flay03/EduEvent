
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '';
  
  // Handle YYYY-MM-DD (standard input format stored in sessions)
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      // Retorna diretamente a string formatada sem passar pelo objeto Date para evitar conversão de Timezone
      return `${day}/${month}/${year}`;
  }

  // Handle ISO strings or other formats (fallback seguro)
  try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return new Intl.DateTimeFormat('pt-BR').format(date);
  } catch (e) {
      return dateString;
  }
};

export const timeToMinutes = (time: string): number => {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return (hours * 60) + minutes;
};
