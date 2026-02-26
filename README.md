# 💳 Mini Payment Gateway Simulator

A full-stack payment gateway simulation built using **Next.js** and **Supabase (PostgreSQL)**.

This system models real-world payment workflows using a state-driven architecture. It supports payment creation, processing, failure handling, transaction summaries, and optional advanced features like refunds and fraud detection.

---

## 🚀 Objective

Build a system that:

- Creates payments  
- Processes them through realistic states  
- Handles failures gracefully  
- Explains outcomes clearly  

---

# 🏗️ Tech Stack

- **Frontend + API**: Next.js  
- **Database**: Supabase (PostgreSQL)  
- **Language**: JavaScript / TypeScript  
- **Architecture**: Full-stack with API routes  

---

# 🧠 System Architecture

Next.js (Frontend + API Routes)  
        ↓  
Supabase (PostgreSQL Database)

---

# 📊 Database Design

### Tables

## 1️⃣ users

- id (UUID, Primary Key)
- username (Unique)
- password (Hashed)
- balance (Numeric, >= 0)
- currency_code
- created_at

## 2️⃣ payments

- id (UUID, Primary Key)
- sender_id (Foreign Key → users.id)
- receiver_id (Foreign Key → users.id)
- sender_amount
- sender_currency
- receiver_amount
- receiver_currency
- exchange_rate
- status (CREATED, PROCESSING, SUCCESS, FAILED, REFUNDED)
- failure_reason
- created_at

## 3️⃣ payment_logs

- id (UUID)
- payment_id (Foreign Key → payments.id)
- old_status
- new_status
- changed_at

---

# ✅ Core Features

---

## 1️⃣ Create Payment

### Input
- amount
- currency
- customerId

### Output
- paymentId
- status (CREATED)

### Behavior
- Generates unique UUID
- Inserts payment with initial status = CREATED

---

## 2️⃣ Payment Processing Engine

### State Flow

CREATED → PROCESSING → SUCCESS  
CREATED → PROCESSING → FAILED  

### Status Transition Methods

- Random-based simulation  
- Rule-based (e.g., invalid amount)  
- Time-based simulation (optional delay)  

### Rule Examples

- Amount ≤ 0 → FAILED  
- Insufficient balance → FAILED  
- Fraud threshold exceeded → FAILED  
- Otherwise → SUCCESS  

All balance updates are handled inside a **PostgreSQL transaction** to ensure data consistency.

---

## 3️⃣ Check Payment Status

Query payment using `paymentId`.

### Response includes:

- Current status  
- Failure reason (if applicable)

---

## 4️⃣ Transaction Summary

Provides:

- Total payments processed  
- Success count  
- Failure count  
- Breakdown of failure reasons  
