import { useState, useEffect } from "react";
import { getTransactions, createTransaction, updateTransaction, deleteTransaction } from "../services/api";
import { G } from "../App";
import {
  validateAmount, validateCategory, validateDescription,
  validateDate, EXPENSE_CATEGORIES, INCOME_CATEGORIES
} from "../utils/validate";

const CATEGORY_COLORS = {
  Food: "#f59e0b", Transport: "#3b82f6", Shopping: "#8b5cf6",
  Entertainment: "#ec4899", Health: "#10b981", Education: "#06b6d4",
  Bills: "#ef4444", Salary: "#10b981", Freelance: "#6366f1",
  Investment: "#f59e0b", Business: "#14b8a6", Other: "#64748b",
};

// IST = UTC+5:30 — offset by 330 minutes
const nowIST = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  return ist.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
};

const istDate = () => nowIST().slice(0, 10);   // "YYYY-MM-DD"
const istTime = () => nowIST().slice(11, 16);  // "HH:MM"

const emptyForm = { amount: "", type: "expense", category: "Food", description: "", date: istDate(), time: istTime() };

export default function Transactions({ user }) {
  const [txns, setTxns]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [errors, setErrors]         = useState({});
  const [saving, setSaving]         = useState(false);
  const [filter, setFilter]         = useState({ type: "", month: "", year: new Date().getFullYear() });
  const [deleting, setDeleting]     = useState(null);
  const [selected, setSelected]     = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [page, setPage]             = useState(1);
  const PAGE_SIZE = 10;

  const categories   = form.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const totalPages   = Math.ceil(txns.length / PAGE_SIZE);
  const paginated    = txns.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allSelected  = paginated.length > 0 && paginated.every(t => selected.has(t.id));
  const someSelected = selected.size > 0;

  useEffect(() => { loadTxns(); }, [filter]);
  useEffect(() => { setSelected(new Set()); setPage(1); }, [txns]);

  const loadTxns = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.type)  params.type  = filter.type;
      if (filter.month) params.month = filter.month;
      if (filter.year)  params.year  = filter.year;
      const res = await getTransactions(params);
      setTxns(res.data);
    } catch { setTxns([]); }
    setLoading(false);
  };

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      const next = new Set(selected);
      paginated.forEach(t => next.delete(t.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      paginated.forEach(t => next.add(t.id));
      setSelected(next);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected transaction${selected.size > 1 ? "s" : ""}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selected].map(id => deleteTransaction(id)));
      setSelected(new Set());
      loadTxns();
    } catch {
      alert("Some transactions could not be deleted. Please try again.");
    }
    setBulkDeleting(false);
  };

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === "type") {
        const cats = v === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
        if (!cats.includes(next.category)) next.category = cats[0];
      }
      return next;
    });
    if (errors[k]) setErrors(prev => ({ ...prev, [k]: null }));
  };

  const validate = () => {
    const errs = {};
    const amtErr  = validateAmount(form.amount);
    if (amtErr)  errs.amount      = amtErr;
    const catErr  = validateCategory(form.category, form.type);
    if (catErr)  errs.category    = catErr;
    const descErr = validateDescription(form.description);
    if (descErr) errs.description = descErr;
    const dateErr = validateDate(form.date);
    if (dateErr) errs.date        = dateErr;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // Combine date + time and treat as IST (UTC+5:30)
      const localDatetime = form.date + 'T' + form.time + ':00';
      const istDate = new Date(localDatetime + '+05:30');
      const payload = {
        amount: parseFloat(form.amount), type: form.type,
        category: form.category,
        description: form.description.trim() || null,
        date: istDate.toISOString(),
      };
      if (editId) { await updateTransaction(editId, payload); }
      else        { await createTransaction(payload); }
      setShowForm(false); setEditId(null); setForm(emptyForm); setErrors({});
      loadTxns();
    } catch (e) {
      const d = e.response?.data?.detail;
      setErrors(prev => ({ ...prev, _form: typeof d === "string" ? d : Array.isArray(d) ? d[0]?.msg : "Failed to save" }));
    }
    setSaving(false);
  };

  const handleEdit = (txn) => {
    setEditId(txn.id);
    const d = new Date(txn.date);
    const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
    const istStr = ist.toISOString();
    setForm({ amount: String(txn.amount), type: txn.type, category: txn.category, description: txn.description || "", date: istStr.slice(0, 10), time: istStr.slice(11, 16) });
    setErrors({}); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    setDeleting(id);
    try { await deleteTransaction(id); loadTxns(); } catch {}
    setDeleting(null);
  };

  const handleCancel = () => { setShowForm(false); setEditId(null); setForm({ ...emptyForm, date: istDate(), time: istTime() }); setErrors({}); };

  const S = {
    wrap:        { padding: "24px 32px", fontFamily: G.font, color: G.text },
    header:      { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
    title:       { fontSize: 22, fontWeight: 700, color: "#1e3a8a" },
    addBtn: {
      background: "#2563eb", color: "#fff", border: "none", borderRadius: 10,
      padding: "10px 22px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: G.font,
    },
    bulkBar: {
      display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
      background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 16px",
    },
    bulkDelBtn: {
      background: "#dc2626", color: "#fff", border: "none", borderRadius: 8,
      padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: G.font,
    },
    clearSelBtn: {
      background: "none", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 8,
      padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: G.font,
    },
    filterBar:   { display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" },
    select: {
      background: "#f8faff", border: "1px solid #dbeafe", borderRadius: 8,
      padding: "8px 12px", fontSize: 13, color: G.text, fontFamily: G.font, cursor: "pointer",
    },
    formCard: {
      background: "#fff", border: "1px solid #dbeafe", borderRadius: 14,
      padding: "28px 32px", marginBottom: 24, boxShadow: "0 4px 20px rgba(37,99,235,0.08)",
    },
    formTitle:   { fontSize: 16, fontWeight: 700, color: "#1e3a8a", marginBottom: 20 },
    row:         { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 4 },
    label: {
      fontSize: 11, fontWeight: 700, color: G.muted,
      textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 5, display: "block",
    },
    input: (hasErr) => ({
      width: "100%", background: "#f8faff",
      border: `1.5px solid ${hasErr ? "#ef4444" : "#dbeafe"}`,
      borderRadius: 8, padding: "10px 12px", fontSize: 13, color: G.text, fontFamily: G.font,
      boxShadow: hasErr ? "0 0 0 3px #fee2e2" : "none", outline: "none", boxSizing: "border-box",
    }),
    fieldError:  { color: "#ef4444", fontSize: 11, marginTop: 3, marginBottom: 10 },
    formError:   { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#dc2626", marginBottom: 16 },
    formBtns:    { display: "flex", gap: 10, marginTop: 20 },
    saveBtn: {
      background: "#2563eb", color: "#fff", border: "none", borderRadius: 8,
      padding: "10px 28px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: G.font,
    },
    cancelBtn: {
      background: "#f1f5f9", color: G.muted, border: "1px solid #e2e8f0", borderRadius: 8,
      padding: "10px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: G.font,
    },
    table:       { width: "100%", borderCollapse: "collapse" },
    th: {
      textAlign: "left", fontSize: 11, fontWeight: 700, color: G.muted,
      textTransform: "uppercase", letterSpacing: 1, padding: "10px 14px",
      borderBottom: `2px solid ${G.border}`, background: "#f8faff",
    },
    td:          { padding: "12px 14px", borderBottom: `1px solid ${G.border}`, fontSize: 13 },
    checkbox:    { width: 16, height: 16, cursor: "pointer", accentColor: "#2563eb" },
    badge: (cat) => ({
      background: `${CATEGORY_COLORS[cat] || "#64748b"}18`,
      color: CATEGORY_COLORS[cat] || "#64748b",
      border: `1px solid ${CATEGORY_COLORS[cat] || "#64748b"}40`,
      borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700,
    }),
    incomeAmt:   { color: "#16a34a", fontWeight: 700 },
    expenseAmt:  { color: "#dc2626", fontWeight: 700 },
    actionBtn: (c) => ({
      background: "none", border: "none", color: c,
      cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: G.font, padding: "4px 8px",
    }),
    pagination: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginTop: 16, padding: "10px 4px",
    },
    pageInfo: { fontSize: 13, color: G.muted },
    pageBtn: (active, disabled) => ({
      background: active ? "#2563eb" : "#f8faff",
      color: active ? "#fff" : disabled ? "#cbd5e1" : G.text,
      border: "1px solid " + (active ? "#2563eb" : "#dbeafe"),
      borderRadius: 8, padding: "6px 12px", fontSize: 13,
      fontWeight: active ? 700 : 500,
      cursor: disabled ? "default" : "pointer",
      fontFamily: G.font, minWidth: 36,
    }),
    pageNumbers: { display: "flex", gap: 4, alignItems: "center" },
  };

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div style={S.wrap}>

      {/* Header */}
      <div style={S.header}>
        <div style={S.title}>Transactions</div>
        <button style={S.addBtn} onClick={() => { setShowForm(true); setEditId(null); setForm({ ...emptyForm, date: istDate(), time: istTime() }); setErrors({}); }}>
          + Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div style={S.filterBar}>
        <select style={S.select} value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}>
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select style={S.select} value={filter.month} onChange={e => setFilter(f => ({ ...f, month: e.target.value }))}>
          <option value="">All Months</option>
          {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select style={S.select} value={filter.year} onChange={e => setFilter(f => ({ ...f, year: e.target.value }))}>
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Bulk action bar — appears when items are selected */}
      {someSelected && (
        <div style={S.bulkBar}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#dc2626", flex: 1 }}>
            {selected.size} transaction{selected.size > 1 ? "s" : ""} selected
          </span>
          <button style={S.clearSelBtn} onClick={() => setSelected(new Set())}>
            Clear Selection
          </button>
          <button style={S.bulkDelBtn} onClick={handleBulkDelete} disabled={bulkDeleting}>
            {bulkDeleting ? "Deleting..." : `🗑 Delete ${selected.size} Selected`}
          </button>
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div style={S.formCard}>
          <div style={S.formTitle}>{editId ? "Edit Transaction" : "Add New Transaction"}</div>
          {errors._form && <div style={S.formError}>⚠ {errors._form}</div>}

          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {["expense", "income"].map(t => (
              <button key={t} onClick={() => set("type")({ target: { value: t } })} style={{
                flex: 1, padding: "9px", borderRadius: 8, fontWeight: 700, fontSize: 13,
                cursor: "pointer", fontFamily: G.font, transition: "all 0.2s",
                background: form.type === t ? (t === "expense" ? "#dc2626" : "#16a34a") : "#f1f5f9",
                color: form.type === t ? "#fff" : G.muted,
                border: `1.5px solid ${form.type === t ? "transparent" : "#e2e8f0"}`,
              }}>{t === "expense" ? "💸 Expense" : "💰 Income"}</button>
            ))}
          </div>

          <div style={S.row}>
            <div>
              <label style={S.label}>Amount (₹)</label>
              <input style={S.input(!!errors.amount)} type="number" min="0.01" step="0.01"
                placeholder="e.g. 500" value={form.amount} onChange={set("amount")} />
              {errors.amount && <div style={S.fieldError}>⚠ {errors.amount}</div>}
            </div>
            <div>
              <label style={S.label}>Category</label>
              <select style={{ ...S.input(!!errors.category), cursor: "pointer" }}
                value={form.category} onChange={set("category")}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
              {errors.category && <div style={S.fieldError}>⚠ {errors.category}</div>}
            </div>
          </div>

          <div style={S.row}>
            <div>
              <label style={S.label}>Date & Time</label>
              <input style={S.input(!!errors.date)} type="date"
                max={istDate()} value={form.date} onChange={set("date")} />
              {errors.date && <div style={S.fieldError}>⚠ {errors.date}</div>}
            </div>
            <div>
              <label style={S.label}>
                Time (IST)
                <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: 10, marginLeft: 6 }}>auto-filled, edit if needed</span>
              </label>
              <input
                style={S.input(false)}
                type="time"
                value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              />
              <div style={{ fontSize: 11, color: "#16a34a", marginTop: 3 }}>
                Current IST: {istTime()}
              </div>
            </div>
          </div>

          {/* Description — full width below */}
          <div style={{ marginBottom: 4 }}>
            <label style={S.label}>Description <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span></label>
            <input style={S.input(!!errors.description)} type="text"
              placeholder="e.g. Lunch at Cafe" maxLength={255}
              value={form.description} onChange={set("description")} />
            {errors.description && <div style={S.fieldError}>⚠ {errors.description}</div>}
            {form.description && !errors.description && (
              <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>{form.description.length}/255</div>
            )}
          </div>

          <div style={S.formBtns}>
            <button style={S.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editId ? "Update" : "Add Transaction"}
            </button>
            <button style={S.cancelBtn} onClick={handleCancel}>Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", color: G.muted, padding: 40 }}>Loading transactions...</div>
      ) : txns.length === 0 ? (
        <div style={{ textAlign: "center", color: G.muted, padding: 40 }}>No transactions found. Add your first one!</div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${G.border}`, overflow: "hidden" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: 44, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    style={S.checkbox}
                    checked={allSelected}
                    onChange={toggleAll}
                    title={allSelected ? "Deselect all" : "Select all"}
                  />
                </th>
                {["Date & Time", "Category", "Description", "Type", "Amount", "Actions"].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(t => {
                const isSelected = selected.has(t.id);
                return (
                  <tr
                    key={t.id}
                    style={{ background: isSelected ? "#eff6ff" : "", transition: "background 0.15s" }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#f8faff"; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = ""; }}
                  >
                    <td style={{ ...S.td, textAlign: "center", width: 44 }}>
                      <input
                        type="checkbox"
                        style={S.checkbox}
                        checked={isSelected}
                        onChange={() => toggleOne(t.id)}
                      />
                    </td>
                    <td style={S.td}>
                      <div>{new Date(new Date(t.date).getTime()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}</div>
                      <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>{new Date(t.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })}</div>
                    </td>
                    <td style={S.td}><span style={S.badge(t.category)}>{t.category}</span></td>
                    <td style={{ ...S.td, color: G.muted }}>{t.description || "—"}</td>
                    <td style={S.td}>
                      <span style={{ ...S.badge(t.type === "income" ? "Salary" : "Bills"), fontSize: 11 }}>
                        {t.type === "income" ? "↑ Income" : "↓ Expense"}
                      </span>
                    </td>
                    <td style={{ ...S.td, ...(t.type === "income" ? S.incomeAmt : S.expenseAmt) }}>
                      {t.type === "income" ? "+" : "−"} ₹{t.amount.toLocaleString("en-IN")}
                    </td>
                    <td style={S.td}>
                      <button style={S.actionBtn("#2563eb")} onClick={() => handleEdit(t)}>Edit</button>
                      <button style={S.actionBtn("#dc2626")} onClick={() => handleDelete(t.id)}
                        disabled={deleting === t.id}>
                        {deleting === t.id ? "..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && txns.length > PAGE_SIZE && (
        <div style={S.pagination}>
          <span style={S.pageInfo}>
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, txns.length)}–{Math.min(page * PAGE_SIZE, txns.length)} of {txns.length} transactions
          </span>
          <div style={S.pageNumbers}>
            <button
              style={S.pageBtn(false, page === 1)}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >← Prev</button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={"ellipsis-" + i} style={{ color: G.muted, padding: "0 4px" }}>…</span>
                ) : (
                  <button
                    key={p}
                    style={S.pageBtn(p === page, false)}
                    onClick={() => setPage(p)}
                  >{p}</button>
                )
              )}

            <button
              style={S.pageBtn(false, page === totalPages)}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
