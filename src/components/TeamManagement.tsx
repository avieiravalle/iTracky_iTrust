import React from 'react';
import { AccessControlPanel } from './AccessControlPanel';
import { AuditLogViewer } from './AuditLogViewer';
import { User } from '../types';
import { ShieldAlert } from 'lucide-react';

interface TeamManagementProps {
  user: User | null;
}

export function TeamManagement({ user }: TeamManagementProps) {
  const isGestor = user?.role === 'gestor' || user?.role === 'admin';

  if (!isGestor) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500">
        <ShieldAlert className="w-16 h-16 mb-4 text-rose-500" />
        <h2 className="text-xl font-bold">Acesso Negado</h2>
        <p>Você não tem permissão para acessar esta área.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AccessControlPanel />
      <AuditLogViewer />
    </div>
  );
}