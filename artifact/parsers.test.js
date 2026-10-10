import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectarFormato,
  fechaIso,
  itemsFacturaInsuaminca,
  itemsInsuaminca,
  itemsNena,
  numeroFlexible,
  parsearEncabezado,
  parsearFactura,
  porcentaje,
} from "./parsers.js";

// Mismos casos que tests/test_utils.py y tests/test_reglas_negocio.py, para
// que el extractor del artifact y el del backend lean igual.

const palabra = (text, x0, top) => ({ text, x0, top });

const filaFacturaInsuaminca = (descripcion, lote, top) => [
  palabra(descripcion, 10, top),
  ...[lote, "12-2027", "2", "0", "0", "0", "0", "100,00", "1,00", "200,00", "2,00", "0"].map((c, i) =>
    palabra(c, 100 + i * 20, top)
  ),
];

const filaInsuaminca = (codigo, descripcion, top, escPrd = "0.00") => [
  palabra(codigo, 10, top),
  palabra(descripcion, 80, top),
  palabra("3", 220, top),
  palabra("L1", 260, top),
  palabra("2027-05", 300, top),
  palabra("5.00", 345, top),
  palabra(escPrd, 380, top),
  palabra("0.00", 410, top),
  palabra("0.00", 440, top),
  palabra("4,50", 480, top),
  palabra("13,50", 530, top),
];

const encabezadoInsuaminca = (top) => [palabra("Código", 10, top), palabra("Descripción", 80, top)];

test("Nena: cantidad de dos dígitos y columnas numéricas", () => {
  const [m] = itemsNena(
    "12 ABC123 ACETAMINOFEN 500MG 3 L01 X 12-2026 16.00 1,234.56 5 0 0 0 1,100.00 25.50 13,200.00 306.00"
  );
  assert.equal(m.cantidad, 12);
  assert.equal(m.codigo, "ABC123");
  assert.equal(m.descripcion, "ACETAMINOFEN 500MG");
  assert.equal(m.bulto, 3);
  assert.equal(m.exp, "12-2026");
  assert.equal(m.ALIC, "16.00");
  assert.equal(m.PRECIO_BS, 1234.56);
  assert.equal(m.DC, 5);
  assert.equal(m.Neto_Bs, 1100);
  assert.equal(m.TOT_NETO_USD, 306);
});

test("números con separador ambiguo y porcentajes con decimales", () => {
  assert.equal(numeroFlexible("1,234.56"), 1234.56);
  assert.equal(numeroFlexible("1.234,56"), 1234.56);
  assert.equal(numeroFlexible("12345"), null);
  assert.equal(porcentaje("4,96"), 4.96);
  assert.equal(porcentaje("2.50%"), 2.5);
  assert.equal(porcentaje("5"), 5);
  assert.equal(porcentaje(null), null);
});

test("encabezado Nena: tasa en cualquier formato", () => {
  for (const [impresa, esperada] of [["36.50", 36.5], ["146,50", 146.5], ["1.234,56", 1234.56], ["146", 146]]) {
    const e = parsearEncabezado(`Número de Documento: 1\nTipo de Cambio (USA $) Bs. ${impresa}\n`);
    assert.equal(e.tipoCambio, esperada);
  }
});

test("detecta el formato y normaliza la fecha", () => {
  assert.equal(detectarFormato("Número de Documento: 1"), "nena");
  assert.equal(detectarFormato("INSUAMINCA, C.A. RIF: J-1\nPedido de cliente"), "insuaminca");
  assert.equal(detectarFormato("FACTURA B0485399\nDescripción Lote Vence Cant. D/1 D/2 D/3 D/4 Prec U"), "insuaminca_factura");
  assert.equal(detectarFormato("Un PDF de otra droguería"), null);
  assert.equal(fechaIso("18/09/2026"), "2026-09-18");
  assert.equal(fechaIso("01-02-2025"), "2025-02-01");
});

test("factura INSUAMINCA lee todas las páginas y el neto es unitario", () => {
  const items = itemsFacturaInsuaminca([[...filaFacturaInsuaminca("ATAMEL", "L1", 100)], [...filaFacturaInsuaminca("LORATADINA", "L2", 100)]]);
  assert.deepEqual(items.map((m) => m.descripcion), ["ATAMEL", "LORATADINA"]);
  assert.equal(items[0].Neto_Bs, 100);
  assert.equal(items[0].TOT_NETO_Bs, 200);
});

test("INSUAMINCA lee todas las páginas, con o sin encabezado repetido", () => {
  const items = itemsInsuaminca([
    [...encabezadoInsuaminca(50), ...filaInsuaminca("C1", "ATAMEL", 100)],
    [...filaInsuaminca("C2", "LORATADINA", 100)],
  ]);
  assert.deepEqual(items.map((m) => m.codigo), ["C1", "C2"]);
});

test("INSUAMINCA: descuentos con decimales y neto unitario", () => {
  const [m] = itemsInsuaminca([[...encabezadoInsuaminca(50), ...filaInsuaminca("C1", "ATAMEL", 100, "2.50")]]);
  assert.equal(m.DC, 5);
  assert.equal(m.DD, 2.5);
  assert.equal(m.Neto_USD, 4.5);
  assert.equal(m.TOT_NETO_USD, 13.5);
});

test("INSUAMINCA: la descripción partida en varias líneas se une a su ítem", () => {
  const [m] = itemsInsuaminca([
    [
      ...encabezadoInsuaminca(50),
      ...filaInsuaminca("889820", "AMOXICILINA 500MG X 10 CAP", 100),
      palabra("CAPSUVEN", 80, 108),
    ],
  ]);
  assert.equal(m.descripcion, "AMOXICILINA 500MG X 10 CAP CAPSUVEN");
});

test("parsearFactura arma encabezado e ítems desde las páginas", () => {
  const f = parsearFactura([
    {
      lineas: ["INSUAMINCA, C.A.", "RIF: J-41241374-0", "Pedido de cliente Número: 01648617", "Fecha: 18/09/2026"],
      palabras: [...encabezadoInsuaminca(50), ...filaInsuaminca("C1", "ATAMEL", 100)],
    },
  ]);
  assert.equal(f.formato, "insuaminca");
  assert.equal(f.numero, "01648617");
  assert.equal(f.drogueria, "INSUAMINCA, C.A.");
  assert.equal(f.fechaIso, "2026-09-18");
  assert.equal(f.items.length, 1);
});

test("encabezado de la factura INSUAMINCA: tasa BCV, pedido y droguería unificada", () => {
  const e = parsearEncabezado(
    "FACTURA B0485399\nFecha de Emisión: 10/09/2026\nVendedor: X PEDIDO: 01625333(10/09/2026)\n" +
      "Descripción Lote Vence Cant. D/1 D/2 D/3 D/4 Prec U Prec $ Imp Bs Imp $ IVA%\n" +
      "INSUAMINCA Unidades: 31 Tasa BCV\nSICM 50863 Bultos: 1 827,74"
  );
  assert.deepEqual(e, {
    formato: "insuaminca_factura",
    numero: "B0485399",
    fecha: "10/09/2026",
    tipoCambio: 827.74,
    drogueria: "INSUAMINCA, C.A.",
    pedido: "01625333",
  });
});

test("formato desconocido: sin ítems", () => {
  const f = parsearFactura([{ lineas: ["Otra droguería"], palabras: [palabra("x", 1, 1)] }]);
  assert.equal(f.formato, null);
  assert.deepEqual(f.items, []);
});
