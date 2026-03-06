# Suíte de Testes E2E - Sistema de Controle de Estoque & PDV

Este documento descreve os cenários de teste End-to-End (E2E) para o Sistema de Controle de Estoque & PDV. O objetivo é validar o fluxo completo do usuário, desde a interface até a persistência de dados no backend, garantindo que todas as funcionalidades operem conforme o esperado.

## 🚀 Pré-requisitos

- Servidor (`server.ts`) rodando.
- Aplicação frontend rodando (`npm run dev`).
- Acesso a um ambiente de teste limpo (ou com dados controlados).
- Credenciais de acesso para diferentes perfis (Admin, Gestor, Colaborador).

---

## 1. Testes de Autenticação e Autorização

### Cenário 1.1: Registro de Novo Gestor (Loja)
- **Descrição**: Um novo usuário se registra como "Gestor", criando uma nova loja.
- **Passos**:
  1. Acessar a tela de registro.
  2. Preencher formulário com dados válidos (Nome, E-mail, Senha, CEP, Nome do Estabelecimento).
  3. Selecionar perfil "Gestor".
  4. Clicar em "Registrar".
- **Validações E2E**:
  - Usuário é redirecionado para uma tela de "Cadastro Pendente" ou "Aguardando Aprovação".
  - Mensagem informativa sobre a necessidade de aprovação e pagamento PIX é exibida.
  - No banco de dados, um novo usuário é criado com `role = 'gestor'`, `status = 'pending'` e um `store_code` gerado.
  - (Opcional) Verificar logs do servidor para envio de e-mail/WhatsApp para o admin.

### Cenário 1.2: Registro de Colaborador
- **Descrição**: Um usuário se registra como "Colaborador" vinculado a uma loja existente.
- **Passos**:
  1. Acessar a tela de registro.
  2. Preencher formulário com dados válidos (Nome, E-mail, Senha, CEP).
  3. Selecionar perfil "Colaborador".
  4. Inserir um `store_code` válido de um gestor existente.
  5. Clicar em "Registrar".
- **Validações E2E**:
  - Usuário é redirecionado para a tela de login ou dashboard (se o gestor já estiver ativo).
  - No banco de dados, um novo usuário é criado com `role = 'colaborador'`, `status = 'active'` e `parent_id` vinculado ao gestor.
  - O `store_code` do colaborador deve ser o mesmo do gestor.

### Cenário 1.3: Login Bem-Sucedido
- **Descrição**: Um usuário (Gestor ou Colaborador ativo) faz login com credenciais corretas.
- **Passos**:
  1. Acessar a tela de login.
  2. Inserir E-mail e Senha válidos de um usuário `active`.
  3. Clicar em "Entrar".
- **Validações E2E**:
  - Usuário é redirecionado para o Dashboard.
  - O token JWT é armazenado (ex: Local Storage).
  - Informações do usuário logado são exibidas corretamente (ex: nome no cabeçalho).

### Cenário 1.4: Login com Credenciais Inválidas
- **Descrição**: Tentativa de login com E-mail ou Senha incorretos.
- **Passos**:
  1. Acessar a tela de login.
  2. Inserir E-mail ou Senha incorretos.
  3. Clicar em "Entrar".
- **Validações E2E**:
  - Mensagem de erro "Credenciais inválidas" é exibida.
  - Usuário permanece na tela de login.

### Cenário 1.5: Login de Gestor Pendente
- **Descrição**: Tentativa de login de um gestor cujo status ainda é 'pending'.
- **Passos**:
  1. Registrar um novo gestor (Cenário 1.1).
  2. Tentar fazer login com as credenciais desse gestor.
- **Validações E2E**:
  - Mensagem de erro "Cadastro em análise..." é exibida, informando sobre o pagamento PIX.
  - Usuário permanece na tela de login.

### Cenário 1.6: Recuperação de Senha
- **Descrição**: Um usuário solicita a recuperação de senha e a redefine.
- **Passos**:
  1. Acessar a tela "Esqueceu a senha?".
  2. Inserir E-mail cadastrado.
  3. Clicar em "Enviar Código".
  4. (Simular recebimento do código de 6 dígitos - pode ser lido do log do servidor em ambiente de teste).
  5. Inserir o código e a nova senha.
  6. Clicar em "Redefinir Senha".
