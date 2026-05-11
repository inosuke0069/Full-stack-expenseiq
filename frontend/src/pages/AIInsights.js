import { useState, useEffect } from "react";
import { getForecast, getAnomalies, getAlerts } from "../services/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { G } from "../App";

const fmt = n => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function AIInsights() {
  const [forecast, setForecast]   = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [alerts, setAlerts]       = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      getForecast().then(r => setForecast(r.data)).catch(() => {}),
      getAnomalies().then(r => setAnomalies(r.data)).catch(() => {}),
      getAlerts().then(r => setAlerts(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  // Build chart data: historical + prediction point
  const chartData = forecast
    ? [
        ...(forecast.historical_months || []).map(m => ({
          label: `${m.year}-${String(m.month).padStart(2,"0")}`,
          actual: m.total,
        })),
        { label: "Forecast", predicted: forecast.predicted_amount },
      ]
    : [];

  const tt = { contentStyle: { background: G.surface, border: `1px solid ${G.border}`, borderRadius: 8, color: G.text, fontFamily: G.font, fontSize: 12 } };

  const s = {
    page: { animation: "fadeIn 0.3s ease" },
    title: { fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 4 },
    card: { background: G.surface, border: `1px solid ${G.border}`, borderRadius: 14, padding: 22, marginBottom: 18 },
    cardTitle: { fontSize: 13, fontWeight: 700, color: G.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 },
    forecastAmount: {
      fontFamily: G.mono, fontWeight: 900, fontSize: 44,
      background: `linear-gradient(135deg, ${G.accent}, ${G.accent2})`,
      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    },
    anomalyItem: {
      background: `${G.red}10`,
      border: `1px solid ${G.red}25`,
      borderRadius: 10,
      padding: "14px 18px",
      marginBottom: 10,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    alertItem: (type) => ({
      background: type === "anomaly" ? `${G.accent2}10` : type === "budget_exceeded" ? `${G.red}10` : `${G.yellow}10`,
      border: `1px solid ${type === "anomaly" ? G.accent2 : type === "budget_exceeded" ? G.red : G.yellow}30`,
      borderRadius: 10,
      padding: "12px 16px",
      marginBottom: 8,
    }),
    badge: (c) => ({ background: `${c}18`, color: c, border: `1px solid ${c}35`, padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600 }),
  };

  if (loading) return (
    <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
      <div style={{ color: G.muted, fontFamily: G.mono, fontSize: 13 }}>Analysing your data...</div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.title}>AI Insights</div>
      <div style={{ color: G.muted, fontSize: 13, marginBottom: 24 }}>Machine learning powered financial intelligence</div>

      {/* Forecast */}
      <div style={{ ...s.card, background: `linear-gradient(135deg, ${G.surface}, #0d1f3c)`, border: `1px solid ${G.accent}30` }}>
        <div style={s.cardTitle}>🔮 Expense Forecast — Next Month</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "center" }}>
          <div>
            <div style={{ color: G.muted, fontSize: 12, marginBottom: 8 }}>Predicted spend</div>
            <div style={s.forecastAmount}>{fmt(forecast?.predicted_amount)}</div>
            <div style={{ color: G.muted, fontSize: 12, marginTop: 10, lineHeight: 1.7 }}>
              Model: <span style={{ color: G.accent }}>{forecast?.model}</span><br />
              {forecast?.confidence_note}
            </div>
          </div>
          <div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={G.border} />
                <XAxis dataKey="label" tick={{ fill: G.muted, fontSize: 10 }} />
                <YAxis tick={{ fill: G.muted, fontSize: 10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip {...tt} formatter={v => fmt(v)} />
                <Line type="monotone" dataKey="actual"    stroke={G.accent}  strokeWidth={2} dot={{ fill: G.accent, r: 3 }}  name="Actual" />
                <Line type="monotone" dataKey="predicted" stroke={G.accent2} strokeWidth={2} strokeDasharray="5 5" dot={{ fill: G.accent2, r: 5 }} name="Forecast" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Anomalies */}
      <div style={s.card}>
        <div style={s.cardTitle}>🔍 Anomaly Detection
          <span style={{ marginLeft: "auto", ...s.badge(anomalies.length > 0 ? G.red : G.green) }}>
            {anomalies.length > 0 ? `${anomalies.length} found` : "All clear"}
          </span>
        </div>
        <div style={{ color: G.muted, fontSize: 12, marginBottom: 14 }}>
          Transactions flagged as unusually high (Z-score &gt; 2σ above your category average)
        </div>
        {anomalies.length === 0
          ? <div style={{ background: `${G.green}10`, border: `1px solid ${G.green}25`, borderRadius: 10, padding: "16px 20px", color: G.green, fontSize: 13 }}>
              ✅ No anomalies detected. Your spending looks consistent!
            </div>
          : anomalies.map(a => (
              <div key={a.transaction_id} style={s.anomalyItem}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#fca5a5" }}>{a.description || a.category}</div>
                  <div style={{ color: G.muted, fontSize: 12, marginTop: 3 }}>
                    {a.category} · {a.date?.split("T")[0]} · Avg: {fmt(a.mean_amount)} ± {fmt(a.std_dev)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: G.mono, fontWeight: 800, fontSize: 18, color: G.red }}>{fmt(a.amount)}</div>
                  <div style={{ fontSize: 11, color: G.muted, marginTop: 3 }}>z = {a.z_score}σ</div>
                </div>
              </div>
            ))
        }
      </div>

      {/* Smart tips */}
      <div style={s.card}>
        <div style={s.cardTitle}>💡 Smart Recommendations</div>
        {[
          { icon: "📱", tip: "Review your subscriptions monthly. Small recurring charges add up quickly." },
          { icon: "🍕", tip: "Food is typically the largest expense category. Meal prepping can reduce it by 20–30%." },
          { icon: "🚗", tip: "Group your transport trips or use public transit to cut travel costs." },
          { icon: "💰", tip: "Aim to save at least 20% of your monthly income before discretionary spending." },
        ].map((r, i) => (
          <div key={i} style={{ background: `${G.border}40`, borderRadius: 10, padding: "12px 16px", marginBottom: 10, display: "flex", gap: 12 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{r.icon}</span>
            <span style={{ color: G.text, fontSize: 13, lineHeight: 1.6 }}>{r.tip}</span>
          </div>
        ))}
      </div>

      {/* Alert history */}
      <div style={s.card}>
        <div style={s.cardTitle}>🔔 Alert History
          <span style={{ marginLeft: "auto", ...s.badge(G.muted) }}>{alerts.length} alerts</span>
        </div>
        {alerts.length === 0
          ? <div style={{ color: G.muted, fontSize: 13, textAlign: "center", padding: "20px 0" }}>No alerts yet. Alerts appear here when budgets are exceeded or anomalies are detected.</div>
          : alerts.slice(0, 10).map(a => (
              <div key={a.id} style={s.alertItem(a.alert_type)}>
                <div style={{ fontSize: 13, color: G.text, lineHeight: 1.5 }}>{a.message}</div>
                <div style={{ fontSize: 11, color: G.muted, marginTop: 4 }}>{new Date(a.sent_at).toLocaleString()}</div>
              </div>
            ))
        }
      </div>
    </div>
  );
}
