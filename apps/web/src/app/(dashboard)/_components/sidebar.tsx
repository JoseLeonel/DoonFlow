"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@doonflow/shared";
import { usarContextoSidebar } from "./sidebar-contexto";

// ── Iconos SVG inline ─────────────────────────────────────────────────────────

function IconoHome({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function IconoInspeccion({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    </svg>
  );
}

function IconoAprobaciones({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 3h6M9 4.5a1.5 1.5 0 0 1 1.5-1.5h3a1.5 1.5 0 0 1 1.5 1.5v.75h1.5a2.25 2.25 0 0 1 2.25 2.25v10.5A2.25 2.25 0 0 1 16.5 20.25h-9A2.25 2.25 0 0 1 5.25 18V7.5A2.25 2.25 0 0 1 7.5 5.25H9V4.5Z" />
    </svg>
  );
}

function IconoPermisos({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

function IconoCertificacion({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function IconoFinca({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12 12 2.25 21.75 12M4.5 9.75V20.25a.75.75 0 0 0 .75.75h4.5a.75.75 0 0 0 .75-.75v-6.75a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75v6.75a.75.75 0 0 0 .75.75h4.5a.75.75 0 0 0 .75-.75V9.75" />
    </svg>
  );
}

function IconoInventario({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  );
}

function IconoAnalytics({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function IconoMantenimiento({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l5.654-4.654m5.896-3.42c-.396 1.335.078 2.775 1.226 3.595l.194.131a2.887 2.887 0 0 1 .962 3.489l-.05.106a2.887 2.887 0 0 1-3.489.962l-.106-.05a2.887 2.887 0 0 1-3.489-.962l-.05-.106a2.887 2.887 0 0 1 .962-3.489l.131-.194c.82-1.148.83-2.648.078-3.808" />
    </svg>
  );
}

// ── Icono clientes ────────────────────────────────────────────────────────────

function IconoClientes({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

// ── Icono usuarios ────────────────────────────────────────────────────────────

function IconoUsuarios({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function IconoAuditoria({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253" />
    </svg>
  );
}

function IconoRetencion({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.86M12 3v8.25m0 0-3-3m3 3 3-3" />
    </svg>
  );
}

// ── Datos de navegación ───────────────────────────────────────────────────────

interface SubItem { titulo: string; href: string; Icono?: ({ className }: { className?: string }) => JSX.Element }
interface NavItem  { titulo: string; href: string; Icono: ({ className }: { className?: string }) => JSX.Element; subItems?: SubItem[] }
interface NavGrupo { seccion: string; items: NavItem[] }

const NAV: NavGrupo[] = [
  {
    seccion: "PRINCIPAL",
    items: [
      { titulo: "Inicio",        href: "/",              Icono: IconoHome },
    ],
  },
  {
    seccion: "CALIDAD",
    items: [
      { titulo: "Inspecciones",  href: "/inspecciones",  Icono: IconoInspeccion },
      { titulo: "Aprobaciones",  href: "/inspecciones/aprobaciones", Icono: IconoAprobaciones },
      {
        titulo: "Certificaciones",
        href: "/certificaciones",
        Icono: IconoCertificacion,
        subItems: [
          { titulo: "Nueva certificación", href: "/certificaciones/nueva" },
          { titulo: "Mis acciones", href: "/certificaciones/seguimiento" },
          { titulo: "Verificación", href: "/certificaciones/verificacion" },
        ],
      },
    ],
  },
  {
    seccion: "PRODUCCIÓN",
    items: [
      { titulo: "Fincas",        href: "/fincas",        Icono: IconoFinca },
      { titulo: "Inventario",    href: "/inventario",    Icono: IconoInventario },
      {
        titulo: "Analytics",
        href: "/analytics",
        Icono: IconoAnalytics,
        subItems: [
          { titulo: "Reportes", href: "/analytics/reportes" },
          { titulo: "Nuevo reporte", href: "/analytics/reportes/nuevo" },
        ],
      },
    ],
  },
  {
    seccion: "CONFIGURACIÓN",
    items: [
      {
        titulo: "Mantenimientos",
        href: "/mantenimientos",
        Icono: IconoMantenimiento,
        subItems: [
          { titulo: "Clientes", href: "/mantenimientos/clientes", Icono: IconoClientes },
          { titulo: "Usuarios", href: "/mantenimientos/usuarios", Icono: IconoUsuarios },
          { titulo: "Roles y permisos", href: "/mantenimientos/roles", Icono: IconoPermisos },
          { titulo: "Auditoría", href: "/mantenimientos/auditoria", Icono: IconoAuditoria },
          { titulo: "Política de retención", href: "/mantenimientos/retencion", Icono: IconoRetencion },
        ],
      },
    ],
  },
];

// ── Logo DoonFlow ─────────────────────────────────────────────────────────────

function LogoDoonFlow() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
        <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 14.2a7.2 7.2 0 0 1-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08a7.2 7.2 0 0 1-6 3.22z"/>
        </svg>
      </div>
      <span className="text-lg font-bold text-dark dark:text-white">DoonFlow</span>
    </div>
  );
}

// ── Ítem de menú con soporte de submenú ───────────────────────────────────────

function ItemMenu({
  titulo, href, Icono, subItems, pathname, onNavegar,
}: {
  titulo: string;
  href: string;
  Icono: ({ className }: { className?: string }) => JSX.Element;
  subItems?: { titulo: string; href: string; Icono?: ({ className }: { className?: string }) => JSX.Element }[];
  pathname: string;
  onNavegar: () => void;
}) {
  const tieneHijos = subItems && subItems.length > 0;
  const activoHijo = tieneHijos && subItems.some((s) => pathname.startsWith(s.href));
  const activoPropio = href === "/" ? pathname === "/" : !tieneHijos && pathname.startsWith(href);
  const activo = activoPropio || activoHijo;

  const [expandido, setExpandido] = useState(!!activoHijo);

  // Cuando navegamos a una ruta hija, auto-expandir
  useEffect(() => {
    if (activoHijo) setExpandido(true);
  }, [activoHijo]);

  if (tieneHijos) {
    return (
      <li>
        <button
          onClick={() => setExpandido((v) => !v)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            activo
              ? "bg-primary/10 text-primary dark:bg-white/10 dark:text-white"
              : "text-dark-4 hover:bg-gray-1 hover:text-dark dark:text-dark-6 dark:hover:bg-white/10 dark:hover:text-white",
          )}
        >
          <Icono className="h-5 w-5 shrink-0" />
          <span className="flex-1 text-left">{titulo}</span>
          <svg
            className={cn("h-4 w-4 shrink-0 transition-transform duration-200", expandido && "rotate-180")}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
          </svg>
        </button>

        {expandido && (
          <ul className="mt-1 space-y-0.5 pl-4">
            {subItems.map((sub) => {
              const activoSub = pathname.startsWith(sub.href);
              return (
                <li key={sub.href}>
                  <Link
                    href={sub.href}
                    onClick={onNavegar}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      activoSub
                        ? "bg-primary/10 text-primary dark:bg-white/10 dark:text-white"
                        : "text-dark-4 hover:bg-gray-1 hover:text-dark dark:text-dark-6 dark:hover:bg-white/10 dark:hover:text-white",
                    )}
                  >
                    {sub.Icono && <sub.Icono className="h-4 w-4 shrink-0" />}
                    {!sub.Icono && <span className="h-4 w-4 shrink-0 flex items-center justify-center"><span className="h-1.5 w-1.5 rounded-full bg-current" /></span>}
                    <span>{sub.titulo}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link
        href={href}
        onClick={onNavegar}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          activo
            ? "bg-primary/10 text-primary dark:bg-white/10 dark:text-white"
            : "text-dark-4 hover:bg-gray-1 hover:text-dark dark:text-dark-6 dark:hover:bg-white/10 dark:hover:text-white",
        )}
      >
        <Icono className="h-5 w-5 shrink-0" />
        <span>{titulo}</span>
      </Link>
    </li>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const { abierto, setAbierto, esMobile } = usarContextoSidebar();

  const cerrarMobile = () => { if (esMobile) setAbierto(false); };

  return (
    <>
      {/* Overlay mobile */}
      {esMobile && abierto && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          aria-hidden="true"
          onClick={() => setAbierto(false)}
        />
      )}

      <aside
        className={cn(
          "overflow-hidden border-r border-stroke bg-white transition-[width] duration-200 dark:border-dark-3 dark:bg-gray-dark",
          esMobile ? "fixed bottom-0 top-0 z-50" : "sticky top-0 h-screen",
          abierto ? "w-[260px]" : "w-0",
        )}
        aria-label="Menú principal"
      >
        <div className="flex h-full flex-col px-6 py-8">
          {/* Logo */}
          <Link href="/" onClick={cerrarMobile}>
            <LogoDoonFlow />
          </Link>

          {/* Navegación */}
          <nav className="mt-8 flex-1 overflow-y-auto space-y-6">
            {NAV.map((grupo) => (
              <div key={grupo.seccion}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-dark-4 dark:text-dark-6">
                  {grupo.seccion}
                </p>
                <ul className="space-y-1">
                  {grupo.items.map(({ titulo, href, Icono, subItems }) => (
                    <ItemMenu
                      key={href}
                      titulo={titulo}
                      href={href}
                      Icono={Icono}
                      subItems={subItems}
                      pathname={pathname}
                      onNavegar={cerrarMobile}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
