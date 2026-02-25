# Documentação Técnica do Projeto iTrust (Estoque & PDV)

Este documento detalha a estrutura de arquivos, decisões arquiteturais e o sistema de design (Identidade Visual) implementado no projeto.

---

## 1. Visão Geral da Arquitetura

O projeto opera como uma aplicação **Monolítica Híbrida**:
- **Frontend:** Single Page Application (SPA) construída com React, TypeScript e Vite.
- **Backend:** Servidor Node.js (Express) que serve tanto a API REST quanto os arquivos estáticos do frontend em produção.
- **Banco de Dados:** SQLite (via `better-sqlite3`), garantindo portabilidade e zero configuração externa.

### Fluxo de Dados
1. O Cliente (Browser) faz requisições HTTP para `/api/*`.
2. O Servidor valida a autenticação via **JWT (JSON Web Token)**.
3. O Servidor interage com o arquivo local `inventory.db`.
4. O Frontend utiliza *Polling* (atualização a cada 5s) para manter os dados sincronizados em tempo real.

---

## 2. Estrutura de Pastas e Arquivos

```
Estoque/
├── dist/                   # Build de produção do Frontend (gerado pelo Vite)
├── node_modules/           # Dependências do projeto
├── src/                    # Código Fonte do Frontend
│   ├── components/         # Componentes React reutilizáveis e Telas
│   │   ├── AccessControlPanel.tsx  # Tabela de gestão de colaboradores
│   │   ├── AdminDashboard.tsx      # Painel Master (Super Admin)
│   │   ├── AuditLogViewer.tsx      # Visualizador de logs de auditoria
│   │   ├── Auth.tsx                # Telas de Login e Registro
│   │   ├── Dashboard.tsx           # Tela inicial com KPIs e Gráficos
│   │   ├── Financeiro.tsx          # Contas a receber e fluxo de caixa
│   │   ├── Informativo.tsx         # Gráficos de performance de produtos
│   │   ├── Inventory.tsx           # Lista de produtos (CRUD)
│   │   ├── Manual.tsx              # Documentação interna para o usuário
│   │   ├── Modals.tsx              # Modais globais (Add Produto, Transação)
│   │   ├── PeriodClosingReport.tsx # Gerador de relatórios
│   │   ├── PixPaymentModal.tsx     # Modal de pagamento do plano
│   │   ├── POS.tsx                 # Frente de Caixa (Ponto de Venda)
│   │   ├── Sidebar.tsx             # Menu lateral de navegação
│   │   └── TeamManagement.tsx      # Tela agrupadora de gestão de equipe
│   ├── utils/
│   │   └── format.ts       # Funções auxiliares (ex: formatação de moeda BRL)
│   ├── App.tsx             # Componente Raiz (Roteamento via Estado e Layout)
│   ├── index.css           # Estilos globais e Tailwind directives
│   ├── main.tsx            # Ponto de entrada do React
│   └── types.ts            # Definições de Tipagem TypeScript (Interfaces)
├── inventory.db            # Arquivo do Banco de Dados SQLite
├── package.json            # Dependências e Scripts
├── server.ts               # Servidor Backend (API + Auth + DB Logic)
├── tailwind.config.js      # Configuração do Tailwind CSS
├── tsconfig.json           # Configuração do TypeScript
└── vite.config.ts          # Configuração do Vite
```

---

## 3. Identidade Visual (Design System)

O projeto utiliza o tema **"iTrust"**, focado em profissionalismo, confiança e clareza.

### Paleta de Cores (Hex)

| Cor | Hex | Aplicação Principal |
| :--- | :--- | :--- |
| **Azul Marinho Profundo** | `#1A3A5F` | Sidebar, Elementos Institucionais, Logos |
| **Verde Vibrante** | `#4CAF50` | Botões de Ação (Salvar, Confirmar), Indicadores de Sucesso |
| **Ciano Brilhante** | `#00D4FF` | Destaques Tech, Ícones ativos, Bordas de foco |
| **Cinza Grafite** | `#2D3436` | Textos principais, Títulos |
| **Branco Gelo** | `#F4F7F6` | Fundo da aplicação (Background) |
| **Dark Mode (Slate)** | `#0f172a` | Fundo em modo escuro |

### Tipografia
- **Fonte:** Inter (Google Fonts).
- **Estilo:** Sans-serif moderna, focada em legibilidade de interfaces (UI).

### Componentes de UI
- **Bordas:** Arredondadas (`rounded-xl` ou `rounded-2xl`).
- **Sombras:** Suaves (`shadow-sm` ou `shadow-lg` para destaque).
- **Ícones:** Biblioteca `lucide-react` (consistência de traço).

---

## 4. Detalhes de Implementação

### Autenticação e Segurança
- **JWT:** Tokens com validade de 8 horas.
- **Single Session:** O banco de dados armazena o `current_token`. Se um usuário logar em outro dispositivo, o token anterior é invalidado no middleware do backend, forçando logout no dispositivo antigo.
- **RBAC (Role-Based Access Control):**
    - `admin`: Acesso total ao sistema e painel master.
    - `gestor`: Acesso total à sua loja e gestão de equipe.
    - `colaborador`: Acesso restrito (Vendas, Estoque), sem acesso a relatórios financeiros sensíveis ou exclusão de dados.

### Banco de Dados (Schema Simplificado)

1.  **users**: Armazena Admin, Gestores e Colaboradores.
    *   `parent_id`: Vincula colaboradores ao gestor.
    *   `store_code`: Código único da loja.
    *   `current_token`: Para controle de sessão única.

2.  **products**: Inventário.
    *   `user_id`: Dono do produto (sempre o ID do Gestor).
    *   `sku`: Código único por loja.

3.  **transactions**: Histórico de movimentações.
    *   `type`: 'ENTRY' (Entrada) ou 'EXIT' (Saída).
    *   `status`: 'PAID' (Pago) ou 'PENDING' (A Receber/Fiado).

4.  **audit_logs**: Rastreabilidade.
    *   Registra quem fez o quê e quando (ex: "João excluiu o produto X").

### Roteamento (Frontend)
O projeto não utiliza `react-router-dom` tradicional. O roteamento é gerenciado via **Estado React** (`activeTab` e `screen`) dentro do `App.tsx`.

- **Screens:** `login` | `register` | `mode_selection` | `app` | `admin`.
- **Tabs (dentro de `app`):** `dashboard`, `inventory`, `pdv`, `financeiro`, `team`, etc.

---

## 5. Comandos Úteis

### Instalação
```bash
npm install
```

### Desenvolvimento (Frontend + Backend concorrentes)
```bash
npm run dev
```
*(Necessário configurar script `concurrently` ou rodar terminais separados para `vite` e `ts-node server.ts`)*

### Produção
1. `npm run build` (Gera a pasta `dist`)
2. `npx ts-node server.ts` (Inicia o servidor que serve a API e o `dist`)