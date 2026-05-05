## Objetivo

Permitir que o operador registre, dentro do próprio sistema, pedidos que chegam por WhatsApp escrito, print ou ligação — para que **100% do faturamento** fique centralizado no painel.

A experiência precisa ser parecida com o checkout do cliente (que a equipe já conhece), porém otimizada para uso interno e rápido: buscar cliente por nome, ver telefone, escolher endereço já cadastrado, montar carrinho e finalizar — tudo sem sair do admin.

---

## Nova aba no Admin: "Lançar Pedido"

Adicionar nova aba no `Admin.tsx` (visível para `master`, `admin` e `operator`):

- Ícone: `ClipboardEdit` (lucide)
- Label: **"Lançar Pedido"**
- Posição: logo após "Produtos"

Componente novo: `src/components/ManualOrderForm.tsx`.

---

## Fluxo da tela (uma única página, em seções)

```text
┌─────────────────────────────────────────┐
│  1. CLIENTE                             │
│  [🔍 Buscar por nome ou telefone...]    │
│  ┌─ Resultados (lista) ──────────────┐  │
│  │ João Silva  · (81) 9xxxx-xxxx  →  │  │
│  │ Maria Souza · (81) 9xxxx-xxxx  →  │  │
│  └───────────────────────────────────┘  │
│  [+ Novo cliente] (abre nome+telefone)  │
├─────────────────────────────────────────┤
│  2. ENTREGA                             │
│  ◉ Delivery   ○ Retirada                │
│  Endereços do cliente: (radio cards)    │
│   ◉ Casa - Rua X, 123 - Boa Viagem      │
│   ○ Trabalho - ...                      │
│  [+ Novo endereço]                      │
│  Bairro (select nativo) → calcula taxa  │
├─────────────────────────────────────────┤
│  3. ITENS DO PEDIDO                     │
│  [🔍 Buscar produto...]                 │
│  Lista de produtos ativos (clique p/+)  │
│  ┌─ Carrinho ────────────────────────┐  │
│  │ 2x Combo Sushi 20pç  R$ 80,00  ✕ │  │
│  │ 1x Refri Lata        R$  6,00  ✕ │  │
│  └───────────────────────────────────┘  │
│  Obs do pedido: [textarea]              │
├─────────────────────────────────────────┤
│  4. PAGAMENTO                           │
│  ○ PIX  ○ Dinheiro  ○ Cartão (+6%)      │
│  Troco para: [____] (se dinheiro)       │
├─────────────────────────────────────────┤
│  RESUMO                                 │
│  Subtotal:     R$ 86,00                 │
│  Entrega:      R$  8,00                 │
│  Taxa cartão:  R$  -                    │
│  TOTAL:        R$ 94,00                 │
│                                         │
│  [ LANÇAR PEDIDO ]                      │
└─────────────────────────────────────────┘
```

---

## Detalhes de comportamento

### 1. Busca de cliente
- Campo único que aceita **nome** ou **telefone**.
- Por nome: busca server-side via nova RPC `search_customers(p_query text)` retornando até 20 resultados (id, nome, telefone) com `ILIKE '%query%'`. Limita acesso ao role staff (security definer).
- Por telefone (≥4 dígitos): também busca por `phone ILIKE`.
- Cada resultado mostra **nome em destaque + telefone formatado**. Clique seleciona e carrega endereços via `lookup_customer_by_phone`.
- Botão "Novo cliente" abre mini-form (nome + telefone) e usa `upsert_customer`.

### 2. Endereços
- Reaproveita lista de endereços do cliente selecionado.
- Botão "Novo endereço" salva via `customer_addresses` (mesmo fluxo do checkout).
- Em "Retirada", oculta seção de endereço/bairro e zera taxa.

### 3. Itens
- Carrega produtos ativos via `useProductsDB`.
- Busca local por nome/categoria.
- Clique adiciona ao carrinho local (estado do formulário, NÃO usa `CartContext` para não conflitar com sessão do cliente público).
- Quantidade ajustável (+ / −), remoção, observação por item opcional.

### 4. Pagamento e total
- Mesma lógica do checkout: cartão soma 6% sobre (subtotal + entrega).
- Resumo sempre visível (sticky no rodapé em mobile).

### 5. Lançar pedido
- Usa `createOrder` (mesmo `create_order_public` já existente) — pedido entra como `pendente` no Kanban como qualquer outro.
- Marca operador no `audit_logs` (`action: "manual_order_created"`, `entity_id: order_id`, `description: "Pedido lançado manualmente por <email>"`).
- **Não dispara WhatsApp** — pedido já veio de fora. Apenas toast de sucesso + opção "Lançar outro pedido" (limpa form) ou "Ver no painel" (vai pro Dashboard/Kanban).
- Fora do horário/Alta Demanda: operador **pode** lançar normalmente (StoreGate não se aplica internamente) — apenas mostra um aviso amarelo "Loja fechada — confirme com o cliente".

---

## Arquivos / mudanças

| Arquivo | Ação |
|---|---|
| `src/components/ManualOrderForm.tsx` | **Novo** — formulário completo |
| `src/pages/Admin.tsx` | Adicionar tab "Lançar Pedido" (visível p/ master, admin, operator) |
| `src/hooks/useCustomers.ts` | Adicionar `searchCustomers(query)` chamando nova RPC |
| `src/hooks/useAuth.ts` | Expor `canCreateManualOrder` (master/admin/operator) |
| **Migration SQL** | Criar RPC `search_customers(p_query text)` SECURITY DEFINER, restrita a staff via `has_role` |
| `audit_logs` | Inserção via cliente após criar pedido manual |

---

## Pontos técnicos

- **RPC `search_customers`**: dentro da função, validar `has_role(auth.uid(),'admin') OR 'master' OR 'operator' OR 'support'`; senão `RAISE EXCEPTION`.
- **Sem `CartContext`**: o form mantém estado local para não interferir com carrinho do cliente público que possa estar aberto em outra aba.
- **Mobile-first**: selects nativos (alinhado à memória `estabilidade-mobile`), inputs grandes — operadores usam celular.
- **Reuso visual**: aproveitar classes/estilo do `Checkout.tsx` para consistência.

---

## Fora do escopo (pode vir depois)
- Edição de pedidos já lançados.
- Importar/parsear print do WhatsApp automaticamente.
- Histórico de pedidos por cliente dentro deste form (já existe no Dashboard).
