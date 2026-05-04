## Plano: Corrigir tela preta no Android ao enviar pedido pelo WhatsApp

### Problema identificado

O pedido já está sendo gravado no sistema antes de abrir o WhatsApp. O bug acontece na etapa seguinte: o app redireciona o cliente para `wa.me` usando navegação direta (`window.location.href`). Em alguns Androids, essa troca entre navegador/app e WhatsApp pode deixar a aba do site em tela preta ou travada. Como o cliente não vê uma confirmação clara antes da troca, ele fica em dúvida se o pedido foi concluído.

Também há um erro de TypeScript já detectado em `src/hooks/useAuth.ts`, causado por uso de `.catch()` em um retorno `PromiseLike`. Vou corrigir junto para garantir que o projeto compile corretamente.

### 1. Mostrar confirmação clara antes de abrir o WhatsApp

Em `src/pages/Checkout.tsx`:

- Depois de criar o pedido no banco, exibir uma tela de sucesso com:
  - número do pedido;
  - mensagem clara: “Seu pedido já foi recebido pelo restaurante”; 
  - aviso: “Agora envie a mensagem no WhatsApp para confirmar/complementar o atendimento”.
- O botão deixará de passar a impressão de que o pedido só existe depois do WhatsApp.
- O carrinho só será limpo depois que o pedido estiver criado com sucesso e a tela de confirmação estiver pronta.

### 2. Trocar o método de abertura do WhatsApp para um fluxo mais seguro no Android

Ainda em `src/pages/Checkout.tsx`:

- Substituir o redirecionamento direto via `window.location.href` por abertura via link/âncora acionado por clique do usuário, usando `target="_blank"` e `rel="noopener noreferrer"`.
- Manter fallback visível para o cliente:
  - botão “Abrir WhatsApp novamente”;
  - botão “Copiar mensagem”.
- Evitar que a tela fique “presa” em estado intermediário: após clicar para abrir WhatsApp, o site continuará numa tela de confirmação do pedido, não em uma tela preta/navegação vazia.

### 3. Reduzir risco de travamento por mensagem muito longa

Em `src/pages/Checkout.tsx`:

- Manter a remoção de observações em mensagens longas.
- Adicionar um limite mais seguro para Android: se a mensagem ainda estiver grande, encurtar o texto do pedido para uma versão resumida com número do pedido, dados do cliente, total e instrução para consultar o pedido no painel.
- Isso evita URLs excessivamente longas no WhatsApp, que são uma causa comum de falhas em Android.

### 4. Revalidar o app ao voltar do WhatsApp

Criar/ajustar uma pequena rotina global de retorno ao app:

- Ao voltar para a aba/app (`visibilitychange`, `pageshow`), forçar o app a sair de estados visuais travados.
- No checkout, se o cliente voltar do WhatsApp, manter a tela de “Pedido recebido” com botões de tentar novamente/copiar mensagem.
- Isso ajuda tanto clientes quanto gestor quando alternam entre o site e o WhatsApp.

### 5. Corrigir erro de build em `useAuth`

Em `src/hooks/useAuth.ts`:

- Remover o uso de `.catch()` encadeado em `PromiseLike`.
- Reescrever a leitura inicial da sessão com `async/await` dentro do `useEffect`, mantendo o mesmo comportamento.
- Isso resolve o erro: `Property 'catch' does not exist on type 'PromiseLike<void>'`.

### Arquivos afetados

| Arquivo | Alteração |
|---|---|
| `src/pages/Checkout.tsx` | Confirmação pós-pedido, abertura segura do WhatsApp, fallback e mensagem encurtada |
| `src/hooks/useAuth.ts` | Correção do erro de TypeScript no carregamento da sessão |
| Possível novo helper/componente simples | Rotina de retorno do app ao primeiro plano, se ficar mais limpo separar |

### Resultado esperado

- O cliente verá claramente que o pedido já foi recebido no site antes de ir ao WhatsApp.
- Se o WhatsApp ou Android falhar, o cliente continuará com uma tela útil, com número do pedido e opção de tentar novamente/copiar mensagem.
- O risco de tela preta no Android será reduzido por evitar navegação direta e URLs longas.
- O app ficará mais estável ao retornar do WhatsApp.