- **Validações E2E**:
  - Mensagem de sucesso após envio do código.
  - Mensagem de sucesso após redefinição da senha.
  - O usuário consegue fazer login com a nova senha.
  - O token de recuperação é invalidado no banco de dados.

### Cenário 1.7: Acesso a Rotas Protegidas sem Autenticação
- **Descrição**: Tentar acessar uma rota protegida sem estar logado.
- **Passos**:
  1. Deslogar ou abrir o navegador em modo anônimo.
  2. Tentar navegar diretamente para `/dashboard` ou `/products`.
- **Validações E2E**:
  - Usuário é redirecionado para a tela de login.
  - Mensagem de erro "Acesso negado" pode ser exibida no console do navegador.

---

## 2. Testes de Gestão de Produtos (Inventário)

### Cenário 2.1: Cadastro de Novo Produto
- **Descrição**: Um gestor ou colaborador cadastra um novo produto.
- **Passos**:
  1. Fazer login como Gestor/Colaborador.
  2. Navegar para a seção "Inventário" ou "Produtos".
  3. Clicar em "Adicionar Produto".
  4. Preencher formulário com Nome, ID (único), Estoque Mínimo.
  5. Clicar em "Salvar".
- **Validações E2E**:
  - Produto aparece na lista de produtos.
  - No banco de dados, o produto é criado com `current_stock = 0` e `average_cost = 0`.
  - ID duplicado deve gerar erro.

### Cenário 2.2: Visualização e Ordenação de Produtos
- **Descrição**: Visualizar a lista de produtos e testar as opções de ordenação.
- **Passos**:
  1. Fazer login.
  2. Navegar para a seção "Inventário".
  3. Testar ordenação por "Nome (ASC/DESC)", "Estoque (ASC/DESC)".
- **Validações E2E**:
  - A lista de produtos é atualizada corretamente conforme a ordenação selecionada.

### Cenário 2.3: Alerta de Estoque Baixo
- **Descrição**: Um produto atinge o nível de estoque mínimo.
- **Passos**:
  1. Cadastrar um produto com `min_stock = 5`.
  2. Realizar uma saída de estoque que deixe `current_stock` abaixo de 5 (ex: 4).
  3. Navegar para o Dashboard ou Inventário.
- **Validações E2E**:
  - O produto é visualmente destacado (ex: cor vermelha) na lista de produtos.
  - Um alerta no Dashboard pode indicar "Produtos com estoque baixo".

### Cenário 2.4: Atualização de Preço de Venda no Inventário
- **Descrição**: Um gestor atualiza o preço de venda de um produto diretamente da lista de inventário.
- **Passos**:
  1. Fazer login como Gestor.
  2. Navegar para a seção "Inventário".
  3. Localizar um produto.
  4. Clicar no campo da coluna "Preço Venda" e digitar um novo valor.
  5. Pressionar "Enter" ou clicar fora do campo.
- **Validações E2E**:
  - Uma mensagem de sucesso ("Preço de venda atualizado!") é exibida brevemente.
  - O novo preço é mantido no campo de input.
  - No banco de dados, o campo `sale_price` do produto é atualizado com o novo valor.
  - Ao adicionar este produto no PDV, o novo preço é utilizado como padrão no carrinho.

---

## 3. Testes de Movimentações (Entrada/Saída)

### Cenário 3.1: Entrada de Estoque (Compra)
- **Descrição**: Registrar a entrada de novos itens de um produto.
- **Passos**:
  1. Fazer login.
  2. Navegar para a seção de "Movimentações" ou "Entrada".
  3. Selecionar um produto existente.
  4. Inserir Quantidade e Custo Unitário.
  5. Clicar em "Registrar Entrada".
- **Validações E2E**:
  - O `current_stock` do produto é atualizado corretamente.
  - O `average_cost` do produto é recalculado e atualizado.
  - Uma nova transação do tipo 'ENTRY' é registrada no banco de dados.

