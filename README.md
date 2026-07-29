# Aura · Premium Finance App — by IMA WEB3

A premium, mobile-first personal-finance experience that looks and feels like
Copilot Money / Revolut / Linear — not a spreadsheet. Built with Next.js 14
(App Router), React 18 and Tailwind. All financial data can be stored as
**monthly Excel workbooks inside your Google Drive**.

> The original influencer-reporting tool still lives in the repo
> (`components/EntryForm.tsx`, `components/EntriesTable.tsx`, `lib/sheets.ts`,
> `app/api/entries`, `app/api/refresh`). The home experience is now the Aura
> finance app.

## Highlights

- **Smart Home dashboard** — Net worth (animated count-up + interactive area
  chart), cash / assets / debt, spending today / week / month, savings and
  monthly cash flow, upcoming bills, credit-card due dates and subscriptions.
- **Interactive account cards** — tap to expand: recent transactions,
  sparklines, utilization, transfer & insights actions.
- **Smart transfer experience** — from → to → amount with an instant quote:
  money leaving, money arriving, transfer fee (configurable per account pair),
  live USD↔PEN exchange rate, conversion fee, effective rate, balances after,
  estimated arrival and transfer type. Confirmation animates the money moving
  between the two cards.
- **Multi-currency (USD + PEN)** at a reference rate of `1 USD = 3.641 PEN`.
- **Interactive analytics** — donut (tap a category), income-vs-expense bars,
  net-worth trend with range toggles, savings-goal ring, debt payoff.
- **Smart insights** — AI-style callouts ("Restaurants up 28%", "IO utilization
  above 30%", …).
- **Activity timeline** — a social-style feed grouped Today / Yesterday / This
  Week / …, each row expands to receipt, category, location, notes, account and
  running balance.
- **Design system** — dark & light mode, gradients, soft shadows,
  glassmorphism, tabular figures, floating action button, bottom nav, haptics,
  premium loading skeletons, `prefers-reduced-motion` support.

## Google Drive storage (monthly Excel workbooks)

Data is stored inside one Drive folder (`GOOGLE_DRIVE_FOLDER_ID`), organised as:

```
Finance Tracker/
  2026/
    07 - July/
      Finance_July_2026.xlsx
      Receipts/
      Reports/
    08 - August/ …
  Dashboard/
    Annual Summary.xlsx
    Net Worth History.xlsx
  Backups/               # weekly, timestamped
```

- Data is **not uploaded automatically**. It stays on your device until you
  choose to export — a download, or a one-tap "Save month to Drive". The Home
  screen shows an **end-of-month export prompt** so you can close out each month.
- When you do save to Drive, a workbook is created per month (previous months
  are never overwritten).
- Each monthly workbook has these sheets: **Dashboard, Transactions, Income,
  Expenses, Transfers, Accounts, Budgets, Goals, Monthly Summary, Charts**.
- The **Transactions** sheet columns: Date, Time, Description,
  Income/Expense/Transfer, Category, Subcategory, Account, Destination Account,
  Currency, Amount, Transfer Fee, Exchange Rate, Notes, Tags, Receipt Link,
  Running Balance.
- **Monthly Summary** auto-calculates totals, savings, spending/income by
  category, transfers, credit-card payments, largest expense/income, account
  balances and debt remaining.
- **Yearly** `2026 Summary.xlsx` combines every month into annual reports.
- An optional `/api/backup` route can create timestamped backup copies + refresh
  the annual summary (manual/opt-in; not scheduled automatically).

### Storage & data integrity

- Every transaction gets a **unique ID** — no duplicates.
- Changes save to the device immediately (offline-first, localStorage). A small
  badge shows 🟢 Saved / 🟡 Saving.
- **Nothing is pushed to Drive automatically** — you export on demand
  (download or save-to-Drive), e.g. at the end of the month.

### Import / export

- Export the current **month** or the whole **year** as `.xlsx`.
- Download a styled **PDF** financial report.
- Import an existing Excel file (UI hook in **Cards → Data & Google Drive**).

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

The app runs fully **without any configuration** — data persists in the browser
(localStorage) and exports work out of the box. Connect Google Drive to enable
workbook sync.

### Connect Google Drive (OAuth)

1. In <https://console.cloud.google.com> → APIs & Services, enable the
   **Google Drive API** and create an **OAuth 2.0 Client ID** (Web application).
2. Add the redirect URI `http://localhost:3000/api/auth/google/callback`
   (and your production URL) to the client.
3. Copy `.env.example` → `.env.local` and fill in `GOOGLE_OAUTH_CLIENT_ID`,
   `GOOGLE_OAUTH_CLIENT_SECRET` and `GOOGLE_DRIVE_FOLDER_ID`.
4. Run the app, open **Cards → Connect** (or visit `/api/auth/google`), approve
   access, and paste the returned refresh token into
   `GOOGLE_OAUTH_REFRESH_TOKEN`. Redeploy.

Once connected, use **Cards → Save month** (or the end-of-month prompt on Home)
to build and upload the current month's workbook. Transactions are never
uploaded automatically.

## Architecture

```
app/
  page.tsx                      → renders the Aura app
  layout.tsx                    → theme bootstrap, viewport, metadata
  globals.css                   → design-system tokens (light/dark), animations
  api/sync/route.ts             → on-demand: write current month's workbook to Drive
  api/export/route.ts           → month / year xlsx + PDF downloads
  api/backup/route.ts           → optional backup + annual summary (manual)
  api/auth/google/…             → OAuth connect + callback
lib/finance/
  types.ts, data.ts             → domain model + demo data (accounts, tx, bills…)
  format.ts                     → currency, FX, fee quoting, dates
  compute.ts                    → derived metrics, timeline grouping
  store.tsx                     → client store + offline-first sync engine
  excel.ts                      → monthly & yearly workbook generation (ExcelJS)
  drive.ts                      → Google Drive folder structure + upload (googleapis)
components/finance/             → App shell, Home, Analytics, Activity, Cards,
                                  AccountCard, TransferSheet, AddTransactionSheet,
                                  charts, chrome (nav/FAB/theme/sync), ui primitives
```

## Notes

- Demo data is Peru + US flavoured (BCP, Falabella, Bank of America, KAST, IO
  Credit Card) with USD and PEN accounts.
- Charts are dependency-free SVG for a small, fast bundle.
- Live Drive sync requires network + OAuth credentials; in a sandbox without
  them the app degrades gracefully to local-only storage.
