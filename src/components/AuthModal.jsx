import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none text-xs text-gray-800 focus:border-primary'
const labelCls = 'block text-xs font-bold text-gray-600 mb-1'

export default function AuthModal({ onFechar }) {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [modo, setModo] = useState('login') // 'login' | 'cadastro'
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [info, setInfo] = useState('')
  const [enviando, setEnviando] = useState(false)

  function trocarModo(novo) {
    setModo(novo)
    setErro('')
    setInfo('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setInfo('')
    if (modo === 'cadastro' && senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.')

    setEnviando(true)
    const { data, error } =
      modo === 'login' ? await signIn(email, senha) : await signUp(email, senha, nome.trim())
    setEnviando(false)

    if (error) return setErro(error.message)
    // Com confirmação de e-mail ativa, o cadastro não gera sessão imediata
    if (modo === 'cadastro' && !data.session) {
      setInfo('Conta criada! Confirme o link enviado ao seu e-mail e depois entre.')
      setModo('login')
    }
    // Com sessão ativa, o ProtectedAdmin troca esta tela pelo painel automaticamente
  }

  async function handleGoogle() {
    setErro('')
    const { error } = await signInWithGoogle()
    if (error) setErro(error.message)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-[#a82d2f] text-white p-5 flex justify-between items-center">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-red-200 font-black">Área restrita</span>
            <h2 className="text-xl font-black">🍕 Painel da Pizzaria</h2>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-xl hover:bg-white/30 transition-colors"
          >
            &times;
          </button>
        </div>

        <div className="flex border-b border-gray-200 bg-gray-50">
          {[['login', 'Entrar'], ['cadastro', 'Criar conta']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => trocarModo(id)}
              className={`flex-1 py-3 text-xs font-bold transition-all ${
                modo === id ? 'text-primary border-b-2 border-primary bg-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-5 text-left">
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-xl py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
              <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
            </svg>
            Entrar com Google
          </button>

          <div className="flex items-center gap-3 my-4 text-[11px] text-gray-400">
            <span className="flex-1 h-px bg-gray-200" /> ou use seu e-mail <span className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {modo === 'cadastro' && (
              <div>
                <label className={labelCls}>Nome completo</label>
                <input className={inputCls} value={nome} onChange={e => setNome(e.target.value)} autoComplete="name" required />
              </div>
            )}
            <div>
              <label className={labelCls}>E-mail</label>
              <input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
            </div>
            <div>
              <label className={labelCls}>Senha</label>
              <input
                type="password"
                className={inputCls}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
                required
              />
            </div>
            {erro && <p className="text-[11px] text-red-500 font-semibold" role="alert">{erro}</p>}
            {info && <p className="text-[11px] text-green-600 font-semibold" role="status">{info}</p>}
            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-primary text-white py-2.5 rounded-xl font-bold text-xs hover:bg-red-700 disabled:opacity-50 transition-all"
            >
              {enviando ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
