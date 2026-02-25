export interface Product {
  id: number;
  user_id: number;
  name: string;
  sku: string;
  min_stock: number;
  current_stock: number;
  average_cost: number;
  sale_price: number; // <-- Adicione esta linha
  expiry_date: string | null;
}


export interface User {
  id: number;
  name: string;
  email: string;
  cep: string;
  establishment_name: string;
  role?: 'admin' | 'gestor' | 'colaborador' | 'user';
  store_code?: string;
  parent_id?: number;
}

export interface Client {
  id: number;
  name: string;
  email: string;
  establishment_name: string;
  role: 'gestor' | 'colaborador' | 'user';
  status: 'active' | 'inactive' | 'pending';
  last_payment: string;
  plan: string;
}

export interface AppSale {
  id: number;
  client_name: string;
  amount: number;
  date: string;
}

export interface Stats {
  realized_profit: number;
  pending_profit: number;
}

export interface Transaction {
  id: number;
  product_id: number;
  type: 'ENTRY' | 'EXIT';
  quantity: number;
  unit_cost: number;
  cost_at_transaction: number;
  status: 'PAID' | 'PENDING';
  amount_paid: number;
  client_name: string | null;
  timestamp: string;
}

export interface Receivable extends Transaction {
  product_name: string;
  product_sku: string;
  expected_profit: number;
}

export interface ProductStat {
  name: string;
  sku: string;
  total_sold: number;
  profit: number;
}

export interface MonthlyStat {
  month: string;
  profit: number;
}
