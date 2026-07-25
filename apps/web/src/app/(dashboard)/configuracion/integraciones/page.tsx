"use client";

import { useState } from "react";
import { DialogoConfirmacion } from "@doonflow/ui";
import { useApiKeys } from "./_hooks/use-api-keys";
import { TablaApiKeys } from "./_components/tabla-api-keys";
import { ModalNuevaApiKey } from "./_components/modal-nueva-api-key";

export default function PaginaIntegraciones() {
  const { apiKeys, cargando, error, crear, revocar } = useApiKeys();
  const [mostrarModal, setMostrarModal] = useState(false);
  const [pendienteRevocar, setPendienteRevocar] = useState<{ id: string; nombre: string } | null>(null);

  return (
    <div className="p-6 md:p-7.5">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-heading-6 font-bold text-dark dark:text-white">Integraciones</h1>
          <p className="text-body-sm text-dark-4 dark:text-dark-6">
            Claves de API para consultar el estado de una certificación desde un sistema externo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMostrarModal(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
        >
          + Generar nueva clave
        </button>
      </div>

      {error && <p className="mb-4 text-body-sm text-red">{error}</p>}

      <TablaApiKeys apiKeys={apiKeys} cargando={cargando} onSolicitarRevocar={(id, nombre) => setPendienteRevocar({ id, nombre })} />

      {mostrarModal && (
        <ModalNuevaApiKey
          onGenerar={crear}
          onCerrar={() => setMostrarModal(false)}
        />
      )}

      <DialogoConfirmacion
        abierto={pendienteRevocar !== null}
        titulo="¿Revocar esta clave?"
        mensaje={`"${pendienteRevocar?.nombre}" dejará de funcionar de inmediato. Esta acción no se puede deshacer — habría que generar una clave nueva.`}
        labelConfirmar="Revocar"
        labelCancelar="Cancelar"
        onConfirmar={() => { if (pendienteRevocar) revocar(pendienteRevocar.id); setPendienteRevocar(null); }}
        onCancelar={() => setPendienteRevocar(null)}
      />
    </div>
  );
}
