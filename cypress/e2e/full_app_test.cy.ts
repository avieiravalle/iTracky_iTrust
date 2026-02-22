describe('Fluxo Completo do Sistema de Estoque', () => {
  const timestamp = Date.now();
  const user = {
    name: 'Usuario Teste Cypress',
    email: `cypress${timestamp}@teste.com`,
    password: 'senha123',
    cep: '01001-000',
    establishment: 'Loja Cypress'
  };

  const admin = {
    email: 'avieiravale@gmail.com',
    password: 'Anderson@46'
  };

  // Função auxiliar para login
  const login = (email: string, pass: string) => {
    cy.contains('Entrar na sua conta').should('be.visible');
    cy.get('[data-testid="input-email-login"]').clear().type(email);
    cy.get('[data-testid="input-password-login"]').clear().type(pass);
    cy.get('[data-testid="btn-login-submit"]').click();
  };

  it('Deve realizar cadastro, login, operações de estoque e admin', () => {
    // Interceptar chamadas de API para evitar esperas fixas
    cy.intercept('GET', 'https://viacep.com.br/ws/**').as('getCep');
    cy.intercept('POST', '/api/register').as('registerUser');
    cy.intercept('POST', '/api/login').as('loginUser');
    cy.intercept('POST', '/api/products').as('createProduct');

    // 1. Acessar a aplicação
    cy.visit('http://localhost:3000');
    cy.contains('Cadastre-se', { timeout: 10000 }).should('be.visible');

    // --- CADASTRO ---
    cy.contains('Cadastre-se').click();
    
    cy.get('[data-testid="input-name"]').should('be.visible').type(user.name);
    cy.get('[data-testid="input-email"]').type(user.email);
    cy.get('[data-testid="input-password"]').type(user.password);
    cy.get('[data-testid="input-cep"]').type(user.cep);
    
    // Aguardar a resposta do CEP em vez de wait(1000)
    cy.wait('@getCep');
    
    cy.get('[data-testid="input-establishment"]').type(user.establishment);
    cy.get('[data-testid="btn-register-submit"]').click();
    cy.wait('@registerUser');

    // --- VERIFICAÇÃO DO MODAL DE PIX ---
    cy.contains('Pagamento Necessário', { timeout: 10000 }).should('be.visible');
    cy.contains('R$ 100,00').should('be.visible');
    
    // Verifica se o QR Code está sendo gerado corretamente (API + Payload PIX)
    cy.get('img[alt="QR Code PIX"]')
      .should('be.visible')
      .and('have.attr', 'src')
      .and('include', 'api.qrserver.com')
      .and('include', 'data=000201'); // 000201 é o início padrão do BR Code

    // Fechar o modal para prosseguir
    cy.get('svg.lucide-x').closest('button').click();

    // --- LOGIN ---
    login(user.email, user.password);
    cy.wait('@loginUser');

    // --- DASHBOARD ---
    cy.contains('Visão Geral', { timeout: 10000 }).should('be.visible');
    cy.contains(user.establishment).should('be.visible');

    // --- CRIAR PRODUTO ---
    cy.get('[data-testid="btn-new-product"]').click();
    cy.get('[data-testid="input-product-name"]').should('be.visible').type('Produto Teste Cypress');
    cy.get('[data-testid="input-product-sku"]').type(`SKU-${timestamp}`);
    cy.get('[data-testid="input-product-min-stock"]').clear().type('10');
    cy.get('[data-testid="btn-save-product"]').click();
    cy.wait('@createProduct');

    // --- VERIFICAR INVENTÁRIO ---
    cy.contains('Inventário').click();
    cy.contains('Produto Teste Cypress').should('be.visible');
    cy.contains(`SKU-${timestamp}`).should('be.visible');

    // --- TRANSAÇÃO DE ENTRADA ---
    cy.get('[data-testid="btn-entry"]').click();
    // Seleciona o produto usando string exata para maior estabilidade
    cy.get('select[name="product_id"]').should('contain', 'Produto Teste Cypress').select('Produto Teste Cypress');
    cy.get('input[name="quantity"]').clear().type('100');
    cy.get('input[name="unit_cost"]').clear().type('10.00');
    cy.get('form:visible').submit();

    // Verificar se o estoque atualizou na tabela (coluna de estoque atual)
    cy.contains('td', '100').should('be.visible');

    // --- TRANSAÇÃO DE SAÍDA ---
    cy.get('[data-testid="btn-exit"]').click();
    cy.get('select[name="product_id"]').should('contain', 'Produto Teste Cypress').select('Produto Teste Cypress');
    cy.get('input[name="quantity"]').clear().type('10');
    cy.get('input[name="unit_cost"]').clear().type('20.00');
    // Seleciona pelo texto visível da opção
    cy.get('select[name="status"]').select('Pago');
    cy.get('form:visible').submit();

    // Verificar se o estoque atualizou (100 - 10 = 90)
    cy.contains('td', '90').should('be.visible');

    // --- LOGOUT ---
    cy.contains('Sair').click();
    cy.contains('Entrar na sua conta').should('be.visible');

    // --- TESTE DE RECUPERAÇÃO DE SENHA (UI) ---
    cy.contains('Esqueci minha senha').click();
    cy.contains('Recuperar Senha').should('be.visible');
    cy.contains('Voltar').click();

    // --- LOGIN ADMIN ---
    cy.contains('Entrar como Adm').click();
    // O form de admin usa inputs controlados, limpar antes de digitar é crucial
    cy.get('input[type="email"]').should('be.visible').clear().type(admin.email);
    cy.get('input[type="password"]').should('be.visible').clear().type(admin.password);
    cy.contains('button', 'Entrar no Painel').click();

    // --- PAINEL ADMIN ---
    cy.contains('Painel Master', { timeout: 10000 }).should('be.visible');
    
    // Buscar o usuário criado
    cy.get('input[placeholder="Buscar cliente..."]').should('be.visible').clear().type(user.name);
    // Aguarda a filtragem acontecer
    cy.contains(user.name).should('be.visible');
    cy.contains(user.establishment).should('be.visible');

    // Testar filtro/busca (usuário inexistente)
    cy.get('input[placeholder="Buscar cliente..."]').clear().type('UsuarioInexistenteXYZ');
    cy.contains(user.name).should('not.exist');
    
    // Limpar busca
    cy.get('input[placeholder="Buscar cliente..."]').clear();
    cy.contains(user.name).should('be.visible');
  });
});
