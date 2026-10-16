# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

---

## Login, Caixa e Investimentos

- **O login aparece assim que o site abre.** Sem sessão, o cliente vê a tela de login/cadastro/Google (`LoginPage`); depois de entrar, vê o cardápio. `AuthGate` (em `main.jsx`) faz esse redirecionamento condicional.
- `src/contexts/AuthContext.jsx`: `AuthProvider` e `useAuth()` com `session`, `user`, `profile`, `signUp`, `signIn`, `signInWithGoogle` e `signOut` (usa `getSession()` e `onAuthStateChange()`).
- O cabeçalho mostra o nome/foto do usuário e o botão **Sair**.
- **Painel Admin** (Pedidos, Produtos, Categorias, 💰 Caixa e 📈 Investir): quem pode abrir é definido por `VITE_ADMIN_EMAILS` (veja `src/lib/admin.js`). Vazio = qualquer usuário logado.
- `src/components/admin/CaixaPanel.jsx`: caixa (vendas e despesas), categorias, filtros, gráfico, CSV e Realtime.
- `src/components/admin/InvestimentosPanel.jsx`: forno, reforma, motos de entrega etc., com rentabilidade e simulador.

### Configuração
1. Rode `supabase/caixa_auth.sql` no SQL Editor do Supabase (cria `caixa_categorias`, `caixa_lancamentos` e `investimentos` com RLS).
2. Em `.env.local`: `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (ou `VITE_SUPABASE_ANON_KEY`). Recomendado: `VITE_ADMIN_EMAILS=seu@email.com`.
3. **Google OAuth**: crie o ID do cliente no Google Cloud (Aplicativo da Web) com redirecionamento `https://<PROJECT_REF>.supabase.co/auth/v1/callback`; ative o provedor em Authentication > Providers > Google; em URL Configuration defina Site URL e Redirect URLs (`http://localhost:5173/**` e o domínio de produção).
4. No APK (Capacitor) o origin é `http://localhost`, então o login com Google não funciona no app nativo sem deep link. Use e-mail e senha.
