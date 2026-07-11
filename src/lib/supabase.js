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
  async updateTreino(id, c) {
    const { data, error } = await supabase.from('treinos').update(c).eq('id', id).select().single()
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
  async updateSaude(id, c) {
    const { data, error } = await supabase.from('health').update(c).eq('id', id).select().single()
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
  async updateFinanca(id, c) {
    const { data, error } = await supabase.from('financas').update(c).eq('id', id).select().single()
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

  async uploadAnexoProva(userId, raceId, file) {
    const ext = file.name.split('.').pop()
    const path = `provas/${userId}/${raceId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('documentos-provas').upload(path, file)
    if (error) throw error
    const { data } = supabase.storage.from('documentos-provas').getPublicUrl(path)
    return { url: data.publicUrl, nome: file.name, tipo: file.type, path }
  },
  async deleteAnexoProva(path) {
    const { error } = await supabase.storage.from('documentos-provas').remove([path])
    if (error) throw error
  },

  async getAcasalamentos() {
    const { data, error } = await supabase.from('breeding').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
  async createAcasalamento(a) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('breeding').insert({ ...a, user_id: uid }).select().single()
    if (error) throw error
    return data
  },
  async updateAcasalamento(id, c) {
    const { data, error } = await supabase.from('breeding').update(c).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async deleteAcasalamento(id) {
    const { error } = await supabase.from('breeding').delete().eq('id', id)
    if (error) throw error
  },

  async getVacinas() {
    const { data, error } = await supabase.from('vacinas').select('*').order('data_aplicacao', { ascending: false })
    if (error) { if (error.code === '42P01') return []; throw error }
    return data || []
  },
  async createVacina(v) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('vacinas').insert({ ...v, user_id: uid }).select().single()
    if (error) throw error
    return data
  },
  async deleteVacina(id) {
    const { error } = await supabase.from('vacinas').delete().eq('id', id)
    if (error) throw error
  },
  async getPlanosVacinacao() {
    const { data, error } = await supabase.from('planos_vacinacao').select('*').order('nome')
    if (error) { if (error.code === '42P01') return []; throw error }
    return data || []
  },
  async createPlanoVacinacao(p) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('planos_vacinacao').insert({ ...p, user_id: uid }).select().single()
    if (error) throw error
    return data
  },
  async updatePlanoVacinacao(id, c) {
    const { data, error } = await supabase.from('planos_vacinacao').update(c).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async deletePlanoVacinacao(id) {
    const { error } = await supabase.from('planos_vacinacao').delete().eq('id', id)
    if (error) throw error
  },

  async getStock() {
    const { data, error } = await supabase.from('stock').select('*').order('nome')
    if (error) throw error
    return data || []
  },
  async createStockItem(s) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('stock').insert({ ...s, user_id: uid }).select().single()
    if (error) throw error
    return data
  },
  async updateStockItem(id, c) {
    const { data, error } = await supabase.from('stock').update(c).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async deleteStockItem(id) {
    const { error } = await supabase.from('stock').delete().eq('id', id)
    if (error) throw error
  },

  async getTarefas() {
    const { data, error } = await supabase.from('tarefas').select('*').order('data_prevista', { ascending: true, nullsFirst: false })
    if (error) throw error
    return data || []
  },
  async createTarefa(t) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('tarefas').insert({ ...t, user_id: uid }).select().single()
    if (error) throw error
    return data
  },
  async updateTarefa(id, c) {
    const { data, error } = await supabase.from('tarefas').update(c).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async deleteTarefa(id) {
    const { error } = await supabase.from('tarefas').delete().eq('id', id)
    if (error) throw error
  },

  async getEventosCal() {
    const { data, error } = await supabase.from('eventos_cal').select('*').order('data_ev')
    if (error) { if (error.code === '42P01') return []; throw error }
    return data || []
  },
  async createEventoCal(e) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('eventos_cal').insert({ ...e, user_id: uid }).select().single()
    if (error) throw error
    return data
  },
  async deleteEventoCal(id) {
    const { error } = await supabase.from('eventos_cal').delete().eq('id', id)
    if (error) throw error
  },

  async getEpocas() {
    const { data, error } = await supabase.from('epocas').select('*').order('ano', { ascending: false })
    if (error) { if (error.code === '42P01') return []; throw error }
    return data || []
  },
  async createEpoca(e) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('epocas').insert({ ...e, user_id: uid }).select().single()
    if (error) throw error
    return data
  },

  async getFeedPosts(limite = 20, offset = 0) {
    const uid = await this.uid()
    // Posts de quem sigo + os meus próprios
    const { data: seguidos } = await supabase.from('followers').select('following_id').eq('follower_id', uid)
    const ids = [...(seguidos || []).map(s => s.following_id), uid]
    const { data, error } = await supabase.from('posts').select('*').in('user_id', ids).order('created_at', { ascending: false }).range(offset, offset + limite - 1)
    if (error) { if (error.code === '42P01') return []; throw error }
    return data || []
  },
  async getAllPosts(limite = 20, offset = 0) {
    const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).range(offset, offset + limite - 1)
    if (error) { if (error.code === '42P01') return []; throw error }
    return data || []
  },
  async createPost(p) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('posts').insert({ ...p, user_id: uid }).select().single()
    if (error) throw error
    return data
  },
  async deletePost(id) {
    const { error } = await supabase.from('posts').delete().eq('id', id)
    if (error) throw error
  },
  async toggleLike(postId) {
    const uid = await this.uid()
    const { data: existing } = await supabase.from('post_likes').select('id').eq('post_id', postId).eq('user_id', uid).maybeSingle()
    if (existing) {
      await supabase.from('post_likes').delete().eq('id', existing.id)
      const { data: p } = await supabase.from('posts').select('likes_count').eq('id', postId).maybeSingle()
      await supabase.from('posts').update({ likes_count: Math.max(0,(p?.likes_count||0)-1) }).eq('id', postId)
      return false
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: uid })
      const { data: p2 } = await supabase.from('posts').select('likes_count').eq('id', postId).maybeSingle()
      await supabase.from('posts').update({ likes_count: (p2?.likes_count||0)+1 }).eq('id', postId)
      return true
    }
  },
  async getMyLikes() {
    const uid = await this.uid()
    const { data } = await supabase.from('post_likes').select('post_id').eq('user_id', uid)
    return new Set((data || []).map(l => l.post_id))
  },
  async getComments(postId) {
    const { data, error } = await supabase.from('comments').select('*').eq('post_id', postId).order('created_at')
    if (error) return []
    return data || []
  },
  async createComment(postId, conteudo, autorNome) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('comments').insert({ post_id: postId, user_id: uid, autor_nome: autorNome, conteudo }).select().single()
    if (error) throw error
    await supabase.from('posts').update({ comments_count: (await supabase.from('comments').select('id', { count: 'exact' }).eq('post_id', postId)).count }).eq('id', postId)
    return data
  },
  async getFollowing() {
    const uid = await this.uid()
    const { data } = await supabase.from('followers').select('following_id').eq('follower_id', uid)
    return new Set((data || []).map(f => f.following_id))
  },
  async toggleFollow(targetId) {
    const uid = await this.uid()
    const { data: existing } = await supabase.from('followers').select('id').eq('follower_id', uid).eq('following_id', targetId).maybeSingle()
    if (existing) {
      await supabase.from('followers').delete().eq('id', existing.id)
      return false
    } else {
      await supabase.from('followers').insert({ follower_id: uid, following_id: targetId })
      return true
    }
  },
  async getNotificacoes() {
    const uid = await this.uid()
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(20)
    if (error) { if (error.code === '42P01') return []; throw error }
    return data || []
  },
  async marcarNotifLida(id) {
    await supabase.from('notifications').update({ lida: true }).eq('id', id)
  },
  async marcarTodasNotifLidas() {
    const uid = await this.uid()
    await supabase.from('notifications').update({ lida: true }).eq('user_id', uid)
  },
  async getExplorar() {
    const { data } = await supabase.from('perfis').select('*').eq('publico', true).limit(30)
    return data || []
  },

  async getFeedPostsLegacy() {
    const { data, error } = await supabase.from('community_posts').select('*').order('created_at', { ascending: false }).limit(30)
    if (error) { if (error.code === '42P01') return []; throw error }
    return data || []
  },
  async getRankingComunidade() {
    const { data, error } = await supabase.from('community_ranking').select('*').order('pontos', { ascending: false }).limit(50)
    if (error) { if (error.code === '42P01') return []; throw error }
    return data || []
  },
  async upsertRankingComunidade(nome, pontos) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('community_ranking').upsert({ user_id: uid, nome, pontos, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select().single()
    if (error) { if (error.code === '42P01') return null; throw error }
    return data
  },

  async isAdmin(email) {
    const { data, error } = await supabase.from('admin_users').select('*').eq('email', email).maybeSingle()
    if (error) return false
    return !!data
  },
  async getLicencas() {
    const { data, error } = await supabase.from('licencas').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
  async updateLicenca(id, c) {
    const { data, error } = await supabase.from('licencas').update(c).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async getTreatmentPlans() {
    const { data, error } = await supabase.from('treatment_plans').select('*').order('nome')
    if (error) { if (error.code === '42P01') return []; throw error }
    return data || []
  },
  async createTreatmentPlan(p) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('treatment_plans').insert({ ...p, user_id: uid }).select().single()
    if (error) throw error
    return data
  },
  async updateTreatmentPlan(id, c) {
    const { data, error } = await supabase.from('treatment_plans').update({ ...c, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async deleteTreatmentPlan(id) {
    const { error } = await supabase.from('treatment_plans').delete().eq('id', id)
    if (error) throw error
  },

  async getTreatmentApplications() {
    const { data, error } = await supabase.from('treatment_applications').select('*').order('semana_inicio', { ascending: false })
    if (error) { if (error.code === '42P01') return []; throw error }
    return data || []
  },
  async createTreatmentApplication(a) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('treatment_applications').insert({ ...a, user_id: uid }).select().single()
    if (error) throw error
    return data
  },
  async updateTreatmentApplication(id, c) {
    const { data, error } = await supabase.from('treatment_applications').update({ ...c, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async deleteTreatmentApplication(id) {
    const { error } = await supabase.from('treatment_applications').delete().eq('id', id)
    if (error) throw error
  },

  async getTreatmentProducts() {
    const { data, error } = await supabase.from('treatment_products').select('*').order('nome')
    if (error) { if (error.code === '42P01') return []; throw error }
    return data || []
  },
  async createTreatmentProduct(p) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('treatment_products').insert({ ...p, user_id: uid }).select().single()
    if (error) throw error
    return data
  },
  async updateTreatmentProduct(id, c) {
    const { data, error } = await supabase.from('treatment_products').update(c).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async deleteTreatmentProduct(id) {
    const { error } = await supabase.from('treatment_products').delete().eq('id', id)
    if (error) throw error
  },

  async getMinhasLigas() {
    const uid = await this.uid()
    const { data, error } = await supabase.from('league_members').select('*, leagues(*)').eq('user_id', uid)
    if (error) { if (error.code === '42P01') return []; throw error }
    return (data || []).map(m => ({ ...m.leagues, meu_role: m.role })).filter(Boolean)
  },
  async createLeague(l) {
    const uid = await this.uid()
    const invite_code = Math.random().toString(36).slice(2, 8).toUpperCase()
    const { nome_membro, ...ligaPayload } = l
    const { data, error } = await supabase.from('leagues').insert({ ...ligaPayload, creator_id: uid, invite_code }).select().single()
    if (error) throw error
    await supabase.from('league_members').insert({ league_id: data.id, user_id: uid, nome: nome_membro || 'Eu', role: 'admin' })
    return data
  },
  async entrarLigaPorCodigo(invite_code, nome) {
    const uid = await this.uid()
    const { data: liga, error: e1 } = await supabase.from('leagues').select('*').eq('invite_code', invite_code.toUpperCase()).maybeSingle()
    if (e1) throw e1
    if (!liga) throw new Error('Código de liga inválido')
    const { error: e2 } = await supabase.from('league_members').insert({ league_id: liga.id, user_id: uid, nome, role: 'member' })
    if (e2) { if (e2.code === '23505') throw new Error('Já é membro desta liga'); throw e2 }
    return liga
  },
  async getMembrosLiga(leagueId) {
    const { data, error } = await supabase.from('league_members').select('*').eq('league_id', leagueId)
    if (error) throw error
    return data || []
  },
  async getResultadosLiga(leagueId) {
    const { data, error } = await supabase.from('league_results').select('*, races(nome, data_reg, tipo)').eq('league_id', leagueId)
    if (error) { if (error.code === '42P01') return []; throw error }
    return data || []
  },
  async registarResultadoLiga(r) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('league_results').upsert({ ...r, user_id: uid }, { onConflict: 'league_id,user_id,race_id' }).select().single()
    if (error) throw error
    return data
  },
  async deleteLeague(id) {
    const { error } = await supabase.from('leagues').delete().eq('id', id)
    if (error) throw error
  },
  async sairDeLiga(leagueId, userId) {
    const { error } = await supabase.from('league_members').delete().eq('league_id', leagueId).eq('user_id', userId)
    if (error) throw error
  },

  async getForumTopicos(categoria) {
    let q = supabase.from('forum_topicos').select('*').order('fixado', { ascending: false }).order('created_at', { ascending: false }).limit(50)
    if (categoria && categoria !== 'Todos') q = q.eq('categoria', categoria)
    const { data, error } = await q
    if (error) throw error  // throw sempre — deixar o caller decidir
    return data || []
  },
  async createForumTopico(t) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('forum_topicos').insert({ ...t, user_id: uid }).select().single()
    if (error) throw error
    return data
  },
  async deleteForumTopico(id) {
    const { error } = await supabase.from('forum_topicos').delete().eq('id', id)
    if (error) throw error
  },
  async incrementForumViews(id) {
    const { data: top } = await supabase.from('forum_topicos').select('views').eq('id', id).maybeSingle()
    try { await supabase.from('forum_topicos').update({ views: (top?.views||0)+1 }).eq('id', id) } catch {}
  },
  async getForumRespostas(topicoId) {
    const { data, error } = await supabase.from('forum_respostas').select('*').eq('topico_id', topicoId).order('created_at')
    if (error) return []
    return data || []
  },
  async createForumResposta(r) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('forum_respostas').insert({ ...r, user_id: uid }).select().single()
    if (error) throw error
    const { data: topico } = await supabase.from('forum_topicos').select('respostas_count').eq('id', r.topico_id).maybeSingle()
    try { await supabase.from('forum_topicos').update({ respostas_count: (topico?.respostas_count||0)+1 }).eq('id', r.topico_id) } catch {}
    return data
  },

  async getPedigree(pigeonId) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('pedigrees').select('arvore').eq('user_id', uid).eq('pigeon_id', pigeonId).maybeSingle()
    if (error) { if (error.code === '42P01') return null; throw error }
    return data?.arvore || null
  },
  async savePedigree(pigeonId, arvore) {
    const uid = await this.uid()
    const { error } = await supabase.from('pedigrees').upsert({ user_id: uid, pigeon_id: pigeonId, arvore, updated_at: new Date().toISOString() }, { onConflict: 'user_id,pigeon_id' })
    if (error) throw error
  },

  async getFeatureFlags() {
    const { data, error } = await supabase.from('feature_flags').select('*').order('label')
    if (error) throw error
    return data || []
  },
  async updateFeatureFlag(id, updates) {
    const { data, error } = await supabase.from('feature_flags').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async getBetaTesters() {
    const { data, error } = await supabase.from('beta_testers').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
  async addBetaTester(email, nome) {
    const { data, error } = await supabase.from('beta_testers').insert({ email, nome }).select().single()
    if (error) throw error
    return data
  },
  async removeBetaTester(id) {
    const { error } = await supabase.from('beta_testers').delete().eq('id', id)
    if (error) throw error
  },

  async getPerfilPublico(slug) {
    const { data, error } = await supabase.from('perfis').select('*').eq('slug', slug).single()
    if (error) throw error
    return data
  },
  async getPombosPublicos(userId) {
    const { data, error } = await supabase.from('pigeons').select('*').eq('user_id', userId).eq('estado', 'ativo').order('percentil', { ascending: false })
    if (error) throw error
    return data || []
  },
  async getPostsPublicos(userId) {
    const { data, error } = await supabase.from('posts').select('*').eq('user_id', userId).eq('visivel', true).order('created_at', { ascending: false }).limit(20)
    if (error) { if (error.code === '42P01') return []; throw error }
    return data || []
  },
  // ─── Mensagens ───────────────────────────────────────────────
  async getConversas() {
    const uid = await this.uid()
    const { data, error } = await supabase.from('mensagens_conversas')
      .select('*').or(`user_a.eq.${uid},user_b.eq.${uid}`)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return data || []
  },
  async criarConversa(outroId, outroNome, outraFoto, meuNome, minhaFoto) {
    const uid = await this.uid()
    // Verificar se já existe conversa entre os dois utilizadores
    const { data: existente } = await supabase.from('mensagens_conversas')
      .select('*')
      .or(`and(user_a.eq.${uid},user_b.eq.${outroId}),and(user_a.eq.${outroId},user_b.eq.${uid})`)
      .maybeSingle()
    if (existente) return existente
    const { data, error } = await supabase.from('mensagens_conversas').insert({
      user_a: uid, user_b: outroId,
      nome_a: meuNome, nome_b: outroNome,
      foto_a: minhaFoto || '', foto_b: outraFoto || '',
      updated_at: new Date().toISOString()
    }).select().single()
    if (error) throw error
    return data
  },
  async getMensagens(conversaId) {
    const { data, error } = await supabase.from('mensagens')
      .select('*').eq('conversa_id', conversaId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  },
  async enviarMensagem(conversaId, conteudo, autorNome, replyId, replyTexto) {
    const uid = await this.uid()
    const { data, error } = await supabase.from('mensagens').insert({
      conversa_id: conversaId, user_id: uid, autor: autorNome,
      conteudo, lida: false,
      reply_to: replyId || null, reply_texto: replyTexto || null
    }).select().single()
    if (error) throw error
    await supabase.from('mensagens_conversas').update({
      ultima_msg: conteudo, updated_at: new Date().toISOString()
    }).eq('id', conversaId)
    return data
  },
  async marcarMensagensLidas(conversaId) {
    const uid = await this.uid()
    await supabase.from('mensagens').update({ lida: true })
      .eq('conversa_id', conversaId).neq('user_id', uid)
  },
}

