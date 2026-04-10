

## Plano: Catálogo Visível Fora do Horário + Correções Android

### 1. Catálogo sempre visível (bloquear apenas finalização)

**Problema**: O `StoreGate` com overlay bloqueia a visualização do cardápio inteiro quando a loja está fechada.

**Solução**:
- Remover o `StoreGate` do `Menu.tsx` — o cardápio fica sempre acessível
- No `ProductCard.tsx`, verificar `isOpen` via `useCompanySettings`. Se fechado, desabilitar o botão "Adicionar" e mostrar texto como "Fora do horário"
- Manter o `StoreGate` no `Index.tsx` (banner informativo) e no `Checkout.tsx` (bloquear finalização)
- No `Cart.tsx`, se a loja estiver fechada, desabilitar o botão de ir para checkout com mensagem

### 2. Tela preta no Android — Select de bairro

**Problema**: O componente Radix Select usa um Portal com overlay que em dispositivos Android pode causar tela preta ou travamento.

**Solução**:
- Substituir o `<Select>` do bairro no Checkout por um `<select>` nativo HTML — funciona perfeitamente em todos os dispositivos mobile
- Estilizar com as mesmas classes Tailwind para manter a aparência consistente

### 3. Tela preta no Android — Finalização / WhatsApp

**Problema**: Mesmo com `window.location.href`, alguns Android podem ter problemas com URLs longas do WhatsApp ou com o fluxo de navegação.

**Solução**:
- Adicionar `setTimeout` de 100ms antes do `window.location.href` para dar tempo ao browser processar o `clearCart`
- Limitar o tamanho da mensagem WhatsApp caso seja muito longa (truncar observações se necessário)
- Adicionar fallback: se após 3 segundos o usuário ainda estiver na página, mostrar botão "Tentar novamente" ou link direto

### Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/pages/Menu.tsx` | Remover StoreGate |
| `src/components/ProductCard.tsx` | Verificar `isOpen`, desabilitar botão se fechado |
| `src/pages/Cart.tsx` | Bloquear checkout se fechado |
| `src/pages/Checkout.tsx` | Trocar Select Radix por select nativo; melhorar fluxo WhatsApp |
| `src/components/StoreGate.tsx` | Sem alteração (continua no Index) |

