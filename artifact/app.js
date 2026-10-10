// Gestor de Farmacias como artifact: las facturas viven en la base de datos
// del artifact (capability `db`), los PDF en su almacén (`assets`) y la
// lectura del PDF ocurre en el navegador con pdf.js (ver parsers.js). Las
// reglas de precio son las mismas de la app web (src/front/lib/precioFactura.js).
import { leerPdf, parsearFactura, FORMATO_INSUAMINCA } from "./parsers.js";
import { calcularPreciosLinea, calcularTotalesFactura, MARGEN_VENTA_DEFAULT } from "./precioFactura.js";

const PDFJS_BASE = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
const XLSX_URL = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
const FORMATOS = { nena: "Nena", insuaminca: "INSUAMINCA · pedido", insuaminca_factura: "INSUAMINCA · factura" };
const DESCUENTOS = ["DC", "DD", "DL", "DV"];
const ETIQUETAS_DESCUENTO = {
  insuaminca: { DC: "Seg", DD: "ESC PRD", DL: "ESC PRV", DV: "DESC PRV" },
  insuaminca_factura: { DC: "D/1 Seg", DD: "D/2", DL: "D/3", DV: "D/4" },
};
const MAX_RESULTADOS = 100;

const estado = {
  ruta: "facturas",
  acceso: "cargando", // cargando | sin-db | denegado | ok
  db: null,
  user: null,
  assets: null,
  downloads: null,
  soloLectura: false,
  puedeEditar: false,
  yo: null,
  nombres: {},
  facturas: [],
  facturasEstado: "cargando", // cargando | ok | error
  config: { tasa: null, tasaFecha: null, margen: MARGEN_VENTA_DEFAULT },
  seleccion: null,
  filtroDrogueria: null,
  filtroTexto: "",
  borrador: null, // { nombre, archivo, datos, fase: leyendo|listo|guardando|error, mensaje, duplicadaId }
  busqueda: "",
  confirmarBorrado: false,
  aviso: null, // { tipo: ok|error, texto }
};

// --- Utilidades ------------------------------------------------------------------

