"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PaymentPage() {

  const [currency, setCurrency] = useState("INR");
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] =
    useState<"idle" | "processing" | "success" | "failure">("idle");

  // LISTEN PAYMENT STATUS
  const listenForStatus = (paymentId: string) => {
    supabase
      .channel("payment-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "payments",
          filter: `id=eq.${paymentId}`,
        },
        (payload) => {
          const status = String(payload.new.status).toLowerCase();
          if (status === "success") { setPaymentStatus("success"); setLoading(false); }
          if (status === "failure") { setPaymentStatus("failure"); setLoading(false); }
        }
      )
      .subscribe();
  };

  // HANDLE PAYMENT
  const handlePayment = async () => {
    if (!customerId.trim() || !amount.trim()) {
      alert("Please fill in all fields");
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

    const { data: receiver } = await supabase
      .from("profiles")
      .select("id, account_id")
      .eq("account_id", customerId.trim())
      .maybeSingle();

    if (!receiver) {
      alert(`Receiver not found. Please check the Account ID.`);
      setPaymentStatus("idle");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("payments")
      .insert({
        sender_id: user.id,
        receiver_id: receiver.account_id,
        amount: Number(amount),
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
      setPaymentStatus("idle");
      setLoading(false);
      return;
    }

    listenForStatus(data.id);
  };

  const resetForm = () => {
    setPaymentStatus("idle");
    setLoading(false);
    setAmount("");
    setCustomerId("");
  };

  // SUCCESS UI
  if (paymentStatus === "success") {
    return (
      <div style={{ minHeight: "100vh", background: "#080810", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>✅</div>
          <p style={{ fontSize: 22, fontWeight: 800, color: "#34d399", fontFamily: "Syne, sans-serif", marginBottom: 8 }}>Payment Successful</p>
          <p style={{ fontSize: 13, color: "#71717a", marginBottom: 28 }}>The amount has been transferred successfully.</p>
          <button onClick={resetForm} style={{ padding: "10px 28px", borderRadius: 999, background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "Syne, sans-serif" }}>
            Make Another Payment
          </button>
        </div>
      </div>
    );
  }

  // FAILURE UI
  if (paymentStatus === "failure") {
    return (
      <div style={{ minHeight: "100vh", background: "#080810", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>❌</div>
          <p style={{ fontSize: 22, fontWeight: 800, color: "#f87171", fontFamily: "Syne, sans-serif", marginBottom: 8 }}>Payment Failed</p>
          <p style={{ fontSize: 13, color: "#71717a", marginBottom: 28 }}>Something went wrong. Please try again.</p>
          <button onClick={resetForm} style={{ padding: "10px 28px", borderRadius: 999, background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "Syne, sans-serif" }}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // PROCESSING UI
  if (paymentStatus === "processing") {
    return (
      <div style={{ minHeight: "100vh", background: "#080810", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 64, height: 64, border: "3px solid rgba(139,92,246,0.3)", borderTopColor: "#8b5cf6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 24px" }} />
          <p style={{ fontSize: 18, fontWeight: 700, color: "#e2e2f0", fontFamily: "Syne, sans-serif", marginBottom: 8 }}>Processing Payment...</p>
          <p style={{ fontSize: 13, color: "#71717a" }}>Please wait, do not close this page</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // PAYMENT FORM
  return (
<>
<style>{`
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
