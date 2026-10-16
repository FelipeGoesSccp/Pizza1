import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const TIPOS = [
  { id: 'forno', label: '🔥 Forno e equipamentos' },
  { id: 'reforma', label: '🏗️ Reforma e ampliação' },
  { id: 'veiculos', label: '🛵 Motos e veículos de entrega' },
  { id: 'marketing', label: '📣 Marketing e site' },
  { id: 'reserva', label: '🏦 Reserva financeira (CDB/Tesouro)' },
  { id: 'outros', label: '💼 Outros' },
]
const rotulo = (id) => TIPOS.find(t => t.id === id)?.label ?? id
const vazio = { nome: '', tipo: 'forno', valor_investido: '', valor_atual: '', observacoes: '' }
const num = (v) => parseFloat(String(v).replace(',', '.'))

const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none text-xs text-gray-800 focus:border-primary bg-white'
const labelCls = 'block text-xs font-bold text-gray-600 mb-1'
const btnPrimary = 'bg-primary text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-red-700 active:scale-95 transition-all shadow-sm disabled:opacity-50'
const btnGhost = 'border border-gray-300 text-gray-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 active:scale-95 transition-all'
const btnEdit = 'bg-blue-100 text-blue-700 px-2.5 py-1.5 rounded-lg text-[11px] font-bold hover:bg-blue-200 active:scale-95 transition-all'
const btnDel = 'bg-red-100 text-red-600 px-2.5 py-1.5 rounded-lg text-[11px] font-bold hover:bg-red-200 active:scale-95 transition-all'

