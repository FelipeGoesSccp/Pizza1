import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dataBR = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '')
const hojeISO = () => new Date().toISOString().slice(0, 10)

const PADRAO = [
  '🍕 Vendas no salão', '🛵 Delivery', '🥤 Bebidas', '🧀 Ingredientes', '🥫 Embalagens',
  '👨‍🍳 Funcionários', '🔥 Lenha e gás', '💡 Contas e aluguel', '📣 Marketing', '🔧 Manutenção',
]
const RAPIDOS = [10, 30, 50, 100]

const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none text-xs text-gray-800 focus:border-primary bg-white'
const labelCls = 'block text-xs font-bold text-gray-600 mb-1'
const btnPrimary = 'bg-primary text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-red-700 active:scale-95 transition-all shadow-sm disabled:opacity-50'
const btnGhost = 'border border-gray-300 text-gray-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 active:scale-95 transition-all'
const btnEdit = 'bg-blue-100 text-blue-700 px-2.5 py-1.5 rounded-lg text-[11px] font-bold hover:bg-blue-200 active:scale-95 transition-all'
const btnDel = 'bg-red-100 text-red-600 px-2.5 py-1.5 rounded-lg text-[11px] font-bold hover:bg-red-200 active:scale-95 transition-all'

export function exportarCSV(lancamentos) {
  if (!lancamentos.length) return
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const linhas = [
    ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor (R$)'].join(';'),
    ...lancamentos.map(l => [
      dataBR(l.data_lancamento), l.tipo === 'receita' ? 'Venda' : 'Despesa',
      q(l.descricao), q(l.categoria), Number(l.valor).toFixed(2).replace('.', ','),
    ].join(';')),
  ]
  const blob = new Blob(['\uFEFF' + linhas.join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `caixa-pizzaria-${hojeISO()}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

// ═══ Categorias do caixa (separadas das categorias do cardápio) ═══
function CategoriasCaixa({ categorias, userId, onUpdate, mostrarToast }) {
  const [nova, setNova] = useState('')
  const [editId, setEditId] = useState(null)
  const [editNome, setEditNome] = useState('')
  const [busy, setBusy] = useState(false)

  const existe = (nome, ignorarId) =>
    categorias.some(c => c.id !== ignorarId && c.nome.toLowerCase() === nome.toLowerCase())

  async function executar(fn, ok) {
    setBusy(true)
    const { error } = await fn()
    setBusy(false)
    if (error) return mostrarToast(error.message, 'erro')
    if (ok) mostrarToast(ok)
    onUpdate()
  }

  async function criar(e) {
    e.preventDefault()
    const nome = nova.trim()
    if (!nome) return
    if (existe(nome)) return mostrarToast('Já existe uma categoria com esse nome.', 'erro')
    await executar(() => supabase.from('caixa_categorias').insert({ nome, user_id: userId }), 'Categoria criada!')
    setNova('')
  }

  async function renomear(id) {
    const nome = editNome.trim()
    if (!nome) return
    if (existe(nome, id)) return mostrarToast('Já existe uma categoria com esse nome.', 'erro')
    await executar(() => supabase.from('caixa_categorias').update({ nome }).eq('id', id).eq('user_id', userId), 'Categoria renomeada!')
    setEditId(null)
  }

  async function apagar(c) {
    if (!window.confirm(`Remover "${c.nome}"? Os lançamentos existentes continuam salvos.`)) return
    await executar(() => supabase.from('caixa_categorias').delete().eq('id', c.id).eq('user_id', userId), 'Categoria removida!')
  }

  async function gerarPadroes() {
    const novas = PADRAO.filter(p => !existe(p))
    if (!novas.length) return mostrarToast('Todas as categorias padrão já existem.', 'erro')
    await executar(() => supabase.from('caixa_categorias').insert(novas.map(nome => ({ nome, user_id: userId }))), 'Categorias padrão criadas!')
  }

  return (
    <details className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
      <summary className="cursor-pointer text-xs font-black text-gray-800 uppercase tracking-wide">
        🏷️ Categorias do caixa <span className="text-gray-400 font-bold">({categorias.length})</span>
      </summary>
      <form onSubmit={criar} className="flex gap-2 mt-3">
        <input className={inputCls} value={nova} onChange={e => setNova(e.target.value)} placeholder="Ex: Delivery, Bebidas..." aria-label="Nova categoria" />
        <button className={btnPrimary} disabled={busy}>Adicionar</button>
      </form>
      <button type="button" onClick={gerarPadroes} disabled={busy} className="text-[11px] font-bold text-primary mt-2 hover:underline">
        Gerar categorias padrão da pizzaria
      </button>
      {categorias.length === 0 ? (
        <p className="text-xs text-gray-400 mt-3">Crie categorias como Delivery, Ingredientes ou Bebidas.</p>
      ) : (
        <ul className="space-y-2 mt-3">
          {categorias.map(c => (
            <li key={c.id} className="flex justify-between items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-xl">
              {editId === c.id ? (
                <>
                  <input className={inputCls} value={editNome} onChange={e => setEditNome(e.target.value)} aria-label="Novo nome" autoFocus />
                  <div className="flex gap-1.5">
                    <button className={btnEdit} onClick={() => renomear(c.id)}>Salvar</button>
                    <button className={btnGhost} onClick={() => setEditId(null)}>×</button>
                  </div>
                </>
              ) : (
                <>
                  <span className="font-bold text-xs text-gray-800">{c.nome}</span>
                  <div className="flex gap-1.5">
                    <button className={btnEdit} onClick={() => { setEditId(c.id); setEditNome(c.nome) }}>Renomear</button>
                    <button className={btnDel} onClick={() => apagar(c)}>Remover</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}

// ═══ Formulário de lançamento (modal) ═══
function FormLancamento({ categorias, lancamento, onSalvar, onFechar }) {
  const edicao = !!lancamento
  const [tipo, setTipo] = useState(lancamento?.tipo ?? 'receita')
  const [descricao, setDescricao] = useState(lancamento?.descricao ?? '')
  const [valor, setValor] = useState(lancamento ? String(lancamento.valor) : '')
  const [categoria, setCategoria] = useState(lancamento?.categoria ?? categorias[0]?.nome ?? '')
  const [data, setData] = useState(lancamento ? lancamento.data_lancamento.slice(0, 10) : hojeISO())
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const somar = (v) => setValor(((parseFloat(String(valor).replace(',', '.')) || 0) + v).toFixed(2))

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    const v = parseFloat(String(valor).replace(',', '.'))
    if (!descricao.trim()) return setErro('Informe uma descrição.')
    if (!(v > 0)) return setErro('Informe um valor maior que zero.')
    if (!categoria) return setErro('Selecione uma categoria (crie uma em "Categorias do caixa").')
    setEnviando(true)
    try {
      await onSalvar({
        tipo, descricao: descricao.trim(), categoria,
        valor: Number(v.toFixed(2)),
        data_lancamento: new Date(data + 'T12:00:00Z').toISOString(),
      })
    } catch (err) {
      setErro(err.message)
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center px-4">
      <form onSubmit={enviar} className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl max-h-[92vh] overflow-y-auto text-left">
        <h4 className="text-lg font-black text-gray-800 mb-4">{edicao ? '✏️ Editar lançamento' : '➕ Novo lançamento'}</h4>

        <div className="grid grid-cols-2 border border-gray-200 rounded-xl overflow-hidden mb-3" role="group" aria-label="Tipo">
          {[['receita', '🍕 Venda'], ['despesa', '🧾 Despesa']].map(([id, label]) => (
            <button
              type="button" key={id} onClick={() => setTipo(id)} aria-pressed={tipo === id}
              className={`py-2.5 text-xs font-bold transition-all ${tipo === id ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className={labelCls}>Descrição <span className="text-primary">*</span></label>
        <input
          className={`${inputCls} mb-3`} value={descricao} onChange={e => setDescricao(e.target.value)}
          placeholder={tipo === 'receita' ? 'Ex: 3 pizzas calabresa grande' : 'Ex: 20 kg de mussarela'} autoFocus
        />

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className={labelCls}>Valor (R$) <span className="text-primary">*</span></label>
            <input className={inputCls} inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <label className={labelCls}>Data</label>
            <input type="date" className={inputCls} value={data} onChange={e => setData(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap mb-3">
          {RAPIDOS.map(v => (
            <button type="button" key={v} onClick={() => somar(v)} className="text-[11px] font-bold px-3 py-1 rounded-full border border-gray-300 text-gray-600 hover:border-primary hover:text-primary">
              +{v}
            </button>
          ))}
          <button type="button" onClick={() => setValor('')} className="text-[11px] font-bold px-3 py-1 rounded-full text-gray-400 hover:text-primary">Limpar</button>
        </div>

        <label className={labelCls}>Categoria <span className="text-primary">*</span></label>
        <select className={`${inputCls} mb-2`} value={categoria} onChange={e => setCategoria(e.target.value)}>
          {categoria && !categorias.some(c => c.nome === categoria) && <option>{categoria}</option>}
          {categorias.length === 0 && !categoria && <option value="">Nenhuma categoria</option>}
          {categorias.map(c => <option key={c.id}>{c.nome}</option>)}
        </select>

        {erro && <p className="text-[11px] text-red-500 mb-2 font-semibold" role="alert">{erro}</p>}

        <div className="flex gap-2 mt-4">
          <button type="button" onClick={onFechar} className={`flex-1 ${btnGhost}`}>Cancelar</button>
          <button type="submit" disabled={enviando} className={`flex-1 ${btnPrimary}`}>{enviando ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
    </div>
  )
}

// ═══ Painel principal do Caixa ═══
export default function CaixaPanel({ mostrarToast }) {
  const { user } = useAuth()
  const userId = user.id

  const [lancamentos, setLancamentos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroCat, setFiltroCat] = useState('')
  const [busca, setBusca] = useState('')
  const idsRef = useRef(new Set())

  const carregarCategorias = useCallback(async () => {
    const { data } = await supabase.from('caixa_categorias').select('*').eq('user_id', userId).order('nome')
    if (data) setCategorias(data)
  }, [userId])

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    const [lan, cat] = await Promise.all([
      supabase.from('caixa_lancamentos').select('*').eq('user_id', userId).order('data_lancamento', { ascending: false }),
      supabase.from('caixa_categorias').select('*').eq('user_id', userId).order('nome'),
    ])
    const e = lan.error || cat.error
    if (e) setErro(e.code === '42P01' || e.code === 'PGRST205' ? 'Tabelas do caixa não encontradas. Rode o arquivo supabase/caixa_auth.sql no Supabase.' : e.message)
    else { setLancamentos(lan.data); setCategorias(cat.data) }
    setCarregando(false)
  }, [userId])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => { idsRef.current = new Set(lancamentos.map(l => l.id)) }, [lancamentos])

  // Realtime: sincroniza alterações feitas em outros dispositivos
  useEffect(() => {
    const filter = `user_id=eq.${userId}`
    const canalLan = supabase.channel('rt-caixa-lancamentos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'caixa_lancamentos', filter }, ({ eventType, new: novo, old }) => {
        if (eventType === 'INSERT' && !idsRef.current.has(novo.id)) {
          setLancamentos(p => [novo, ...p].sort((a, b) => new Date(b.data_lancamento) - new Date(a.data_lancamento)))
          mostrarToast('⚡ Novo lançamento sincronizado!')
        } else if (eventType === 'UPDATE') {
          setLancamentos(p => p.map(l => (l.id === novo.id ? novo : l)))
        } else if (eventType === 'DELETE' && idsRef.current.has(old.id)) {
          setLancamentos(p => p.filter(l => l.id !== old.id))
          mostrarToast('🗑️ Lançamento removido em outro dispositivo')
        }
      }).subscribe()
    const canalCat = supabase.channel('rt-caixa-categorias')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'caixa_categorias', filter }, carregarCategorias)
      .subscribe()
    return () => { supabase.removeChannel(canalLan); supabase.removeChannel(canalCat) }
  }, [userId, carregarCategorias]) // eslint-disable-line react-hooks/exhaustive-deps

  async function salvar(payload) {
    if (editando) {
      const { data, error } = await supabase.from('caixa_lancamentos').update(payload)
        .eq('id', editando.id).eq('user_id', userId).select().single()
      if (error) throw new Error(error.message)
      setLancamentos(p => p.map(l => (l.id === data.id ? data : l)))
      mostrarToast('Lançamento atualizado!')
    } else {
      const { data, error } = await supabase.from('caixa_lancamentos').insert({ ...payload, user_id: userId }).select().single()
      if (error) throw new Error(error.message)
      setLancamentos(p => (p.some(l => l.id === data.id) ? p : [data, ...p]))
      mostrarToast('Lançamento registrado!')
    }
    setFormAberto(false)
    setEditando(null)
  }

  async function remover(l) {
    if (!window.confirm(`Excluir o lançamento "${l.descricao}"?`)) return
    const { error } = await supabase.from('caixa_lancamentos').delete().eq('id', l.id).eq('user_id', userId)
    if (error) return mostrarToast(error.message, 'erro')
    setLancamentos(p => p.filter(x => x.id !== l.id))
    mostrarToast('Lançamento excluído!')
  }

  const { vendas, despesas, saldo, economia, porCategoria } = useMemo(() => {
    const soma = (t) => lancamentos.filter(l => l.tipo === t).reduce((s, l) => s + Number(l.valor), 0)
    const vendas = soma('receita')
    const despesas = soma('despesa')
    const saldo = vendas - despesas
    const mapa = {}
    lancamentos.filter(l => l.tipo === 'despesa').forEach(l => { mapa[l.categoria] = (mapa[l.categoria] || 0) + Number(l.valor) })
    const porCategoria = Object.entries(mapa)
      .map(([nome, total]) => ({ nome, total, pct: despesas > 0 ? Math.round((total / despesas) * 100) : 0 }))
      .sort((a, b) => b.total - a.total)
    return { vendas, despesas, saldo, economia: vendas > 0 ? Math.max(0, Math.round((saldo / vendas) * 100)) : 0, porCategoria }
  }, [lancamentos])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return lancamentos.filter(l =>
      (filtroTipo === 'todos' || l.tipo === filtroTipo) &&
      (!filtroCat || l.categoria === filtroCat) &&
      (!termo || l.descricao.toLowerCase().includes(termo) || l.categoria.toLowerCase().includes(termo) || String(l.valor).includes(termo)))
  }, [lancamentos, filtroTipo, filtroCat, busca])

  const nVendas = lancamentos.filter(l => l.tipo === 'receita').length

  return (
    <section className="text-left space-y-4">
      {erro && <p className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold">{erro}</p>}

      <div className="bg-gradient-to-r from-dark to-[#3a3a3a] text-white rounded-2xl p-4 shadow-sm">
        <span className="text-[10px] uppercase tracking-wider text-gray-300 font-black">Saldo do caixa</span>
        <p className={`text-3xl font-black leading-tight ${saldo < 0 ? 'text-red-300' : ''}`}>{brl(saldo)}</p>
        <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
          <div><span className="text-gray-300 block">Vendas</span><b className="text-green-300">{brl(vendas)}</b></div>
          <div><span className="text-gray-300 block">Despesas</span><b className="text-red-300">{brl(despesas)}</b></div>
          <div><span className="text-gray-300 block">Economia</span><b>{economia}%</b></div>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => { setEditando(null); setFormAberto(true) }} className={`flex-1 ${btnPrimary}`}>➕ Novo lançamento</button>
        {lancamentos.length > 0 && <button onClick={() => exportarCSV(lancamentos)} className={btnGhost}>📥 CSV</button>}
      </div>

      <CategoriasCaixa categorias={categorias} userId={userId} onUpdate={carregarCategorias} mostrarToast={mostrarToast} />

      {porCategoria.length > 0 && (
        <details open className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
          <summary className="cursor-pointer text-xs font-black text-gray-800 uppercase tracking-wide">📊 Para onde vai o dinheiro</summary>
          <ul className="space-y-3 mt-3">
            {porCategoria.map(c => (
              <li key={c.nome}>
                <div className="flex justify-between text-[11px] mb-1"><span className="font-bold text-gray-700">{c.nome}</span><b className="text-gray-500">{brl(c.total)} · {c.pct}%</b></div>
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${c.pct}%` }} /></div>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div>
        <h3 className="text-base font-black text-gray-800 uppercase tracking-wide mb-2">Lançamentos</h3>
        <div className="grid grid-cols-3 border border-gray-200 rounded-xl overflow-hidden mb-2" role="group" aria-label="Filtrar por tipo">
          {[['todos', `Todos (${lancamentos.length})`], ['receita', `Vendas (${nVendas})`], ['despesa', `Despesas (${lancamentos.length - nVendas})`]].map(([id, label]) => (
            <button key={id} onClick={() => setFiltroTipo(id)} aria-pressed={filtroTipo === id}
              className={`py-2 text-[11px] font-bold ${filtroTipo === id ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}>{label}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <input type="search" className={inputCls} value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..." aria-label="Buscar" />
          <select className={inputCls} value={filtroCat} onChange={e => setFiltroCat(e.target.value)} aria-label="Filtrar por categoria">
            <option value="">Todas as categorias</option>
            {categorias.map(c => <option key={c.id}>{c.nome}</option>)}
          </select>
        </div>

        {carregando ? (
          <div className="py-8 text-center text-gray-400 text-xs">Carregando caixa...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-6 bg-gray-50 rounded-2xl text-center text-gray-400 text-xs">
            {lancamentos.length ? 'Nada encontrado com esses filtros.' : 'O caixa está vazio. Registre a primeira venda.'}
          </div>
        ) : (
          <ul className="space-y-2">
            {filtrados.map(l => (
              <li key={l.id} className="bg-gray-50 border border-gray-200 px-4 py-3 rounded-2xl">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-gray-800 break-words">{l.descricao}</p>
                    <p className="text-[11px] text-gray-400">{dataBR(l.data_lancamento)} · {l.categoria}</p>
                  </div>
                  <b className={`text-sm whitespace-nowrap ${l.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                    {l.tipo === 'receita' ? '+' : '−'} {brl(l.valor)}
                  </b>
                </div>
                <div className="flex gap-1.5 mt-2 justify-end">
                  <button className={btnEdit} onClick={() => { setEditando(l); setFormAberto(true) }}>Editar</button>
                  <button className={btnDel} onClick={() => remover(l)}>Excluir</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {formAberto && (
        <FormLancamento
          key={editando?.id ?? 'novo'}
          categorias={categorias}
          lancamento={editando}
          onSalvar={salvar}
          onFechar={() => { setFormAberto(false); setEditando(null) }}
        />
      )}
    </section>
  )
}
