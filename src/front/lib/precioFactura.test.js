import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularPreciosLinea, calcularTotalesFactura } from "./precioFactura.js";

const cerca = (actual, esperado) =>
  assert.ok(Math.abs(actual - esperado) < 1e-6, `${actual} ≠ ${esperado}`);

const otra = { drogueria: "GUILLER", formato: "guillermar", tipo_de_cambio: "40.0" };
const sinTasa = { drogueria: "INSUAMINCA, C.A.", formato: "insuaminca", tipo_de_cambio: null };

test("uses PRECIO_USD when present", () => {
  const p = calcularPreciosLinea({ PRECIO_USD: 10, PRECIO_BS: 400, cantidad: 2 }, otra, 0);
  assert.equal(p.costoUnitario, 10);
  assert.equal(p.costoTotal, 20);
});

test("converts Bs to USD with the invoice exchange rate instead of mixing currencies", () => {
  const p = calcularPreciosLinea({ PRECIO_USD: null, PRECIO_BS: 400, cantidad: 1 }, otra, 0);
  assert.equal(p.costoUnitario, 10);
});

test("Bs-only line without exchange rate has no USD price", () => {
  const p = calcularPreciosLinea({ PRECIO_USD: null, PRECIO_BS: 400, cantidad: 1 }, sinTasa, 30);
  assert.equal(p.costoUnitario, null);
  assert.equal(p.ventaConDescuentoTotal, null);
});

test("totals skip lines without USD price and count them", () => {
  const t = calcularTotalesFactura(
    [
      { PRECIO_USD: 10, cantidad: 1 },
      { PRECIO_USD: null, PRECIO_BS: 400, cantidad: 1 },
    ],
    sinTasa,
    0
  );
  assert.equal(t.costo, 10);
  assert.equal(t.lineasSinPrecio, 1);
});

test("zero quantity is not treated as one", () => {
  const p = calcularPreciosLinea({ PRECIO_USD: 10, cantidad: 0 }, otra, 0);
  assert.equal(p.costoTotal, 0);
});

// --- Casos tomados de las hojas de cálculo de la farmacia -------------------

test("Nena, gravado: reproduce PEDIDOS_DROGUERIA_NENA_2025 fila 4 (AMY HISOPOS)", () => {
  // H=335,17 Bs, IVA 16 %, L=25 %, M=244,6504 → E=2,06595 y F=1,54947 en la hoja.
  const factura = { formato: "nena", tipo_de_cambio: "244.6504" };
  const p = calcularPreciosLinea(
    { PRECIO_BS: 335.17, ALIC: "16.00", DD: 25, cantidad: 4 },
    factura,
    30
  );
  cerca(p.ventaSinDescuentoUnitario, 2.06595354023537);
  cerca(p.ventaConDescuentoUnitario, 1.54946515517653);
  cerca(p.costoListaUnitario, 335.17 / 244.6504);
  cerca(p.costoUnitario, (335.17 * 0.75) / 244.6504);
});

test("Nena, exento (E): no suma IVA", () => {
  // Fila 5 (ARUDIL): H=2480,94 Bs, (E), sin descuento, M=243,11 → E=F=13,26651.
  const factura = { formato: "nena", tipo_de_cambio: "243.11" };
  const p = calcularPreciosLinea({ PRECIO_BS: 2480.94, ALIC: "0.00", cantidad: 1 }, factura, 30);
  cerca(p.ventaSinDescuentoUnitario, 13.2665131010654);
  cerca(p.ventaConDescuentoUnitario, 13.2665131010654);
});

test("Nena: descuentos con decimales (hoja Vitalclinic fila 2, 4,96 %)", () => {
  // H=2342,26, (E), L=4,96 %, M=171,8458 → E=17,71901 y F=16,84015.
  const factura = { formato: "nena", tipo_de_cambio: "171.8458" };
  const p = calcularPreciosLinea({ PRECIO_BS: 2342.26, ALIC: "0.00", DC: 4.96 }, factura, 30);
  cerca(p.ventaSinDescuentoUnitario, 17.7190132083531);
  cerca(p.ventaConDescuentoUnitario, 16.8401501532188);
});

test("INSUAMINCA: reproduce DROG_INSUAMINCA fila 3 (ASAPROL)", () => {
  // E=1831,41 Bs, G=7 %, H=5 %, I=0 %, L=832,49 → O=3,23700 y P=3,07515.
  const p = calcularPreciosLinea(
    { PRECIO_USD: 1831.41 / 832.49, DC: 7, DD: 5, DL: 0, cantidad: 1 },
    sinTasa,
    30
  );
  cerca(p.ventaSinDescuentoUnitario, 3.23700488119784);
  cerca(p.ventaConDescuentoUnitario, 3.07515463713794);
  cerca(p.costoListaUnitario, 2072.90322580645 / 832.49);
});

test("INSUAMINCA: Seg (7 %) queda para la farmacia, no se traslada al cliente", () => {
  const p = calcularPreciosLinea({ PRECIO_USD: 93, DC: 7, cantidad: 1 }, sinTasa, 0);
  cerca(p.costoListaUnitario, 100);
  cerca(p.ventaSinDescuentoUnitario, 100);
  cerca(p.ventaConDescuentoUnitario, 100);
});

test("formato sin regla confirmada: precio tal cual, con IVA y margen", () => {
  const p = calcularPreciosLinea({ PRECIO_USD: 10, ALIC: "16", DC: 20, cantidad: 1 }, otra, 30);
  cerca(p.costoUnitario, 10);
  cerca(p.costoListaUnitario, 10);
  cerca(p.ventaSinDescuentoUnitario, 10 * 1.3 * 1.16);
  cerca(p.ventaConDescuentoUnitario, 10 * 1.3 * 1.16);
});
