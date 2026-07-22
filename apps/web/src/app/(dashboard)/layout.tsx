import { ProveedorSidebar } from "./_components/sidebar-contexto";
import { Sidebar } from "./_components/sidebar";
import { Header } from "./_components/header";

export default function LayoutDashboard({ children }: { children: React.ReactNode }) {
  return (
    <ProveedorSidebar>
      <div className="flex min-h-screen bg-gray-2 dark:bg-[#020d1a]">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="mx-auto w-full max-w-screen-2xl p-4 md:p-6 2xl:p-10">
            {children}
          </main>
        </div>
      </div>
    </ProveedorSidebar>
  );
}
