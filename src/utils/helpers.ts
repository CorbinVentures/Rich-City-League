export function cn(...classes: (string | undefined | boolean)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return (first + last).toUpperCase();
}

export function getTeamColor(teamName: string): string {
  const colors = {
    'rva elite': '#E63946',
    'richmond rebels': '#1D3557',
    'southside strikers': '#F77F00',
    'west end warriors': '#06A77D',
  };
  return colors[teamName.toLowerCase() as keyof typeof colors] || '#457B9D';
}

export function calculateFG(made: number, attempted: number): number {
  return attempted === 0 ? 0 : Math.round((made / attempted) * 1000) / 10;
}

export function getRecordString(wins: number, losses: number): string {
  return `${wins}-${losses}`;
}
