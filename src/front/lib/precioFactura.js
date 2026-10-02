/**
 * Pricing for medicamentos.
 *
 * INSUAMINCA ("Pedido de cliente"): the stored `PRECIO_USD` already has all
 * three discount tiers folded in (it's what the pharmacy actually pays). Of
 * those, `Seg` (DC) is the pharmacy's own margin — not a supplier discount —
 * and is never reversed. Only `ESC PRD` (DD) and `ESC PRV` (DL) are real
 * distributor discounts, so the list ("sin descuento") price is recovered by
 * dividing the net price by (1 - DD%) × (1 - DL%). Confirmed with the
 * business owner 2026-09-19.
 *
 * Other suppliers (Nena, etc.) don't have a confirmed rule yet — the price
 * is shown as-is, with no discount reversed, until that's worked out
 * separately. Don't extend the INSUAMINCA formula to them by assumption.
 *
 * Every figure here is in US$. Lines that only carry a Bs price (the
 * "Número de Documento" layout) are converted with the invoice's own
 * exchange rate; without a rate the line has no USD price (null) and is
 * left out of the totals rather than mixing Bs into USD sums.
 */

export const MARGEN_VENTA_DEFAULT = 30;

export function aplicarDescuentosEscalonados(precio, porcentajes) {
  return porcentajes.reduce(
    (saldo, porcentaje) => saldo * (1 - (Number(porcentaje) || 0) / 100),
    Number(precio) || 0
  );
}

function esInsuaminca(drogueria) {
  return (drogueria || "").toUpperCase().includes("INSUAMINCA");
}

function precioUsdUnitario(medicamento, tipoDeCambio) {
  if (medicamento.PRECIO_USD != null) return Number(medicamento.PRECIO_USD) || 0;
  const tasa = Number(tipoDeCambio);
  if (medicamento.PRECIO_BS != null && tasa > 0) return Number(medicamento.PRECIO_BS) / tasa;
  return null;
}

const PRECIOS_VACIOS = {
  precioUnitario: null,
  precioSinDescuentoUnitario: null,
  precioVentaConDescuentoUnitario: null,
  precioVentaSinDescuentoUnitario: null,
  precioTotal: null,
  precioSinDescuentoTotal: null,
  precioVentaConDescuentoTotal: null,
  precioVentaSinDescuentoTotal: null,
};

/**
 * Computes the net price, the reconstructed list price, and the two
 * possible sale prices (selling off the net price vs. off the list price)
 * for one line item, both per unit and totaled for the line (multiplied by
 * `cantidad`).
 */
export function calcularPreciosLinea(medicamento, factura, margenPorcentaje = MARGEN_VENTA_DEFAULT) {
  const descuentos = [medicamento.DC, medicamento.DD, medicamento.DL].map((d) => Number(d) || 0);
  const precioUnitario = precioUsdUnitario(medicamento, factura?.tipo_de_cambio);
  if (precioUnitario === null) return { ...PRECIOS_VACIOS, descuentos };

  const cantidad = medicamento.cantidad == null ? 1 : Number(medicamento.cantidad) || 0;
  const margen = Number(margenPorcentaje) || 0;

  let precioSinDescuentoUnitario = precioUnitario;
  if (esInsuaminca(factura?.drogueria)) {
    const factorReversion = aplicarDescuentosEscalonados(1, [medicamento.DD, medicamento.DL]);
    precioSinDescuentoUnitario = factorReversion > 0 ? precioUnitario / factorReversion : precioUnitario;
  }

  const precioVentaConDescuentoUnitario = precioUnitario * (1 + margen / 100);
  const precioVentaSinDescuentoUnitario = precioSinDescuentoUnitario * (1 + margen / 100);

  return {
    precioUnitario,
    descuentos,
    precioSinDescuentoUnitario,
    precioVentaConDescuentoUnitario,
    precioVentaSinDescuentoUnitario,
    precioTotal: precioUnitario * cantidad,
    precioSinDescuentoTotal: precioSinDescuentoUnitario * cantidad,
    precioVentaConDescuentoTotal: precioVentaConDescuentoUnitario * cantidad,
    precioVentaSinDescuentoTotal: precioVentaSinDescuentoUnitario * cantidad,
  };
}

/**
 * Sums the per-line totals into invoice-level totals. Lines without a USD
 * price are skipped and counted in `lineasSinPrecio` so the UI can flag
 * that the total is incomplete.
 */
export function calcularTotalesFactura(medicamentos, factura, margenPorcentaje = MARGEN_VENTA_DEFAULT) {
  return medicamentos.reduce(
    (totales, medicamento) => {
      const precios = calcularPreciosLinea(medicamento, factura, margenPorcentaje);
      if (precios.precioUnitario === null) {
        return { ...totales, lineasSinPrecio: totales.lineasSinPrecio + 1 };
      }
      return {
        ...totales,
        precio: totales.precio + precios.precioTotal,
        precioSinDescuento: totales.precioSinDescuento + precios.precioSinDescuentoTotal,
        precioVentaConDescuento:
          totales.precioVentaConDescuento + precios.precioVentaConDescuentoTotal,
        precioVentaSinDescuento:
          totales.precioVentaSinDescuento + precios.precioVentaSinDescuentoTotal,
      };
    },
    {
      precio: 0,
      precioSinDescuento: 0,
      precioVentaConDescuento: 0,
      precioVentaSinDescuento: 0,
      lineasSinPrecio: 0,
    }
  );
}
