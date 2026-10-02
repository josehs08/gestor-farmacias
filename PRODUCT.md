# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A single pharmacy's own back-office staff, using the tool internally to manage their own supplier invoices and medicine inventory. Not built for other pharmacy businesses (not multi-tenant), and not a public-facing product.

## Product Purpose

Digitizes paper/PDF supplier invoices into a structured, priced medicine inventory, and lets staff quickly look up current medicine prices. Success means staff no longer manually re-key invoice line items into spreadsheets, and can trust the Bs/USD pricing shown is current.

## Positioning

Automates extraction from a specific fixed-column supplier invoice PDF layout directly into priced, searchable inventory records — a generic spreadsheet or manual entry cannot do this. Tracks pricing in both bolívares and US dollars, reflecting how the business actually prices and reconciles stock.

## Operating Context

- Workflow: upload a supplier invoice PDF (by file or URL) → invoice header fields (number, date, exchange rate) are parsed → staff trigger line-item extraction for that invoice → resulting medicine rows are searchable and exportable.
- Staff also check the day's official Bs/USD exchange rate (via dolarapi.com) and search medicine prices by name, independent of the invoice workflow.
- Tables of invoices and medicines are the primary surfaces staff work in; Excel export exists for records staff need outside the app.
- Runs as two separate local processes (Flask backend, Vite/React frontend) talking over HTTP — not currently a hosted multi-user deployment.

## Capabilities and Constraints

- Venezuela's bolívar/USD dual-currency pricing is a permanent product constraint, not incidental — invoice and inventory data always carries both Bs and USD figures, and the exchange-rate lookup is pinned to the Venezuelan dolarapi.com endpoint.
- The invoice PDF parser (`extraer_informacion_medicamentos`) currently assumes one fixed-column supplier layout. Supporting additional supplier invoice formats is an anticipated near-term need, not yet built.
- No authentication/authorization exists yet; the app assumes trusted internal use by pharmacy staff.
- No test suite and no `requirements.txt` for the backend (see CLAUDE.md for setup gaps).

## Brand Commitments

None. No specific pharmacy business name or brand identity is attached yet — the product stays generic/unbranded at this stage.

## Evidence on Hand

No sample invoices, real business data, or brand assets were shared. The current parsing regex in `src/back/utils.py` and the `Medicina` model's column set (ALIC, DC/DD/DL/DV, Neto_Bs/Neto_USD, etc.) are the only concrete evidence of the real invoice format in use.

## Product Principles

- Trustworthy currency math: Bs and USD figures must always be visibly paired and never presented ambiguously, given real currency volatility.
- Fast re-entry over manual re-entry: every screen should assume staff are trying to avoid retyping numbers from a paper invoice.
- One fixed invoice format today, more tomorrow: don't hard-code assumptions in the UI that would break when a second supplier format is added.
- Internal tool, not a marketed product: prioritize staff task completion (Operate mode) over persuasion or brand expression.
