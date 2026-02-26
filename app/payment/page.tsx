// frontend + backend - Aarushi Deshmukh

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PaymentPage() {

  const [currency, setCurrency] = useState("INR");
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");

  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] =
    useState<"idle" | "processing" | "success" | "failed">("idle");

  // ===============================
  // LISTEN PAYMENT STATUS
  // ===============================

  // ===============================
  // HANDLE PAYMENT
  // ===============================
  const handlePayment = async () => {

  if (!customerId.trim() || !amount.trim()) {
    alert("Fill all fields");
    return;
  }

  setLoading(true);
  setPaymentStatus("processing");

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    alert("No session");
    setLoading(false);
    setPaymentStatus("idle");
    return;
  }

  // 🔎 Find receiver by account_id
  const { data: receiver } = await supabase
    .from("profiles")
    .select("account_id")
    .eq("account_id", customerId.trim())
    .maybeSingle();

  if (!receiver) {
    alert("Receiver not found");
    setLoading(false);
    setPaymentStatus("idle");
    return;
  }

  // ✅ Insert WITHOUT sending status (enum handled by DB)
  const { data, error } = await supabase
    .from("payments")
    .insert({
      sender_id: user.id,
      receiver_id: receiver.account_id,
      amount: Number(amount)
    })
    .select("id")
    .single();

  if (error || !data) {
    alert(error?.message ?? "Payment failed");
    setPaymentStatus("failed");
    setLoading(false);
    return;
  }

  const paymentId = data.id;

  // ⏳ Wait 5 seconds
  setTimeout(async () => {

    const { data: payment } = await supabase
      .from("payments")
      .select("status")
      .eq("id", paymentId)
      .single();

    if (!payment) {
      setPaymentStatus("failed");
      setLoading(false);
      return;
    }

    const status = String(payment.status).toUpperCase();

    if (status === "SUCCESS") {
      setPaymentStatus("success");
    } else if (status === "FAILURE") {
      setPaymentStatus("failed");
    } else {
      setPaymentStatus("processing");
    }

    setLoading(false);

  }, 5000);
};
  // ===============================
  // SUCCESS UI
  // ===============================
  if (paymentStatus === "success") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-green-500 text-6xl">✅</div>
          <p className="text-xl font-bold mt-4">
            Payment Successful
          </p>
        </div>
      </div>
    );
  }

  // ===============================
  // FAILED UI
  // ===============================
  if (paymentStatus === "failed") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl">❌</div>
          <p className="text-xl font-bold mt-4">
            Payment Failed
          </p>
        </div>
      </div>
    );
  }

  // ===============================
  // PROCESSING UI
  // ===============================
  if (paymentStatus === "processing") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"/>
          <p className="font-semibold">
            Processing payment...
          </p>
        </div>
      </div>
    );
  }

  // ===============================
  // PAYMENT FORM
  // ===============================
  return (
<>
<style>{`
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

body {
  margin:0;
  background:#080810 !important;
}

.page {
  font-family:'Syne',sans-serif;
  min-height:100vh;
  background:#080810;
  color:#e2e2f0;
}

/* SAME DASHBOARD BACKGROUND */
.grid-bg{
  position:fixed;
  inset:0;
  pointer-events:none;
  background-image:
    linear-gradient(rgba(139,92,246,.035) 1px,transparent 1px),
    linear-gradient(90deg,rgba(139,92,246,.035) 1px,transparent 1px);
  background-size:44px 44px;
}

.orb1{
  position:fixed;
  width:600px;
  height:600px;
  border-radius:50%;
  background:radial-gradient(circle,rgba(139,92,246,.1),transparent 65%);
  top:-200px;
  right:-120px;
}

.orb2{
  position:fixed;
  width:400px;
  height:400px;
  border-radius:50%;
  background:radial-gradient(circle,rgba(6,182,212,.07),transparent 65%);
  bottom:-120px;
  left:-80px;
}

/* DASHBOARD CARD STYLE */
.pay-card{
  background:rgba(255,255,255,.025);
  border:1px solid rgba(255,255,255,.07);
  backdrop-filter:blur(20px);
  border-radius:22px;
  padding:36px;
  width:420px;
  display:flex;
  flex-direction:column;
  gap:18px;
}

.title{
  font-size:22px;
  font-weight:800;
  text-align:center;
}

.label{
  font-size:11px;
  letter-spacing:2px;
  text-transform:uppercase;
  color:#52525b;
}

.input{
  width:100%;
  padding:14px;
  border-radius:12px;
  border:1px solid rgba(255,255,255,.1);
  background:rgba(255,255,255,.04);
  color:white;
  outline:none;
  font-family:'JetBrains Mono',monospace;
}

.input:focus{
  border-color:rgba(139,92,246,.5);
}

.pay-btn{
  margin-top:10px;
  padding:14px;
  border-radius:12px;
  border:none;
  font-weight:700;
  cursor:pointer;
  color:white;
  background:linear-gradient(135deg,#8b5cf6,#06b6d4);
  transition:.25s;
}

.pay-btn:hover:not(:disabled){
  transform:translateY(-2px);
  box-shadow:0 10px 28px rgba(139,92,246,.4);
}

.pay-btn:disabled{
  opacity:.5;
  cursor:not-allowed;
}
`}</style>

<div className="page">
<div className="grid-bg"/>
<div className="orb1"/>
<div className="orb2"/>

<div className="flex h-screen items-center justify-center">

<div className="pay-card">

<div className="title">
Make Payment
</div>

<div>
<div className="label">Currency</div>
<select
className="input"
value={currency}
onChange={(e)=>setCurrency(e.target.value)}
>
<option>INR</option>
<option>USD</option>
<option>EUR</option>
</select>
</div>

<div>
<div className="label">Receiver Account ID</div>
<input
className="input"
placeholder="Enter Account ID"
value={customerId}
onChange={(e)=>setCustomerId(e.target.value)}
/>
</div>

<div>
<div className="label">Amount</div>
<input
type="number"
className="input"
placeholder="0.00"
value={amount}
onChange={(e)=>setAmount(e.target.value)}
/>
</div>

<button
onClick={handlePayment}
disabled={loading}
className="pay-btn"
>
{loading ? "Processing..." : "Pay Securely →"}
</button>

</div>
</div>
</div>
</>
);
}