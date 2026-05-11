import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { getMonthlySummary, getTrends, getCategoryTrends } from "../services/api";
import { G } from "../App";

const CAT_COLORS = ["#00d4ff","#7c3aed","#ff4d6d","#00ff9d","#ffd60a","#ff7849","#a78bfa","#f472b6"];
const fmt = n => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const now = new Date();

export default function Analytics() {
  const [trends, setTrends]     = useState([]);
  const [catData, setCatData]   = useState([]);
  const [summary, setSummary]   = useState(null);
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [selYear, setSelYear]   = useState(now.getFullYear());

  useEffect(() => {
    getTrends({ months: 6 }).then(r => setTrends(r.data.trends || [])).catch(() => {});
  }, []);

  useEffect(() => {
    getCategoryTrends({ month: selMonth, year: selYear }).then(r => setCatData(r.data.categories || [])).catch(() => {});
    getMonthlySummary({ month: selMonth, year: selYear }).then(r => setSummary(r.data)).catch(() => {});
  }, [selMonth, selYear]);

  const tt = { contentStyle: { background: G.surface, border: `1px solid ${G.border}`, borderRadius: 8, color: G.text, fontFamily: G.font, fontSize: 12 } };

  const s = {
    page: { animation: "fadeIn 0.3s ease" },
    title: { fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 4 },
    card: { background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: 22 },
    cardTitle: { fontSize: 13, fontWeight: 700, color: G.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, margin: "20px 0" },
    filterRow: { display: "flex", gap: 10, marginTop: 20, marginBottom: 0 },
    sel: { background: G.surface, border: `1px solid ${G.border}`, borderRadius: 8, padding: "8px 12px", color: G.text, fontSize: 13, fontFamily: G.font },
    statRow: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20, marginTop: 20 },
    stat: (color) => ({ background: G.surface, border: `1px solid ${G.border}`, borderTop: `2px solid ${color}`, borderRadius: 12, padding: "16px 18px" }),
  };

  const maxCat = catData.reduce((m, c) => c.total > m ? c.total : m, 1);

  return (
    <div style={s.page}>
      <div style={s.title}>Analytics</div>
      <div style={{ color: G.muted, fontSize: 13 }}>Visualise your spending patterns over time</div>

      {/* 6-month line chart */}
      <div style={{ ...s.card, marginTop: 24 }}>
        <div style={s.cardTitle}>📈 6-Month Income vs Expenses</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={trends}>
            <CartesianGrid strokeDasharray="3 3" stroke={G.border} />
            <XAxis dataKey="month" tick={{ fill: G.muted, fontSize: 11 }} />
            <YAxis tick={{ fill: G.muted, fontSize: 10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip {...tt} formatter={v => fmt(v)} />
            <Line type="monotone" dataKey="expenses" stroke={G.accent2} strokeWidth={2.5} dot={{ fill: G.accent2, r: 4 }} name="Expenses" />
            <Line type="monotone" dataKey="income"   stroke={G.green}   strokeWidth={2.5} dot={{ fill: G.green, r: 4 }}   name="Income" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Month selector + summary */}
      <div style={s.filterRow}>
        <select style={s.sel} value={selMonth} onChange={e => setSelMonth(e.target.value)}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i+1} value={i+1}>{new Date(2024, i).toLocaleString("default", { month: "long" })}</option>
          ))}
        </select>
        <select style={s.sel} value={selYear} onChange={e => setSelYear(e.target.value)}>
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {summary && (
        <div style={s.statRow}>
          <div style={s.stat(G.green)}>
            <div style={{ color: G.muted, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Income</div>
            <div style={{ fontFamily: G.mono, fontWeight: 800, fontSize: 20, color: G.green }}>{fmt(summary.total_income)}</div>
          </div>
          <div style={s.stat(G.red)}>
            <div style={{ color: G.muted, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Expenses</div>
            <div style={{ fontFamily: G.mono, fontWeight: 800, fontSize: 20, color: G.red }}>{fmt(summary.total_expenses)}</div>
          </div>
          <div style={s.stat(G.yellow)}>
            <div style={{ color: G.muted, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Net Savings</div>
            <div style={{ fontFamily: G.mono, fontWeight: 800, fontSize: 20, color: summary.net_savings >= 0 ? G.yellow : G.red }}>{fmt(summary.net_savings)}</div>
          </div>
        </div>
      )}

      <div style={s.grid2}>
        {/* Category pie */}
        <div style={s.card}>
          <div style={s.cardTitle}>🍕 Category Pie Chart</div>
          {catData.length === 0
            ? <div style={{ color: G.muted, fontSize: 13, textAlign: "center", paddingTop: 60 }}>No expense data</div>
            : <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={catData} dataKey="total" nameKey="category" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3}>
                    {catData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tt} formatter={v => fmt(v)} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: G.muted }} />
                </PieChart>
              </ResponsiveContainer>
          }
        </div>

        {/* Category bar breakdown */}
        <div style={s.card}>
          <div style={s.cardTitle}>📦 Category Breakdown</div>
          {catData.length === 0
            ? <div style={{ color: G.muted, fontSize: 13, textAlign: "center", paddingTop: 60 }}>No expense data</div>
            : catData.sort((a, b) => b.total - a.total).map((c, i) => (
                <div key={c.category} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
                    <span style={{ color: G.text }}>{c.category}</span>
                    <span style={{ color: CAT_COLORS[i % CAT_COLORS.length], fontFamily: G.mono, fontWeight: 700 }}>{fmt(c.total)}</span>
                  </div>
                  <div style={{ background: G.border, borderRadius: 99, height: 7 }}>
                    <div style={{ width: `${(c.total / maxCat) * 100}%`, background: CAT_COLORS[i % CAT_COLORS.length], height: "100%", borderRadius: 99, transition: "width 0.5s" }} />
                  </div>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );
}
