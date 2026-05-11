import { useState, useEffect } from "react";
import { getOverallSummary, getTransactions, createTransaction, getTrends } from "../services/api";
import { G } from "../App";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const CATEGORY_COLORS = {
  Food: "#f59e0b", Transport: "#3b82f6", Shopping: "#8b5cf6",
  Entertainment: "#ec4899", Health: "#10b981", Education: "#06b6d4",
  Bills: "#ef4444", Salary: "#10b981", Freelance: "#6366f1",
  Investment: "#f59e0b", Business: "#14b8a6", Other: "#64748b",
};

const EXPENSE_CATEGORIES = ["Food","Transport","Shopping","Entertainment","Health","Education","Bills","Other"];
const INCOME_CATEGORIES  = ["Salary","Freelance","Investment","Business","Other"];

export default function Dashboard({ user, onNavigate }) {
  const [summary, setSummary]         = useState({ total_income: 0, total_expenses: 0, net_savings: 0, transaction_count: 0 });
  const [recent, setRecent]           = useState([]);
  const [trends, setTrends]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [txnType, setTxnType]         = useState("expense");
  const [form, setForm]               = useState({ description: "", amount: "", category: "Food", date: new Date().toISOString().slice(0, 10) });
  const [adding, setAdding]           = useState(false);
  const [addMsg, setAddMsg]           = useState("");

  const categories = txnType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sumRes, recentRes, trendsRes] = await Promise.all([
        getOverallSummary(),
        getTransactions({ limit: 8 }),
        getTrends({ months: 6 }),
      ]);
      setSummary(sumRes.data);
      setRecent(recentRes.data);
      setTrends(trendsRes.data.trends || []);
    } catch (e) {
      console.error("Dashboard fetch error:", e?.response?.data || e.message);
    }
    setLoading(false);
  };

  const handleTypeSwitch = (t) => {
    setTxnType(t);
    const cats = t === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    setForm(f => ({ ...f, category: cats[0] }));
  };

  const handleQuickAdd = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) { setAddMsg("Enter a valid amount"); return; }
    setAdding(true); setAddMsg("");
    try {
      await createTransaction({
        amount: parseFloat(form.amount),
        type: txnType,
        category: form.category,
        description: form.description || null,
        date: new Date(form.date).toISOString(),
      });
      setForm({ description: "", amount: "", category: categories[0], date: new Date().toISOString().slice(0, 10) });
      setAddMsg("✅ Added!");
      fetchAll();
      setTimeout(() => setAddMsg(""), 2000);
    } catch (e) {
      const d = e.response?.data?.detail;
      setAddMsg(typeof d === "string" ? d : "Failed to add");
    }
    setAdding(false);
  };

  // ── Pie chart data from recent transactions ────────────────────────────
  const pieData = Object.entries(
    recent.filter(t => t.type === "expense").reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // ── Styles ─────────────────────────────────────────────────────────────
  const S = {
    wrap:  { padding: "28px 32px", fontFamily: G.font, color: G.text, background: G.bg, minHeight: "100vh" },
    greeting: { fontSize: 26, fontWeight: 800, color: "#1e3a8a", marginBottom: 4 },
    date:  { fontSize: 13, color: G.muted, marginBottom: 28 },
    cards: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 28 },
    card:  (border) => ({
      background: "#fff", borderRadius: 14, padding: "22px 24px",
      border: "1px solid #e2e8f0", borderTop: `4px solid ${border}`,
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    }),
    cardLabel: { fontSize: 11, fontWeight: 700, color: G.muted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10 },
    cardAmount: { fontSize: 32, fontWeight: 800, color: "#1e3a8a", marginBottom: 6 },
    cardSub: { fontSize: 12, color: G.muted },
    cardIcon: { float: "right", fontSize: 28, marginTop: -4 },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 },
    panel: {
      background: "#fff", borderRadius: 14, padding: "22px 24px",
      border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    },
    panelTitle: { fontSize: 15, fontWeight: 700, color: "#1e3a8a", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 },
    label: { fontSize: 11, fontWeight: 700, color: G.muted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 5, display: "block" },
    input: {
      width: "100%", background: "#f8faff", border: "1.5px solid #dbeafe",
      borderRadius: 8, padding: "9px 12px", fontSize: 13, color: G.text,
      fontFamily: G.font, outline: "none", boxSizing: "border-box",
    },
    select: {
      width: "100%", background: "#f8faff", border: "1.5px solid #dbeafe",
      borderRadius: 8, padding: "9px 12px", fontSize: 13, color: G.text,
      fontFamily: G.font, outline: "none", cursor: "pointer",
    },
    typeBtn: (active, color) => ({
      flex: 1, padding: "9px", borderRadius: 8, fontWeight: 700, fontSize: 13,
      cursor: "pointer", fontFamily: G.font, border: "none",
      background: active ? color : "#f1f5f9",
      color: active ? "#fff" : G.muted,
    }),
    addBtn: {
      background: "#2563eb", color: "#fff", border: "none", borderRadius: 8,
      padding: "10px 24px", fontWeight: 700, fontSize: 13, cursor: "pointer",
      fontFamily: G.font, marginTop: 12,
    },
    addMsg: (ok) => ({
      fontSize: 12, marginTop: 8,
      color: ok ? "#16a34a" : "#dc2626",
    }),
    recentItem: {
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 0", borderBottom: "1px solid #f1f5f9",
    },
    recentName: { fontSize: 13, fontWeight: 600, color: G.text },
    recentSub:  { fontSize: 11, color: G.muted, marginTop: 2 },
    recentAmt: (type) => ({ fontSize: 13, fontWeight: 700, color: type === "income" ? "#16a34a" : "#dc2626" }),
    badge: (type) => ({
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      background: type === "income" ? "#f0fdf4" : "#fef2f2",
      color: type === "income" ? "#16a34a" : "#dc2626",
      border: `1px solid ${type === "income" ? "#bbf7d0" : "#fecaca"}`,
      marginLeft: 8,
    }),
    viewAll: {
      display: "block", textAlign: "center", marginTop: 14,
      fontSize: 13, color: "#2563eb", fontWeight: 600, cursor: "pointer",
      background: "none", border: "none", fontFamily: G.font, width: "100%",
    },
  };

  const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
  const isOk = (m) => m.startsWith("✅");

  return (
    <div style={S.wrap}>
      <div style={S.greeting}>Welcome back, {user?.name?.split(" ")[0]} 👋</div>
      <div style={S.date}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>

      {/* ── Summary Cards ─────────────────────────────────────────────── */}
      <div style={S.cards}>
        <div style={S.card("#16a34a")}>
          <div style={S.cardIcon}>💰</div>
          <div style={S.cardLabel}>Total Income</div>
          <div style={S.cardAmount}>{loading ? "..." : fmt(summary.total_income)}</div>
          <div style={S.cardSub}>All time</div>
        </div>
        <div style={S.card("#dc2626")}>
          <div style={S.cardIcon}>💸</div>
          <div style={S.cardLabel}>Total Expenses</div>
          <div style={S.cardAmount}>{loading ? "..." : fmt(summary.total_expenses)}</div>
          <div style={S.cardSub}>All time</div>
        </div>
        <div style={S.card("#2563eb")}>
          <div style={S.cardIcon}>🏦</div>
          <div style={S.cardLabel}>Balance</div>
          <div style={{ ...S.cardAmount, color: summary.net_savings >= 0 ? "#16a34a" : "#dc2626" }}>
            {loading ? "..." : fmt(summary.net_savings)}
          </div>
          <div style={S.cardSub}>{summary.net_savings >= 0 ? "You're in profit!" : "Spending exceeds income"}</div>
        </div>
      </div>

      {/* ── Charts + Quick Add ────────────────────────────────────────── */}
      <div style={S.grid2}>

        {/* Bar Chart */}
        <div style={S.panel}>
          <div style={S.panelTitle}>📊 Income vs Expenses (6 months)</div>
          {trends.length === 0 ? (
            <div style={{ textAlign: "center", color: G.muted, padding: 30, fontSize: 13 }}>No trend data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trends} margin={{ top: 4, right: 4, bottom: 4, left: -10 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Bar dataKey="income"   fill="#16a34a" radius={[4,4,0,0]} name="Income" />
                <Bar dataKey="expenses" fill="#dc2626" radius={[4,4,0,0]} name="Expenses" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Quick Add */}
        <div style={S.panel}>
          <div style={S.panelTitle}>➕ Quick Add Transaction</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button style={S.typeBtn(txnType === "expense", "#dc2626")} onClick={() => handleTypeSwitch("expense")}>💸 Expense</button>
            <button style={S.typeBtn(txnType === "income",  "#16a34a")} onClick={() => handleTypeSwitch("income")}>💰 Income</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={S.label}>Description</label>
              <input style={S.input} placeholder="e.g. Lunch, Salary..." value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label style={S.label}>Amount (₹)</label>
              <input style={S.input} type="number" min="0" placeholder="0.00" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label style={S.label}>Category</label>
              <select style={S.select} value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Date</label>
              <input style={S.input} type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <button style={S.addBtn} onClick={handleQuickAdd} disabled={adding}>
            {adding ? "Adding..." : `Add ${txnType === "expense" ? "Expense" : "Income"}`}
          </button>
          {addMsg && <div style={S.addMsg(isOk(addMsg))}>{addMsg}</div>}
        </div>
      </div>

      {/* ── Recent Transactions + Pie ─────────────────────────────────── */}
      <div style={S.grid2}>

        {/* Pie Chart */}
        <div style={S.panel}>
          <div style={S.panelTitle}>🥧 Expense Breakdown</div>
          {pieData.length === 0 ? (
            <div style={{ textAlign: "center", color: G.muted, padding: 30, fontSize: 13 }}>No expense data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[entry.name] || "#64748b"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Transactions */}
        <div style={S.panel}>
          <div style={S.panelTitle}>🕐 Recent Transactions</div>
          {recent.length === 0 ? (
            <div style={{ textAlign: "center", color: G.muted, padding: 30, fontSize: 13 }}>No transactions yet</div>
          ) : (
            recent.map(t => (
              <div key={t.id} style={S.recentItem}>
                <div>
                  <div style={S.recentName}>{t.description || t.category}</div>
                  <div style={S.recentSub}>{t.category} · {new Date(t.date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} · {new Date(t.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={S.recentAmt(t.type)}>
                    {t.type === "income" ? "+" : "−"}₹{t.amount.toLocaleString("en-IN")}
                  </span>
                  <span style={S.badge(t.type)}>{t.type}</span>
                </div>
              </div>
            ))
          )}
          {recent.length > 0 && (
            <button style={S.viewAll} onClick={() => onNavigate && onNavigate("transactions")}>
              View all transactions →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
