// Lectura de facturas en el navegador: puerto de src/back/utils.py para el
// artifact. Las funciones de extracción son puras (reciben texto o palabras
// con su posición), así se prueban en Node sin pdf.js; solo leerPdf() lo usa.

export const FORMATO_NENA = "nena";
export const FORMATO_INSUAMINCA = "insuaminca";
export const FORMATO_GUILLERMAR = "guillermar";

// --- Números -----------------------------------------------------------------

/** "10.222,92" → 10222.92 */
export function numeroLatino(valor) {
  if (valor == null) return null;
  const n = Number(valor.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function entero(valor) {
  if (valor == null || !/^-?\d+$/.test(valor.trim())) return null;
  return Number.parseInt(valor, 10);
}

/** Separador decimal ambiguo: el último "." o "," es el decimal. */
export function numeroFlexible(valor) {
  if (valor == null) return null;
  const m = /^(.*)[.,](\d+)$/.exec(valor);
  if (!m) return null;
  const n = Number(`${m[1].replace(/\D/g, "") || "0"}.${m[2]}`);
  return Number.isFinite(n) ? n : null;
}

/** "5", "5.00", "4,96", "2.50%" → número, sin redondear. */
export function porcentaje(valor) {
  if (valor == null) return null;
  const limpio = valor.trim().replace(/%$/, "");
  if (/^\d+$/.test(limpio)) return Number(limpio);
  return numeroFlexible(limpio);
}

function dividir(total, cantidad) {
  return total == null || !cantidad ? null : total / cantidad;
}

/** Tasa impresa ("36.50", "146,50", "1.234,56", "146") → número. */
export function tasa(valor) {
  if (valor == null) return null;
  const limpio = valor.replace(/[.,]+$/, "");
  return /[.,]/.test(limpio) ? numeroFlexible(limpio) : entero(limpio);
}

const textoONull = (palabras) => palabras.join(" ").trim() || null;

// --- Formato y encabezado --------------------------------------------------------

export function detectarFormato(texto) {
  if (!texto) return null;
  if (texto.includes("Número de Documento")) return FORMATO_NENA;
  if (texto.includes("Pedido de cliente")) return FORMATO_INSUAMINCA;
  return FORMATO_GUILLERMAR;
}

const grupo = (re, texto) => re.exec(texto)?.[1] ?? null;

/** Número, fecha, tasa y droguería según el formato (ver utils.py). */
export function parsearEncabezado(texto) {
  const formato = detectarFormato(texto);
  if (formato === FORMATO_NENA) {
    return {
      formato,
      numero: grupo(/Número de Documento: (\d+)/, texto),
      fecha: grupo(/Fecha de Emisión: (\d{2}-\d{2}-\d{4})/, texto),
      tipoCambio: tasa(grupo(/Tipo de Cambio \(USA \$\) Bs\. ([\d.,]+)/, texto)),
      // La droguería (vendedora) aparece en la dirección de la sede.
      drogueria: grupo(/Droguería\s+([^,\n]+)/, texto)?.trim() ?? null,
    };
  }
  if (formato === FORMATO_INSUAMINCA) {
    return {
      formato,
      numero: grupo(/Número:\s*(\d+)/, texto),
      fecha: grupo(/Fecha:\s*(\d{2}\/\d{2}\/\d{4})/, texto),
      tipoCambio: null, // factura en US$
      drogueria: grupo(/^(.+?)\s+RIF:/, texto)?.trim() ?? null,
    };
  }
  return {
    formato,
    numero: grupo(/FACTURA\s+(\S+)/, texto),
    fecha: grupo(/Fecha de Emisión:\s*(\d{2}\/\d{2}\/\d{4})/, texto),
    tipoCambio: tasa(grupo(/Tasa BCV[\s\S]*?(\d{1,3}(?:\.\d{3})*,\d{2})/, texto)),
    drogueria: grupo(/(\S+)\s+Unidades:/, texto)?.trim() ?? null,
  };
}

/** "18/09/2026" o "18-09-2026" → "2026-09-18", para ordenar por fecha. */
export function fechaIso(fecha) {
  const m = /^(\d{2})[-/](\d{2})[-/](\d{4})$/.exec(fecha ?? "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

// --- Ítems -----------------------------------------------------------------------

/** Formato Nena: una línea de texto por ítem, 16 columnas fijas. */
export function itemsNena(texto) {
  const patron =
    /^(\d+)\s(\w+)\s(.*?)\s(\d+)\s(\w+)\s.\s(\d+.\d+)\s(\d+.\d+)\s([\w,]+.\d+)\s(\d+)\s(\d+)\s(\d+)\s(\d+)\s([\w,]+.\d+)\s(\d+.\d+)\s([\w,]+.\d+)\s(\d+.\d+)/gm;
  return [...texto.matchAll(patron)].map((g) => ({
    cantidad: entero(g[1]),
    codigo: g[2],
    descripcion: g[3],
    bulto: entero(g[4]),
    lote: g[5],
    exp: g[6],
    ALIC: g[7],
    PRECIO_BS: numeroFlexible(g[8]),
    PRECIO_USD: null,
    DC: porcentaje(g[9]),
    DD: porcentaje(g[10]),
    DL: porcentaje(g[11]),
    DV: porcentaje(g[12]),
    Neto_Bs: numeroFlexible(g[13]),
    Neto_USD: numeroFlexible(g[14]),
    TOT_NETO_Bs: numeroFlexible(g[15]),
    TOT_NETO_USD: numeroFlexible(g[16]),
  }));
}

/** Agrupa palabras {text, x0, top} en filas visuales por su posición vertical. */
export function agruparPorFilas(palabras, tolerancia = 2) {
  const filas = [];
  for (const palabra of [...palabras].sort((a, b) => a.top - b.top)) {
    const fila = filas.find((f) => Math.abs(f[0].top - palabra.top) <= tolerancia);
    if (fila) fila.push(palabra);
    else filas.push([palabra]);
  }
  return filas.map((fila) => fila.sort((a, b) => a.x0 - b.x0));
}

/** Formato GUILLER MAR: las últimas 12 columnas de cada fila son datos. */
export function itemsGuillermar(paginas) {
  const items = [];
  for (const palabras of paginas) {
    for (const fila of agruparPorFilas(palabras)) {
      if (fila.length < 13) continue;
      const columnas = fila.slice(-12).map((w) => w.text);
      const [lote, vence, cant, d1, d2, d3, d4, precu, precusd, impbs, impusd, iva] = columnas;
      if (!/^\d{2}-\d{4}$/.test(vence)) continue;
      const cantidad = entero(cant);
      const impBs = numeroLatino(impbs);
      const impUsd = numeroLatino(impusd);
      items.push({
        cantidad,
        codigo: null,
        descripcion: fila.slice(0, -12).map((w) => w.text).join(" "),
        bulto: null,
        lote,
        exp: vence,
        ALIC: iva,
        PRECIO_BS: numeroLatino(precu),
        PRECIO_USD: numeroLatino(precusd),
        DC: porcentaje(d1),
        DD: porcentaje(d2),
        DL: porcentaje(d3),
        DV: porcentaje(d4),
        Neto_Bs: dividir(impBs, cantidad),
        Neto_USD: dividir(impUsd, cantidad),
        TOT_NETO_Bs: impBs,
        TOT_NETO_USD: impUsd,
      });
    }
  }
  return items;
}

const BANDAS_INSUAMINCA = [
  ["codigo", 0, 75],
  ["descripcion", 75, 215],
  ["cantidad", 215, 250],
  ["lote", 250, 295],
  ["vence", 295, 340],
  ["seg", 340, 377],
  ["escprd", 377, 404],
  ["escprv", 404, 430],
  ["descprv", 430, 470],
  ["precio", 470, 520],
  ["importe", 520, Infinity],
];

function clasificarInsuaminca(fila) {
  const datos = Object.fromEntries(BANDAS_INSUAMINCA.map(([nombre]) => [nombre, []]));
  for (const palabra of fila) {
    const banda = BANDAS_INSUAMINCA.find(([, inicio, fin]) => palabra.x0 >= inicio && palabra.x0 < fin);
    if (banda) datos[banda[0]].push(palabra.text);
  }
  return datos;
}

function itemsPaginaInsuaminca(filas) {
  const clasificadas = filas.map((fila) => ({ top: fila[0].top, datos: clasificarInsuaminca(fila) }));
  const items = clasificadas.filter(({ datos }) => /^\d{4}-\d{2}$/.test(textoONull(datos.vence) ?? ""));
  if (!items.length) return [];

  // La descripción de cada ítem suele partirse en líneas propias arriba o
  // abajo de su fila de datos: cada línea suelta va al ítem más cercano.
  const descripciones = new Map(items.map(({ top, datos }) => [top, [textoONull(datos.descripcion) ?? ""]]));
  for (const { top, datos } of clasificadas) {
    if (descripciones.has(top) || !datos.descripcion.length) continue;
    const cercano = items.reduce((a, b) => (Math.abs(b.top - top) < Math.abs(a.top - top) ? b : a));
    descripciones.get(cercano.top).push(textoONull(datos.descripcion) ?? "");
  }

  return items.map(({ top, datos }) => {
    const importe = numeroLatino(textoONull(datos.importe));
    const cantidad = entero(textoONull(datos.cantidad) ?? "");
    return {
      cantidad,
      codigo: textoONull(datos.codigo),
      descripcion: descripciones.get(top).filter(Boolean).join(" "),
      bulto: null,
      lote: textoONull(datos.lote),
      exp: textoONull(datos.vence),
      ALIC: null,
      PRECIO_BS: null,
      PRECIO_USD: numeroLatino(textoONull(datos.precio)),
      DC: porcentaje(textoONull(datos.seg)),
      DD: porcentaje(textoONull(datos.escprd)),
      DL: porcentaje(textoONull(datos.escprv)),
      DV: porcentaje(textoONull(datos.descprv)),
      Neto_Bs: null,
      Neto_USD: dividir(importe, cantidad),
      TOT_NETO_Bs: null,
      TOT_NETO_USD: importe,
    };
  });
}

/** Formato INSUAMINCA ("Pedido de cliente"): columnas por posición X. */
export function itemsInsuaminca(paginas) {
  const items = [];
  for (const [indice, palabras] of paginas.entries()) {
    const filas = agruparPorFilas(palabras);
    const encabezado = filas.find((fila) => fila.some((w) => w.text === "Código" || w.text === "Descripción"));
    if (!encabezado && indice === 0) return [];
    // Lo que está por encima del encabezado de la tabla (razón social,
    // cliente, dirección) caería en la banda de descripción.
    const cuerpo = encabezado ? filas.filter((fila) => fila[0].top > encabezado[0].top) : filas;
    items.push(...itemsPaginaInsuaminca(cuerpo));
  }
  return items;
}

/** Factura completa a partir de las páginas ya leídas. */
export function parsearFactura(paginas) {
  const texto = paginas.map((p) => p.lineas.join("\n")).join("\n");
  const encabezado = parsearEncabezado(paginas[0]?.lineas.join("\n") ?? "");
  const palabras = paginas.map((p) => p.palabras);
  let items;
  if (encabezado.formato === FORMATO_NENA) items = itemsNena(texto);
  else if (encabezado.formato === FORMATO_INSUAMINCA) items = itemsInsuaminca(palabras);
  else items = itemsGuillermar(palabras);
  return { ...encabezado, fechaIso: fechaIso(encabezado.fecha), items };
}

// --- pdf.js ----------------------------------------------------------------------

/**
 * Lee un PDF con pdf.js y devuelve, por página, sus palabras con posición
 * (x0 y top en puntos, como pdfplumber) y sus líneas de texto.
 */
export async function leerPdf(pdfjsLib, datos) {
  const pdf = await pdfjsLib.getDocument({ data: datos, isEvalSupported: false }).promise;
  const paginas = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const pagina = await pdf.getPage(n);
    const alto = pagina.getViewport({ scale: 1 }).height;
    const contenido = await pagina.getTextContent();
    const palabras = [];
    for (const item of contenido.items) {
      if (!item.str || !item.str.trim()) continue;
      const [, , , , x, y] = item.transform;
      const anchoLetra = item.str.length ? item.width / item.str.length : 0;
      // "top" es el borde superior del texto, como en pdfplumber: con la
      // línea base sola, textos de distinto tamaño en la misma fila
      // (razón social y RIF) quedarían en filas separadas.
      const top = alto - y - (item.height || 0);
      // pdf.js entrega trozos de texto; se parten en palabras estimando la
      // posición de cada una dentro del trozo.
      for (const m of item.str.matchAll(/\S+/g)) {
        palabras.push({ text: m[0], x0: x + m.index * anchoLetra, top });
      }
    }
    const lineas = agruparPorFilas(palabras).map((fila) => fila.map((w) => w.text).join(" "));
    paginas.push({ palabras, lineas });
  }
  return paginas;
}
