import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://tgqnbheetpgnpjsjphoj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRncW5iaGVldHBnbnBqc2pwaG9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NTk0NDIsImV4cCI6MjA5MjAzNTQ0Mn0.32ZjOUB-bOAIgtwwpKDVRSJy1w4xlOR7IMb4bRTK3Uo',
  { auth: { persistSession: true, autoRefreshToken: true } }
)

export const db = {
  async uid() {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id
  },

  async getPerfil() {
    const uid = await this.uid()
    if (!uid) return null
    const { data } = await supabase.from('perfis').select('*').eq('user_id', uid).single()
    return data
  },
  async savePerfil(p) {
    const uid = await this.uid()
    if (!uid) throw new Error('Sem auth')
    const { data, error } = await supabase.from('perfis').upsert(
      { ...p, user_id: uid, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    ).select().single()
    if (error) throw error
    return data
  },

  async getPombos() {
    const { data, error } = await supabase.from('pigeons').select('*').order('nome')
    if (error) throw error
    return data || []
  },
  async createPombo(p) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('pigeons').insert({ ...p, user_id: uid }).select().single()
    if (error) throw error
    return data
  },
  async updatePombo(id, changes) {
    const { data, error } = await supabase.from('pigeons').update(changes).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async deletePombo(id) {
    const { error } = await supabase.from('pigeons').delete().eq('id', id)
    if (error) throw error
  },

  async getPombais() {
    const { data, error } = await supabase.from('lofts').select('*').order('nome')
    if (error) throw error
    return data || []
  },
  async createPombal(p) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('lofts').insert({ ...p, user_id: uid }).select().single()
    if (error) throw error
    return data
  },
  async updatePombal(id, c) {
    const { data, error } = await supabase.from('lofts').update(c).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async deletePombal(id) {
    const { error } = await supabase.from('lofts').delete().eq('id', id)
    if (error) throw error
  },

  async getProvas() {
    const { data, error } = await supabase.from('races').select('*').order('data_reg', { ascending: false })
    if (error) throw error
    return data || []
  },
  async createProva(p) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('races').insert({ ...p, user_id: uid }).select().single()
    if (error) throw error
    return data
  },
  async updateProva(id, c) {
    const { data, error } = await supabase.from('races').update(c).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async deleteProva(id) {
    const { error } = await supabase.from('races').delete().eq('id', id)
    if (error) throw error
  },

  async getResultados(raceId) {
    const { data, error } = await supabase.from('race_results').select('*, pigeons(nome,anilha,emoji,foto_url)').eq('race_id', raceId).order('posicao', { ascending: true, nullsFirst: false })
    if (error) throw error
    return data || []
  },
  async createResultado(r) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('race_results').insert({ ...r, user_id: uid }).select().single()
    if (error) throw error
    return data
  },
  async updateResultado(id, c) {
    const { data, error } = await supabase.from('race_results').update(c).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async deleteResultado(id) {
    const { error } = await supabase.from('race_results').delete().eq('id', id)
    if (error) throw error
  },

  async getTreinos() {
    const { data, error } = await supabase.from('treinos').select('*').order('data', { ascending: false })
    if (error) throw error
    return data || []
  },
  async createTreino(t) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('treinos').insert({ ...t, user_id: uid }).select().single()
    if (error) throw error
    return data
  },
  async deleteTreino(id) {
    const { error } = await supabase.from('treinos').delete().eq('id', id)
    if (error) throw error
  },

  async getSaude() {
    const { data, error } = await supabase.from('health')
      .select('*, pigeons(nome,emoji)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
  async createSaude(s) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('health').insert({ ...s, user_id: uid }).select().single()
    if (error) throw error
    return data
  },
  async deleteSaude(id) {
    const { error } = await supabase.from('health').delete().eq('id', id)
    if (error) throw error
  },

  async getFinancas() {
    const { data, error } = await supabase.from('financas').select('*').order('data_reg', { ascending: false })
    if (error) throw error
    return data || []
  },
  async createFinanca(f) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('financas').insert({ ...f, user_id: uid }).select().single()
    if (error) throw error
    return data
  },
  async deleteFinanca(id) {
    const { error } = await supabase.from('financas').delete().eq('id', id)
    if (error) throw error
  },

  async uploadFoto(userId, pigeonId, file) {
    const ext = file.name.split('.').pop()
    const path = `pombos/${userId}/${pigeonId}.${ext}`
    const { error } = await supabase.storage.from('fotos-pombos').upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('fotos-pombos').getPublicUrl(path)
    return data.publicUrl
  },
}
