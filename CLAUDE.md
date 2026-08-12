@AGENTS.md

# Planejamento & Escalas

Planejador doméstico para família Schiavoni — gestão de funcionários em casa (babá, diarista, faxineira) e eventos da família (viagens, férias escolares, recessos, aniversários).

No ar em **https://planejamento-escalas.vercel.app** (login Google — mesma lista de convidados do app viagens).

## Stack

- Next.js (App Router) + React 19 + TypeScript
- Tailwind v4 + shadcn/ui — estilo **base-nova**, prop **`render`** nos componentes Base UI
- Supabase (Postgres) — acesso **somente server-side**
- Deploy na Vercel

## Estrutura

- `app/(app)/` — telas autenticadas: dashboard, calendario, anual, funcionarios, eventos, configuracoes
- `app/(auth)/login` — tela de login ("Entrar com Google")
- `proxy.ts` — middleware de autenticação (cookie de sessão assinado, 30 dias)
- `lib/auth.ts` — criação/validação de tokens de sessão (carregam o e-mail)
- `lib/supabase/auth-client.ts` — cliente Supabase SÓ do login Google (projeto compartilhado **benysch** `phvcaevhelvvrzclrapt` — mesmo dos dados; trigger `fc_check_allowed_email` vs `fc_allowed_emails` limita a convidados); `app/auth-actions.ts` valida o access token no servidor e emite o cookie. ⚠️ NÃO usar o antigo `wegmdgpgelclpjbqqhvm` (projeto standalone do viagens, DELETADO na migração de jul/2026 — apontar pra ele quebra o login)
- `lib/supabase/server.ts` — cliente Supabase server-side
- `lib/types.ts` — tipos TypeScript + constantes de label/cor por tipo de evento
- `app/(app)/actions.ts` — server actions (CRUD de eventos, pessoas, escala)
- `components/calendario-mensal.tsx` — calendário mensal interativo
- `components/evento-modal.tsx` — modal de criação/edição de eventos
- `supabase/migrations/` — migrations SQL (0001, 0002, …)

## Banco de dados (Supabase)

- Prefixo de tabelas: **`pe_`** (Planejamento & Escalas)
- **Qualquer mudança de schema vira uma migration** numerada em `supabase/migrations/`
- O **usuário roda o SQL manualmente** no SQL Editor do Supabase — nunca aplicar migrations pelo assistente
- Credenciais em `.env.local` (não versionado): `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (dados) + `NEXT_PUBLIC_AUTH_SUPABASE_URL`, `NEXT_PUBLIC_AUTH_SUPABASE_ANON_KEY` (login Google)

## Tabelas

- `pe_pessoas` — família e funcionários (tipo: familiar|funcionario, cargo: adulto|crianca|baba|diarista|faxineira|motorista|outro)
- `pe_eventos` — todos os eventos (viagem_familia, viagem_trabalho, ferias_escola, recesso_escola, aniversario, feriado, folga_funcionario, ferias_funcionario, outro)
- `pe_evento_pessoas` — many-to-many: evento ↔ pessoa
- `pe_escala_mensal` — dias trabalhados + saldo VT por funcionário por mês

## Comandos

- `npm run dev` — servidor local
- `npm run build` — build de produção
- `npx vercel --prod` — deploy

## Convenções

- Trabalho feito em etapas, aprovação antes de avançar
- Migrations manuais (igual ao Projeto HI)
