import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Budgets from "./pages/Budgets";
import Analytics from "./pages/Analytics";
import AIInsights from "./pages/AIInsights";
import ImportPDF from "./pages/ImportPDF";
import { getMe } from "./services/api";

const NAV = [
  { id: "dashboard",    label: "Dashboard",   icon: "◈" },
  { id: "transactions", label: "Transactions", icon: "⇄" },
  { id: "budgets",      label: "Budgets",      icon: "◎" },
  { id: "analytics",   label: "Analytics",    icon: "∿" },
  { id: "ai",          label: "AI Insights",  icon: "⬡" },
  { id: "import",      label: "Import PDF",   icon: "📄" },
];

const G = {
  bg:      "#f0f4ff",
  surface: "#ffffff",
  border:  "#dde6f5",
  accent:  "#2563eb",
  accent2: "#1d4ed8",
  green:   "#16a34a",
  red:     "#dc2626",
  yellow:  "#d97706",
  text:    "#0f172a",
  muted:   "#64748b",
  font:    "'Outfit', sans-serif",
  mono:    "'JetBrains Mono', monospace",
};

export { G };

export default function App() {
  const [user, setUser]       = useState(null);
  const [page, setPage]       = useState("dashboard");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      getMe()
        .then(r => setUser(r.data))
        .catch(() => localStorage.removeItem("token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem("token", token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const s = {
    app: {
      minHeight: "100vh",
      background: G.bg,
      color: G.text,
      fontFamily: G.font,
      display: "flex",
    },
    sidebar: {
      width: 230,
      background: G.accent2,
      borderRight: "none",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      position: "fixed",
      top: 0, left: 0, bottom: 0,
      boxShadow: "4px 0 20px rgba(37,99,235,0.15)",
    },
    logo: {
      padding: "28px 24px 20px",
      borderBottom: "1px solid rgba(255,255,255,0.15)",
    },
    logoText: {
      fontFamily: G.font,
      fontWeight: 900,
      fontSize: 20,
      color: "#ffffff",
      letterSpacing: "-0.5px",
    },
    logoSub: {
      fontSize: 10,
      color: "rgba(255,255,255,0.6)",
      letterSpacing: 2,
      textTransform: "uppercase",
      marginTop: 2,
    },
    nav: {
      padding: "16px 12px",
      flex: 1,
    },
    navBtn: (active) => ({
      display: "flex",
      alignItems: "center",
      gap: 10,
      width: "100%",
      padding: "10px 14px",
      borderRadius: 10,
      border: "none",
      cursor: "pointer",
      marginBottom: 4,
      background: active ? "rgba(255,255,255,0.2)" : "transparent",
      color: active ? "#ffffff" : "rgba(255,255,255,0.65)",
      fontSize: 13,
      fontWeight: active ? 700 : 400,
      fontFamily: G.font,
      textAlign: "left",
      transition: "all 0.15s",
    }),
    navIcon: {
      fontSize: 16,
      width: 20,
      textAlign: "center",
      flexShrink: 0,
    },
    userBox: {
      padding: "16px",
      borderTop: "1px solid rgba(255,255,255,0.15)",
    },
    userName: {
      fontWeight: 700,
      color: "#ffffff",
      fontSize: 13,
    },
    userInfo: {
      fontSize: 12,
      color: "rgba(255,255,255,0.6)",
      marginBottom: 10,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    logoutBtn: {
      width: "100%",
      padding: "8px",
      background: "rgba(255,255,255,0.15)",
      border: "1px solid rgba(255,255,255,0.25)",
      borderRadius: 8,
      color: "#ffffff",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
      fontFamily: G.font,
    },
    main: {
      flex: 1,
      marginLeft: 230,
      padding: "32px",
      minHeight: "100vh",
    },
  };

  if (loading) return (
    <div style={{ ...s.app, alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: G.accent, fontFamily: G.mono, fontSize: 14 }}>Loading...</div>
    </div>
  );

  if (!user) return <Login onLogin={handleLogin} />;

  const pages = { dashboard: Dashboard, transactions: Transactions, budgets: Budgets, analytics: Analytics, ai: AIInsights, import: ImportPDF };
  const PageComponent = pages[page] || Dashboard;

  return (
    <div style={s.app}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: ${G.bg}; }
        ::-webkit-scrollbar-thumb { background: ${G.border}; border-radius: 3px; }
        button:hover { opacity: 0.88; }
        input, select { outline: none; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .fade-in { animation: fadeIn 0.3s ease forwards; }
      `}</style>

      <aside style={s.sidebar}>
        <div style={s.logo}>
          <div style={s.logoText}>💸 ExpenseIQ</div>
          <div style={s.logoSub}>Smart Tracker</div>
        </div>
        <nav style={s.nav}>
          {NAV.map(n => (
            <button key={n.id} style={s.navBtn(page === n.id)} onClick={() => setPage(n.id)}>
              <span style={s.navIcon}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
        <div style={s.userBox}>
          <div style={s.userName}>{user.name}</div>
          <div style={s.userInfo}>{user.email}</div>
          <button style={s.logoutBtn} onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>

      <main style={s.main}>
        <PageComponent user={user} />
      </main>
    </div>
  );
}
