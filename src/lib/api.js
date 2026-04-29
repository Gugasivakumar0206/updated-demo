const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

const AUTH_TOKEN_KEY = 'erp_auth_token'
const AUTH_USER_KEY = 'erp_auth_user'

export function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function getStoredUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
}

export function saveAuth(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(getStoredToken() ? { Authorization: `Bearer ${getStoredToken()}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`

    try {
      const errorData = await response.json()
      message = errorData.detail || errorData.message || message
    } catch {
    }

    throw new Error(message)
  }

  return response.json()
}

export function createCustomer(payload) {
  return request('/customer/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function createSupplier(payload) {
  return request('/supplier/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function createItem(payload) {
  return request('/inventory/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getItems() {
  return request('/inventory/')
}

export function getCustomers() {
  return request('/customer/')
}

export function getSuppliers() {
  return request('/supplier/')
}

export function getPurchaseInwards(inwardType = '') {
  const query = inwardType ? `?inward_type=${encodeURIComponent(inwardType)}` : ''
  return request(`/purchase-inward/${query}`)
}

export function createPurchaseInward(payload) {
  return request('/purchase-inward/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getDashboardSummary() {
  return request('/dashboard/summary')
}

export function getInventoryReport() {
  return request('/reports/inventory')
}

export function getInventoryReportCsvUrl() {
  return `${API_BASE_URL}/reports/inventory/csv`
}

export function getBusinessReport(reportKey) {
  return request(`/reports/${reportKey}`)
}

export function getBusinessReportCsvUrl(reportKey) {
  return `${API_BASE_URL}/reports/${reportKey}/csv`
}

export function getSalesDCs() {
  return request('/sales-dc/')
}

export function createSalesDC(payload) {
  return request('/sales-dc/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getTaxInvoices() {
  return request('/tax-invoice/')
}

export function getTaxInvoiceById(id) {
  return request(`/tax-invoice/${id}`)
}

export function createTaxInvoice(payload) {
  return request('/tax-invoice/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateTaxInvoice(id, payload) {
  return request(`/tax-invoice/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteTaxInvoice(id) {
  return request(`/tax-invoice/${id}`, {
    method: 'DELETE',
  })
}

export function getSaleInvoices() {
  return request('/sale-invoice/')
}

export function createSaleInvoice(payload) {
  return request('/sale-invoice/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function deleteSaleInvoice(id) {
  return request(`/sale-invoice/${id}`, {
    method: 'DELETE',
  })
}

export async function registerUser(payload) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function loginUser(payload) {
  const result = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  saveAuth(result.token, result.user)
  return result
}

export function getCurrentUser() {
  return request('/auth/me')
}
