# Forma ecommerce store

A working ecommerce application with a responsive storefront and an authenticated store-management workspace. Built with React, TypeScript, Vinext, and Cloudflare D1.

## Features

- Search, category filters, stock and price filters, sorting, saved products, product details, and a persistent cart.
- Editable catalog: create products, add any category, change prices and stock, define finishes/variants, add arbitrary product attributes, and archive products by disabling visibility.
- Checkout with delivery details, **demo payments** and **cash on delivery**. Online payments are simulated; no real funds are charged and no card data is collected.
- Durable orders with immutable item and price snapshots. Track Processing → Shipped → Delivered, or cancel a processing order.
- Transaction ledger, status filters, and CSV export. Demo cancellations create a Demo refunded status. COD becomes Collected when delivery is marked complete.
- Atomic inventory changes and transaction/order creation, prevention of negative stock, and idempotent checkout retries. Cancellation restores inventory once.
- Authenticated database access. Each signed-in user has a separate store workspace, catalog, orders, and transaction records. The hosted Site starts private to its owner.

All prices are INR. Shipping is ₹199, with complimentary shipping for a subtotal of ₹5,000 or more. Inventory is tracked per product and shared across its finishes; the product editor explains this. Seed data and photography illustrate a demo store and can be replaced in Manage catalog.

## Run locally

Requires Node.js 22.13 or newer, npm, and Git. From this directory:

```powershell
npm run install:ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_thankful_micromax.sql
npm run dev
```

Apply the migration once per fresh local database. Open the URL printed by the dev server, normally http://127.0.0.1:5173, and use Sign in with ChatGPT. Local development simulates sign-in as `seedy@sites.test`; this mock authentication is excluded from the production build. Hosted sign-in is managed by Sites.

Local and hosted databases are separate. Eight example products are created for a workspace on its first authenticated catalog request. Local QA orders are not published.

## Working with the store

1. Open **Manage catalog** to create or edit products. Uncheck “Visible in the shop” to archive one; historical orders retain their original information.
2. Shop, choose a finish, add items to the bag, and complete checkout.
3. Open **Orders**, then **View**, to manage fulfilment or cancel a processing order. Cancelling returns the quantity to available stock.
4. Open **Transactions** to inspect records and export a CSV.

Cash collection and shipment are manually recorded workflow actions. There is no courier integration, live payment gateway, email delivery, or automated refunds. An order confirmation is shown on-screen. This version is a private demo store/workspace; making it a public multi-customer shop would require merchant/customer roles and shared-catalog authorization.

## Validation

```powershell
node node_modules/typescript/bin/tsc --noEmit
npm run build
```

The implementation was also checked in Chrome at desktop and phone sizes. Browser/API checks covered catalog filters, saved products, cart persistence and variant selection, COD checkout and fulfilment, CSV download, server-calculated totals, idempotent retries, cancellation and inventory restoration, invalid requests, flexible product creation, concurrent checkout without overselling, archived-product visibility, image loading, and browser runtime errors.

## Source map

- `app/Store.tsx`: storefront and management screens
- `app/store.css`: responsive styling
- `app/api/store/route.ts`: authenticated store API
- `app/seed.ts`: initial demo catalog
- `app/types.ts`: shared types and INR formatting
- `db/schema.ts` and `drizzle/`: D1 schema and migrations
- `.openai/hosting.json`: existing Sites identity and database binding

## Photo credits

Demo photography is from Unsplash. Source URLs are recorded in `ASSETS.md`.
