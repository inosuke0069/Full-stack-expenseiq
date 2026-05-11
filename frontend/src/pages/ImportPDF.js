import { useState, useRef } from "react";
import { createTransaction, parseBankStatement } from "../services/api";
import { G } from "../App";

const EXPENSE_CATS = ["Food","Transport","Shopping","Health","Entertainment","Utilities","Education","Other"];
const INCOME_CATS  = ["Salary","Freelance","Business","Investment","Other"];
const fmt = n => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function ImportPDF() {
  const [stage, setStage]         = useState("upload");
  const [drag, setDrag]           = useState(false);
  const [file, setFile]           = useState(null);
  const [transactions, setTxns]   = useState([]);
  const [selected, setSelected]   = useState({});
  const [msg, setMsg]             = useState("");
  const [progress, setProgress]   = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const fileRef = useRef();

  // ── Styles (inside component so G is available) ───────────────────────
  const s = {
    page:      { animation: "fadeIn 0.3s ease" },
    heading:   { fontSize: 26, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.5px" },
    sub:       { color: "#64748b", fontSize: 14, marginTop: 4, marginBottom: 28 },
    card:      { background: "#fff", border: "1.5px solid #dbeafe", borderRadius: 16, padding: 28, boxShadow: "0 2px 12px rgba(37,99,235,0.06)", marginBottom: 22 },
    cardTitle: { fontSize: 15, fontWeight: 800, color: "#1e3a8a", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 },
    uploadBox: (d) => ({ border: `2px dashed ${d ? "#2563eb" : "#bfdbfe"}`, borderRadius: 14, padding: "48px 24px", textAlign: "center", background: d ? "#eff6ff" : "#f8faff", cursor: "pointer", transition: "all 0.2s" }),
    btn:       { padding: "11px 24px", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: G.font, boxShadow: "0 4px 14px rgba(37,99,235,0.3)" },
    secBtn:    { padding: "11px 20px", background: "#f8faff", border: "1.5px solid #dbeafe", borderRadius: 10, color: "#64748b", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: G.font },
    greenBtn:  { padding: "11px 24px", background: "linear-gradient(135deg, #16a34a, #15803d)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: G.font, boxShadow: "0 4px 14px rgba(22,163,74,0.3)" },
    th:        { padding: "11px 14px", textAlign: "left", color: "#64748b", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700, background: "#f8faff", borderBottom: "1.5px solid #dbeafe" },
    td:        { padding: "12px 14px", borderBottom: "1px solid #f1f5f9", fontSize: 13, verticalAlign: "middle" },
    select:    { background: "#f8faff", border: "1.5px solid #dbeafe", borderRadius: 8, padding: "6px 10px", color: "#0f172a", fontSize: 12, fontFamily: G.font, cursor: "pointer" },
    badge:     (t) => ({ background: t === "income" ? "#f0fdf4" : "#fef2f2", color: t === "income" ? "#16a34a" : "#dc2626", border: `1px solid ${t === "income" ? "#bbf7d0" : "#fecaca"}`, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }),
    msg:       (ok) => ({ background: ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${ok ? "#bbf7d0" : "#fecaca"}`, borderRadius: 10, padding: "12px 16px", fontSize: 13, color: ok ? "#16a34a" : "#dc2626", marginBottom: 16 }),
    progress:  { background: "#dbeafe", borderRadius: 8, height: 8, overflow: "hidden", marginTop: 8 },
    progressBar: (pct) => ({ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #2563eb, #3b82f6)", borderRadius: 8, transition: "width 0.3s" }),
    statRow:   { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 22 },
    statCard:  (color) => ({ background: "#fff", border: `1.5px solid ${color}20`, borderTop: `4px solid ${color}`, borderRadius: 14, padding: "16px 20px" }),
  };

  const toBase64 = (f) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

  const parsePDF = async (f) => {
    setStage("parsing"); setMsg(""); setProgress(20);
    try {
      const formData = new FormData();
      formData.append("file", f);
      setProgress(40);
      const res = await parseBankStatement(formData);
      setProgress(90);
      const parsed = res.data.transactions;
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("No transactions found in this PDF.");
      setProgress(100);
      const sel = {};
      parsed.forEach((_, i) => { sel[i] = true; });
      setSelected(sel);
      setTxns(parsed);
      setStage("preview");
    } catch (e) {
      const detail = e.response?.data?.detail || e.message || "Failed to parse PDF.";
      setMsg("❌ " + detail);
      setStage("upload"); setProgress(0);
    }
  };

  const handleFile = (f) => {
    if (!f || f.type !== "application/pdf") { setMsg("❌ Please upload a PDF file."); return; }
    if (f.size > 10 * 1024 * 1024) { setMsg("❌ File too large. Max 10MB."); return; }
    setFile(f); parsePDF(f);
  };

  const onDrop = (e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); };

  const editTxn = (i, field, val) => {
    setTxns(prev => prev.map((t, idx) => idx === i ? {
      ...t, [field]: val,
      ...(field === "type" ? { category: val === "income" ? "Salary" : "Food" } : {})
    } : t));
  };

  const importTxns = async () => {
    const toImport = transactions.filter((_, i) => selected[i]);
    if (toImport.length === 0) { setMsg("❌ Select at least one transaction."); return; }
    setStage("importing"); setProgress(0);
    let count = 0;
    for (let i = 0; i < toImport.length; i++) {
      try {
        await createTransaction({ ...toImport[i], amount: parseFloat(toImport[i].amount), date: new Date(toImport[i].date).toISOString() });
        count++;
      } catch (e) {}
      setProgress(Math.round(((i + 1) / toImport.length) * 100));
    }
    setImportedCount(count); setStage("done");
  };

  const reset = () => { setStage("upload"); setFile(null); setTxns([]); setSelected({}); setMsg(""); setProgress(0); };

  const totalIncome   = transactions.filter((t, i) => selected[i] && t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense  = transactions.filter((t, i) => selected[i] && t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div style={s.page}>
      <div style={s.heading}>📄 Import Bank Statement</div>
      <div style={s.sub}>Upload your bank statement PDF — AI will extract and categorize all transactions automatically</div>

      {/* UPLOAD */}
      {stage === "upload" && (
        <div style={s.card}>
          <div style={s.cardTitle}>📤 Upload PDF Statement</div>
          {msg && <div style={s.msg(false)}>{msg}</div>}
          <div style={s.uploadBox(drag)} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop} onClick={() => fileRef.current.click()}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏦</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#1e3a8a", marginBottom: 6 }}>Drop your bank statement here</div>
            <div style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>Supports SBI, HDFC, ICICI, Axis, Kotak and any other bank PDF</div>
            <button style={s.btn}>📂 Choose PDF File</button>
            <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 12 }}>Max file size: 10MB</div>
          </div>
          <input ref={fileRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
          <div style={{ marginTop: 20, padding: 16, background: "#f0f9ff", borderRadius: 10, border: "1px solid #bae6fd" }}>
            <div style={{ fontWeight: 700, color: "#0369a1", fontSize: 13, marginBottom: 6 }}>💡 How it works</div>
            <div style={{ color: "#0c4a6e", fontSize: 12, lineHeight: 1.8 }}>
              1. Upload your bank statement PDF<br/>
              2. AI reads every transaction and auto-categorizes it<br/>
              3. Review the preview — edit any category you want<br/>
              4. Click Import to save selected transactions to your account
            </div>
          </div>
        </div>
      )}

      {/* PARSING */}
      {stage === "parsing" && (
        <div style={s.card}>
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🤖</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#1e3a8a", marginBottom: 8 }}>AI is reading your statement...</div>
            <div style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>Extracting and categorizing transactions intelligently</div>
            <div style={{ maxWidth: 360, margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                <span>{progress < 30 ? "Reading PDF..." : progress < 70 ? "AI analyzing..." : "Categorizing..."}</span>
                <span>{progress}%</span>
              </div>
              <div style={s.progress}><div style={s.progressBar(progress)} /></div>
            </div>
          </div>
        </div>
      )}

      {/* IMPORTING */}
      {stage === "importing" && (
        <div style={s.card}>
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>💾</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#1e3a8a", marginBottom: 8 }}>Importing transactions...</div>
            <div style={{ maxWidth: 360, margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                <span>Saving to your account</span><span>{progress}%</span>
              </div>
              <div style={s.progress}><div style={s.progressBar(progress)} /></div>
            </div>
          </div>
        </div>
      )}

      {/* DONE */}
      {stage === "done" && (
        <div style={s.card}>
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <div style={{ fontWeight: 900, fontSize: 22, color: "#16a34a", marginBottom: 8 }}>Import Successful!</div>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 28 }}>{importedCount} transactions added to your account</div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button style={s.greenBtn} onClick={reset}>Import Another Statement</button>
              <button style={s.secBtn} onClick={() => window.location.reload()}>Go to Dashboard</button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW */}
      {stage === "preview" && (
        <>
          <div style={s.statRow}>
            {[
              { label: "Found", val: transactions.length, unit: "transactions", color: "#2563eb" },
              { label: "Selected", val: selectedCount, unit: "to import", color: "#7c3aed" },
              { label: "Income", val: fmt(totalIncome), unit: "", color: "#16a34a" },
              { label: "Expense", val: fmt(totalExpense), unit: "", color: "#dc2626" },
            ].map(({ label, val, unit, color }) => (
              <div key={label} style={s.statCard(color)}>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: G.mono }}>{val}</div>
                {unit && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{unit}</div>}
              </div>
            ))}
          </div>

          <div style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1e3a8a" }}>📋 Review & Edit Transactions</div>
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>Edit categories or type if needed, then import</div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={s.secBtn} onClick={() => { const a = {}; transactions.forEach((_, i) => a[i] = true); setSelected(a); }}>Select All</button>
                <button style={s.secBtn} onClick={() => setSelected({})}>Deselect All</button>
                <button style={s.secBtn} onClick={reset}>↩ Re-upload</button>
                <button style={s.greenBtn} onClick={importTxns}>✅ Import {selectedCount} Transaction{selectedCount !== 1 ? "s" : ""}</button>
              </div>
            </div>
          </div>

          <div style={{ background: "#fff", border: "1.5px solid #dbeafe", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(37,99,235,0.06)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={s.th}><input type="checkbox" checked={selectedCount === transactions.length} onChange={e => { const a = {}; if (e.target.checked) transactions.forEach((_, i) => a[i] = true); setSelected(a); }} /></th>
                  {["Date","Description","Amount","Type","Category"].map(h => <th key={h} style={s.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr key={i} style={{ background: selected[i] ? "#fff" : "#f8faff", opacity: selected[i] ? 1 : 0.55 }}>
                    <td style={s.td}><input type="checkbox" checked={!!selected[i]} onChange={e => setSelected(p => ({ ...p, [i]: e.target.checked }))} /></td>
                    <td style={s.td}><span style={{ color: "#64748b", fontSize: 12, fontFamily: G.mono }}>{t.date}</span></td>
                    <td style={s.td}><span style={{ fontWeight: 600, color: "#0f172a" }}>{t.description}</span></td>
                    <td style={s.td}><span style={{ fontFamily: G.mono, fontWeight: 800, color: t.type === "income" ? "#16a34a" : "#dc2626" }}>{t.type === "income" ? "+" : "-"}{fmt(t.amount)}</span></td>
                    <td style={s.td}>
                      <select style={s.select} value={t.type} onChange={e => editTxn(i, "type", e.target.value)}>
                        <option value="expense">💸 Expense</option>
                        <option value="income">💰 Income</option>
                      </select>
                    </td>
                    <td style={s.td}>
                      <select style={s.select} value={t.category} onChange={e => editTxn(i, "category", e.target.value)}>
                        {(t.type === "income" ? INCOME_CATS : EXPENSE_CATS).map(c => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18, gap: 12 }}>
            <button style={s.secBtn} onClick={reset}>↩ Re-upload</button>
            <button style={s.greenBtn} onClick={importTxns}>✅ Import {selectedCount} Transaction{selectedCount !== 1 ? "s" : ""}</button>
          </div>
        </>
      )}
    </div>
  );
}