### Cenário 3.2: Saída de Estoque (Venda Simples)
- **Descrição**: Registrar a saída de itens de um produto (venda).
- **Passos**:
  1. Fazer login.
  2. Navegar para a seção de "Movimentações" ou "Saída".
  3. Selecionar um produto com estoque disponível.
  4. Inserir Quantidade e Preço de Venda Unitário.
  5. Selecionar `status = 'PAID'` e `client_name` (opcional).
  6. Clicar em "Registrar Saída".
- **Validações E2E**:
  - O `current_stock` do produto é atualizado corretamente.
  - Uma nova transação do tipo 'EXIT' com `status = 'PAID'` é registrada.
  - O lucro da venda é refletido no "Lucro Realizado" no Dashboard.

### Cenário 3.3: Saída de Estoque "A Receber"
- **Descrição**: Registrar uma venda que será paga posteriormente.
- **Passos**:
  1. Fazer login.
  2. Navegar para a seção de "Movimentações" ou "Saída".
  3. Selecionar um produto com estoque disponível.
  4. Inserir Quantidade e Preço de Venda Unitário.
  5. Selecionar `status = 'PENDING'` e informar `client_name`.
  6. Clicar em "Registrar Saída".
- **Validações E2E**:
  - O `current_stock` do produto é atualizado corretamente.
  - Uma nova transação do tipo 'EXIT' com `status = 'PENDING'` é registrada.
  - O lucro da venda é refletido no "Lucro a Receber" no Dashboard e na seção "Financeiro".

### Cenário 3.4: Saída de Estoque Insuficiente
- **Descrição**: Tentar registrar uma venda com quantidade maior que o estoque disponível.
- **Passos**:
  1. Fazer login.
  2. Selecionar um produto.
  3. Tentar registrar uma saída com `quantidade > current_stock`.
- **Validações E2E**:
  - Mensagem de erro "Estoque insuficiente" é exibida.
  - A transação não é registrada e o estoque não é alterado.

---

## 4. Testes de Frente de Caixa (PDV) e Recibos

### Cenário 4.1: Venda Múltipla (PDV) - Pago com Envio de Recibo
- **Descrição**: Realizar uma venda de múltiplos produtos no PDV com pagamento imediato.
- **Passos**:
  1. Fazer login.
  2. Navegar para a seção "PDV".
  3. Adicionar vários produtos ao carrinho, ajustando quantidades.
  5. No modal de finalização, preencher "Nome do Cliente" e "Número do WhatsApp" com dados válidos.
  6. Selecionar método de pagamento (ex: Dinheiro, PIX, Cartão).
  5. Clicar em "Finalizar Venda".
- **Validações E2E**:
  - Todos os `current_stock` dos produtos são atualizados.
  - A tela de impressão do navegador **não** é aberta.
  - Um log `[WHATSAPP SIM]` aparece no console do servidor, simulando o envio da mensagem.
  - O `client_name` e `client_phone` são salvos corretamente nas transações no banco de dados.
  - Múltiplas transações do tipo 'EXIT' com `status = 'PAID'` são registradas.
  - O lucro total é refletido no "Lucro Realizado" no Dashboard.
  - O carrinho é limpo após a venda.

### Cenário 4.2: Venda Múltipla de Produtos (PDV) - A Receber
- **Descrição**: Realizar uma venda de múltiplos produtos no PDV com status "A Receber".
- **Passos**:
  1. Fazer login.
  2. Navegar para a seção "PDV".
  3. Adicionar vários produtos ao carrinho.
  4. No modal de finalização, selecionar `status = 'PENDING'`, informar `client_name` e `client_phone`.
  5. Clicar em "Finalizar Venda".
- **Validações E2E**:
  - Todos os `current_stock` dos produtos são atualizados.
  - Múltiplas transações do tipo 'EXIT' com `status = 'PENDING'` são registradas.
  - Um log `[WHATSAPP SIM]` aparece no console do servidor.
  - O `client_name` e `client_phone` são salvos corretamente.
  - O lucro total é refletido no "Lucro a Receber" no Dashboard e na seção "Financeiro".

