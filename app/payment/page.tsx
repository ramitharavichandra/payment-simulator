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

  // ===============================
  // LISTEN PAYMENT STATUS
  // ===============================
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

  // ===============================
  // HANDLE PAYMENT
  // ===============================
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

  // ===============================
  // SUCCESS UI
  // ===============================
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

  // ===============================
  // FAILURE UI
  // ===============================
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

  // ===============================
  // PROCESSING UI
  // ===============================
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

  // ===============================
  // PAYMENT FORM
  // ===============================
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080810 !important; }

        .page { font-family: 'Syne', sans-serif; min-height: 100vh; background: #080810; color: #e2e2f0; display: flex; align-items: center; justify-content: center; padding: 40px 20px; position: relative; }
        .bg-grid { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: linear-gradient(rgba(139,92,246,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.035) 1px, transparent 1px); background-size: 44px 44px; }
        .orb1 { position: fixed; width: 600px; height: 600px; border-radius: 50%; background: radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 65%); top: -200px; right: -150px; pointer-events: none; z-index: 0; }
        .orb2 { position: fixed; width: 400px; height: 400px; border-radius: 50%; background: radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 65%); bottom: -100px; left: -80px; pointer-events: none; z-index: 0; }

        .card { position: relative; z-index: 1; width: 100%; max-width: 420px; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 40px 36px; display: flex; flex-direction: column; gap: 20px; }

        .card-header { text-align: center; margin-bottom: 8px; }
        .card-icon { width: 56px; height: 56px; border-radius: 16px; margin: 0 auto 16px; background: linear-gradient(135deg, #8b5cf6, #06b6d4); display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 8px 28px rgba(139,92,246,0.35); }
        .card-title { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #e2e2f0; margin-bottom: 6px; }
        .card-sub { font-size: 13px; color: #71717a; }

        .field { display: flex; flex-direction: column; gap: 6px; }
        .field-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #52525b; }
        .inp { width: 100%; padding: 13px 16px; font-family: 'JetBrains Mono', monospace; font-size: 13px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #e2e2f0; outline: none; transition: border-color 0.2s, background 0.2s; }
        .inp:focus { border-color: rgba(139,92,246,0.5); background: rgba(139,92,246,0.04); }
        .inp::placeholder { color: #3f3f46; }
        .inp:disabled { opacity: 0.5; }
        .inp option { background: #18181b; color: #e2e2f0; }

        .pay-btn { width: 100%; padding: 14px; font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; border: none; border-radius: 12px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 20px rgba(139,92,246,0.3); margin-top: 8px; }
        .pay-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(139,92,246,0.45); }
        .pay-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
      `}</style>

      <div className="page">
        <div className="bg-grid" /><div className="orb1" /><div className="orb2" />

        <div className="card">
          <div className="card-header">
            <div className="card-title">Make Payment</div>
            <div className="card-sub">Send money instantly to any account</div>
          </div>

          <div className="field">
            <label className="field-label">Currency</label>
            <select className="inp" value={currency} onChange={e => setCurrency(e.target.value)}>
              <option value="INR">🇮🇳 INR — Indian Rupee</option>
              <option value="USD">🇺🇸 USD — US Dollar</option>
              <option value="EUR">🇪🇺 EUR — Euro</option>
            </select>
          </div>

          <div className="field">
            <label className="field-label">Receiver Account ID</label>
            <input
              className="inp"
              placeholder="e.g. 323338889"
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-label">Amount</label>
            <input
              type="number"
              className="inp"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          <button className="pay-btn" onClick={handlePayment} disabled={loading}>
            {loading ? "Processing…" : "Pay Securely →"}
          </button>
        </div>
      </div>
    </>
  );
}
