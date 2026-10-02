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
```

Backend:
```bash
python app.py       # runs Flask in debug mode on the default port
```
There is no `requirements.txt` in the repo — the backend imports `flask`, `flask_cors`, `flask_sqlalchemy`, `flask_admin`, `python-dotenv`, `pandas`, `openpyxl`, `PyPDF2`, and `requests`, none of which are currently installed in this environment. Install them manually (e.g. into a venv) before running the backend.

There is no test suite (Python or JS) in this repo.

## Architecture

### Backend (`app.py` + `src/back/utils.py`)

Everything backend-side lives in `app.py` — models, routes, and Flask-Admin registration are not split into blueprints/modules. SQLite database file is `instance/database.db` (auto-created via `db.create_all()` on import).

Three models:
- `Recipe` — an uploaded invoice: stores the raw PDF bytes (`file`), the full extracted text (`texto`), and a few fields parsed out of the first page (`numero_factura`, `fecha`, `tipo_de_cambio`).
- `Medicina` — one line item (medicine) parsed out of an invoice's text, with quantity/price/tax breakdown columns matching the source invoice format (`ALIC`, `DC`/`DD`/`DL`/`DV`, `Neto_Bs`/`Neto_USD`, `TOT_NETO_Bs`/`TOT_NETO_USD`, etc.).
- `Factura` — a minimal invoice/exchange-rate record (`numero`, `fecha`, `precio_dolar`); not currently wired to any route.

Flow for ingesting an invoice:
1. `POST /factura` — upload a PDF, `extraer_datos_factura_pdf` (PyPDF2, first page only) pulls invoice number/date/exchange rate via regex, the full text and raw file are stored in a new `Recipe` row.
2. `POST /medicina/<idFactura>` — re-parses the stored `Recipe.texto` with `extraer_informacion_medicamentos`, whose regex expects a specific fixed-column invoice layout (16 capture groups per line). Each match becomes a `Medicina` row. Changing invoice formats means changing this regex.
3. `GET /precio/<nombre>` — looks up `Medicina.descripcion` by substring for price lookup (backs the frontend's price-search view).

Excel import/export:
- `subir.py` is a standalone one-off script (not called from `app.py`) that bulk-loads `Precio.xlsx` into the `Medicina` table via pandas — run manually with `python subir.py`.
- `/descargar/facturas` and `/descargar/medicinas` export the `Recipe`/`Medicina` tables to `.xlsx` via `export_to_excel()`. Note this currently writes to a hardcoded Windows path (`C:\Users\Public\...`) before serving the file — this only works when the backend runs on Windows.

Flask-Admin is mounted on `app` giving CRUD views over `Recipe` and `Medicina` (default `/admin` path).

### Frontend (`src/front/`)

- Entry: `main.jsx` → `App.jsx`, routed with `react-router-dom` (`/`, `/medicamentos`, `/facturas`, `/precios`).
- `componentes/` holds one file per feature area, paired with the backend routes above: `agregarFacturas.jsx`/`agregarFacturasUrl.jsx` (upload a PDF invoice, by file or URL), `agregarMedicamentos.jsx` (trigger line-item extraction for a factura), `listaFacturas.jsx`/`listaMedicamentos.jsx` (list views), `precioDolar.jsx`/`precioMedicamento.jsx` (price lookups), `descargarExcel.jsx` (Excel export), `navbar.jsx`.
- `views/home.jsx` is the landing page.
- shadcn/ui primitives live in `src/components/ui` (configured via `components.json`, style `new-york`, no RSC/TSX). Shared class-merge helper is `src/lib/utils.js` (`cn()` via `clsx` + `tailwind-merge`).
- Path alias `@` → `src` (set in both `vite.config.js` and `jsconfig.json`) — use it for imports from `src/components`, `src/lib`, etc.; code under `src/front` itself uses relative imports.