### Cenário 4.3: Scanner de Código de Barras (PDV/Entrada)
- **Descrição**: Utilizar o scanner de código de barras para adicionar produtos.
- **Passos**:
  1. Fazer login.
  2. Navegar para PDV ou Entrada de Estoque.
  3. (Simular leitura de código de barras - pode ser via input manual do ID em ambiente de teste).
  4. Ler um ID de produto existente.
- **Validações E2E**:
  - O produto é automaticamente adicionado ao carrinho (PDV) ou selecionado no formulário (Entrada).
  - Se o ID não existir, o sistema deve sugerir o cadastro (Entrada) ou exibir um alerta (PDV).

### Cenário 4.4: Venda com Desconto (PDV)
- **Descrição**: Realizar uma venda no PDV aplicando um desconto em porcentagem.
- **Passos**:
  1. Fazer login.
  2. Navegar para a seção "PDV".
  3. Adicionar produtos ao carrinho.
  4. Inserir um valor no campo "Desconto (%)" (ex: 10).
  5. Clicar em "Finalizar Venda".
- **Validações E2E**:
  - O valor do "Total a Pagar" reflete o subtotal menos o desconto percentual.
  - Após a venda, as transações são registradas no banco de dados com o preço de venda unitário (`sale_price` ou campo similar) refletindo o valor com desconto.
  - O lucro da venda, calculado no backend, deve ser baseado no preço final com desconto.
  - O campo de desconto é limpo para a próxima venda.

### Cenário 4.5: Venda com Falha no Envio de WhatsApp
- **Descrição**: Realizar uma venda com um número de WhatsApp inválido para garantir que a venda seja concluída mesmo com a falha na notificação.
- **Passos**:
  1. Fazer login e navegar para o "PDV".
  2. Adicionar produtos ao carrinho.
  3. No modal de finalização, preencher "Nome do Cliente" e um "Número do WhatsApp" inválido (ex: "123").
  4. Selecionar o método de pagamento e clicar em "Finalizar Venda".
- **Validações E2E**:
  - A venda é concluída com sucesso na interface (o carrinho é limpo).
  - Os estoques são atualizados e as transações são salvas corretamente no banco de dados.
  - Um log de erro `[WHATSAPP FALHA]` é registrado no console do servidor.
  - A interface do usuário não é bloqueada e não exibe um erro crítico para o usuário final.

---

## 5. Testes de Gestão Financeira

### Cenário 5.1: Visualização de Contas a Receber
- **Descrição**: Um gestor ou colaborador visualiza as vendas pendentes.
- **Passos**:
  1. Fazer login.
  2. Navegar para a seção "Financeiro" ou "Contas a Receber".
- **Validações E2E**:
  - Todas as transações com `status = 'PENDING'` são listadas.
  - Informações como nome do cliente, produto, valor e lucro esperado são exibidas.

### Cenário 5.2: Recebimento Total de Venda Pendente
- **Descrição**: Marcar uma venda "A Receber" como paga.
- **Passos**:
  1. Fazer login.
  2. Navegar para "Financeiro".
  3. Selecionar uma transação pendente.
  4. Clicar em "Receber" (ou botão similar para pagamento total).
- **Validações E2E**:
  - O `status` da transação é atualizado para 'PAID'.
  - O valor da transação é removido do "Lucro a Receber" e adicionado ao "Lucro Realizado" no Dashboard.
  - A transação não aparece mais na lista de "Contas a Receber".

### Cenário 5.3: Recebimento Parcial de Venda Pendente
- **Descrição**: Registrar um pagamento parcial para uma venda pendente.
- **Passos**:
  1. Fazer login.
  2. Navegar para "Financeiro".
  3. Selecionar uma transação pendente.
  4. Clicar em "Receber" e inserir um valor parcial.
- **Validações E2E**:
  - O `amount_paid` da transação é atualizado com o valor parcial.
  - O `status` da transação permanece 'PENDING' (se ainda houver saldo).
  - O "Lucro a Receber" e "Lucro Realizado" no Dashboard são ajustados proporcionalmente.

---

## 6. Testes de Clientes

