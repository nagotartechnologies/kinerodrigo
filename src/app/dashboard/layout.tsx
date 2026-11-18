import type { ReactNode } from 'react';
import { ConfirmProvider } from '@/components/ConfirmDialog';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <ConfirmProvider>{children}</ConfirmProvider>;
}