export default function InvestimentosPanel({ mostrarToast }) {
  const { user } = useAuth()
  const userId = user.id

  const [itens, setItens] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [formAberto, setFormAberto] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(vazio)
  const [erroForm, setErroForm] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sim, setSim] = useState({ aporte: 500, taxa: 11, anos: 5 })

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('investimentos').select('*')
      .eq('user_id', userId).order('criado_em', { ascending: false })
    if (error) setErro(error.code === '42P01' || error.code === 'PGRST205' ? 'Tabela "investimentos" não encontrada. Rode o arquivo supabase/caixa_auth.sql no Supabase.' : error.message)
    else { setItens(data); setErro('') }
    setCarregando(false)
  }, [userId])

  useEffect(() => {
    carregar()
    const canal = supabase.channel('rt-investimentos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investimentos', filter: `user_id=eq.${userId}` }, carregar)
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [carregar, userId])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  function abrirNovo() { setEditId(null); setForm(vazio); setErroForm(''); setFormAberto(true) }
  function abrirEditar(i) {
    setEditId(i.id)
    setForm({ nome: i.nome, tipo: i.tipo, valor_investido: String(i.valor_investido), valor_atual: String(i.valor_atual), observacoes: i.observacoes ?? '' })
    setErroForm(''); setFormAberto(true)
  }

  async function salvar(e) {
    e.preventDefault()
    const investido = num(form.valor_investido)
    if (!form.nome.trim()) return setErroForm('Informe o nome do item.')
    if (!(investido > 0)) return setErroForm('Informe um valor investido válido.')
    const atual = form.valor_atual === '' ? investido : num(form.valor_atual)
    if (!(atual >= 0)) return setErroForm('Valor atual inválido.')

    setEnviando(true)
    const payload = { user_id: userId, nome: form.nome.trim(), tipo: form.tipo, valor_investido: investido, valor_atual: atual, observacoes: form.observacoes.trim() || null }
    const { error } = editId
      ? await supabase.from('investimentos').update(payload).eq('id', editId).eq('user_id', userId)
      : await supabase.from('investimentos').insert(payload)
    setEnviando(false)
    if (error) return setErroForm(error.message)
    mostrarToast(editId ? 'Investimento atualizado!' : 'Investimento registrado!')
    setFormAberto(false)
    carregar()
  }

  async function excluir(i) {
    if (!window.confirm(`Excluir "${i.nome}" dos investimentos?`)) return
    const { error } = await supabase.from('investimentos').delete().eq('id', i.id).eq('user_id', userId)
    if (error) return mostrarToast(error.message, 'erro')
    setItens(p => p.filter(x => x.id !== i.id))
    mostrarToast('Investimento excluído!')
  }

  const { investido, atual, lucro, rent, dist } = useMemo(() => {
    const investido = itens.reduce((s, i) => s + Number(i.valor_investido), 0)
    const atual = itens.reduce((s, i) => s + Number(i.valor_atual), 0)
    const mapa = {}
    itens.forEach(i => { mapa[i.tipo] = (mapa[i.tipo] || 0) + Number(i.valor_atual) })
    const dist = Object.entries(mapa)
      .map(([id, valor]) => ({ id, valor, pct: atual > 0 ? Math.round((valor / atual) * 100) : 0 }))
      .sort((a, b) => b.valor - a.valor)
    return { investido, atual, lucro: atual - investido, rent: investido > 0 ? ((atual - investido) / investido) * 100 : 0, dist }
  }, [itens])

  // Juros compostos com aporte mensal
  const resultado = useMemo(() => {
    const meses = Math.max(0, Number(sim.anos)) * 12
    const taxaMensal = Math.pow(1 + Number(sim.taxa) / 100, 1 / 12) - 1
    let acumulado = 0, aportado = 0
    for (let m = 0; m < meses; m++) { aportado += Number(sim.aporte); acumulado = (acumulado + Number(sim.aporte)) * (1 + taxaMensal) }
    return { aportado, acumulado, juros: acumulado - aportado }
  }, [sim])

  return (
    <section className="text-left space-y-4">
      {erro && <p className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold">{erro}</p>}

      <div className="bg-gradient-to-r from-dark to-[#3a3a3a] text-white rounded-2xl p-4 shadow-sm">
        <span className="text-[10px] uppercase tracking-wider text-gray-300 font-black">Valor investido na pizzaria</span>
        <p className="text-3xl font-black leading-tight">{brl(atual)}</p>
        <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
          <div><span className="text-gray-300 block">Investido</span><b>{brl(investido)}</b></div>
          <div><span className="text-gray-300 block">Resultado</span><b className={lucro >= 0 ? 'text-green-300' : 'text-red-300'}>{lucro >= 0 ? '+' : '−'} {brl(Math.abs(lucro))}</b></div>
          <div><span className="text-gray-300 block">Rentab.</span><b className={rent >= 0 ? 'text-green-300' : 'text-red-300'}>{rent.toFixed(2).replace('.', ',')}%</b></div>
        </div>
      </div>

      <button onClick={abrirNovo} className={`w-full ${btnPrimary}`}>➕ Novo investimento</button>

      {dist.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
          <h4 className="text-xs font-black text-gray-800 uppercase tracking-wide mb-3">📊 Onde o dinheiro está</h4>
          <ul className="space-y-3">
            {dist.map(d => (
              <li key={d.id}>
                <div className="flex justify-between text-[11px] mb-1"><span className="font-bold text-gray-700">{rotulo(d.id)}</span><b className="text-gray-500">{brl(d.valor)} · {d.pct}%</b></div>
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${d.pct}%` }} /></div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-base font-black text-gray-800 uppercase tracking-wide mb-2">Meus investimentos</h3>
        {carregando ? (
          <div className="py-8 text-center text-gray-400 text-xs">Carregando...</div>
        ) : itens.length === 0 ? (
          <div className="p-6 bg-gray-50 rounded-2xl text-center text-gray-400 text-xs">Nada registrado ainda. Adicione o forno, a moto de entrega, a reforma…</div>
        ) : (
          <ul className="space-y-2">
            {itens.map(i => {
              const l = Number(i.valor_atual) - Number(i.valor_investido)
              return (
                <li key={i.id} className="bg-gray-50 border border-gray-200 px-4 py-3 rounded-2xl">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-gray-800 break-words">{i.nome}</p>
                      <p className="text-[11px] text-gray-400">{rotulo(i.tipo)}{i.observacoes ? ` · ${i.observacoes}` : ''}</p>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <b className="text-sm text-gray-800 block">{brl(i.valor_atual)}</b>
                      <span className={`text-[11px] font-bold ${l >= 0 ? 'text-green-600' : 'text-red-600'}`}>{l >= 0 ? '+' : '−'} {brl(Math.abs(l))}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-2 justify-end">
                    <button className={btnEdit} onClick={() => abrirEditar(i)}>Editar</button>
                    <button className={btnDel} onClick={() => excluir(i)}>Excluir</button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <details className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
        <summary className="cursor-pointer text-xs font-black text-gray-800 uppercase tracking-wide">🧮 Simulador: guardar para a próxima reforma</summary>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div>
            <label className={labelCls}>Guardar por mês (R$)</label>
            <input type="number" min="0" className={inputCls} value={sim.aporte} onChange={e => setSim({ ...sim, aporte: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Taxa anual (%)</label>
            <input type="number" min="0" step="0.1" className={inputCls} value={sim.taxa} onChange={e => setSim({ ...sim, taxa: e.target.value })} />
          </div>
        </div>
        <label className={`${labelCls} mt-3`}>Prazo: {sim.anos} {Number(sim.anos) === 1 ? 'ano' : 'anos'}</label>
        <input type="range" min="1" max="40" className="w-full accent-[#ca3c3f]" value={sim.anos} onChange={e => setSim({ ...sim, anos: e.target.value })} />
        <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
          <div><span className="text-gray-400 block">Total guardado</span><b className="text-gray-800">{brl(resultado.aportado)}</b></div>
          <div><span className="text-gray-400 block">Juros ganhos</span><b className="text-green-600">{brl(resultado.juros)}</b></div>
          <div><span className="text-gray-400 block">Valor final</span><b className="text-gray-800">{brl(resultado.acumulado)}</b></div>
        </div>
      </details>

      {formAberto && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center px-4">
          <form onSubmit={salvar} className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl max-h-[92vh] overflow-y-auto">
            <h4 className="text-lg font-black text-gray-800 mb-4">{editId ? '✏️ Editar investimento' : '➕ Novo investimento'}</h4>
            <label className={labelCls}>Item <span className="text-primary">*</span></label>
            <input className={`${inputCls} mb-3`} value={form.nome} onChange={set('nome')} placeholder="Ex: Forno a lenha 2 câmaras" autoFocus />
            <label className={labelCls}>Tipo</label>
            <select className={`${inputCls} mb-3`} value={form.tipo} onChange={set('tipo')}>
              {TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className={labelCls}>Valor investido <span className="text-primary">*</span></label>
                <input className={inputCls} inputMode="decimal" value={form.valor_investido} onChange={set('valor_investido')} />
              </div>
              <div>
                <label className={labelCls}>Valor atual</label>
                <input className={inputCls} inputMode="decimal" value={form.valor_atual} onChange={set('valor_atual')} placeholder="igual ao investido" />
              </div>
            </div>
            <label className={labelCls}>Observações</label>
            <input className={`${inputCls} mb-2`} value={form.observacoes} onChange={set('observacoes')} />
            {erroForm && <p className="text-[11px] text-red-500 mb-2 font-semibold" role="alert">{erroForm}</p>}
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setFormAberto(false)} className={`flex-1 ${btnGhost}`}>Cancelar</button>
              <button type="submit" disabled={enviando} className={`flex-1 ${btnPrimary}`}>{enviando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