### Cenário 6.1: Visualização da Lista de Clientes
- **Descrição**: Um gestor visualiza a lista de clientes gerada a partir das vendas.
- **Passos**:
  1. Fazer login como Gestor.
  2. Realizar algumas vendas (PDV ou Saída Simples) para clientes nomeados, por exemplo: "Cliente A", "Cliente B".
  3. Realizar uma venda para "Consumidor Final" ou sem nome de cliente.
  4. Navegar para a nova seção "Clientes".
- **Validações E2E**:
  - A tela exibe uma lista contendo "Cliente A" e "Cliente B".
  - O cliente "Consumidor Final" (ou vendas sem nome) não deve aparecer na lista.
  - Para cada cliente, são exibidos o "Valor Total Gasto" e a "Data da Última Compra".
  - Os valores exibidos correspondem à soma dos `amount_paid` e à `timestamp` mais recente das transações para cada cliente.

---

## 7. Testes de Relatórios e Dashboard

### Cenário 7.1: Dashboard - Visão Geral
- **Descrição**: Verificar os dados exibidos no Dashboard.
- **Passos**:
  1. Fazer login.
  2. Acessar o Dashboard.
- **Validações E2E**:
  - "Patrimônio em Estoque" reflete o valor total dos produtos (`current_stock * average_cost`).
  - "Lucro Realizado" reflete a soma dos lucros de transações 'EXIT' com `status = 'PAID'`.
  - "Lucro a Receber" reflete a soma dos lucros de transações 'EXIT' com `status = 'PENDING'`.
  - O gráfico de evolução de lucro exibe dados consistentes com as vendas registradas.

### Cenário 7.2: Informativo de Lucros por Produto
- **Descrição**: Visualizar os produtos mais lucrativos.
- **Passos**:
  1. Fazer login.
  2. Navegar para a seção "Informativo de Lucros".
- **Validações E2E**:
  - A lista de produtos é exibida, ordenada pelo lucro total.
  - O lucro de cada produto é calculado corretamente.

### Cenário 7.3: Evolução de Lucro por Período
- **Descrição**: Verificar o gráfico de evolução de lucro para diferentes períodos.
- **Passos**:
  1. Fazer login.
  2. Acessar o Dashboard.
  3. Alterar o filtro de período do gráfico (ex: 3 meses, 6 meses, anual, customizado).
- **Validações E2E**:
  - O gráfico é atualizado para refletir os dados do período selecionado.
  - Os valores no gráfico correspondem aos lucros das transações 'EXIT' no período.

### Cenário 7.4: Geração de Relatório de Fechamento de Período
- **Descrição**: Um gestor gera um relatório em PDF para um período específico.
- **Passos**:
  1. Fazer login como Gestor.
  2. Registrar algumas vendas pagas (`PAID`) e pendentes (`PENDING`) em um intervalo de datas específico (ex: 01/03 a 15/03).
  3. Registrar algumas entradas de estoque (`ENTRY`) no mesmo período.
  4. Acessar o menu de ações e clicar em "Relatório" (ou no item de menu na versão web).
  5. No modal, selecionar as datas de início (01/03) e fim (15/03).
  5. Clicar no botão "Gerar Relatório".
- **Validações E2E**:
  - Um modal é exibido com o título "Relatório de Fechamento de Período".
  - Os valores de "Faturamento Bruto", "Recebimentos", "Contas a Pagar" e "Saldo Líquido" correspondem aos cálculos corretos das transações do período.
  - A seção "Movimentação de Estoque" reflete os totais de entradas, saídas e CMV.
  - A seção "KPIs de Performance" exibe o Ticket Médio, o Produto Carro-Chefe e a Margem de Contribuição calculados corretamente.
  - Clicar no botão "Imprimir / Salvar PDF" abre a caixa de diálogo de impressão do navegador.
  - O modal pode ser fechado.

---

## 8. Testes de Funcionalidades Administrativas (Apenas para Admin)

### Cenário 8.1: Visualização de Usuários (Admin)
- **Descrição**: O administrador visualiza todos os usuários cadastrados (exceto outros admins).
- **Passos**:
  1. Fazer login como `admin` (avieiravale@gmail.com).
  2. Navegar para a seção "Administração" ou "Gerenciar Usuários".
- **Validações E2E**:
  - Uma lista de todos os usuários (Gestores e Colaboradores) é exibida.
  - Informações como nome, e-mail, loja, função, status e último pagamento são visíveis.

