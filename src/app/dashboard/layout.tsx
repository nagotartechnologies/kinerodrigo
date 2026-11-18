import type { ReactNode } from 'react';
import { ConfirmProvider } from '@/components/ConfirmDialog';
import VigilanteSesion from '@/components/VigilanteSesion';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ConfirmProvider>
      <VigilanteSesion />
      {children}
    </ConfirmProvider>
  );
}
