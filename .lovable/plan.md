

## Plano: Sistema de Horário de Funcionamento + Modo Alta Demanda

### Visão Geral

Substituir o campo de texto livre de horários por um sistema estruturado por dia da semana, adicionar modo "Alta Demanda" com bloqueio automático, e validar horário antes de permitir pedidos.

---

### 1. Migração de Banco de Dados

Adicionar 3 novas colunas na tabela `company_settings`:

- **`business_hours`** (`jsonb`, default `'{}'`) — Estrutura: `{ "seg": { "active": true, "slots": [{"start":"12:00","end":"14:00"},{"start":"17:00","end":"22:00"}] }, "ter": {...}, ... }`
- **`high_demand_active`** (`boolean`, default `false`) — Toggle de alta demanda
- **`high_demand_message`** (`text`, nullable) — Mensagem customizada (padrão no frontend)
- **`high_demand_activated_at`** (`timestamptz`, nullable) — Para reset automático à meia-noite

---

### 2. Hook `useCompanySettings` (atualizar)

- Adicionar os novos campos à interface `CompanySettings`
- Adicionar função `isOpen()` que verifica:
  1. Se `high_demand_active` está ativo E `high_demand_activated_at` é de hoje → bloqueado
  2. Se `high_demand_activated_at` é de ontem ou antes → considerar desativado (reset automático)
  3. Verificar dia da semana atual nos `business_hours` → checar se algum slot contém o horário atual
- Exportar `isOpen`, `isHighDemand`, `highDemandMessage`

---

### 3. Componente `CompanySettings.tsx` (painel admin)

**Substituir seção "Horário":**
- Lista dos 7 dias (Seg–Dom) com Switch ativo/inativo
- Para cada dia ativo: lista de intervalos com inputs `time` (HH:mm) + botão remover
- Botão "+ Adicionar horário" por dia

**Nova seção "Alta Demanda":**
- Toggle "Alta demanda" com destaque visual (vermelho quando ativo)
- Campo de texto para mensagem customizada
- Texto auxiliar explicando o reset automático à meia-noite

---

### 4. Bloqueio no Frontend (páginas públicas)

**Criar componente `StoreGate.tsx`:**
- Usa `useCompanySettings` para checar `isOpen` / `isHighDemand`
- Se bloqueado: exibe pop-up/overlay com mensagem (alta demanda ou fora de horário)
- Impede navegação para cardápio/checkout

**Aplicar em:**
- `Index.tsx` — Pop-up automático ao entrar se fechado
- `Menu.tsx` — Overlay bloqueando interação
- `Checkout.tsx` — Validar antes de finalizar pedido

---

### 5. Reset Automático

Lógica no frontend: ao carregar settings, se `high_demand_active === true` e `high_demand_activated_at` é anterior ao dia atual (comparando datas), considerar como desativado. Opcionalmente, chamar `updateSettings({ high_demand_active: false })` para limpar no banco.

---

### Arquivos Afetados

| Arquivo | Ação |
|---|---|
| Migração SQL | Criar — adicionar colunas |
| `src/hooks/useCompanySettings.ts` | Editar — novos campos + `isOpen()` |
| `src/components/CompanySettings.tsx` | Editar — UI horários estruturados + alta demanda |
| `src/components/StoreGate.tsx` | Criar — componente de bloqueio |
| `src/pages/Index.tsx` | Editar — integrar StoreGate |
| `src/pages/Menu.tsx` | Editar — integrar StoreGate |
| `src/pages/Checkout.tsx` | Editar — validar antes de finalizar |

