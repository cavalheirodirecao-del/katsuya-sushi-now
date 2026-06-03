# Corrigir "tela preta" ao finalizar pedido

## Problema
Após o cliente tocar em **Finalizar Pedido**, o `createOrder` (chamada de rede) pode demorar alguns segundos em Androids antigos / 3G. Nesse intervalo a tela pode parecer travada/preta porque:

1. Não existe nenhum **overlay visível** cobrindo a página enquanto `submitting = true` — o botão só mostra um pequeno spinner que fica fora da viewport quando o teclado está aberto.
2. Quando `clearCart()` roda, o componente re-renderiza e, em devices lentos, há um "flash" entre o estado antigo e o estado `whatsappMessage`, que aparece como tela escura.
3. A tela de sucesso atual mora dentro do mesmo componente `Checkout`. Se o WebView reciclar o componente (volta do WhatsApp, pouca memória, back-gesture), o estado some e o cliente fica sem saber se deu certo.

## Solução

### 1. Overlay full-screen enquanto envia (`src/pages/Checkout.tsx`)
Adicionar um overlay fixo `z-[60]` exibido enquanto `submitting === true`:

- Fundo `bg-background/95` com `backdrop-blur`
- Spinner grande + texto "Enviando seu pedido..."
- Subtexto "Não feche o app, já estamos confirmando."

Isso garante feedback visual imediato — nunca mais "tela preta" durante o `await`.

### 2. Tela de sucesso como overlay fixo full-screen
Hoje a tela de sucesso é renderizada inline. Vou transformá-la em um overlay fixo (`fixed inset-0 z-[55] overflow-y-auto bg-background`) que cobre toda a viewport assim que `whatsappMessage` é setado. Benefícios:

- Não depende do scroll/posição do checkout
- Não há "flash" entre estados — overlay aparece por cima
- Garantia visual de que o pedido foi recebido (✅ verde grande no topo)

### 3. Persistência via `sessionStorage`
Salvar `{ orderNumber, whatsappUrl, whatsappMessage }` em `sessionStorage` assim que o pedido é criado, e ler no `useEffect` inicial do `Checkout`. Assim, se o WebView reciclar a página quando o cliente volta do WhatsApp, a tela de sucesso reaparece automaticamente em vez de uma tela vazia.

### 4. Pequenos ajustes de UX
- Aumentar o delay do `setWhatsappFallback` de 3s para 4s (Android antigo demora mais a abrir o app).
- Adicionar segundo botão "Já enviei pelo WhatsApp → Voltar ao cardápio" para o cliente confirmar e sair limpo.
- Mostrar `Nº do pedido` em destaque (fonte grande) na confirmação — reforça que deu certo.

## Arquivos alterados
- `src/pages/Checkout.tsx` — overlay de envio, overlay de sucesso, sessionStorage, ajustes de UX

Sem mudanças no backend, no `useOrdersDB` ou no fluxo de criação do pedido. A lógica de criação já está correta — o pedido chega no painel; o que falta é apenas garantir que o cliente **veja** a confirmação em qualquer dispositivo.
