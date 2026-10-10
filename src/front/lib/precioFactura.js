/**
 * Precios de venta por línea de factura.
 *
 * Las fórmulas replican las hojas de cálculo con las que la farmacia ponía
 * precios antes de esta app (PEDIDOS_DROGUERIA_NENA_2025.ods,
 * precios_Vitalclinic_2025.xlsx y DROG_INSUAMINCA.ods). En todas:
 *
 *   venta sin descuento = precio de lista × (1 + margen) × (1 + IVA)
 *   venta con descuento = venta sin descuento × (1 − descuentos trasladables)
 *
 * El margen es un recargo sobre el costo (la hoja multiplica por 1,3 para un
 * 30 %), no un margen sobre el precio de venta.
 *
 * Lo que cambia por droguería es qué precio trae la factura y qué descuentos
 * se le trasladan al cliente:
 *
 * - Nena (formato "Número de Documento"): PRECIO_BS es el precio de lista,
 *   antes de descuentos (el neto de la factura es PRECIO_BS × (1 − desc.)).
 *   Todos los descuentos (DC/DD/DL/DV) se trasladan. Columna "costo" de la
 *   hoja = PRECIO_BS; "Descuento" = el descuento de la línea.
 *
 * - INSUAMINCA, en sus dos documentos: el pedido ("Pedido de cliente", en
 *   US$) y la factura ("FACTURA B…", en Bs y US$ con la Tasa BCV). El precio
 *   ya trae todos los descuentos aplicados. El precio de lista se reconstruye
 *   revirtiendo Seg (DC / D/1, el 7 % fijo de la farmacia), ESC PRD (DD),
 *   ESC PRV (DL) y DESC PRV (DV). Al cliente solo se le trasladan los del
 *   distribuidor (DD/DL/DV): Seg queda como ganancia de la farmacia. En la
 *   hoja: M = E / ((1−G)(1−H)(1−I)), N = M × 1,3 y P = N × (1−H)(1−I).
 *   La hoja toma E en Bs de la factura y la divide por la Tasa BCV de esa
 *   factura (columna DOLAR), así que en la factura el costo sale de
 *   PRECIO_BS ÷ tasa. En el pedido, que solo trae US$ redondeados a 2
 *   decimales (0,95 para un importe de 19,08 / 20 = 0,954), sale de
 *   Neto_USD (importe ÷ cantidad).
 *
 * - Formatos que el lector no reconoce: sin regla. El precio se toma tal
 *   cual, sin revertir ni trasladar descuentos.
 *
 * El IVA sale de ALIC (16 % o 0 % para exentos "(E)"). Todo se expresa en
 * US$: si la línea solo trae precio en Bs se convierte con la tasa de la
 * propia factura; sin tasa la línea queda sin precio (null) y fuera de los
 * totales, en vez de mezclar Bs con US$.
 */

export const MARGEN_VENTA_DEFAULT = 30;

const DESCUENTOS = ["DC", "DD", "DL", "DV"];

// `fuentes`: de dónde sale el precio unitario en US$, en orden de preferencia
// ("bs" = PRECIO_BS ÷ tasa de la factura, "neto" = Neto_USD, "usd" = PRECIO_USD).
const REGLAS_POR_FORMATO = {
  nena: { precioEsLista: true, fuentes: ["bs", "usd"], propios: [], trasladables: DESCUENTOS },
  insuaminca: { precioEsLista: false, fuentes: ["neto", "usd", "bs"], propios: ["DC"], trasladables: ["DD", "DL", "DV"] },
  insuaminca_factura: {
    precioEsLista: false,
    fuentes: ["bs", "neto", "usd"],
    propios: ["DC"],
    trasladables: ["DD", "DL", "DV"],
  },
};

const REGLA_SIN_CONFIRMAR = { precioEsLista: false, fuentes: ["usd", "bs"], propios: [], trasladables: [] };

export function obtenerReglaPrecios(factura) {
  return REGLAS_POR_FORMATO[factura?.formato] ?? REGLA_SIN_CONFIRMAR;
}

export function aplicarDescuentosEscalonados(precio, porcentajes) {
  return porcentajes.reduce(
    (saldo, porcentaje) => saldo * (1 - (Number(porcentaje) || 0) / 100),
    Number(precio) || 0
  );
}

