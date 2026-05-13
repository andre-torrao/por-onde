# Guia Supabase — Vou PorOnde

## Passo 1 — Criar projeto

1. Vai a **supabase.com** e cria conta (gratuito)
2. Clica **New project**
3. Nome: `vou-poronde`
4. Gera uma password segura e guarda-a
5. Região: **West EU (Ireland)** — mais próximo de Portugal
6. Clica **Create new project** e espera ~2 minutos

---

## Passo 2 — Criar a base de dados

1. No painel do projeto, vai a **SQL Editor** (menu lateral)
2. Clica **New query**
3. Copia e cola o conteúdo do ficheiro `supabase-setup.sql`
4. Clica **Run** (▶)
5. Deve aparecer "Success. No rows returned"

---

## Passo 3 — Criar buckets de imagens

1. Vai a **Storage** (menu lateral)
2. Clica **New bucket**:
   - Nome: `suggestion-photos` · Public: ✅ · Max size: 2MB
3. Clica **New bucket** novamente:
   - Nome: `profile-photos` · Public: ✅ · Max size: 1MB

---

## Passo 4 — Obter as chaves

1. Vai a **Settings → API** (menu lateral)
2. Copia:
   - **Project URL** (ex: `https://abcdef.supabase.co`)
   - **anon public key** (começa por `eyJ...`)

---

## Passo 5 — Configurar a app

Cria o ficheiro `.env` na pasta do projeto:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

---

## Passo 6 — Criar conta admin

1. Em Supabase, vai a **Authentication → Users**
2. Clica **Add user → Create new user**
3. Email: o teu email · Password: uma password segura
4. Depois vai a **SQL Editor** e corre:
```sql
update public.profiles 
set is_admin = true, approved = true 
where username = 'teu-nome-de-utilizador';
```

---

## O que muda quando integrarmos Supabase

| Agora (localStorage) | Com Supabase |
|---|---|
| Dados só no teu browser | Dados na nuvem, acessíveis em qualquer dispositivo |
| Admin aprova no seu browser | Admin aprova e todos os utilizadores vêem imediatamente |
| Máx ~5MB de dados | Ilimitado (plano gratuito até 500MB) |
| Sem backup | Backups automáticos diários |
| Sem auth real | Email/password, Google, Apple login |

---

## Capacidade do plano gratuito Supabase

- **50.000 utilizadores** registados
- **500MB** base de dados
- **1GB** de imagens
- **2GB** de bandwidth/mês
- Suficiente para testar com centenas de utilizadores