### Cenário 8.2: Aprovação/Rejeição de Gestor (Admin)
- **Descrição**: O administrador altera o status de um gestor pendente.
- **Passos**:
  1. Fazer login como `admin`.
  2. Navegar para "Gerenciar Usuários".
  3. Localizar um gestor com `status = 'pending'`.
  4. Clicar em "Aprovar" (ou "Ativar").
- **Validações E2E**:
  - O `status` do gestor é alterado para 'active' no banco de dados e na interface.
  - O gestor agora consegue fazer login (Cenário 1.3).

### Cenário 8.3: Desativação/Ativação de Usuário (Admin)
- **Descrição**: O administrador desativa ou reativa um usuário.
- **Passos**:
  1. Fazer login como `admin`.
  2. Navegar para "Gerenciar Usuários".
  3. Selecionar um usuário ativo e clicar em "Desativar".
  4. Tentar fazer login com o usuário desativado.
  5. Reativar o usuário.
- **Validações E2E**:
  - O `status` do usuário é alterado para 'inactive'/'active'.
  - Usuário desativado não consegue fazer login (erro "Acesso revogado").
  - Usuário reativado consegue fazer login.

### Cenário 8.4: Registro de Pagamento Manual (Admin)
- **Descrição**: O administrador registra um pagamento manual para um usuário.
- **Passos**:
  1. Fazer login como `admin`.
  2. Navegar para "Gerenciar Usuários".
  3. Selecionar um usuário.
  4. Clicar em "Registrar Pagamento" e inserir um valor.
- **Validações E2E**:
  - O `last_payment` do usuário é atualizado.
  - O `status` do usuário é definido como 'active'.
  - Uma nova entrada é adicionada na tabela `app_sales`.

### Cenário 8.5: Visualização de Vendas do Aplicativo (Admin)
- **Descrição**: O administrador visualiza as vendas de planos do aplicativo.
- **Passos**:
  1. Fazer login como `admin`.
  2. Navegar para a seção "Vendas do App".
- **Validações E2E**:
  - Uma lista de todas as vendas de planos (`app_sales`) é exibida.
  - Informações como cliente, valor e data são visíveis.

### Cenário 8.6: Visualização de Logs de Auditoria (Admin)
- **Descrição**: O administrador visualiza os logs de auditoria do sistema.
- **Passos**:
  1. Fazer login como `admin`.
  2. Navegar para a seção "Logs de Auditoria".
- **Validações E2E**:
  - Uma lista dos últimos logs de auditoria é exibida.
  - Ações como login, cadastro, criação de produto, movimentações, etc., são registradas.

### Cenário 8.7: Reset Completo do Banco de Dados (Admin)
- **Descrição**: O administrador reseta completamente o banco de dados (exceto o próprio admin).
- **Passos**:
  1. Fazer login como `admin`.
  2. Navegar para a seção "Administração".
  3. Clicar em "Resetar Banco de Dados" (confirmar ação).
- **Validações E2E**:
  - Todas as tabelas (`transactions`, `products`, `app_sales`, `users` - exceto admin) são esvaziadas.
  - O admin ainda consegue fazer login.
  - Um log de auditoria para o reset é registrado.

---

## 9. Testes de Webhook (PIX)

### Cenário 9.1: Aprovação Automática de Pagamento PIX
- **Descrição**: Um pagamento PIX é aprovado via webhook, ativando um gestor pendente.
- **Passos**:
  1. Registrar um novo gestor (Cenário 1.1), deixando-o com `status = 'pending'`.
  2. Simular uma requisição POST para `/api/webhook/pix` com um payload contendo `external_reference` (ID do usuário) e `status = 'approved'`.
     ```json
     {
       "external_reference": "ID_DO_GESTOR_PENDENTE",
       "status": "approved",
       "amount": 100.00 // Opcional, se o webhook enviar
     }
     ```
- **Validações E2E**:
  - O `status` do gestor é alterado para 'active'.
  - O `last_payment` do gestor é atualizado.
  - Uma nova entrada é adicionada na tabela `app_sales` para o usuário.
  - O gestor consegue fazer login.
  - Um log de auditoria é registrado para o aprovação via webhook.

