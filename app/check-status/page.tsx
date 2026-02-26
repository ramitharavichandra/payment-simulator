"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

type PaymentResult = {
  id: string;
  status: "CREATED" | "PROCESSING" | "SUCCESS" | "FAILURE";
  failure_reason: string | null;
  amount: number;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  sender_name?: string;
  receiver_name?: string;
};

const STATUS_CONFIG = {
  SUCCESS:    { color: "#34d399", bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.25)",  icon: "✓", label: "Successful" },
  FAILURE:    { color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)", icon: "✕", label: "Failed"     },
  PROCESSING: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.25)",  icon: "⟳", label: "Processing" },
  CREATED:    { color: "#a78bfa", bg: "rgba(139,92,246,0.1)",  border: "rgba(139,92,246,0.25)",  icon: "○", label: "Created"    },
};

const normalizeStatus = (s: string): PaymentResult["status"] =>
  s.toUpperCase().trim() as PaymentResult["status"];

const isTerminal = (status: string) =>
  status === "SUCCESS" || status === "FAILURE";

export default function CheckStatusPage() {
  const [paymentId, setPaymentId]       = useState("");
  const [result, setResult]             = useState<PaymentResult | null>(null);
  const [currentUser, setCurrentUser]   = useState<{ id: string; account_id: string } | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [pollingCount, setPollingCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const fetchStatus = async (id: string): Promise<PaymentResult | null> => {
    const { data, error: err } = await supabase
      .from("payments")
      .select("id, status, failure_reason, amount, created_at, sender_id, receiver_id")
      .eq("id", id)
      .maybeSingle();

    if (err || !data) return null;

    // Fetch sender name by UUID
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name, account_id")
      .eq("id", data.sender_id)
      .maybeSingle();

    // Fetch receiver name by account_id (text FK)
    const { data: receiverProfile } = await supabase
      .from("profiles")
      .select("full_name, account_id")
      .eq("account_id", data.receiver_id)
      .maybeSingle();

    return {
      id: data.id,
      status: normalizeStatus(String(data.status)),
      failure_reason: data.failure_reason,
      amount: data.amount,
      created_at: data.created_at,
      sender_id: data.sender_id,
      receiver_id: data.receiver_id,
      sender_name:   senderProfile?.full_name   ?? "Unknown",
      receiver_name: receiverProfile?.full_name ?? "Unknown",
    };
  };

  const handleSearch = async () => {
    const trimmed = paymentId.trim();
    if (!trimmed) { setError("Please enter a Payment ID."); return; }

    stopPolling();
    setError(""); setResult(null); setLoading(true); setPollingCount(0);

    // Get current logged-in user to determine direction
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, account_id")
        .eq("id", user.id)
        .maybeSingle();
      if (prof) setCurrentUser(prof);
    }

    const initial = await fetchStatus(trimmed);

    if (!initial) {
      setError("Payment not found. Please check the ID and try again.");
      setLoading(false);
      return;
    }

    setResult(initial);

    if (isTerminal(initial.status)) {
      setLoading(false);
      return;
    }

    // Poll every 1.5s until terminal
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      setPollingCount(attempts);

      const updated = await fetchStatus(trimmed);
      if (!updated) { stopPolling(); setLoading(false); return; }

      setResult(updated);

      if (isTerminal(updated.status) || attempts >= 30) {
        stopPolling();
        setLoading(false);
      }
    }, 1500);
  };

  const cfg = result ? (STATUS_CONFIG[result.status] ?? STATUS_CONFIG.PROCESSING) : null;
  const isPending = result && !isTerminal(result.status);

  // Determine direction from current user's perspective
  const isSent     = currentUser && result?.sender_id === currentUser.id;
  const isReceived = currentUser && result?.receiver_id === currentUser.account_id;

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

        .card { position: relative; z-index: 1; width: 100%; max-width: 520px; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 40px 36px; display: flex; flex-direction: column; gap: 28px; }
        .card-header { text-align: center; }
        .card-icon { width: 56px; height: 56px; border-radius: 16px; margin: 0 auto 16px; background: linear-gradient(135deg, #8b5cf6, #06b6d4); display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 8px 28px rgba(139,92,246,0.35); }
        .card-title { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 6px; }
        .card-sub { font-size: 13px; color: #71717a; }

        .search-wrap { display: flex; flex-direction: column; gap: 12px; }
        .inp { width: 100%; padding: 14px 16px; font-family: 'JetBrains Mono', monospace; font-size: 13px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #e2e2f0; outline: none; transition: border-color 0.2s; }
        .inp:focus { border-color: rgba(139,92,246,0.5); background: rgba(139,92,246,0.04); }
        .inp::placeholder { color: #3f3f46; }
        .inp:disabled { opacity: 0.5; }
        .btn { width: 100%; padding: 14px; font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; border: none; border-radius: 12px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 20px rgba(139,92,246,0.3); }
        .btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(139,92,246,0.45); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .err-msg { font-size: 13px; color: #f87171; background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.2); border-radius: 10px; padding: 11px 14px; text-align: center; }

        .polling-bar-wrap { display: flex; flex-direction: column; gap: 8px; }
        .polling-label { font-size: 12px; color: #71717a; text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .spinner { width: 12px; height: 12px; border: 2px solid rgba(139,92,246,0.3); border-top-color: #8b5cf6; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; flex-shrink: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .progress-track { height: 3px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #8b5cf6, #06b6d4); border-radius: 2px; transition: width 1.4s linear; }

        .result { border-radius: 16px; padding: 24px; border: 1px solid; display: flex; flex-direction: column; gap: 18px; animation: fadeUp 0.35s ease both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .result-top { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .status-badge { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 700; padding: 7px 16px; border-radius: 20px; border: 1px solid; }
        .divider { height: 1px; background: rgba(255,255,255,0.06); }
        .rows { display: flex; flex-direction: column; gap: 12px; }
        .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .row-lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #52525b; padding-top: 2px; flex-shrink: 0; }
        .row-val { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #c4b5fd; text-align: right; word-break: break-all; }
        .row-val.sm { color: #a1a1aa; font-size: 12px; }
        .row-val.name { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 600; color: #e2e2f0; }
        .row-val.sent-name { color: #f87171; }
        .row-val.recv-name { color: #34d399; }
        .failure-box { border-radius: 10px; padding: 12px 14px; background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.2); }
        .failure-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #f87171; margin-bottom: 6px; }
        .failure-reason { font-size: 13px; color: #fca5a5; font-family: 'JetBrains Mono', monospace; line-height: 1.5; }
        .success-glow { box-shadow: 0 0 40px rgba(52,211,153,0.15); }
        .failed-glow  { box-shadow: 0 0 40px rgba(248,113,113,0.15); }
      `}</style>

      <div className="page">
        <div className="bg-grid" /><div className="orb1" /><div className="orb2" />
        <div className="card">
          <div className="card-header">
            <div className="card-icon">🔍</div>
            <div className="card-title">Check Payment Status</div>
            <div className="card-sub">Click a TXN ID on the dashboard to copy, then paste here</div>
          </div>

          <div className="search-wrap">
            <input
              className="inp"
              placeholder="Paste full Payment UUID here"
              value={paymentId}
              onChange={e => { setPaymentId(e.target.value); setError(""); setResult(null); stopPolling(); }}
              onKeyDown={e => e.key === "Enter" && !loading && handleSearch()}
              disabled={loading}
            />
            <button className="btn" onClick={handleSearch} disabled={loading}>
              {loading ? "Checking…" : "Check Status"}
            </button>
          </div>

          {error && <p className="err-msg">{error}</p>}

          {loading && isPending && (
            <div className="polling-bar-wrap">
              <div className="polling-label">
                <span className="spinner" />
                Waiting for payment to settle… ({pollingCount}s)
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${Math.min((pollingCount / 30) * 100, 95)}%` }} />
              </div>
            </div>
          )}

          {result && cfg && (
            <div
              key={result.status}
              className={`result ${result.status === "SUCCESS" ? "success-glow" : result.status === "FAILURE" ? "failed-glow" : ""}`}
              style={{ background: cfg.bg, borderColor: cfg.border }}
            >
              <div className="result-top">
                <span className="status-badge" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                  {cfg.icon} {cfg.label}
                </span>
                <span style={{ fontFamily: "JetBrains Mono", fontSize: 18, fontWeight: 700, color: cfg.color }}>
                  {result.amount != null ? `₹${Number(result.amount).toFixed(2)}` : "—"}
                </span>
              </div>

              <div className="divider" />

              <div className="rows">
                <div className="row">
                  <span className="row-lbl">Payment ID</span>
                  <span className="row-val">{result.id}</span>
                </div>
                <div className="row">
                  <span className="row-lbl">Created At</span>
                  <span className="row-val sm">
                    {new Date(result.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>

                {/* Sender */}
                <div className="row">
                  <span className="row-lbl">{isSent ? "You (Sender)" : "Sent By"}</span>
                  <span className={`row-val name ${isSent ? "sent-name" : ""}`}>
                    {isSent ? "You" : result.sender_name}
                  </span>
                </div>

                {/* Receiver */}
                <div className="row">
                  <span className="row-lbl">{isReceived ? "You (Receiver)" : "Sent To"}</span>
                  <span className={`row-val name ${isReceived ? "recv-name" : ""}`}>
                    {isReceived ? "You" : result.receiver_name}
                  </span>
                </div>
              </div>

              {result.status === "FAILURE" && (
                <>
                  <div className="divider" />
                  <div className="failure-box">
                    <div className="failure-lbl">Failure Reason</div>
                    <div className="failure-reason">{result.failure_reason ?? "No reason provided."}</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}