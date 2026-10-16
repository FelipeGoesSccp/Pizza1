import { useAuth } from '../contexts/AuthContext'
import LoginPage from './LoginPage'

// Protege o site inteiro: sem sessão, a primeira coisa que aparece é o login.
export default function AuthGate({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
        <img src="/assets/images/logopizza.png" alt="Goes Pizzaria" className="w-40" />
        <p className="text-xs font-bold text-gray-400 animate-pulse">Carregando...</p>
      </div>
    )
  }

  return user ? children : <LoginPage />
}