const $ = (sel) => document.querySelector(sel);
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmt = (n, dec = 2) =>
  n == null || !Number.isFinite(Number(n))
    ? "—"
    : Number(n).toLocaleString("es-VE", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtPct = (n) => `${(Number(n) || 0).toLocaleString("es-VE", { maximumFractionDigits: 2 })}%`;
const normalizar = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const hoyIso = () => new Date().toISOString().slice(0, 10);
const fechaCorta = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");

const reglaFactura = (f) => ({ formato: f.formato, tipo_de_cambio: f.tipoCambio, drogueria: f.drogueria });
const margen = () => Number(estado.config.margen ?? MARGEN_VENTA_DEFAULT);
const tasaDia = () => (Number(estado.config.tasa) > 0 ? Number(estado.config.tasa) : null);
const etiquetas = (formato) => ETIQUETAS_DESCUENTO[formato] ?? { DC: "DC", DD: "DD", DL: "DL", DV: "DV" };

function cargarScript(src) {
  return new Promise((resolve, reject) => {
    const existente = document.querySelector(`script[src="${src}"]`);
    if (existente) {
      if (existente.dataset.listo) return resolve();
      existente.addEventListener("load", () => resolve());
      existente.addEventListener("error", () => reject(new Error(`No se pudo cargar ${src}`)));
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => {
      s.dataset.listo = "1";
      resolve();
    };
    s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(s);
  });
}

async function pdfjs() {
  // El worker se carga como script en la misma página: pdf.js detecta su
  // global y trabaja en el hilo principal, sin pedir archivos aparte.
  await cargarScript(`${PDFJS_BASE}pdf.min.js`);
  await cargarScript(`${PDFJS_BASE}pdf.worker.min.js`);
  const lib = window.pdfjsLib;
  lib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}pdf.worker.min.js`;
  return lib;
}

async function idDocumento(datos, bytes) {
  if (datos.numero) {
    const drogueria = (datos.drogueria || "sin-drogueria").replace(/[^A-Za-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    return `${drogueria || "sin-drogueria"}--${datos.numero.replace(/[^A-Za-z0-9-]+/g, "-")}`.slice(0, 180);
  }
  // Sin número legible, el mismo archivo es la misma factura.
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return `archivo-${[...hash.slice(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

// --- Arranque ------------------------------------------------------------------

async function iniciar() {
  window.addEventListener("hashchange", () => {
    leerRuta();
    render();
  });
  leerRuta();
  document.addEventListener("click", alHacerClic);
  document.addEventListener("input", alEscribir);
  document.addEventListener("change", alCambiar);
  render();

  const claude = window.claude;
  const [db, user] = claude?.use ? await Promise.all([claude.use("db"), claude.use("user")]) : [null, null];
  estado.db = db;
  estado.user = user;
  if (!db) {
    estado.acceso = "sin-db";
    render();
    return;
  }

  const [puedeEscribir, puedeEditar, yo] = user
    ? await Promise.all([user.can("data.write"), user.canEdit(), user.me()])
    : [null, false, null];
  if (puedeEscribir === false) {
    // Las reglas de la base solo dejan leer y escribir a quien tiene acceso
    // de Colaborador o más; un Lector no vería nada aunque se mostrara la app.
    estado.acceso = "denegado";
    estado.yo = yo;
    render();
    return;
  }
  estado.acceso = "ok";
  estado.puedeEditar = puedeEditar;
  estado.yo = yo;
  render();

  db.collection("facturas")
    .orderBy("fechaIso", "desc")
    .limit(1000)
    .onSnapshot(
      (snap) => {
        estado.facturas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        estado.facturasEstado = "ok";
        resolverNombres();
        render();
      },
      () => {
        estado.facturasEstado = "error";
        render();
      }
    );

  db.doc("config/general").onSnapshot((snap) => {
    estado.config = { tasa: null, tasaFecha: null, margen: MARGEN_VENTA_DEFAULT, ...(snap.exists ? snap.data() : {}) };
    render();
  });

  [estado.assets, estado.downloads] = await Promise.all([claude.use("assets"), claude.use("downloads")]);
  render();
}

async function resolverNombres() {
  if (!estado.user) return;
  const ids = [...new Set(estado.facturas.map((f) => f.cargadaPor).filter(Boolean))];
  if (!ids.length) return;
  const perfiles = await estado.user.profiles(ids);
  const nombres = Object.fromEntries(ids.map((id) => [id, perfiles[id]?.name || ""]));
  if (JSON.stringify(nombres) !== JSON.stringify(estado.nombres)) {
    estado.nombres = nombres;
    render();
  }
}

function leerRuta() {
  const ruta = location.hash.replace("#", "");
  estado.ruta = ["facturas", "precios", "ajustes"].includes(ruta) ? ruta : "facturas";
}

// --- Render ----------------------------------------------------------------------

function render() {
  for (const a of document.querySelectorAll("#nav a")) {
    if (a.dataset.ruta === estado.ruta) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  const tasa = tasaDia();
  $("#chip-tasa").innerHTML = `Tasa del día <b>${tasa ? `${fmt(tasa)} Bs/US$` : "sin cargar"}</b>`;
  $("#chip-usuario").textContent =
    estado.acceso === "ok"
      ? `${estado.yo?.name || "Conectado"} · ${estado.puedeEditar ? "Editor" : "Colaborador"}`
      : estado.acceso === "cargando"
        ? "Conectando…"
        : "Sin acceso";

  const app = $("#app");
  if (estado.acceso === "cargando") {
    app.innerHTML = `<section class="ticket"><div class="estado">Abriendo la base de datos de la farmacia…</div></section>`;
    return;
  }
  if (estado.acceso === "sin-db") {
    app.innerHTML = bloqueo(
      "Abre esta página desde Claude",
      "Los datos de la farmacia solo se cargan cuando la página está abierta en claude.ai con una cuenta que tenga acceso."
    );
    return;
  }
  if (estado.acceso === "denegado") {
    app.innerHTML = bloqueo(
      "Acceso restringido",
      "Esta herramienta es solo para el personal de la farmacia. Si trabajas aquí, pídele al dueño que te invite como Editor."
    );
    return;
  }

  // Conserva el foco y el cursor de un campo de texto entre renders.
  const activo = document.activeElement?.id;
  const cursor = document.activeElement?.selectionStart;
  if (estado.ruta === "facturas") app.innerHTML = vistaFacturas();
  else if (estado.ruta === "precios") app.innerHTML = vistaPrecios();
  else app.innerHTML = vistaAjustes();
  if (activo && document.getElementById(activo)) {
    const el = document.getElementById(activo);
    el.focus();
    try {
      if (cursor != null) el.setSelectionRange(cursor, cursor);
    } catch {
      // date y number no admiten cursor; el foco basta.
    }
  }
}

const bloqueo = (titulo, texto) => `
  <section class="ticket bloqueo">
    <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true" style="margin-inline:auto"><rect x="5" y="10" width="14" height="11" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
    <h1>${esc(titulo)}</h1>
    <p class="tenue">${esc(texto)}</p>
  </section>`;

const aviso = () =>
  estado.aviso ? `<div class="aviso ${estado.aviso.tipo}" role="status">${esc(estado.aviso.texto)}</div>` : "";

// --- Facturas --------------------------------------------------------------------

function vistaFacturas() {
  const seleccionada = estado.facturas.find((f) => f.id === estado.seleccion);
  return `
    <div class="dos-col">
      ${tarjetaCarga()}
      ${listaFacturas()}
    </div>
    <div id="detalle">${estado.borrador?.datos ? vistaBorrador() : seleccionada ? detalleFactura(seleccionada) : guiaPrecios()}</div>`;
}

function tarjetaCarga() {
  const b = estado.borrador;
  let cuerpo;
  if (estado.soloLectura) {
    cuerpo = `<p class="tenue">Tu acceso es de solo lectura: puedes consultar facturas y precios, pero no cargar nuevas.</p>`;
  } else if (b?.fase === "leyendo") {
    cuerpo = `<div class="estado">Leyendo ${esc(b.nombre)}…</div>`;
  } else {
    cuerpo = `
      <label class="soltar" id="soltar" for="archivo">
        <input type="file" id="archivo" accept="application/pdf,.pdf">
        <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0-4 4m4-4 4 4M5 20h14" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
        <strong>Arrastra el PDF de la factura</strong>
        <span class="tenue">o toca para elegirlo · Nena o INSUAMINCA (factura o pedido)</span>
      </label>`;
  }
  return `
    <section class="ticket">
      <div class="ticket-cab"><h2>Cargar factura</h2><span class="etiqueta">PDF · máx. 20 MB</span></div>
      <div style="display:grid;gap:12px">${aviso()}${b?.fase === "error" ? `<div class="aviso error">${esc(b.mensaje)}</div>` : ""}${cuerpo}</div>
    </section>`;
}

function totalesFactura(f) {
  return calcularTotalesFactura(f.items ?? [], reglaFactura(f), margen());
}

function listaFacturas() {
  const droguerias = [...new Set(estado.facturas.map((f) => f.drogueria).filter(Boolean))].sort();
  const texto = normalizar(estado.filtroTexto);
  const visibles = estado.facturas.filter(
    (f) =>
      (!estado.filtroDrogueria || f.drogueria === estado.filtroDrogueria) &&
      (!texto || normalizar(`${f.numero} ${f.drogueria}`).includes(texto))
  );
  let filas;
  if (estado.facturasEstado === "cargando") filas = `<tr><td colspan="5" class="estado">Imprimiendo facturas…</td></tr>`;
  else if (estado.facturasEstado === "error")
    filas = `<tr><td colspan="5" class="estado" style="color:var(--rojo)">No se pudieron leer las facturas. Recarga la página.</td></tr>`;
  else if (!estado.facturas.length)
    filas = `<tr><td colspan="5" class="estado">Todavía no hay facturas.<br>Carga el primer PDF arriba.</td></tr>`;
  else if (!visibles.length) filas = `<tr><td colspan="5" class="estado">Ninguna factura coincide</td></tr>`;
  else
    filas = visibles
      .map((f) => {
        const t = totalesFactura(f);
        return `<tr class="clic" data-abrir="${esc(f.id)}" aria-selected="${f.id === estado.seleccion}" tabindex="0">
          <td class="dato">${esc(fechaCorta(f.fechaIso))}</td>
          <td>${esc(f.drogueria || "—")}</td>
          <td class="dato">${esc(f.numero || "—")}</td>
          <td class="num">${f.items?.length ?? 0}</td>
          <td class="num">${fmt(t.costo)}</td>
        </tr>`;
      })
      .join("");

  return `
    <section class="ticket">
      <div class="ticket-cab"><h2>Facturas</h2><span class="etiqueta">${estado.facturas.length} registradas</span></div>
      ${
        droguerias.length > 1
          ? `<div class="filtros" role="group" aria-label="Filtrar por droguería">
              <button data-drogueria="" aria-pressed="${!estado.filtroDrogueria}">Todas</button>
              ${droguerias.map((d) => `<button data-drogueria="${esc(d)}" aria-pressed="${estado.filtroDrogueria === d}">${esc(d)}</button>`).join("")}
            </div>`
          : ""
      }
      <input class="buscar" id="filtro-facturas" type="search" placeholder="Buscar por número o droguería" value="${esc(estado.filtroTexto)}" style="margin-bottom:8px">
      <div class="tabla-env">
        <table>
          <thead><tr><th>Fecha</th><th>Droguería</th><th>N.º</th><th class="num">Ítems</th><th class="num">Costo US$</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    </section>`;
}

function guiaPrecios() {
  return `
    <section class="ticket">
      <div class="ticket-cab"><h2>Precio de venta</h2><span class="etiqueta">+${fmtPct(margen())} de ganancia</span></div>
      <div style="display:grid;gap:12px">
        <p style="margin:0">Elige una factura para ver el precio de venta de cada ítem. Las fórmulas son las de las hojas de la farmacia:</p>
        <dl class="lista-def">
          <dt>Venta</dt><dd>precio de lista × (1 + ${fmtPct(margen())}) × (1 + IVA)</dd>
          <dt>Con desc.</dt><dd>la venta menos los descuentos del distribuidor</dd>
          <dt>Nena</dt><dd>el precio impreso es el de lista; IVA 16 % salvo exentos (E)</dd>
          <dt>INSUAMINCA</dt><dd>el precio ya trae los descuentos; el Seg (7 %, D/1) queda para la farmacia. En la factura el costo es Prec U Bs ÷ Tasa BCV</dd>
        </dl>
        <p class="tenue" style="margin:0">El % de ganancia y la tasa del día se cambian en Ajustes.</p>
      </div>
    </section>`;
}

function tablaItems(items, factura, { animar = false } = {}) {
  const e = etiquetas(factura.formato);
  const tasa = tasaDia();
  const regla = reglaFactura(factura);
  const filas = items
    .map((m) => {
      const p = calcularPreciosLinea(m, regla, margen());
      return `<tr>
        <td style="min-width:14rem">${esc(m.descripcion)}${m.lote ? `<div class="etiqueta" style="font-weight:500">Lote ${esc(m.lote)} · vence ${esc(m.exp || "—")}</div>` : ""}</td>
        <td class="num">${m.cantidad ?? "—"}</td>
        <td class="num">${fmt(p.costoUnitario)}</td>
        <td class="num venta">${fmt(p.ventaConDescuentoUnitario)}</td>
        <td class="num venta">${fmt(p.ventaSinDescuentoUnitario)}</td>
        ${tasa ? `<td class="num venta">${fmt(p.ventaConDescuentoUnitario == null ? null : p.ventaConDescuentoUnitario * tasa)}</td>` : ""}
        <td class="num">${fmt(p.costoListaUnitario)}</td>
        ${DESCUENTOS.map((d) => `<td class="num">${fmtPct(p.descuentos[d])}</td>`).join("")}
        <td class="num">${fmtPct(p.iva * 100)}</td>
      </tr>`;
    })
    .join("");
  const t = calcularTotalesFactura(items, regla, margen());
  return `
    <div class="tabla-env ${animar ? "imprimir" : ""}">
      <table>
        <thead><tr>
          <th>Descripción</th><th class="num">Cant.</th><th class="num">Costo US$</th>
          <th class="num venta">Venta c/desc. US$</th><th class="num venta">Venta s/desc. US$</th>
          ${tasa ? `<th class="num venta">Venta c/desc. Bs</th>` : ""}
          <th class="num">Lista US$</th>
          ${DESCUENTOS.map((d) => `<th class="num">${esc(e[d])}</th>`).join("")}
          <th class="num">IVA</th>
        </tr></thead>
        <tbody>${filas || `<tr><td colspan="${tasa ? 12 : 11}" class="estado">No se encontraron ítems en este PDF</td></tr>`}</tbody>
        ${
          items.length
            ? `<tfoot><tr>
                <td colspan="2">TOTAL${t.lineasSinPrecio ? ` · ${t.lineasSinPrecio} sin precio` : ""}</td>
                <td class="num">${fmt(t.costo)}</td>
                <td class="num venta">${fmt(t.ventaConDescuento)}</td>
                <td class="num venta">${fmt(t.ventaSinDescuento)}</td>
                ${tasa ? `<td class="num venta">${fmt(t.ventaConDescuento * tasa)}</td>` : ""}
                <td class="num">${fmt(t.costoLista)}</td>
                <td colspan="5"></td>
              </tr></tfoot>`
            : ""
        }
      </table>
    </div>`;
}

let ultimaAnimada = null;

function detalleFactura(f) {
  const animar = ultimaAnimada !== f.id;
  ultimaAnimada = f.id;
  const nombre = f.cargadaPor ? estado.nombres[f.cargadaPor] : "";
  const confirmar = estado.confirmarBorrado
    ? `<div class="aviso error" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between">
        <span>¿Eliminar la factura ${esc(f.numero || "")} y su PDF? No se puede deshacer.</span>
        <span class="acciones"><button class="btn peligro" data-accion="borrar-si">Eliminar</button><button class="btn" data-accion="borrar-no">Cancelar</button></span>
      </div>`
    : "";
  return `
    <section class="ticket">
      <div class="ticket-cab">
        <h2>${esc(f.drogueria || "Droguería sin identificar")} · ${esc(f.numero || "s/n")}</h2>
        <span class="pill">${esc(FORMATOS[f.formato] ?? "Formato desconocido")}</span>
      </div>
      <div style="display:grid;gap:14px">
        <dl class="lista-def">
          <dt>Fecha</dt><dd class="dato">${esc(f.fecha || "—")}</dd>
          <dt>Tasa factura</dt><dd class="dato">${f.tipoCambio ? `${fmt(f.tipoCambio, 4)} Bs/US$` : f.formato === FORMATO_INSUAMINCA ? "En US$" : "—"}</dd>
          <dt>Cargada</dt><dd>${esc(fechaCorta((f.cargadaEn || "").slice(0, 10)))}${nombre ? ` por ${esc(nombre)}` : ""}</dd>
        </dl>
        <div class="acciones">
          <button class="btn" data-accion="cerrar">← Facturas</button>
          ${f.pdf ? `<a class="btn" href="/_blob/${esc(f.pdf)}" target="_blank" rel="noopener">Ver PDF</a>` : ""}
          ${estado.downloads ? `<button class="btn" data-accion="excel-factura">Exportar Excel</button>` : ""}
          ${estado.puedeEditar ? `<button class="btn peligro" data-accion="borrar">Eliminar</button>` : ""}
        </div>
        ${confirmar}
        ${tablaItems(f.items ?? [], f, { animar })}
      </div>
    </section>`;
}

/** El pedido de INSUAMINCA que esta factura cierra, si ya se cargó. */
function pedidoCargado(d) {
  return d.pedido ? estado.facturas.find((f) => f.formato === FORMATO_INSUAMINCA && f.numero === d.pedido) : null;
}

function vistaBorrador() {
  const b = estado.borrador;
  const d = b.datos;
  const sinTasa = d.formato !== FORMATO_INSUAMINCA && !(Number(d.tipoCambio) > 0);
  return `
    <section class="ticket">
      <div class="ticket-cab"><h2>Revisar antes de guardar</h2><span class="pill">${esc(FORMATOS[d.formato] ?? "Formato desconocido")}</span></div>
      <div style="display:grid;gap:14px">
        <p class="tenue" style="margin:0">${esc(b.nombre)} · ${d.items.length} ítems leídos. Corrige el encabezado si algo salió mal.</p>
        <div class="rejilla-campos">
          <div class="campo"><label class="etiqueta" for="b-drogueria">Droguería</label><input id="b-drogueria" data-borrador="drogueria" value="${esc(d.drogueria ?? "")}"></div>
          <div class="campo"><label class="etiqueta" for="b-numero">N.º factura</label><input id="b-numero" data-borrador="numero" value="${esc(d.numero ?? "")}"></div>
          <div class="campo"><label class="etiqueta" for="b-fecha">Fecha</label><input id="b-fecha" type="date" data-borrador="fechaIso" value="${esc(d.fechaIso ?? "")}"></div>
          ${
            d.formato === FORMATO_INSUAMINCA
              ? ""
              : `<div class="campo"><label class="etiqueta" for="b-tasa">Tasa factura (Bs/US$)</label><input id="b-tasa" type="number" step="0.0001" min="0" data-borrador="tipoCambio" value="${esc(d.tipoCambio ?? "")}"></div>`
          }
        </div>
        ${sinTasa ? `<div class="aviso error">Esta factura no trae tasa legible: sin ella los precios en Bs no se pueden pasar a US$.</div>` : ""}
        ${!d.items.length ? `<div class="aviso error">No se encontraron ítems. Puede que esta droguería use un formato que el lector todavía no conoce.</div>` : ""}
        ${
          pedidoCargado(d)
            ? `<div class="aviso">El pedido ${esc(d.pedido)} de esta factura ya está cargado: sus productos saldrán dos veces en Precios. <button class="btn" data-abrir="${esc(pedidoCargado(d).id)}">Ver el pedido</button></div>`
            : ""
        }
        ${b.duplicadaId ? `<div class="aviso error">Esta factura ya está cargada. <button class="btn" data-abrir="${esc(b.duplicadaId)}">Ver la guardada</button></div>` : ""}
        ${b.mensaje && b.fase !== "error" ? `<div class="aviso">${esc(b.mensaje)}</div>` : ""}
        <div class="acciones">
          <button class="btn primario" data-accion="guardar" ${b.fase === "guardando" || !d.items.length ? "disabled" : ""}>${b.fase === "guardando" ? "Guardando…" : "Guardar factura"}</button>
          <button class="btn" data-accion="descartar">Descartar</button>
        </div>
        ${tablaItems(d.items, d)}
      </div>
    </section>`;
}

// --- Precios ---------------------------------------------------------------------

function resultadosPrecios() {
  const q = normalizar(estado.busqueda.trim());
  if (!q) return { filas: [], total: 0 };
  const filas = [];
  for (const f of estado.facturas) {
    for (const m of f.items ?? []) {
      if (normalizar(m.descripcion).includes(q)) filas.push({ f, m });
    }
  }
  return { filas: filas.slice(0, MAX_RESULTADOS), total: filas.length };
}

function filasPrecios() {
  const tasa = tasaDia();
  const { filas, total } = resultadosPrecios();
  if (!estado.busqueda.trim()) return { html: `<tr><td colspan="6" class="estado">Escribe para buscar</td></tr>`, total: 0 };
  if (!filas.length) return { html: `<tr><td colspan="6" class="estado">Sin resultados para “${esc(estado.busqueda)}”</td></tr>`, total };
  const html = filas
    .map(({ f, m }) => {
      const p = calcularPreciosLinea(m, reglaFactura(f), margen());
      return `<tr class="clic" data-abrir="${esc(f.id)}" data-ir="facturas" tabindex="0">
        <td>${esc(m.descripcion)}</td>
        <td><span class="tenue">${esc(f.drogueria || "—")} · ${esc(fechaCorta(f.fechaIso))}</span></td>
        <td class="num">${fmt(p.costoUnitario)}</td>
        <td class="num venta">${fmt(p.ventaConDescuentoUnitario)}</td>
        <td class="num venta">${fmt(p.ventaSinDescuentoUnitario)}</td>
        <td class="num">${tasa && p.ventaConDescuentoUnitario != null ? fmt(p.ventaConDescuentoUnitario * tasa) : "—"}</td>
      </tr>`;
    })
    .join("");
  return { html, total };
}

function vistaPrecios() {
  const { html, total } = filasPrecios();
  return `
    <section class="ticket">
      <div class="ticket-cab"><h2>Precios</h2><span class="etiqueta">Más recientes primero · +${fmtPct(margen())}</span></div>
      <div style="display:grid;gap:12px">
        <div class="campo" style="max-width:28rem">
          <label class="etiqueta" for="buscar-precio">Buscar medicamento</label>
          <input class="buscar" id="buscar-precio" type="search" placeholder="Ej. losartan 50" value="${esc(estado.busqueda)}" autocomplete="off">
        </div>
        <div class="tabla-env">
          <table>
            <thead><tr><th>Descripción</th><th>Droguería · factura</th><th class="num">Costo US$</th><th class="num venta">Venta c/desc. US$</th><th class="num venta">Venta s/desc. US$</th><th class="num">Venta Bs hoy</th></tr></thead>
            <tbody id="resultados">${html}</tbody>
          </table>
        </div>
        <div class="ticket-pie"><span class="etiqueta" id="conteo">${total > MAX_RESULTADOS ? `${MAX_RESULTADOS} de ${total} resultados` : `${total} resultado${total === 1 ? "" : "s"}`}</span>${tasaDia() ? "" : `<span class="etiqueta">Carga la tasa del día en Ajustes para ver Bs</span>`}</div>
      </div>
    </section>`;
}

// --- Ajustes ---------------------------------------------------------------------

function vistaAjustes() {
  const c = estado.config;
  const editable = estado.puedeEditar;
  const totalItems = estado.facturas.reduce((n, f) => n + (f.items?.length ?? 0), 0);
  return `
    <div class="dos-col">
      <section class="ticket">
        <div class="ticket-cab"><h2>Precios</h2><span class="etiqueta">${editable ? "Editable" : "Solo editores"}</span></div>
        <form id="form-config" style="display:grid;gap:14px">
          <div class="rejilla-campos">
            <div class="campo"><label class="etiqueta" for="c-tasa">Tasa del día (Bs/US$)</label><input id="c-tasa" type="number" step="0.0001" min="0" value="${esc(c.tasa ?? "")}" ${editable ? "" : "disabled"}></div>
            <div class="campo"><label class="etiqueta" for="c-margen">% de ganancia</label><input id="c-margen" type="number" step="0.01" min="0" value="${esc(c.margen ?? MARGEN_VENTA_DEFAULT)}" ${editable ? "" : "disabled"}></div>
          </div>
          <p class="tenue" style="margin:0">Tasa cargada el ${esc(fechaCorta(c.tasaFecha))}. La ganancia es un recargo sobre el costo, como en las hojas: 30 % multiplica por 1,3.</p>
          ${aviso()}
          ${editable ? `<div class="acciones"><button class="btn primario" type="submit">Guardar</button></div>` : ""}
        </form>
      </section>
      <section class="ticket">
        <div class="ticket-cab"><h2>Acceso y datos</h2><span class="etiqueta">${esc(estado.yo?.name || "Tú")}</span></div>
        <div style="display:grid;gap:14px">
          <p style="margin:0">Solo entra quien tú invites. La página es privada y la base de datos solo deja leer o escribir a Colaboradores y Editores.</p>
          <ol class="pasos">
            <li>Abre <b>Compartir</b> en la esquina superior de esta página.</li>
            <li>Invita a cada persona del personal por su correo.</li>
            <li>Dales nivel <b>Editor</b> si cargan facturas y eliminan; los Lectores no ven datos.</li>
          </ol>
          <dl class="lista-def">
            <dt>Facturas</dt><dd class="dato">${estado.facturas.length}</dd>
            <dt>Ítems</dt><dd class="dato">${totalItems}</dd>
          </dl>
          ${estado.downloads ? `<div class="acciones"><button class="btn" data-accion="excel-todo" ${estado.facturas.length ? "" : "disabled"}>Exportar todo a Excel</button></div>` : ""}
        </div>
      </section>
    </div>`;
}

// --- Acciones --------------------------------------------------------------------

function mostrarAviso(tipo, texto) {
  estado.aviso = { tipo, texto };
  render();
  clearTimeout(mostrarAviso.t);
  mostrarAviso.t = setTimeout(() => {
    estado.aviso = null;
    render();
  }, 6000);
}

async function leerArchivo(archivo) {
  if (!archivo) return;
  if (archivo.size > 20 * 1024 * 1024) {
    estado.borrador = { fase: "error", mensaje: "El archivo supera los 20 MB." };
    render();
    return;
  }
  estado.seleccion = null;
  estado.borrador = { nombre: archivo.name, archivo, fase: "leyendo" };
  render();
  try {
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    if (String.fromCharCode(...bytes.slice(0, 4)) !== "%PDF") throw new Error("El archivo no es un PDF.");
    const lib = await pdfjs();
    const paginas = await leerPdf(lib, bytes.slice());
    const datos = parsearFactura(paginas);
    estado.borrador = { ...estado.borrador, datos, bytes, fase: "listo" };
    verDetalle();
  } catch (error) {
    estado.borrador = { fase: "error", mensaje: error?.message?.startsWith("El archivo") ? error.message : "No se pudo leer el PDF." };
  }
  render();
}

async function guardarBorrador() {
  const b = estado.borrador;
  const d = b.datos;
  const factura = {
    numero: (d.numero || "").trim() || null,
    drogueria: (d.drogueria || "").trim() || null,
    fechaIso: d.fechaIso || null,
    fecha: d.fechaIso ? fechaCorta(d.fechaIso) : d.fecha,
    formato: d.formato,
    tipoCambio: Number(d.tipoCambio) > 0 ? Number(d.tipoCambio) : null,
    pedido: d.pedido ?? null,
    items: d.items,
  };
  estado.borrador = { ...b, fase: "guardando", duplicadaId: null, mensaje: null };
  render();
  try {
    const id = await idDocumento(factura, b.bytes);
    const ref = estado.db.doc(`facturas/${id}`);
    if ((await ref.get()).exists) {
      estado.borrador = { ...estado.borrador, fase: "listo", duplicadaId: id };
      render();
      return;
    }
    let pdf = null;
    let nota = estado.assets ? null : "Factura guardada sin el PDF: adjuntar archivos requiere acceso de Editor.";
    if (estado.assets) {
      try {
        pdf = (await estado.assets.upload(b.archivo, { type: "application/pdf" })).id;
      } catch {
        nota = "La factura se guardó, pero el PDF no se pudo adjuntar.";
      }
    }
    await ref.set({
      ...factura,
      pdf,
      nombreArchivo: b.nombre,
      cargadaPor: estado.yo?.id ?? null,
      cargadaEn: new Date().toISOString(),
    });
    estado.borrador = null;
    estado.seleccion = id;
    mostrarAviso("ok", nota ?? "Factura guardada.");
  } catch (error) {
    if (error?.code === "invalid_argument") estado.soloLectura = true;
    const texto =
      error?.code === "quota_exceeded"
        ? "La base de datos está llena: elimina facturas viejas para cargar nuevas."
        : error?.code === "invalid_argument"
          ? "Tu acceso no permite guardar facturas."
          : "No se pudo guardar. Intenta de nuevo.";
    estado.borrador = { ...estado.borrador, fase: "listo", mensaje: texto };
    render();
  }
}

async function borrarFactura() {
  const f = estado.facturas.find((x) => x.id === estado.seleccion);
  if (!f) return;
  try {
    await estado.db.doc(`facturas/${f.id}`).delete();
    if (f.pdf && estado.assets) await estado.assets.delete(f.pdf).catch(() => {});
    estado.seleccion = null;
    estado.confirmarBorrado = false;
    mostrarAviso("ok", "Factura eliminada.");
  } catch {
    estado.confirmarBorrado = false;
    mostrarAviso("error", "No se pudo eliminar la factura.");
  }
}

async function guardarConfig() {
  const tasa = Number($("#c-tasa")?.value);
  const margenNuevo = Number($("#c-margen")?.value);
  if (!(margenNuevo >= 0)) return mostrarAviso("error", "El % de ganancia debe ser un número positivo.");
  const nueva = {
    tasa: tasa > 0 ? tasa : null,
    tasaFecha: tasa > 0 && tasa !== Number(estado.config.tasa) ? hoyIso() : estado.config.tasaFecha ?? null,
    margen: margenNuevo,
  };
  try {
    await estado.db.doc("config/general").set(nueva);
    mostrarAviso("ok", "Ajustes guardados.");
  } catch {
    mostrarAviso("error", "Solo los editores pueden cambiar la tasa y la ganancia.");
  }
}

function filasExcel(facturas) {
  const filas = [];
  for (const f of facturas) {
    for (const m of f.items ?? []) {
      const p = calcularPreciosLinea(m, reglaFactura(f), margen());
      filas.push({
        Fecha: f.fecha,
        Droguería: f.drogueria,
        Factura: f.numero,
        Código: m.codigo,
        Descripción: m.descripcion,
        Cantidad: m.cantidad,
        Lote: m.lote,
        Vence: m.exp,
        "IVA %": p.iva * 100,
        ...Object.fromEntries(DESCUENTOS.map((d) => [`${etiquetas(f.formato)[d]} %`, p.descuentos[d]])),
        "Costo US$": p.costoUnitario,
        "Lista US$": p.costoListaUnitario,
        [`Venta c/desc. US$ (+${margen()}%)`]: p.ventaConDescuentoUnitario,
        [`Venta s/desc. US$ (+${margen()}%)`]: p.ventaSinDescuentoUnitario,
      });
    }
  }
  return filas;
}

async function exportarExcel(facturas, nombre) {
  try {
    await cargarScript(XLSX_URL);
    const XLSX = window.XLSX;
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filasExcel(facturas)), "Medicamentos");
    const datos = XLSX.write(libro, { bookType: "xlsx", type: "array" });
    await estado.downloads.save({ filename: nombre, data: new Blob([datos]) });
  } catch (error) {
    if (error?.code === "declined") return;
    mostrarAviso("error", "No se pudo generar el Excel.");
  }
}

function verDetalle() {
  requestAnimationFrame(() => document.getElementById("detalle")?.scrollIntoView({ block: "start", behavior: "smooth" }));
}

function alHacerClic(evento) {
  const abrir = evento.target.closest("[data-abrir]");
  if (abrir) {
    estado.seleccion = abrir.dataset.abrir;
    estado.borrador = null;
    estado.confirmarBorrado = false;
    if (abrir.dataset.ir) location.hash = abrir.dataset.ir;
    render();
    verDetalle();
    return;
  }
  const filtro = evento.target.closest("[data-drogueria]");
  if (filtro) {
    estado.filtroDrogueria = filtro.dataset.drogueria || null;
    render();
    return;
  }
  const accion = evento.target.closest("[data-accion]")?.dataset.accion;
  if (!accion) return;
  if (accion === "guardar") guardarBorrador();
  else if (accion === "descartar") {
    estado.borrador = null;
    render();
  } else if (accion === "cerrar") {
    estado.seleccion = null;
    render();
  } else if (accion === "borrar") {
    estado.confirmarBorrado = true;
    render();
  } else if (accion === "borrar-no") {
    estado.confirmarBorrado = false;
    render();
  } else if (accion === "borrar-si") borrarFactura();
  else if (accion === "excel-factura") {
    const f = estado.facturas.find((x) => x.id === estado.seleccion);
    if (f) exportarExcel([f], `factura-${f.numero || f.id}.xlsx`);
  } else if (accion === "excel-todo") exportarExcel(estado.facturas, `medicamentos-${hoyIso()}.xlsx`);
}

function alEscribir(evento) {
  const el = evento.target;
  if (el.id === "buscar-precio") {
    estado.busqueda = el.value;
    clearTimeout(alEscribir.t);
    alEscribir.t = setTimeout(() => {
      const { html, total } = filasPrecios();
      $("#resultados").innerHTML = html;
      $("#conteo").textContent =
        total > MAX_RESULTADOS ? `${MAX_RESULTADOS} de ${total} resultados` : `${total} resultado${total === 1 ? "" : "s"}`;
    }, 150);
  } else if (el.id === "filtro-facturas") {
    estado.filtroTexto = el.value;
    clearTimeout(alEscribir.t);
    alEscribir.t = setTimeout(render, 150);
  } else if (el.dataset.borrador && estado.borrador?.datos) {
    estado.borrador.datos[el.dataset.borrador] = el.value;
    estado.borrador.duplicadaId = null;
  }
}

function alCambiar(evento) {
  if (evento.target.id === "archivo") leerArchivo(evento.target.files?.[0]);
  else if (evento.target.dataset.borrador === "tipoCambio") render();
}

document.addEventListener("submit", (evento) => {
  evento.preventDefault();
  if (evento.target.id === "form-config") guardarConfig();
});
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter" && evento.target.matches?.("tr[data-abrir]")) evento.target.click();
});
for (const tipo of ["dragenter", "dragover"]) {
  document.addEventListener(tipo, (evento) => {
    const zona = evento.target.closest?.("#soltar");
    if (!zona) return;
    evento.preventDefault();
    zona.classList.add("encima");
  });
}
document.addEventListener("dragleave", (evento) => evento.target.closest?.("#soltar")?.classList.remove("encima"));
document.addEventListener("drop", (evento) => {
  const zona = evento.target.closest?.("#soltar");
  if (!zona) return;
  evento.preventDefault();
  leerArchivo(evento.dataTransfer?.files?.[0]);
});

iniciar();
