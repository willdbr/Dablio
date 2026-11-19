export function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function fmtDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function diasRestantes(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}
