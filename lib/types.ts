export type Perfil = "SUPORTE" | "DEV" | "ADM";
export type Prioridade = "Alta" | "Média" | "Baixa";
export type Tipo = "Correção de bug/erro" | "Solicitação de melhoria" | "Migração";
export type Sistema = "ERP WEB" | "TMS WEB" | "Delphi";
export type Status = "Pendente" | "Aguardando informação" | "Em desenvolvimento" | "Concluída";

export interface User {
  id: string;
  username: string;
  name: string;
  passwordHash: string;
  perfil: Perfil;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  username: string;
  name: string;
  perfil: Perfil;
  createdAt: string;
}

export interface Demand {
  id: string;
  numero: number;
  descricao: string;
  prioridade: Prioridade;
  tipo: Tipo;
  cliente: string;
  clienteId?: string;
  anexos?: string[];
  sistema: Sistema;
  status: Status;
  criadaPor: string;
  criadaEm: string;
  responsavelId: string | null;
  responsavel: Pick<PublicUser, "id" | "name"> | null;
  comentarios: DemandComment[];
}

export interface DemandComment {
  id: string;
  conteudo: string;
  createdAt: string;
  autor: Pick<PublicUser, "id" | "name">;
}

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  perfil: Perfil;
  exp: number;
}

export const PRIORIDADES: Prioridade[] = ["Alta", "Média", "Baixa"];
export const TIPOS: Tipo[] = ["Correção de bug/erro", "Solicitação de melhoria", "Migração"];
export const SISTEMAS: Sistema[] = ["ERP WEB", "TMS WEB", "Delphi"];
export const STATUS: Status[] = ["Pendente", "Aguardando informação", "Em desenvolvimento", "Concluída"];
export const PERFIS: Perfil[] = ["SUPORTE", "DEV", "ADM"];

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export interface Client {
  id: string;
  nome: string;
  contato: string;
  createdAt: string;
}