---

## 10. Testes de Integridade e Casos de Borda

### Cenário 10.1: Limite de Colaboradores por Loja
- **Descrição**: Tentar adicionar mais de 4 colaboradores a uma loja.
- **Passos**:
  1. Registrar um gestor.
  2. Registrar 4 colaboradores para essa loja.
  3. Tentar registrar um 5º colaborador para a mesma loja.
- **Validações E2E**:
  - Mensagem de erro "Limite de colaboradores atingido" é exibida.
  - O 5º colaborador não é registrado.

### Cenário 10.2: Exclusão de Usuário (Admin)
- **Descrição**: O administrador exclui um usuário e verifica a cascata.
- **Passos**:
  1. Fazer login como `admin`.
  2. Criar um gestor, alguns produtos e transações para esse gestor.
  3. Navegar para "Gerenciar Usuários".
  4. Excluir o gestor criado.
- **Validações E2E**:
  - O gestor é removido da lista de usuários.
  - Todos os produtos e transações associados a esse gestor são removidos do banco de dados (devido a `ON DELETE CASCADE`).
  - Um log de auditoria para a exclusão é registrado.

### Cenário 10.3: Conflitos de ID
- **Descrição**: Tentar cadastrar um produto com um ID já existente para o mesmo `user_id`.
- **Passos**:
  1. Fazer login.
  2. Cadastrar um produto com ID "PROD001".
  3. Tentar cadastrar outro produto com o mesmo ID "PROD001".
- **Validações E2E**:
  - Mensagem de erro "UNIQUE constraint failed: products.user_id, products.sku" ou similar é exibida (o nome da coluna no banco não muda).
  - O segundo produto não é cadastrado.

### Cenário 10.4: Validação de Limites de Plano
- **Descrição**: Tentar adicionar usuários além do limite permitido pelo plano da loja.
- **Passos (Plano Profissional - 1 Gestor, 9 Colaboradores)**:
  1. Fazer login como `admin`.
  2. Alterar o plano de uma loja para 'profissional'.
  3. Garantir que a loja tenha 1 gestor e 9 colaboradores.
  4. Tentar registrar um 10º colaborador para a mesma loja.
  5. Tentar alterar o papel de um colaborador para 'gestor'.
- **Validações E2E**:
  - Ao tentar registrar o 10º colaborador, uma mensagem de erro "Limite de 9 colaboradores atingido para o Plano Profissional." é exibida. O usuário não é criado.
  - Ao tentar promover um colaborador para gestor, uma mensagem de erro "Limite de 1 gestor atingido para o Plano Profissional." é exibida. O papel do usuário não é alterado.
- **Passos (Plano Empresarial - 2 Gestores, ∞ Colaboradores)**:
  1. Fazer login como `admin`.
  2. Alterar o plano de uma loja para 'empresarial'.
  3. Garantir que a loja tenha 1 gestor e 10+ colaboradores.
  4. Registrar um 2º gestor para a loja.
  5. Tentar registrar um 3º gestor para a loja.
- **Validações E2E**:
  - O registro de mais de 10 colaboradores é bem-sucedido.
  - O registro do 2º gestor é bem-sucedido.
  - Ao tentar registrar o 3º gestor, uma mensagem de erro "Limite de 2 gestores atingido para o Plano Empresarial." é exibida. O usuário não é criado.

---

## 📝 Observações Finais

- **Testes de UI/UX**: Além dos fluxos funcionais, é importante validar a responsividade, usabilidade e consistência visual da interface em diferentes dispositivos e tamanhos de tela.
- **Performance**: Para sistemas maiores, testes de carga e estresse seriam recomendados para avaliar o desempenho sob alta demanda.
- **Segurança**: Testes de penetração e vulnerabilidade são essenciais para garantir a segurança dos dados.
- **Logs de Auditoria**: Verificar se todas as ações críticas estão sendo devidamente logadas no `audit_logs`.

Este documento serve como um guia abrangente para a criação de testes E2E, garantindo que as principais funcionalidades do sistema sejam validadas de ponta a ponta.