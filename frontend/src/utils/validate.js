// utils/validate.js  –  ExpenseIQ frontend validation helpers

export const EXPENSE_CATEGORIES = [
  "Food", "Transport", "Shopping", "Entertainment",
  "Health", "Education", "Bills", "Other"
];

export const INCOME_CATEGORIES = [
  "Salary", "Freelance", "Investment", "Business", "Other","Bonus"
];

// ── Auth validations ────────────────────────────────────────────────────────

export function validateName(name) {
  const v = name.trim();
  if (!v) return "Name is required";
  if (v.length < 2) return "Name must be at least 2 characters";
  if (v.length > 100) return "Name must be under 100 characters";
  if (!/^[A-Za-z\s.\-']+$/.test(v)) return "Name can only contain letters, spaces, hyphens, apostrophes, or dots";
  return null;
}

export function validateEmail(email) {
  const v = email.trim();
  if (!v) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email address";
  return null;
}

export function validatePassword(password) {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 128) return "Password is too long";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
  if (!/\d/.test(password)) return "Password must contain at least one number";
  return null;
}

export function validateOTP(otp) {
  if (!otp) return "OTP is required";
  if (!/^\d{6}$/.test(otp)) return "OTP must be exactly 6 digits";
  return null;
}

// ── Transaction validations ─────────────────────────────────────────────────

export function validateAmount(amount) {
  const v = String(amount).trim();
  if (!v) return "Amount is required";
  const n = parseFloat(v);
  if (isNaN(n)) return "Amount must be a valid number";
  if (n <= 0) return "Amount must be greater than 0";
  if (n > 10_000_000) return "Amount cannot exceed ₹1,00,00,000";
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return "Amount can have at most 2 decimal places";
  return null;
}

export function validateCategory(category, type) {
  if (!category) return "Category is required";
  const valid = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  if (!valid.includes(category)) return `Invalid category for ${type}`;
  return null;
}

export function validateDescription(description) {
  if (description && description.length > 255)
    return "Description must be under 255 characters";
  return null;
}

export function validateDate(dateStr) {
  if (!dateStr) return "Date is required";
  // Parse as local date by appending T00:00 (avoids UTC-shift making yesterday appear "future")
  const d = new Date(dateStr + "T00:00");
  if (isNaN(d)) return "Enter a valid date";
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (d > today) return "Date cannot be in the future";
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  if (d < fiveYearsAgo) return "Date cannot be more than 5 years in the past";
  return null;
}

export function validateTransaction({ amount, type, category, description, date }) {
  const errors = {};
  const amtErr = validateAmount(amount);
  if (amtErr) errors.amount = amtErr;
  const catErr = validateCategory(category, type);
  if (catErr) errors.category = catErr;
  const descErr = validateDescription(description);
  if (descErr) errors.description = descErr;
  const dateErr = validateDate(date);
  if (dateErr) errors.date = dateErr;
  return errors; // empty object = valid
}

// ── Budget validations ──────────────────────────────────────────────────────

export function validateBudgetAmount(amount) {
  return validateAmount(amount); // same rules
}

export function validateBudgetCategory(category) {
  const valid = [...EXPENSE_CATEGORIES, "Overall"];
  if (!category) return "Category is required";
  if (!valid.includes(category)) return "Invalid budget category";
  return null;
}

export function validateBudgetMonth(month) {
  const m = parseInt(month);
  if (!month) return "Month is required";
  if (isNaN(m) || m < 1 || m > 12) return "Month must be between 1 and 12";
  return null;
}

export function validateBudgetYear(year) {
  const y = parseInt(year);
  if (!year) return "Year is required";
  if (isNaN(y) || y < 2020 || y > 2100) return "Enter a valid year (2020–2100)";
  return null;
}

// ── Helper: show inline error style ────────────────────────────────────────

export function fieldStyle(base, error) {
  return {
    ...base,
    border: error ? "1.5px solid #ef4444" : base.border,
    boxShadow: error ? "0 0 0 2px #fee2e2" : "none",
  };
}
