import { useAuth } from '../contexts/AuthContext'
import { ehAdmin } from '../lib/admin'
import AdminPanel from '../AdminPanel'

// O login é do site inteiro (AuthGate). Aqui só se confirma se a conta pode administrar.
export default function ProtectedAdmin({ onFechar }) {
  const { user } = useAuth()

  if (!ehAdmin(user)) {
    return (
      <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
          <p className="text-3xl mb-2">🔒</p>
          <p className="font-black text-gray-800 mb-1">Acesso restrito</p>
          <p className="text-xs text-gray-500 mb-5">Esta conta não tem permissão para o painel administrativo.</p>
          <button onClick={onFechar} className="w-full bg-primary text-white py-2.5 rounded-xl font-bold text-xs hover:bg-red-700">
            Voltar
          </button>
        </div>
      </div>
    )
  }

  return <AdminPanel onFechar={onFechar} />
}
