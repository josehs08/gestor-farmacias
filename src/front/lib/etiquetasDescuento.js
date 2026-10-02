// Las columnas DC/DD/DL/DV son descuentos genéricos en la tabla Medicina,
// pero cada proveedor las llena con conceptos distintos (ver
// _extraer_medicamentos_* en src/back/utils.py). Se etiquetan según la
// droguería de la factura para que el nombre mostrado coincida con el de su
// PDF original, sin tocar el esquema ni el backend.
const ETIQUETAS_DESCUENTO_POR_DROGUERIA = [
  {
    coincide: (drogueria) => (drogueria || "").toUpperCase().includes("INSUAMINCA"),
    etiquetas: { DC: "Seg", DD: "ESC PRD", DL: "ESC PRV", DV: "DESC PRV" },
  },
];

const ETIQUETAS_DESCUENTO_DEFAULT = { DC: "DC", DD: "DD", DL: "DL", DV: "DV" };

export function obtenerEtiquetasDescuento(drogueria) {
  const regla = ETIQUETAS_DESCUENTO_POR_DROGUERIA.find((r) => r.coincide(drogueria));
  return regla ? regla.etiquetas : ETIQUETAS_DESCUENTO_DEFAULT;
}
