import { ReactNode } from 'react';
import { RoleSidebar } from './RoleSidebar';
import { Header } from './Header';
import { UpdateBanner } from './UpdateBanner';
import { UserRole } from '@/types/lis';

interface RoleLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  role: UserRole;
  userName?: string;
}

export function RoleLayout({ children, title, subtitle, role, userName }: RoleLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <RoleSidebar role={role} userName={userName} />
      <div className="ml-64">
        <Header title={title} subtitle={subtitle} />
        <UpdateBanner />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
