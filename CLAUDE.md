# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Gestor de Farmacias — a pharmacy invoice/medicine management tool. It has two independent halves that run as separate processes and talk over HTTP:

- **Backend**: a single-file Flask app (`app.py`) with SQLAlchemy models, a Flask-Admin panel, and PDF/Excel processing helpers in `src/back/utils.py`.
- **Frontend**: a React 18 + Vite SPA under `src/front/`, styled with Tailwind and shadcn/ui components.

There is no shared build pipeline between them — the frontend calls the backend via `VITE_APP_API_URL` (set in `.env`).

## Commands

Frontend (run from repo root):
```bash
npm install       # install JS deps
npm run dev        # start Vite dev server
npm run build       # production build
npm run lint        # ESLint over the whole repo
npm run preview      # preview a production build
npm test            # node:test over src/front/lib/*.test.js (pricing rules)
```

Backend:
```bash
pip install -r requirements-dev.txt   # pinned versions; Flask-Admin 2.x breaks app.py
python app.py       # runs Flask on 127.0.0.1 (FLASK_DEBUG=1 for debug mode)
pytest              # backend tests in tests/
```
Environment variables (`.env`, never committed): `VITE_APP_API_URL`, `FLASK_KEY`, `DATABASE_URL`, `CORS_ORIGINS`, `ADMIN_USER`/`ADMIN_PASSWORD` (the `/admin` panel is denied unless `ADMIN_PASSWORD` is set).

## Architecture

### Backend (`app.py` + `src/back/utils.py`)

Everything backend-side lives in `app.py` — models, routes, and Flask-Admin registration are not split into blueprints/modules. SQLite database file is `instance/database.db` (auto-created via `db.create_all()` on import).

Three models (`db.create_all()` does not alter existing tables — a column type change on Postgres needs a manual `ALTER TABLE`):
- `Recipe` — an uploaded invoice: stores the raw PDF bytes (`file`), the full extracted text (`texto`), and a few fields parsed out of the first page (`numero_factura`, `fecha`, `tipo_de_cambio`, `drogueria`). `serialize()` adds a computed `formato` (`nena` | `insuaminca` | `guillermar`, from `detectar_formato(texto)`) that selects the frontend pricing rule.
- `Medicina` — one line item (medicine) parsed out of an invoice, with quantity/price/tax breakdown columns (`ALIC` = IVA %, `DC`/`DD`/`DL`/`DV` = discount percentages as floats, `Neto_*` = net **per unit**, `TOT_NETO_*` = line total).
- `Factura` — a minimal invoice/exchange-rate record (`numero`, `fecha`, `precio_dolar`); not currently wired to any route.

Flow for ingesting an invoice:
1. `POST /factura` (or `POST /facturaurl`, SSRF-checked by `validar_url_publica`) — upload a PDF (max 20 MB, must start with `%PDF`); `extraer_datos_factura_pdf` (pypdf) parses the header from the first page per supplier format and stores the full text and raw file in a new `Recipe`. Duplicates (same number + droguería, or same bytes) get 409.
2. `POST /medicina/<idFactura>` — `extraer_informacion_medicamentos` dispatches on `detectar_formato`: Nena ("Número de Documento") uses a regex over the text; INSUAMINCA ("Pedido de cliente") and GUILLER MAR read word coordinates with pdfplumber. Each item becomes a `Medicina` row.
3. `GET /precio/<nombre>` — case-insensitive substring search over `Medicina.descripcion` (LIKE wildcards escaped), newest invoice first, each result with its `factura`; the frontend computes the sale price with the same rule as "Precio por factura".

Excel import/export:
- `subir.py` is a standalone one-off script (not called from `app.py`) that bulk-loads `Precio.xlsx` into the `Medicina` table via pandas — run manually with `python subir.py`.
- `/descargar/facturas` and `/descargar/medicinas` export the `Recipe`/`Medicina` tables to `.xlsx` in memory via `export_to_excel()`.

Flask-Admin is mounted on `app` giving CRUD views over `Recipe` and `Medicina` (default `/admin` path), behind HTTP Basic auth with CSRF-protected forms (`SecureForm`). The rest of the API has no auth: it assumes a trusted local network.

### Frontend (`src/front/`)

- Entry: `main.jsx` → `App.jsx`, routed with `react-router-dom` (`/`, `/medicamentos`, `/facturas`, `/precios`).
- `componentes/` holds one file per feature area, paired with the backend routes above: `agregarFacturas.jsx`/`agregarFacturasUrl.jsx` (upload a PDF invoice, by file or URL), `agregarMedicamentos.jsx` (trigger line-item extraction for a factura), `listaFacturas.jsx`/`listaMedicamentos.jsx` (list views), `precioDolar.jsx`/`precioMedicamento.jsx`/`precioPorFactura.jsx` (exchange rate and sale prices), `descargarExcel.jsx` (Excel export), `sidebar.jsx` (navigation).
- `lib/precioFactura.js` holds the sale-price rules, transcribed from the pharmacy's own spreadsheets (see its header comment): sale = list price × (1 + markup) × (1 + IVA), "con descuento" passes the distributor discounts on to the customer. Rules are keyed by `factura.formato`; tests in `precioFactura.test.js` pin the expected values from those spreadsheets. `lib/useMargenVenta.js` shares the markup % between views.
- `views/home.jsx` is the landing page.
- shadcn/ui primitives live in `src/components/ui` (configured via `components.json`, style `new-york`, no RSC/TSX). Shared class-merge helper is `src/lib/utils.js` (`cn()` via `clsx` + `tailwind-merge`).
- Path alias `@` → `src` (set in both `vite.config.js` and `jsconfig.json`) — use it for imports from `src/components`, `src/lib`, etc.; code under `src/front` itself uses relative imports.
