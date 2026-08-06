# NEXUS Stock

Multi-site inventory management for an industrial supply stockroom — receiving,
dispatch, transfers, stock takes, procurement, costing and cross-site
visibility, built for one person running the floor rather than a team of ERP
administrators.

Built with Next.js (App Router) + TypeScript + Tailwind, on Supabase
(Postgres, Auth, RLS, Realtime), deployed to Vercel.

---

## The core idea

Every quantity in the system lives in `stock_levels`, **per item per site** —
never as a single global number. Everything else follows from that: the
dashboard, the lookup screen, transfers and the valuation report all answer
"where is it" as naturally as "how many".

Every change to a quantity goes through one database function,
`post_movement()`. Nothing — not the app, not a client with the anon key —
writes `stock_levels` directly. That is what makes the audit trail in
`stock_movements` complete rather than merely well-intentioned.

## Screens

| Screen | What it is for |
| --- | --- |
| **Dashboard** (`/`) | The 5–10 things to act on today: stock-outs, items below reorder point, deliveries due, stock in transit, counts awaiting approval, recent movements. Filtered by the site picker in the header. |
| **Stock lookup** (`/stock`) | Fuzzy search by code, description or barcode (trigram-ranked, typo tolerant). An exact barcode match jumps straight to the item. |
| **Item** (`/stock/[id]`) | Quantity per site, bin, in-transit and on-order, costs, suppliers, full movement and cost history. |
| **Receiving** (`/receiving`) | Receive against an open PO with partial receipts, or ad-hoc with a reason. Scanning a line fills its outstanding quantity. |
| **Dispatch** (`/dispatch`) | Issue stock to a job, cost centre or customer, with a low-stock warning before it goes out. |
| **Transfers** (`/transfers`) | Site-to-site movement with a real in-transit state. |
| **Stock takes** (`/stock-takes`) | Full or cycle counts, live variance, supervisor approval before anything posts. |
| **Procurement** (`/procurement`) | Reorder suggestions grouped by supplier; one action turns a selection into draft POs. |
| **Reports** (`/reports`) | Valuation, movement CSV export, dead stock, stock-take variance history. |
| **Bin labels** (`/labels`) | Print-ready 38 × 88 mm linbin labels, 14 to an A4 sheet with crop marks and scannable Code 128 barcodes. |

## Roles and access

Enforced by Postgres row level security, not by hiding buttons.

- **admin** — everything, all sites.
- **site_supervisor** — all sites; can approve stock takes and edit reference data.
- **staff** — scoped to their home site plus any sites in `user_sites`. Cannot
  approve a stock take or change costs; RLS rejects the attempt even if the
  request is made directly against the API.

Tables holding posted stock (`stock_levels`, `stock_movements`, `cost_history`)
have **no write policies at all**. They change only via the `SECURITY DEFINER`
functions, each of which re-checks site access itself.

## Data model

`sites` · `profiles` / `user_sites` · `categories` (hierarchical) ·
`suppliers` / `supplier_items` · `stock_items` · **`stock_levels`** (per site) ·
**`stock_movements`** (append-only audit log) · `purchase_orders` /
`purchase_order_lines` · `dispatches` / `dispatch_lines` · `transfers` /
`transfer_lines` · `stock_takes` / `stock_take_lines` · `cost_history`

Reporting views (`v_stock_status`, `v_reorder_suggestions`,
`v_stock_valuation`, `v_movement_log`, `v_purchase_order_summary`,
`v_stock_take_summary`) are all `security_invoker`, so a staff member querying
a valuation sees only their own sites.

### Costing

Weighted average cost is recalculated on every priced receipt, across all
sites, and each change writes a `cost_history` row. Standard cost is changed
explicitly by a supervisor and is likewise logged.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL and publishable key
npm run dev
```

### Migrations

`supabase/migrations/` holds the schema in order — core tables, transactional
tables, business logic, RLS, views, seed data, demo users, hardening, realtime.
Apply them with the Supabase CLI (`supabase db push`) or by running each file
against a fresh project.

### Verifying the label output

The bin labels are generated with `pdf-lib` and hand-rolled Code 128 encoding,
so there are two scripts that check the geometry and that the barcodes are
genuinely scannable:

```bash
npm i -D canvas                                   # only needed for these checks
node --experimental-strip-types scripts/verify-labels.mjs    # A4 geometry, paging
node --experimental-strip-types scripts/verify-barcodes.mjs  # decode round-trip
```

## Keyboard and scanning

- `Ctrl`/`Cmd` + `K` anywhere — search stock or jump to a screen.
- Hardware scanners work as keyboard wedges: they type into the focused field
  and press Enter. Receiving, counting and the item picker all handle that.
- Camera scanning (`@zxing/browser`) is available on every scan button for
  phones without a hardware scanner.
- `Enter` walks down the lines on the receiving and counting screens.

## Deliberately out of scope for v1

Called out rather than silently skipped:

- **Multi-currency** — costs and prices are single-currency (ZAR formatting).
  There is no `currency` column or FX handling.
- **Supplier EDI / order transmission** — "Mark as sent" records that a PO was
  sent; it does not email or transmit it to the supplier.
- **Serial and batch/lot tracking** — quantities are tracked, individual
  serial numbers and expiry-dated batches are not.
- **Bin-level quantities** — one bin reference per item per site, not stock
  split across several bins within a site.
- **Landed cost** — freight, duty and clearing are not apportioned into the
  weighted average; only the line price is.
- **Backorders and allocations** — dispatch checks available stock at the
  moment of issue; it does not reserve stock against future demand.
- **Barcode label stock other than 38 × 88 mm** — the sheet geometry is fixed
  to the linbin format currently in use.
