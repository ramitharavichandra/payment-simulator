"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  full_name: string;
  account_id: string;
  balance: number;
  currency: string;
  created_at: string;
};

type Payment = {
  id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  status: "CREATED" | "PROCESSING" | "SUCCESS" | "FAILURE";
  failure_reason: string | null;
  created_at: string;
  sender_name?: string;
  receiver_name?: string;
};

const fmt = (n: number, currency = "INR") => {
  if (n == null || isNaN(Number(n))) return "—";
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(Number(n));
  } catch {
    return `${currency} ${Number(n).toFixed(2)}`;
  }
};

const timeAgo = (date: string) => {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const BADGE: Record<string, { bg: string; color: string; border: string }> = {
  SUCCESS:    { bg: "rgba(52,211,153,0.12)",  color: "#34d399", border: "rgba(52,211,153,0.25)"  },
  FAILURE:    { bg: "rgba(248,113,113,0.12)", color: "#f87171", border: "rgba(248,113,113,0.25)" },
  PROCESSING: { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24", border: "rgba(251,191,36,0.25)"  },
  CREATED:    { bg: "rgba(139,92,246,0.12)",  color: "#a78bfa", border: "rgba(139,92,246,0.25)"  },
};

const normalizeStatus = (s: string): Payment["status"] =>
  s.toUpperCase().trim() as Payment["status"];

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab]       = useState<"all" | "sent" | "received">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "SUCCESS" | "FAILURE" | "PROCESSING" | "CREATED">("all");
  const [copiedId, setCopiedId]         = useState<string | null>(null);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/signin");
  };

  const copyId = async (id: string) => {
    try {
      if (typeof window !== "undefined" && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(id);
      } else {
        // Fallback for HTTP / unsupported browsers
        const textarea = document.createElement("textarea");
        textarea.value = id;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
  
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const fetchData = async (uid: string) => {
    // First get the profile to get account_id
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();

    if (!prof) { setLoading(false); return; }
    setProfile(prof);

    const accountId = prof.account_id; // text account_id for receiver_id matching

    // FIX: sender_id is UUID, receiver_id is text account_id
    const { data: pays } = await supabase
      .from("payments")
      .select("id, sender_id, receiver_id, amount, status, failure_reason, created_at")
      .or(`sender_id.eq.${uid},receiver_id.eq.${accountId}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!pays || pays.length === 0) {
      setPayments([]);
      setLoading(false);
      return;
    }

    // Collect all unique sender UUIDs and receiver account_ids
    const senderIds   = [...new Set(pays.map(p => p.sender_id).filter(Boolean))];
    const receiverIds = [...new Set(pays.map(p => p.receiver_id).filter(Boolean))];

    // Fetch sender profiles by UUID
    const { data: senderProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, account_id")
      .in("id", senderIds);

    // Fetch receiver profiles by account_id (text FK)
    const { data: receiverProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, account_id")
      .in("account_id", receiverIds);

    // Build lookup maps
    const senderMap: Record<string, string> = {};
    (senderProfiles ?? []).forEach(p => { senderMap[p.id] = p.full_name; });

    const receiverMap: Record<string, string> = {};
    (receiverProfiles ?? []).forEach(p => { receiverMap[p.account_id] = p.full_name; });

    setPayments(
      pays.map(p => ({
        ...p,
        status: normalizeStatus(String(p.status)),
        sender_name:   senderMap[p.sender_id]    ?? "Unknown",
        receiver_name: receiverMap[p.receiver_id] ?? "Unknown",
      }))
    );

    setLoading(false);
  };

  useEffect(() => {
    let userId: string | null = null;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/signin"); return; }
      userId = user.id;
      await fetchData(user.id);
    };

    init();

    const onFocus = () => { if (userId) fetchData(userId); };
    window.addEventListener("focus", onFocus);

    const channel = supabase
      .channel("dashboard-payments")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" },
        () => { if (userId) fetchData(userId); }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" },
        () => { if (userId) fetchData(userId); }
      )
      .subscribe();

    return () => {
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channel);
    };
  }, [router]);

  const stats = {
    total:      payments.length,
    success:    payments.filter(p => p.status === "SUCCESS").length,
    failed:     payments.filter(p => p.status === "FAILURE").length,
    processing: payments.filter(p => p.status === "PROCESSING" || p.status === "CREATED").length,
    totalSent: payments
      .filter(p => p.sender_id === profile?.id && p.status === "SUCCESS")
      .reduce((a, p) => a + Number(p.amount), 0),
    totalReceived: payments
      .filter(p => p.receiver_id === profile?.account_id && p.status === "SUCCESS")
      .reduce((a, p) => a + Number(p.amount), 0),
  };

  const filtered = payments.filter(p => {
    const dirMatch =
      activeTab === "sent"     ? p.sender_id   === profile?.id :
      activeTab === "received" ? p.receiver_id === profile?.account_id : true;
    const statusMatch = statusFilter === "all" ? true : p.status === statusFilter;
    return dirMatch && statusMatch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center flex-col gap-4">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm font-mono tracking-widest uppercase">Loading</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; background: #080810 !important; }
        .dash { font-family: 'Syne', sans-serif; min-height: 100vh; background: #080810; color: #e2e2f0; }
        .grid-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: linear-gradient(rgba(139,92,246,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.035) 1px, transparent 1px); background-size: 44px 44px; }
        .orb1 { position: fixed; width: 600px; height: 600px; border-radius: 50%; background: radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 65%); top: -200px; right: -100px; pointer-events: none; z-index: 0; }
        .orb2 { position: fixed; width: 400px; height: 400px; border-radius: 50%; background: radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 65%); bottom: -100px; left: -50px; pointer-events: none; z-index: 0; }
        .content { position: relative; z-index: 1; }
        .main { max-width: 1280px; margin: 0 auto; padding: 32px 24px; display: flex; flex-direction: column; gap: 24px; }

        .profile-card { background: linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(6,182,212,0.09) 100%); border: 1px solid rgba(139,92,246,0.28); border-radius: 22px; padding: 28px 32px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px; position: relative; overflow: hidden; }
        .profile-card::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(139,92,246,0.05), transparent); }
        .profile-left { display: flex; align-items: center; gap: 18px; position: relative; }
        .avatar { width: 58px; height: 58px; border-radius: 18px; background: linear-gradient(135deg, #8b5cf6, #06b6d4); display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; color: white; flex-shrink: 0; box-shadow: 0 6px 20px rgba(139,92,246,0.4); }
        .profile-name { font-size: 22px; font-weight: 700; margin: 0 0 5px; }
        .profile-acct { font-size: 13px; color: #71717a; }
        .profile-acct span { color: #a78bfa; font-family: 'JetBrains Mono', monospace; }
        .balance-block { text-align: right; position: relative; }
        .balance-label { font-size: 11px; color: #52525b; text-transform: uppercase; letter-spacing: 2.5px; margin-bottom: 5px; }
        .balance-amount { font-size: 38px; font-weight: 800; color: #c4b5fd; letter-spacing: -1.5px; }
        .balance-sub { font-size: 12px; color: #52525b; margin-top: 3px; font-family: 'JetBrains Mono', monospace; }

        .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(155px, 1fr)); gap: 14px; }
        .stat-card { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 20px; transition: border-color 0.2s, transform 0.2s; }
        .stat-card:hover { border-color: rgba(139,92,246,0.3); transform: translateY(-2px); }
        .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #3f3f46; margin-bottom: 10px; }
        .stat-value { font-size: 28px; font-weight: 800; letter-spacing: -1px; line-height: 1; }
        .stat-value.green  { color: #34d399; }
        .stat-value.amber  { color: #fbbf24; }
        .stat-value.red    { color: #f87171; }
        .stat-value.violet { color: #a78bfa; }
        .stat-value.cyan   { color: #22d3ee; }
        .stat-value.small  { font-size: 18px; margin-top: 4px; }

        .panel { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; overflow: hidden; }
        .panel-header-wrap { padding: 18px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .panel-header-left { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .panel-title { font-size: 15px; font-weight: 700; }

        .tabs { display: flex; gap: 3px; background: rgba(255,255,255,0.04); padding: 4px; border-radius: 10px; }
        .tab { font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 7px; border: none; cursor: pointer; color: #52525b; background: transparent; transition: all 0.2s; }
        .tab.active { background: rgba(139,92,246,0.18); color: #c4b5fd; }
        .tab:hover:not(.active) { color: #a1a1aa; }

        .filter-select { font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 600; padding: 7px 30px 7px 12px; border-radius: 9px; cursor: pointer; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: #a1a1aa; outline: none; transition: border-color 0.2s; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; }
        .filter-select:focus { border-color: rgba(139,92,246,0.4); color: #e2e2f0; }
        .filter-select option { background: #18181b; color: #e2e2f0; }

        .table-wrap { overflow-x: auto; max-height: 540px; overflow-y: auto; }
        .table-wrap::-webkit-scrollbar { width: 3px; } .table-wrap::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.25); border-radius: 2px; }
        .tx-table { width: 100%; border-collapse: collapse; }
        .tx-table th { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #3f3f46; font-weight: 600; padding: 12px 20px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); position: sticky; top: 0; background: #0d0d18; z-index: 2; }
        .tx-table td { padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 13px; }
        .tx-row:hover td { background: rgba(139,92,246,0.04); }
        .tx-row:last-child td { border-bottom: none; }
        .tx-id { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #3f3f46; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 6px; border: 1px solid transparent; transition: all 0.15s; }
        .tx-id:hover { color: #a78bfa; border-color: rgba(139,92,246,0.25); background: rgba(139,92,246,0.08); }
        .tx-id.copied { color: #34d399 !important; border-color: rgba(52,211,153,0.25) !important; background: rgba(52,211,153,0.08) !important; }
        .tx-time { font-size: 11px; color: #3f3f46; font-family: 'JetBrains Mono', monospace; }
        .tx-amount-pos { color: #34d399; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
        .tx-amount-neg { color: #f87171; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
        .badge { display: inline-flex; align-items: center; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid; }
        .empty { text-align: center; padding: 64px; color: #3f3f46; font-size: 14px; }
        .failure-text { font-size: 11px; color: #f87171; font-family: 'JetBrains Mono', monospace; max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .counterparty { display: flex; flex-direction: column; gap: 2px; }
        .counterparty-label { font-size: 10px; color: #3f3f46; text-transform: uppercase; letter-spacing: 1px; }
        .counterparty-name { font-size: 13px; font-weight: 600; color: #e2e2f0; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .main > * { animation: fadeIn 0.4s ease both; }
        .main > *:nth-child(1) { animation-delay: 0.05s; }
        .main > *:nth-child(2) { animation-delay: 0.10s; }
        .main > *:nth-child(3) { animation-delay: 0.15s; }
      `}</style>

      <div className="dash">
        <div className="grid-bg" /><div className="orb1" /><div className="orb2" />
        <nav
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 32px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(8,8,16,0.8)",
    backdropFilter: "blur(20px)",
    position: "sticky",
    top: 0,
    zIndex: 50,
  }}
  className="content"
>
  <span
    style={{
      fontSize: 16,
      fontWeight: 800,
      letterSpacing: -0.5,
      color: "#e2e2f0",
    }}
  >
    Pay<span style={{ color: "#8b5cf6" }}>Sim</span>
  </span>

  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
    <span style={{ fontSize: 13, color: "#71717a" }}>
      {profile?.full_name}
    </span>

    {/* ✅ SUPPORT BUTTON */}
    <button
      onClick={() => router.push("/support")}
      style={{
        fontFamily: "'Syne', sans-serif",
        fontSize: 13,
        fontWeight: 600,
        padding: "8px 16px",
        borderRadius: 8,
        cursor: "pointer",
        background: "rgba(139,92,246,0.1)",
        color: "#a78bfa",
        border: "1px solid rgba(139,92,246,0.2)",
        transition: "all 0.2s",
      }}
    >
      Support
    </button>

    {/* SIGN OUT BUTTON */}
    <button
      onClick={handleSignOut}
      style={{
        fontFamily: "'Syne', sans-serif",
        fontSize: 13,
        fontWeight: 600,
        padding: "8px 16px",
        borderRadius: 8,
        cursor: "pointer",
        background: "rgba(239,68,68,0.1)",
        color: "#f87171",
        border: "1px solid rgba(239,68,68,0.2)",
        transition: "all 0.2s",
      }}
    >
      Sign Out
    </button>
  </div>
</nav>



        <div className="main content">
          {/* Profile */}
          <div className="profile-card">
            <div className="profile-left">
              <div className="avatar">{profile?.full_name?.[0]?.toUpperCase() ?? "?"}</div>
              <div>
                <p className="profile-name">{profile?.full_name}</p>
                <p className="profile-acct">Account ID: <span>{profile?.account_id}</span></p>
              </div>
            </div>
            <div className="balance-block">
              <p className="balance-label">Available Balance</p>
              <p className="balance-amount">{fmt(profile?.balance ?? 0, profile?.currency ?? "INR")}</p>
              <p className="balance-sub">{profile?.currency ?? "INR"} · Live</p>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-row">
            <div className="stat-card"><p className="stat-label">Total Transactions</p><p className="stat-value violet">{stats.total}</p></div>
            <div className="stat-card"><p className="stat-label">Successful</p><p className="stat-value green">{stats.success}</p></div>
            <div className="stat-card"><p className="stat-label">In Progress</p><p className="stat-value amber">{stats.processing}</p></div>
            <div className="stat-card"><p className="stat-label">Failed</p><p className="stat-value red">{stats.failed}</p></div>
            <div className="stat-card"><p className="stat-label">Total Sent</p><p className="stat-value red small">{fmt(stats.totalSent, profile?.currency ?? "INR")}</p></div>
            <div className="stat-card"><p className="stat-label">Total Received</p><p className="stat-value cyan small">{fmt(stats.totalReceived, profile?.currency ?? "INR")}</p></div>
          </div>

          {/* Table */}
          <div className="panel">
            <div className="panel-header-wrap">
              <div className="panel-header-left">
                <span className="panel-title">Transaction History</span>
                <div className="tabs">
                  {(["all", "sent", "received"] as const).map(t => (
                    <button key={t} className={`tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
                      {t[0].toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}>
                <option value="all">All Statuses</option>
                <option value="SUCCESS">✓ Successful</option>
                <option value="FAILURE">✕ Failed</option>
                <option value="PROCESSING">⟳ Processing</option>
                <option value="CREATED">○ Created</option>
              </select>
            </div>
            <div className="table-wrap">
              {filtered.length === 0 ? (
                <p className="empty">No transactions found</p>
              ) : (
                <table className="tx-table">
                  <thead>
                    <tr><th>TXN ID</th><th>Direction</th><th>Counterparty</th><th>Amount</th><th>Status</th><th>Failure Reason</th><th>Time</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => {
                      const isSent = p.sender_id === profile?.id;
                      const b = BADGE[p.status] ?? BADGE.CREATED;
                      const counterpartyLabel = isSent ? "To" : "From";
                      const counterpartyName  = isSent ? p.receiver_name : p.sender_name;
                      return (
                        <tr key={p.id} className="tx-row">
                          <td>
                            <span className={`tx-id ${copiedId === p.id ? "copied" : ""}`} onClick={() => copyId(p.id)} title="Click to copy full ID">
                              {p.id.slice(0, 8)}… <span style={{ fontSize: 10 }}>{copiedId === p.id ? "✓" : "⎘"}</span>
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: 12, color: isSent ? "#f87171" : "#34d399", fontWeight: 600 }}>
                              {isSent ? "↑ Sent" : "↓ Received"}
                            </span>
                          </td>
                          <td>
                            <div className="counterparty">
                              <span className="counterparty-label">{counterpartyLabel}</span>
                              <span className="counterparty-name">{counterpartyName ?? "—"}</span>
                            </div>
                          </td>
                          <td>
                            <span className={isSent ? "tx-amount-neg" : "tx-amount-pos"}>
                              {isSent ? "−" : "+"}{fmt(Number(p.amount), profile?.currency ?? "INR")}
                            </span>
                          </td>
                          <td>
                            <span className="badge" style={{ background: b.bg, color: b.color, borderColor: b.border }}>
                              {p.status}
                            </span>
                          </td>
                          <td>
                            {p.failure_reason
                              ? <span className="failure-text" title={p.failure_reason}>{p.failure_reason}</span>
                              : <span style={{ color: "#3f3f46", fontSize: 11 }}>—</span>
                            }
                          </td>
                          <td><span className="tx-time">{timeAgo(p.created_at)}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
