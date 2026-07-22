-- AlterTable: inspeccion.periodo_etiqueta (período que cubre el formulario)
ALTER TABLE "inspeccion" ADD COLUMN "periodo_etiqueta" VARCHAR(50);

-- AlterTable: inspeccion.establecimiento pasa a ser opcional (@deprecated, reemplazado por sucursal_id)
ALTER TABLE "inspeccion" ALTER COLUMN "establecimiento" DROP NOT NULL;