function precioUsdUnitario(medicamento, factura, regla) {
  const tasa = Number(factura?.tipo_de_cambio);
  const valores = {
    bs: medicamento.PRECIO_BS != null && tasa > 0 ? Number(medicamento.PRECIO_BS) / tasa : null,
    neto: medicamento.Neto_USD != null ? Number(medicamento.Neto_USD) || 0 : null,
    usd: medicamento.PRECIO_USD != null ? Number(medicamento.PRECIO_USD) || 0 : null,
  };
  const fuente = regla.fuentes.find((f) => valores[f] !== null);
  return fuente ? valores[fuente] : null;
}

export function alicuotaIva(medicamento) {
  const alicuota = Number(String(medicamento.ALIC ?? "").replace(",", "."));
  return alicuota > 0 ? alicuota / 100 : 0;
}

const PRECIOS_VACIOS = {
  costoUnitario: null,
  costoListaUnitario: null,
  ventaConDescuentoUnitario: null,
  ventaSinDescuentoUnitario: null,
  costoTotal: null,
  costoListaTotal: null,
  ventaConDescuentoTotal: null,
  ventaSinDescuentoTotal: null,
};

/**
 * Costo neto (lo que paga la farmacia), precio de lista, y los dos precios
 * de venta posibles, por unidad y por línea (× cantidad). Todo en US$.
 */
export function calcularPreciosLinea(medicamento, factura, margenPorcentaje = MARGEN_VENTA_DEFAULT) {
  const regla = obtenerReglaPrecios(factura);
  const descuentos = Object.fromEntries(DESCUENTOS.map((d) => [d, Number(medicamento[d]) || 0]));
  const iva = alicuotaIva(medicamento);
  const precio = precioUsdUnitario(medicamento, factura, regla);
  if (precio === null) return { ...PRECIOS_VACIOS, descuentos, iva };

  const factorTrasladable = aplicarDescuentosEscalonados(1, regla.trasladables.map((d) => descuentos[d]));
  const factorPropio = aplicarDescuentosEscalonados(1, regla.propios.map((d) => descuentos[d]));
  const factorTotal = factorTrasladable * factorPropio;

  let costoUnitario = precio;
  let costoListaUnitario = precio;
  if (regla.precioEsLista) {
    costoUnitario = precio * factorTotal;
  } else if (factorTotal > 0) {
    costoListaUnitario = precio / factorTotal;
  }

  const margen = Number(margenPorcentaje) || 0;
  const ventaSinDescuentoUnitario = costoListaUnitario * (1 + margen / 100) * (1 + iva);
  const ventaConDescuentoUnitario = ventaSinDescuentoUnitario * factorTrasladable;

  const cantidad = medicamento.cantidad == null ? 1 : Number(medicamento.cantidad) || 0;

  return {
    descuentos,
    iva,
    costoUnitario,
    costoListaUnitario,
    ventaConDescuentoUnitario,
    ventaSinDescuentoUnitario,
    costoTotal: costoUnitario * cantidad,
    costoListaTotal: costoListaUnitario * cantidad,
    ventaConDescuentoTotal: ventaConDescuentoUnitario * cantidad,
    ventaSinDescuentoTotal: ventaSinDescuentoUnitario * cantidad,
  };
}

/**
 * Suma los totales de cada línea. Las líneas sin precio en US$ se omiten y
 * se cuentan en `lineasSinPrecio` para que la UI avise que el total está
 * incompleto.
 */
export function calcularTotalesFactura(medicamentos, factura, margenPorcentaje = MARGEN_VENTA_DEFAULT) {
  return medicamentos.reduce(
    (totales, medicamento) => {
      const precios = calcularPreciosLinea(medicamento, factura, margenPorcentaje);
      if (precios.costoUnitario === null) {
        return { ...totales, lineasSinPrecio: totales.lineasSinPrecio + 1 };
      }
      return {
        ...totales,
        costo: totales.costo + precios.costoTotal,
        costoLista: totales.costoLista + precios.costoListaTotal,
        ventaConDescuento: totales.ventaConDescuento + precios.ventaConDescuentoTotal,
        ventaSinDescuento: totales.ventaSinDescuento + precios.ventaSinDescuentoTotal,
      };
    },
    { costo: 0, costoLista: 0, ventaConDescuento: 0, ventaSinDescuento: 0, lineasSinPrecio: 0 }
  );
}
