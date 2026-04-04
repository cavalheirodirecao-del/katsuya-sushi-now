

## Plano de Correções no Checkout

### Problemas a resolver

1. **Bairro do endereço salvo não seleciona automaticamente o frete** — Quando o cliente escolhe um endereço salvo que já tem bairro, o sistema ainda pede para selecionar o bairro manualmente.
2. **Não há opção de apagar endereço salvo** — Cliente não pode remover endereços antigos.
3. **Remover modo "Automático" (GPS)** — O cálculo por geolocalização está dando muito erro.
4. **Adicionar forma de pagamento "Cartão"** — Com acréscimo de 6% sobre subtotal + frete.

### Alterações

**1. Arquivo: `src/pages/Checkout.tsx`**

- **Remover modo "auto" (GPS)**: O `DeliveryMode` passa de `"auto" | "manual" | "retirada"` para `"manual" | "retirada"`. O estado inicial de `deliveryMode` muda para `"manual"`. Remover todo o bloco de geolocalização (estados `geoLoading`, `customerCoords`, `geoError`, `feeResultAuto`, `handleGetLocation`, `switchToAuto`, `switchToManual` e a UI do modo auto). Manter apenas os botões "Bairro" e "Retirada".

- **Auto-selecionar bairro ao escolher endereço salvo**: Quando o cliente clica em um endereço salvo, buscar o bairro do endereço (`addr.neighborhood`) na lista `activeNeighborhoods` por nome (case-insensitive). Se encontrar, setar `selectedNeighborhoodId` automaticamente e definir `deliveryMode = "manual"`. Isso faz o frete ser calculado sem intervenção do cliente.

- **Botão de apagar endereço salvo**: Em cada card de endereço salvo, adicionar um ícone de lixeira (Trash2). Ao clicar, exibir um `confirm()` ou dialog de confirmação. Se confirmado, chamar `deleteAddress(addr.id)` (nova função no hook `useCustomers`).

- **Forma de pagamento "Cartão" com 6%**: Adicionar `"cartao"` ao tipo `PaymentMethod`. Adicionar botão "Cartão" na seção de pagamento. Calcular `cardFee = payment === "cartao" ? (total + deliveryFee) * 0.06 : 0`. Exibir a taxa do cartão no resumo quando selecionado. O `grandTotal` passa a ser `total + deliveryFee + cardFee`. Incluir na mensagem do WhatsApp a informação do acréscimo.

**2. Arquivo: `src/hooks/useCustomers.ts`**

- Adicionar função `deleteAddress(addressId: string)` que faz `supabase.from("customer_addresses").delete().eq("id", addressId)` e recarrega os dados do cliente.

**3. Arquivo: `src/hooks/useOrdersDB.ts`**

- Adicionar `"cartao"` ao tipo `PaymentMethod`.

**4. Migração de banco (se necessário)**

- Verificar se a coluna `payment_method` na tabela `orders` aceita o valor `"cartao"` (é `text` ou enum). Se for enum, criar migração para adicionar o novo valor.

### Fluxo resultante

- Cliente digita telefone → endereços salvos aparecem
- Ao selecionar endereço salvo com bairro "Cidade Alta" → sistema encontra "Cidade Alta" nos bairros cadastrados → frete auto-preenchido
- Se bairro não for encontrado → dropdown fica aberto para seleção manual
- Pode apagar endereço com confirmação
- Ao escolher "Cartão" → aparece "+6% taxa cartão: R$ X.XX" no resumo e total é recalculado

