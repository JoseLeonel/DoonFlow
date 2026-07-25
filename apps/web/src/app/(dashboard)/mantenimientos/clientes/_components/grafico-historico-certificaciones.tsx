"use client";

import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import type { RegistroCertificacion } from "../_servicios/sucursal.servicio";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

/**
 * Gráfico de barras del comportamiento histórico de la sucursal a través del tiempo — pedido
 * explícito del cliente (revisión de audios WhatsApp 2026-06-03: "me gusta el gráfico de barras
 * porque es bastante evidente"). Complementa (no reemplaza) la tabla de detalle.
 */
export function GraficoHistoricoCertificaciones({ registros }: { registros: RegistroCertificacion[] }) {
  if (registros.length === 0) return null;

  // Orden cronológico ascendente (más antigua primero) — la tabla de detalle mantiene el orden
  // que ya trae el backend (más reciente primero), este gráfico necesita el orden inverso para
  // que la evolución se lea de izquierda a derecha.
  const ordenados = [...registros].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  const categorias = ordenados.map((r) => new Date(r.fecha).toLocaleDateString("es-CR", { year: "numeric", month: "short" }));
  const porcentajes = ordenados.map((r) => (r.puntajeMaximo > 0 ? Math.round((r.puntajeObtenido / r.puntajeMaximo) * 10000) / 100 : 0));

  const options: ApexOptions = {
    colors: ["#15803d"],
    chart: { type: "bar", toolbar: { show: false }, zoom: { enabled: false } },
    plotOptions: {
      bar: { borderRadius: 4, columnWidth: "45%", borderRadiusApplication: "end" },
    },
    dataLabels: {
      enabled: true,
      formatter: (valor: number) => `${valor}%`,
      style: { fontSize: "11px", fontWeight: 600 },
    },
    grid: {
      strokeDashArray: 5,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    xaxis: {
      categories: categorias,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { max: 100, labels: { formatter: (valor: number) => `${valor}%` } },
    tooltip: {
      y: { formatter: (valor: number) => `${valor}% de cumplimiento` },
    },
  };

  return (
    <div className="mb-5 rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
      <p className="mb-3 text-body-xs font-semibold uppercase tracking-wide text-dark-4 dark:text-dark-6">
        Evolución del cumplimiento
      </p>
      <Chart options={options} series={[{ name: "Cumplimiento", data: porcentajes }]} type="bar" height={280} />
    </div>
  );
}
