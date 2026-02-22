import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Sidebar } from './Sidebar';

// Mock do objeto User
const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  establishment_name: 'Test Store',
  role: 'gestor',
  status: 'active',
  plan: 'Basic',
  last_payment: '2024-01-01',
  store_code: 'CODE123',
  parent_id: null
};

describe('Sidebar Component', () => {
  const defaultProps = {
    user: mockUser as any,
    activeTab: 'dashboard',
    setActiveTab: vi.fn(),
    onLogout: vi.fn(),
    onShowTransaction: vi.fn(),
    onShowAddProduct: vi.fn(),
    darkMode: false,
    setDarkMode: vi.fn(),
  };

  it('Deve renderizar os botões de navegação corretamente', () => {
    render(<Sidebar {...defaultProps} />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Inventário')).toBeInTheDocument();
    expect(screen.getByText('Informativo')).toBeInTheDocument();
    expect(screen.getByText('Financeiro')).toBeInTheDocument();
    expect(screen.getByText('Ajuda/Manual')).toBeInTheDocument();
  });

  it('Deve chamar setActiveTab com o valor correto ao clicar', () => {
    render(<Sidebar {...defaultProps} />);

    fireEvent.click(screen.getByText('Dashboard'));
    expect(defaultProps.setActiveTab).toHaveBeenCalledWith('dashboard');

    fireEvent.click(screen.getByText('Inventário'));
    expect(defaultProps.setActiveTab).toHaveBeenCalledWith('inventory');
    
    fireEvent.click(screen.getByText('Financeiro'));
    expect(defaultProps.setActiveTab).toHaveBeenCalledWith('financeiro');
  });

  it('Deve chamar onLogout ao clicar em Sair', () => {
    render(<Sidebar {...defaultProps} />);
    fireEvent.click(screen.getByText('Sair'));
    expect(defaultProps.onLogout).toHaveBeenCalled();
  });

  it('Deve alternar o modo escuro', () => {
    render(<Sidebar {...defaultProps} />);
    const themeBtn = screen.getByLabelText('Alternar tema');
    fireEvent.click(themeBtn);
    expect(defaultProps.setDarkMode).toHaveBeenCalledWith(true);
  });

  it('Não deve mostrar opções restritas para colaboradores', () => {
    const collaboratorUser = { ...mockUser, role: 'colaborador' };
    render(<Sidebar {...defaultProps} user={collaboratorUser as any} />);
    
    expect(screen.queryByText('Informativo')).not.toBeInTheDocument();
    expect(screen.queryByText('Financeiro')).not.toBeInTheDocument();
  });
});