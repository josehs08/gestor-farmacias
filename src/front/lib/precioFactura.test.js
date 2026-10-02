import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcularPreciosLinea,
  calcularTotalesFactura,
} from "./precioFactura.js";

const nena = { drogueria: "Nena", tipo_de_cambio: "40.0" };
const insuaminca = { drogueria: "INSUAMINCA, C.A.", tipo_de_cambio: null };

test("uses PRECIO_USD when present", () => {
  const p = calcularPreciosLinea({ PRECIO_USD: 10, PRECIO_BS: 400, cantidad: 2 }, nena, 0);
  assert.equal(p.precioUnitario, 10);
  assert.equal(p.precioTotal, 20);
});

test("converts Bs to USD with the invoice exchange rate instead of mixing currencies", () => {
  const p = calcularPreciosLinea({ PRECIO_USD: null, PRECIO_BS: 400, cantidad: 1 }, nena, 0);
  assert.equal(p.precioUnitario, 10);
});

test("Bs-only line without exchange rate has no USD price", () => {
  const p = calcularPreciosLinea({ PRECIO_USD: null, PRECIO_BS: 400, cantidad: 1 }, insuaminca, 30);
  assert.equal(p.precioUnitario, null);
  assert.equal(p.precioVentaConDescuentoTotal, null);
});

test("totals skip lines without USD price and count them", () => {
  const t = calcularTotalesFactura(
    [
      { PRECIO_USD: 10, cantidad: 1 },
      { PRECIO_USD: null, PRECIO_BS: 400, cantidad: 1 },
    ],
    insuaminca,
    0
  );
  assert.equal(t.precio, 10);
  assert.equal(t.lineasSinPrecio, 1);
});

test("zero quantity is not treated as one", () => {
  const p = calcularPreciosLinea({ PRECIO_USD: 10, cantidad: 0 }, nena, 0);
  assert.equal(p.precioTotal, 0);
});

test("INSUAMINCA reverses only DD and DL", () => {
  const p = calcularPreciosLinea(
    { PRECIO_USD: 72, DC: 50, DD: 10, DL: 20, cantidad: 1 },
    insuaminca,
    0
  );
  assert.ok(Math.abs(p.precioSinDescuentoUnitario - 100) < 1e-9);
});
