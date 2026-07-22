import Link from "next/link";

const CATALOGOS = [
  {
    href: "/mantenimientos/clientes",
    titulo: "Clientes",
    descripcion: "Personas de contacto y empresas registradas para asociar a pedidos y trazabilidad.",
    icono: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-1a4 4 0 00-4-4h-1M9 20H4v-1a4 4 0 014-4h1m4 5v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1m8 0v-1a4 4 0 014-4h1a4 4 0 014 4v1M12 12a4 4 0 100-8 4 4 0 000 8z" />
      </svg>
    ),
  },
  {
    href: "/mantenimientos/usuarios",
    titulo: "Usuarios",
    descripcion: "Cuentas de acceso al sistema y su alcance de visibilidad (empresa, cliente o sucursal).",
    icono: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
  {
    href: "/mantenimientos/roles",
    titulo: "Roles y permisos",
    descripcion: "Qué puede hacer cada rol dentro del sistema — matriz de permisos por acción.",
    icono: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
  },
];

export default function PaginaMantenimientos() {
  return (
    <div className="p-6 md:p-7.5">
      <h1 className="text-heading-6 font-bold text-dark dark:text-white">Mantenimientos</h1>
      <p className="mt-1 text-body-sm text-dark-4 dark:text-dark-6">
        Configuración y tablas maestras del sistema.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CATALOGOS.map((cat) => (
          <Link
            key={cat.href}
            href={cat.href}
            className="group rounded-[10px] bg-white p-6 shadow-1 transition-shadow hover:shadow-3 dark:bg-gray-dark dark:shadow-card dark:hover:shadow-card-2"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              {cat.icono}
            </div>
            <h2 className="text-body-lg font-semibold text-dark dark:text-white">{cat.titulo}</h2>
            <p className="mt-1 text-body-sm text-dark-4 dark:text-dark-6">{cat.descripcion}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-body-sm font-medium text-primary">
              Ver {cat.titulo.toLowerCase()}
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
