// E-mails autorizados a administrar a pizzaria: VITE_ADMIN_EMAILS=dono@pizzaria.com,gerente@pizzaria.com
// Se a lista estiver vazia, qualquer usuário logado enxerga o painel Admin.
const ADMINS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

export function ehAdmin(user) {
  if (!user) return false
  if (ADMINS.length === 0) return true
  return ADMINS.includes((user.email || '').toLowerCase())
}
