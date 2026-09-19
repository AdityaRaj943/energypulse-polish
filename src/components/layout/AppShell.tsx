import type { ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { ImportDialog } from "@/components/data/ImportDialog";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
      <ImportDialog />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:gap-3">{actions}</div>}
    </div>
  );
}
