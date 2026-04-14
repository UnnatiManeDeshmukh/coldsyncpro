// Shared frontend validators — mirrors backend validators.py

export const PHONE_RE    = /^[6-9]\d{9}$/
export const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/
export const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const NAME_RE     = /^[a-zA-Z\u0900-\u097F\s'\-.]{2,100}$/
export const SAFE_RE     = /^[^<>{}\[\]\\;`$|&]*$/
export const UTR_RE      = /^[a-zA-Z0-9]{8,25}$/   // UPI UTR / reference number

// ── Core validators ───────────────────────────────────────────────────────────

export function validatePhone(v = '') {
  const clean = v.replace(/[\s+]/g, '').replace(/^91/, '')
  if (!clean) return 'Phone number is required'
  if (!/^\d+$/.test(clean)) return 'Phone number must contain only digits'
  if (!PHONE_RE.test(clean)) return 'Enter valid 10-digit mobile number starting with 6–9'
  return ''
}

export function validateUsername(v = '') {
  if (!v.trim()) return 'Username is required'
  if (/^\d+$/.test(v)) return 'Username cannot be only numbers — add at least one letter'
  if (!USERNAME_RE.test(v)) return 'Username: 3–30 chars, letters/numbers/underscore only, no spaces'
  return ''
}

export function validateEmail(v = '') {
  if (!v.trim()) return 'Email is required'
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address (e.g. name@example.com)'
  return ''
}

export function validateName(v = '', label = 'Name') {
  if (!v.trim()) return `${label} is required`
  if (/^\d+$/.test(v.trim())) return `${label} cannot be only numbers`
  if (v.trim().length < 2) return `${label} must be at least 2 characters`
  if (!NAME_RE.test(v.trim())) return `${label}: only letters, spaces, hyphens and dots allowed`
  return ''
}

export function validatePassword(v = '') {
  if (!v) return 'Password is required'
  if (v.length < 6) return 'Password must be at least 6 characters'
  if (v.length > 128) return 'Password is too long'
  if (/^\d+$/.test(v)) return 'Password cannot be all numbers — add at least one letter'
  const common = ['password', '123456', 'qwerty', 'abcdef', '111111', 'password1']
  if (common.includes(v.toLowerCase())) return 'Password is too common — choose a stronger one'
  return ''
}

export function validateSafeText(v = '', label = 'Field') {
  if (!SAFE_RE.test(v)) return `${label} contains invalid characters`
  return ''
}

// ── Address / Location validators ─────────────────────────────────────────────

export function validateVillage(v = '') {
  if (!v.trim()) return 'Village / Town is required'
  if (/^\d+$/.test(v.trim())) return 'Village cannot be only numbers — enter a valid village/town name'
  if (v.trim().length < 2) return 'Village name must be at least 2 characters'
  if (!SAFE_RE.test(v)) return 'Village contains invalid characters'
  return ''
}

export function validateAddress(v = '') {
  if (!v.trim()) return 'Address is required'
  if (/^\d+$/.test(v.trim())) return 'Address cannot be only numbers — enter a valid address'
  if (v.trim().length < 5) return 'Address must be at least 5 characters'
  if (!SAFE_RE.test(v)) return 'Address contains invalid characters'
  return ''
}

export function validateShopName(v = '') {
  if (!v.trim()) return 'Shop name is required'
  if (/^\d+$/.test(v.trim())) return 'Shop name cannot be only numbers'
  if (v.trim().length < 2) return 'Shop name must be at least 2 characters'
  if (!SAFE_RE.test(v)) return 'Shop name contains invalid characters'
  return ''
}

// ── Payment validators ────────────────────────────────────────────────────────

export function validateAmount(v = '') {
  if (!String(v).trim()) return 'Amount is required'
  const n = parseFloat(v)
  if (isNaN(n)) return 'Amount must be a valid number'
  if (n <= 0) return 'Amount must be greater than ₹0'
  if (n > 999999) return 'Amount cannot exceed ₹9,99,999'
  return ''
}

export function validateReference(v = '') {
  if (!v.trim()) return 'UPI reference / UTR number is required'
  if (v.trim().length < 8) return 'Reference number must be at least 8 characters'
  if (v.trim().length > 50) return 'Reference number is too long'
  if (!SAFE_RE.test(v)) return 'Reference number contains invalid characters'
  return ''
}

// ── Product / Inventory validators ───────────────────────────────────────────

export function validateProductName(v = '') {
  if (!v.trim()) return 'Product name is required'
  if (/^\d+$/.test(v.trim())) return 'Product name cannot be only numbers'
  if (v.trim().length < 2) return 'Product name must be at least 2 characters'
  if (!SAFE_RE.test(v)) return 'Product name contains invalid characters'
  return ''
}

export function validateBrand(v = '') {
  if (!v.trim()) return 'Brand is required'
  if (/^\d+$/.test(v.trim())) return 'Brand cannot be only numbers'
  if (v.trim().length < 2) return 'Brand must be at least 2 characters'
  return ''
}

export function validateCrateSize(v = '') {
  const n = parseInt(v)
  if (!v) return 'Crate size is required'
  if (isNaN(n) || n < 1) return 'Crate size must be at least 1'
  if (n > 1000) return 'Crate size cannot exceed 1000'
  return ''
}

export function validateRate(v = '') {
  if (!String(v).trim()) return 'Rate is required'
  const n = parseFloat(v)
  if (isNaN(n) || n <= 0) return 'Rate must be greater than ₹0'
  if (n > 10000) return 'Rate cannot exceed ₹10,000 per bottle'
  return ''
}

export function validateExpiryDate(v = '') {
  if (!v) return 'Expiry date is required'
  const d = new Date(v)
  if (isNaN(d.getTime())) return 'Enter a valid date'
  if (d < new Date()) return 'Expiry date cannot be in the past'
  return ''
}

// ── Expense validators ────────────────────────────────────────────────────────

export function validateExpenseName(v = '') {
  if (!v.trim()) return 'Expense name is required'
  if (/^\d+$/.test(v.trim())) return 'Expense name cannot be only numbers'
  if (v.trim().length < 2) return 'Expense name must be at least 2 characters'
  if (!SAFE_RE.test(v)) return 'Expense name contains invalid characters'
  return ''
}

export function validateExpenseDate(v = '') {
  if (!v) return 'Date is required'
  const d = new Date(v)
  if (isNaN(d.getTime())) return 'Enter a valid date'
  const today = new Date(); today.setHours(23, 59, 59, 999)
  if (d > today) return 'Expense date cannot be in the future'
  return ''
}

// ── Return validators ─────────────────────────────────────────────────────────

export function validateQuantity(crates = 0, bottles = 0) {
  const c = parseInt(crates) || 0
  const b = parseInt(bottles) || 0
  if (c < 0) return 'Crates cannot be negative'
  if (b < 0) return 'Bottles cannot be negative'
  if (c === 0 && b === 0) return 'Enter at least 1 crate or 1 bottle'
  if (c > 1000) return 'Crates cannot exceed 1000'
  if (b > 10000) return 'Bottles cannot exceed 10,000'
  return ''
}

// ── Contact form validators ───────────────────────────────────────────────────

export function validateContactName(v = '') {
  if (!v.trim()) return 'Name is required'
  if (/^\d+$/.test(v.trim())) return 'Name cannot be only numbers'
  if (v.trim().length < 2) return 'Name must be at least 2 characters'
  if (!SAFE_RE.test(v)) return 'Name contains invalid characters'
  return ''
}

export function validateMessage(v = '') {
  if (!v.trim()) return 'Message is required'
  if (v.trim().length < 10) return 'Message must be at least 10 characters'
  if (v.trim().length > 1000) return 'Message cannot exceed 1000 characters'
  if (!SAFE_RE.test(v)) return 'Message contains invalid characters'
  return ''
}

// ── Supplier validators ───────────────────────────────────────────────────────

export function validateSupplierName(v = '') {
  if (!v.trim()) return 'Supplier name is required'
  if (/^\d+$/.test(v.trim())) return 'Supplier name cannot be only numbers'
  if (v.trim().length < 2) return 'Supplier name must be at least 2 characters'
  if (!SAFE_RE.test(v)) return 'Supplier name contains invalid characters'
  return ''
}

// ── Password strength ─────────────────────────────────────────────────────────

export function passwordStrength(v = '') {
  if (!v) return 0
  let score = 0
  if (v.length >= 6)  score++
  if (v.length >= 10) score++
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++
  if (/\d/.test(v) && /[^a-zA-Z0-9]/.test(v)) score++
  return score  // 0–4
}

export const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong']
export const STRENGTH_COLOR = ['', '#C00000', '#F5B400', '#1E6FFF', '#00C864']
