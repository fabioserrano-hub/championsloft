// src/hooks/useIdioma.js
import { useState, useEffect, createContext, useContext } from 'react'

// Traduções completas — PT (base), EN, ES
export const TRADUCOES = {
  // Navegação
  dashboard:      { pt:'Dashboard',        br:'Dashboard',       en:'Dashboard',       es:'Panel' },
  pombos:         { pt:'Pombos',           br:'Pombos Correio',  en:'Pigeons',         es:'Palomas' },
  provas:         { pt:'Provas',           br:'Corridas',        en:'Races',           es:'Carreras' },
  treinos:        { pt:'Treinos',          br:'Treinos',         en:'Training',        es:'Entrenamientos' },
  saude:          { pt:'Saúde',            br:'Saúde',           en:'Health',          es:'Salud' },
  reproducao:     { pt:'Reprodução',       br:'Reprodução',      en:'Breeding',        es:'Cría' },
  pedigree:       { pt:'Pedigree',         br:'Pedigree',        en:'Pedigree',        es:'Pedigrí' },
  alimentacao:    { pt:'Alimentação',      br:'Alimentação',     en:'Feeding',         es:'Alimentación' },
  tratamentos:    { pt:'Tratamentos',      br:'Tratamentos',     en:'Treatments',      es:'Tratamientos' },
  calendario:     { pt:'Calendário',       br:'Calendário',      en:'Calendar',        es:'Calendario' },
  comunidade:     { pt:'Comunidade',       br:'Comunidade',      en:'Community',       es:'Comunidad' },
  marketplace:    { pt:'Marketplace',      br:'Marketplace',     en:'Marketplace',     es:'Mercado' },
  leiloes:        { pt:'Leilões',          br:'Leilões',         en:'Auctions',        es:'Subastas' },
  clubes:         { pt:'Clubes',           br:'Clubes',          en:'Clubs',           es:'Clubes' },
  analiticas:     { pt:'Analíticas',       br:'Analíticas',      en:'Analytics',       es:'Analíticas' },
  // Terminologia
  pombo:          { pt:'Pombo',            br:'Pombo Correio',   en:'Pigeon',          es:'Paloma' },
  pombal:         { pt:'Pombal',           br:'Colombário',      en:'Loft',            es:'Palomar' },
  anilha:         { pt:'Anilha',           br:'Argola',          en:'Ring',            es:'Anilla' },
  efectivo:       { pt:'Efectivo',         br:'Plantel',         en:'Stock',           es:'Efectivo' },
  prova:          { pt:'Prova',            br:'Corrida',         en:'Race',            es:'Carrera' },
  percentil:      { pt:'Percentil',        br:'Percentil',       en:'Percentile',      es:'Percentil' },
  velocidade:     { pt:'Velocidade',       br:'Velocidade',      en:'Speed',           es:'Velocidad' },
  fundo:          { pt:'Fundo',            br:'Fundo',           en:'Long distance',   es:'Fondo' },
  federacao:      { pt:'Federação (FPC)',  br:'Fed. (FENAC)',     en:'Federation',      es:'Federación' },
  borrachinho:    { pt:'Borrachinho',      br:'Pinto / Filhote', en:'Squab',           es:'Pichón' },
  cacifo:         { pt:'Cacifo',           br:'Gaiola / Ninho',  en:'Box / Nest',      es:'Nidal' },
  columbofilo:    { pt:'Columbófilo',      br:'Colombófilo',     en:'Pigeon fancier',  es:'Colombófilo' },
  // UI
  guardar:        { pt:'Guardar',          br:'Salvar',          en:'Save',            es:'Guardar' },
  cancelar:       { pt:'Cancelar',         br:'Cancelar',        en:'Cancel',          es:'Cancelar' },
  eliminar:       { pt:'Eliminar',         br:'Excluir',         en:'Delete',          es:'Eliminar' },
  editar:         { pt:'Editar',           br:'Editar',          en:'Edit',            es:'Editar' },
  novo:           { pt:'Novo',             br:'Novo',            en:'New',             es:'Nuevo' },
  ativo:          { pt:'Activo',           br:'Ativo',           en:'Active',          es:'Activo' },
  inativo:        { pt:'Inactivo',         br:'Inativo',         en:'Inactive',        es:'Inactivo' },
}

export const IDIOMAS = [
  { code:'pt', label:'🇵🇹 PT', nome:'Português (PT)' },
  { code:'br', label:'🇧🇷 BR', nome:'Português (BR)' },
  { code:'en', label:'🇬🇧 EN', nome:'English' },
  { code:'es', label:'🇪🇸 ES', nome:'Español' },
]

export const IdiomaContext = createContext('pt')

export function useIdioma() {
  const idioma = useContext(IdiomaContext)
  const t = (chave) => TRADUCOES[chave]?.[idioma] || TRADUCOES[chave]?.pt || chave
  return { idioma, t, isBR: idioma==='br', isEN: idioma==='en', isES: idioma==='es' }
}

export function useIdiomaState() {
  const [idioma, setIdioma] = useState(() => localStorage.getItem('cl_idioma') || 'pt')
  useEffect(() => { localStorage.setItem('cl_idioma', idioma) }, [idioma])
  return { idioma, setIdioma }
}
