import { useState } from "react";
import { login, register, getMe, verifyOTP, resendOTP } from "../services/api";
import { G } from "../App";
import {
  validateName, validateEmail, validatePassword, validateOTP
} from "../utils/validate";

export default function Login({ onLogin }) {
  const [mode, setMode]       = useState("login");
  const [form, setForm]       = useState({ name: "", email: "", password: "" });
  const [otp, setOtp]         = useState("");
  const [msg, setMsg]         = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors]   = useState({});

  const isSuccess = (m) => typeof m === "string" && m.startsWith("✅");

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(prev => ({ ...prev, [k]: null }));
  };

  const validateRegisterForm = () => {
    const errs = {};
    const nameErr = validateName(form.name);
    if (nameErr) errs.name = nameErr;
    const emailErr = validateEmail(form.email);
    if (emailErr) errs.email = emailErr;
    const passErr = validatePassword(form.password);
    if (passErr) errs.password = passErr;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateLoginForm = () => {
    const errs = {};
    const emailErr = validateEmail(form.email);
    if (emailErr) errs.email = emailErr;
    if (!form.password) errs.password = "Password is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validateRegisterForm()) return;
    setMsg(""); setLoading(true);
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      setMsg("✅ OTP sent to your email! Check your inbox.");
      setMode("verify-otp");
    } catch (e) {
      const d = e.response?.data?.detail;
      setMsg(typeof d === "string" ? d : Array.isArray(d) ? d[0]?.msg || "Registration failed." : "Registration failed.");
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    const otpErr = validateOTP(otp);
    if (otpErr) { setMsg(otpErr); return; }
    setMsg(""); setLoading(true);
    try {
      await verifyOTP({ email: form.email, otp });
      setMsg("✅ Email verified! You can now log in.");
      setMode("login"); setOtp("");
    } catch (e) {
      const d = e.response?.data?.detail;
      setMsg(typeof d === "string" ? d : "Invalid or expired OTP.");
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setMsg(""); setLoading(true);
    try {
      await resendOTP({ email: form.email });
      setMsg("✅ New OTP sent!");
      setResendCooldown(30);
      const t = setInterval(() => setResendCooldown(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
    } catch (e) {
      const d = e.response?.data?.detail;
      setMsg(typeof d === "string" ? d : "Failed to resend OTP.");
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!validateLoginForm()) return;
    setMsg(""); setLoading(true);
    try {
      const res = await login({ email: form.email.trim(), password: form.password });
      localStorage.setItem("token", res.data.access_token);
      const me = await getMe();
      onLogin(me.data, res.data.access_token);
    } catch (e) {
      const d = e.response?.data?.detail;
      setMsg(typeof d === "string" ? d : Array.isArray(d) ? d[0]?.msg || "Login failed." : "Login failed.");
    }
    setLoading(false);
  };

  // ── Styles (static — defined outside render so they never change) ────────
  const page = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #eff6ff 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: G.font,
  };
  const card = {
    background: "#ffffff", borderRadius: 20, padding: "44px 48px",
    width: 420,
    boxShadow: "0 20px 60px rgba(37,99,235,0.12), 0 4px 16px rgba(37,99,235,0.08)",
    border: "1px solid #dbeafe",
  };
  const topBar = {
    height: 4,
    background: "linear-gradient(90deg, #2563eb, #1d4ed8, #3b82f6)",
    borderRadius: "20px 20px 0 0",
    margin: "-44px -48px 36px",
  };
  const labelStyle = {
    fontSize: 11, color: G.muted, letterSpacing: 1.5,
    textTransform: "uppercase", fontWeight: 700, marginBottom: 6, display: "block",
  };
  const inputBase = {
    width: "100%", background: "#f8faff",
    border: "1.5px solid #dbeafe",
    borderRadius: 10, padding: "12px 14px",
    color: G.text, fontSize: 14, fontFamily: G.font,
    marginBottom: 16, outline: "none", boxSizing: "border-box",
  };
  const inputErr = {
    ...inputBase,
    border: "1.5px solid #ef4444",
    boxShadow: "0 0 0 3px #fee2e2",
    marginBottom: 4,
  };
  const fieldErrorStyle = { color: "#ef4444", fontSize: 12, marginBottom: 12, paddingLeft: 2 };
  const btnStyle = {
    width: "100%", padding: "13px",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    border: "none", borderRadius: 10, color: "#fff",
    fontWeight: 700, fontSize: 14, cursor: "pointer",
    fontFamily: G.font, marginTop: 4, letterSpacing: 0.3,
    boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
  };
  const toggleStyle = { textAlign: "center", marginTop: 20, fontSize: 13, color: G.muted };
  const toggleLink = { color: "#2563eb", cursor: "pointer", fontWeight: 700, marginLeft: 4 };
  const msgBox = {
    background: isSuccess(msg) ? "#f0fdf4" : "#fef2f2",
    border: `1px solid ${isSuccess(msg) ? "#bbf7d0" : "#fecaca"}`,
    borderRadius: 8, padding: "10px 14px", fontSize: 13,
    color: isSuccess(msg) ? "#16a34a" : "#dc2626", marginBottom: 16,
  };
  const emailBadge = {
    background: "#eff6ff", border: "1px solid #bfdbfe",
    borderRadius: 8, padding: "10px 14px", fontSize: 13,
    color: "#2563eb", marginBottom: 18, textAlign: "center", fontWeight: 500,
  };
  const otpInput = {
    width: "100%", background: "#f8faff",
    border: "2px solid #2563eb", borderRadius: 10,
    padding: "16px 14px", color: "#1e3a8a", fontSize: 32,
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: 16, textAlign: "center", letterSpacing: 14, fontWeight: 700,
    outline: "none", boxSizing: "border-box",
  };
  const resendBtnStyle = {
    background: "none", border: "none",
    color: resendCooldown > 0 ? G.muted : "#2563eb",
    cursor: resendCooldown > 0 ? "default" : "pointer",
    fontSize: 13, fontFamily: G.font, fontWeight: 700, padding: 0,
  };

  return (
    <div style={page}>
      <div style={card}>
        <div style={topBar} />

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>💸</div>
          <div style={{ fontWeight: 900, fontSize: 28, color: "#1e3a8a", letterSpacing: "-1px" }}>ExpenseIQ</div>
          <div style={{ color: G.muted, fontSize: 13, marginTop: 4 }}>
            {mode === "login" ? "Sign in to your account" : mode === "register" ? "Create your account" : "Verify your email"}
          </div>
        </div>

        {msg && <div style={msgBox}>{msg}</div>}

        {/* ── OTP Verify ─────────────────────────────────────── */}
        {mode === "verify-otp" && (
          <>
            <div style={emailBadge}>📧 OTP sent to {form.email}</div>
            <label style={labelStyle}>Enter 6-Digit Code</label>
            <input
              style={otpInput}
              type="text"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => e.key === "Enter" && handleVerifyOTP()}
            />
            <button style={btnStyle} onClick={handleVerifyOTP} disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: G.muted }}>
              Didn't receive it?{" "}
              <button style={resendBtnStyle} onClick={handleResend} disabled={loading || resendCooldown > 0}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
              </button>
            </div>
            <div style={toggleStyle}>
              <span style={toggleLink} onClick={() => { setMode("register"); setMsg(""); setOtp(""); }}>← Back</span>
            </div>
          </>
        )}

        {/* ── Register ───────────────────────────────────────── */}
        {mode === "register" && (
          <>
            <label style={labelStyle}>Full Name</label>
            <input
              style={errors.name ? inputErr : inputBase}
              type="text"
              placeholder="Your name"
              value={form.name}
              onChange={set("name")}
              onKeyDown={e => e.key === "Enter" && handleRegister()}
            />
            {errors.name && <div style={fieldErrorStyle}>⚠ {errors.name}</div>}

            <label style={labelStyle}>Email Address</label>
            <input
              style={errors.email ? inputErr : inputBase}
              type="email"
              placeholder="you@email.com"
              value={form.email}
              onChange={set("email")}
              onKeyDown={e => e.key === "Enter" && handleRegister()}
            />
            {errors.email && <div style={fieldErrorStyle}>⚠ {errors.email}</div>}

            <label style={labelStyle}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                style={{ ...(errors.password ? inputErr : inputBase), paddingRight: 44 }}
                type={showPass ? "text" : "password"}
                placeholder="Min 8 chars, uppercase, number"
                value={form.password}
                onChange={set("password")}
                onKeyDown={e => e.key === "Enter" && handleRegister()}
              />
              <span
                onClick={() => setShowPass(v => !v)}
                style={{ position: "absolute", right: 14, top: 13, cursor: "pointer", fontSize: 18, userSelect: "none" }}
              >{showPass ? "🙈" : "👁️"}</span>
            </div>
            {errors.password && <div style={fieldErrorStyle}>⚠ {errors.password}</div>}
            {form.password && !errors.password && (
              <div style={{ fontSize: 11, color: "#16a34a", marginBottom: 12 }}>✓ Password looks good</div>
            )}

            <button style={btnStyle} onClick={handleRegister} disabled={loading}>
              {loading ? "Sending OTP..." : "Create Account"}
            </button>
            <div style={toggleStyle}>
              Already have an account?
              <span style={toggleLink} onClick={() => { setMode("login"); setMsg(""); setErrors({}); }}>Sign In</span>
            </div>
          </>
        )}

        {/* ── Login ──────────────────────────────────────────── */}
        {mode === "login" && (
          <>
            <label style={labelStyle}>Email Address</label>
            <input
              style={errors.email ? inputErr : inputBase}
              type="email"
              placeholder="you@email.com"
              value={form.email}
              onChange={set("email")}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
            />
            {errors.email && <div style={fieldErrorStyle}>⚠ {errors.email}</div>}

            <label style={labelStyle}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                style={{ ...(errors.password ? inputErr : inputBase), paddingRight: 44 }}
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={set("password")}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
              <span
                onClick={() => setShowPass(v => !v)}
                style={{ position: "absolute", right: 14, top: 13, cursor: "pointer", fontSize: 18, userSelect: "none" }}
              >{showPass ? "🙈" : "👁️"}</span>
            </div>
            {errors.password && <div style={fieldErrorStyle}>⚠ {errors.password}</div>}

            <button style={btnStyle} onClick={handleLogin} disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
            <div style={toggleStyle}>
              Don't have an account?
              <span style={toggleLink} onClick={() => { setMode("register"); setMsg(""); setErrors({}); }}>Register</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
