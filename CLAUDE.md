@AGENTS.md

# Planejamento & Escalas

Planejador doméstico para família Schiavoni — gestão de funcionários em casa (babá, diarista, faxineira) e eventos da família (viagens, férias escolares, recessos, aniversários).

No ar em **https://planejamento-escalas.vercel.app** (acesso por senha única).

## Stack

- Next.js (App Router) + React 19 + TypeScript
- Tailwind v4 + shadcn/ui — estilo **base-nova**, prop **`render`** nos componentes Base UI
- Supabase (Postgres) — acesso **somente server-side**
- Deploy na Vercel

## Estrutura

- `app/(app)/` — telas autenticadas: dashboard, calendario, anual, funcionarios, eventos, configuracoes
- `app/(auth)/login` — tela de login
- `middleware.ts` — autenticação (senha única + cookie de sessão assinado)
- `lib/auth.ts` — criação/validação de tokens de sessão
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
- Credenciais em `.env.local` (não versionado): `APP_PASSWORD`, `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`

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
