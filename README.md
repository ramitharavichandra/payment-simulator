# PaySim — Payment Simulator

A full-stack payment simulation platform built with **Next.js 14**, **Supabase**, and **PostgreSQL**. PaySim allows users to send and receive money between accounts, with real-time status tracking, balance updates, and transaction history.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | PostgreSQL Stored Functions (via Supabase) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime (Postgres Changes) |

---

## 📁 Project Structure

```
payment-simulator/
├── app/                        # Next.js pages and API endpoints
│   ├── dashboard/              # Main dashboard (balance, stats, transactions)
│   ├── payment/                # Payment form page
│   ├── check-status/           # Payment status lookup page
│   └── signin/                 # Authentication page
├── components/                 # Reusable UI components
├── lib/
│   └── supabase.ts             # Supabase client setup
├── public/                     # Public assets (images, favicon)
├── middleware.ts               # Next.js middleware (auth protection)
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
├── package.json                # NPM dependencies & scripts
└── README.md                   # Project documentation
```

---

## ⚙️ Features

- **User Authentication** — Sign up / Sign in via Supabase Auth
- **Send Payments** — Transfer money to any user by their Account ID
- **Real-time Status** — Payment status updates live via Supabase Realtime
- **Transaction History** — View all sent and received payments with filters
- **Balance Tracking** — Sender balance deducted, receiver balance credited automatically
- **Failure Handling** — Payments fail with clear reasons (insufficient balance, receiver not found)
- **Check Status Page** — Look up any payment by UUID and see full details

---

## 🗄️ Database Schema

### `profiles` table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key, linked to auth.users |
| full_name | text | User's display name |
| account_id | text | Unique text account identifier |
| balance | numeric | Current wallet balance |
| currency | text | Account currency (INR, USD, etc.) |
| created_at | timestamp | Account creation time |

### `payments` table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (auto-generated) |
| sender_id | uuid | FK → profiles.id |
| receiver_id | text | FK → profiles.account_id |
| amount | numeric(15,2) | Payment amount |
| status | enum (status) | Current payment status |
| failure_reason | text | Reason if payment failed |
| created_at | timestamp | Payment creation time |

---

## 🔄 Payment State Transitions

Every payment goes through the following states:

```
  INSERT
    │
    ▼
┌─────────┐
│ CREATED │  ← Payment row inserted into DB
└────┬────┘
     │ Trigger fires automatically
     ▼
┌────────────┐
│ PROCESSING │  ← pg_sleep(2) simulates processing delay
└─────┬──────┘
      │
      ├──── Receiver not found ──────────────────────────┐
      │                                                   ▼
      ├──── Sender has insufficient balance ──────► ┌─────────┐
      │                                             │ FAILURE │
      │                                             └─────────┘
      │
      ▼ (all checks pass)
┌─────────┐
│ SUCCESS │  ← Balances updated for sender and receiver
└─────────┘
```

### State Descriptions

| Status | Description |
|--------|-------------|
| `created` | Payment row has been inserted, trigger not yet fired |
| `processing` | Payment is being validated and processed |
| `success` | Payment completed — sender debited, receiver credited |
| `failure` | Payment failed — see `failure_reason` for details |

---

## ❌ Failure Rules

A payment transitions to `failure` status in these cases:

| Rule | Failure Reason |
|------|----------------|
| `receiver_id` does not match any `profiles.account_id` | `"Receiver not found"` |
| `sender.balance < payment.amount` | `"Insufficient balance"` |

When a payment fails:
- Sender's balance is **NOT deducted**
- Receiver's balance is **NOT updated**
- The `failure_reason` column is populated with the exact reason

---

## 🔧 Backend — How It Works

The payment processing logic lives entirely in a **PostgreSQL stored function** called `process_payment()`, triggered automatically on every payment insert.

### Trigger Chain

```
payments INSERT
    → payment_after_insert trigger
    → payment_trigger_fn()
    → process_payment(payment_id)
```

### `process_payment()` Logic

```sql
1. UPDATE payments SET status = 'processing'
2. PERFORM pg_sleep(2)             -- simulates async processing
3. SELECT sender profile
4. SELECT receiver profile by account_id
5. IF receiver IS NULL → status = 'failure', reason = 'Receiver not found'
6. IF sender.balance < amount → status = 'failure', reason = 'Insufficient balance'
7. UPDATE sender balance  → balance - amount
8. UPDATE receiver balance → balance + amount
9. UPDATE payments SET status = 'success'
```

This is a **database-driven backend** pattern — business logic runs inside Postgres, not in a separate Node.js server. This is a valid production architecture used by many fintech systems.

---

## 🔐 Row Level Security (RLS)

All tables have RLS enabled. The following policies are in place:

### `profiles` table
| Policy | Action | Rule |
|--------|--------|------|
| `profiles_select_authenticated` | SELECT | Any authenticated user can read any profile |
| `profiles_update_own` | UPDATE | Users can only update their own profile |
| `insert_your_details` | INSERT | Authenticated users can insert |

### `payments` table
| Policy | Action | Rule |
|--------|--------|------|
| `select_payment` | SELECT | `sender_id = auth.uid()` OR `receiver_id = current user's account_id` |
| `insert_policy` | INSERT | Authenticated users can insert |
| `update_payment` | UPDATE | Sender or receiver can update |

---

## 🖥️ Pages

### `/dashboard`
- Shows current user's profile, balance, and account ID
- Stats: total transactions, successful, failed, in-progress
- Total sent and total received amounts
- Transaction history table with filters (All / Sent / Received) and status filter
- Counterparty names (To / From) shown for each transaction
- Real-time updates via Supabase Realtime

### `/payment`
- Form to send money to another user by Account ID
- Validates receiver exists before inserting payment
- Shows processing spinner while payment is being processed
- Redirects to success or failure screen based on realtime status update

### `/check-status`
- Look up any payment by its UUID
- Shows payment status, amount, sender name, receiver name
- Auto-polls every 1.5s if payment is still processing
- Shows failure reason if payment failed

---

## 🏗️ Design Assumptions

1. **Account ID is text, not UUID** — `receiver_id` in payments references `profiles.account_id` (a text field like `"323338889"`), not the user's UUID. This allows human-readable account numbers.

2. **Single currency per profile** — Each user has one currency set on their profile. The payment form accepts a currency selector but the backend processes using the stored balance directly.

3. **No transaction rollback** — If the process fails mid-way (e.g., after deducting sender but before crediting receiver), there is no automatic rollback. This is a simulator and not production-grade.

4. **Simulated processing delay** — `pg_sleep(2)` simulates a 2-second processing delay to mimic real payment gateway behavior.

5. **No duplicate payment protection** — The system does not prevent double-submits. In production, idempotency keys would be used.

6. **Realtime via Supabase** — Status updates use Supabase Postgres Changes. The frontend polls as a fallback every 1.5s in case realtime events are missed.

7. **Database-as-backend** — All business logic (balance checks, deductions, credits) runs inside a Postgres stored function. There are no separate API routes for payment processing.

8. **RLS for security** — All data access is controlled via Supabase Row Level Security policies, ensuring users can only access their own data or data they are a party to.

---

## 🛠️ Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/your-username/payment-simulator.git
cd payment-simulator

# 2. Install dependencies
npm install

# 3. Create .env.local and add your Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 4. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📝 Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

---

## 👩‍💻 Author

Built as a payment simulation project using Next.js and Supabase.
