import { useState, useEffect } from "react";
import { getBudgets, createBudget, deleteBudget, getBudgetStatus } from "../services/api";
import { G } from "../App";

const CATEGORIES = ["Overall","Food","Transport","Shopping","Health","Entertainment","Utilities","Other"];
const fmt = n => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const now = new Date();

function BudgetBar({ item }) {
  const pct   = Math.min(item.percentage_used, 100);
  const color = item.status === "exceeded" ? G.red : item.status === "warning" ? G.yellow : G.green;
  return (
    <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{item.category}</div>
          <div style={{ color: G.muted, fontSize: 12, marginTop: 2 }}>Limit: {fmt(item.limit)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: G.mono, fontWeight: 800, fontSize: 18, color }}>{fmt(item.spent)}</div>
          <div style={{ fontSize: 12, color, marginTop: 2 }}>{item.percentage_used}% used</div>
        </div>
      </div>
      <div style={{ background: G.border, borderRadius: 99, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.5s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: G.muted }}>
        <span>{item.status === "exceeded" ? "⚠️ Budget exceeded!" : item.status === "warning" ? "⚠️ Approaching limit" : "✅ On track"}</span>
        <span>{fmt(item.remaining)} remaining</span>
      </div>
    </div>
  );
}

export default function Budgets() {
  const [status, setStatus]   = useState([]);
  const [form, setForm]       = useState({ category: "Overall", limit_amount: "", month: now.getMonth() + 1, year: now.getFullYear() });
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState("");
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [selYear, setSelYear]   = useState(now.getFullYear());

  const load = () => {
    getBudgetStatus({ month: selMonth, year: selYear })
      .then(r => setStatus(r.data.budgets || []))
      .catch(() => {});
  };

  useEffect(() => { load(); }, [selMonth, selYear]);

  const save = async () => {
    if (!form.limit_amount) return;
    setSaving(true);
    try {
      await createBudget({ ...form, limit_amount: parseFloat(form.limit_amount), month: parseInt(form.month), year: parseInt(form.year) });
      setMsg("✅ Budget saved!"); load();
      setTimeout(() => setMsg(""), 2000);
    } catch (e) { setMsg("❌ " + (e.response?.data?.detail || "Error")); }
    setSaving(false);
  };

  const s = {
    page: { animation: "fadeIn 0.3s ease" },
    title: { fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 4 },
    grid: { display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, marginTop: 24 },
    card: { background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: 22 },
    cardTitle: { fontSize: 13, fontWeight: 700, marginBottom: 18, color: G.accent },
    label: { fontSize: 11, color: G.muted, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600, marginBottom: 5, display: "block" },
    input: { background: `${G.border}50`, border: `1px solid ${G.border}`, borderRadius: 8, padding: "10px 12px", color: G.text, fontSize: 13, fontFamily: G.font, width: "100%", marginBottom: 14 },
    select: { background: G.surface, border: `1px solid ${G.border}`, borderRadius: 8, padding: "10px 12px", color: G.text, fontSize: 13, fontFamily: G.font, width: "100%", marginBottom: 14 },
    btn: { background: `linear-gradient(135deg, ${G.accent}cc, ${G.accent2})`, border: "none", borderRadius: 8, padding: "11px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: G.font, width: "100%" },
    filterRow: { display: "flex", gap: 10, marginBottom: 18 },
    filterSel: { background: G.surface, border: `1px solid ${G.border}`, borderRadius: 8, padding: "8px 12px", color: G.text, fontSize: 13, fontFamily: G.font },
  };

  return (
    <div style={s.page}>
      <div style={s.title}>Budgets</div>
      <div style={{ color: G.muted, fontSize: 13 }}>Set monthly spending limits and track your progress</div>

      <div style={s.grid}>
        {/* Set budget form */}
        <div style={s.card}>
          <div style={s.cardTitle}>+ Set Budget Limit</div>
          <label style={s.label}>Category</label>
          <select style={s.select} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>

          <label style={s.label}>Limit Amount (₹)</label>
          <input style={s.input} type="number" placeholder="e.g. 25000" value={form.limit_amount} onChange={e => setForm(f => ({ ...f, limit_amount: e.target.value }))} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={s.label}>Month</label>
              <select style={s.select} value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i+1} value={i+1}>{new Date(2024, i).toLocaleString("default", { month: "short" })}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={s.label}>Year</label>
              <select style={s.select} value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}>
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <button style={s.btn} onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Budget"}</button>
          {msg && <div style={{ marginTop: 10, fontSize: 13, color: msg.startsWith("✅") ? G.green : G.red }}>{msg}</div>}
        </div>

        {/* Budget status */}
        <div>
          <div style={s.filterRow}>
            <select style={s.filterSel} value={selMonth} onChange={e => setSelMonth(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i+1} value={i+1}>{new Date(2024, i).toLocaleString("default", { month: "long" })}</option>
              ))}
            </select>
            <select style={s.filterSel} value={selYear} onChange={e => setSelYear(e.target.value)}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {status.length === 0
            ? <div style={{ ...s.card, textAlign: "center", color: G.muted, fontSize: 13, padding: 40 }}>No budgets set for this month.<br/>Use the form to create one.</div>
            : status.map(b => <BudgetBar key={b.category} item={b} />)
          }
        </div>
      </div>
    </div>
  );
}
