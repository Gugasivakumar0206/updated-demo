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

export function updateCustomer(id, payload) {
  return request(`/customer/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteCustomer(id) {
  return request(`/customer/${id}`, {
    method: 'DELETE',
  })
}

export function createSupplier(payload) {
  return request('/supplier/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateSupplier(id, payload) {
  return request(`/supplier/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteSupplier(id) {
  return request(`/supplier/${id}`, {
    method: 'DELETE',
  })
}

export function createItem(payload) {
  return request('/inventory/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getItems(itemType = '') {
  const query = itemType ? `?item_type=${encodeURIComponent(itemType)}` : ''
  return request(`/inventory/${query}`)
}

export function getItemById(id) {
  return request(`/inventory/${id}`)
}

export function getNextItemNumber(itemType = '') {
  const query = itemType ? `?item_type=${encodeURIComponent(itemType)}` : ''
  return request(`/inventory/next-number${query}`)
}

export function updateItem(id, payload) {
  return request(`/inventory/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteItem(id) {
  return request(`/inventory/${id}`, {
    method: 'DELETE',
  })
}

export function getCustomers() {
  return request('/customer/')
}

export function getCustomerById(id) {
  return request(`/customer/${id}`)
}

export function getNextCustomerNumber() {
  return request('/customer/next-number')
}

export function getSuppliers() {
  return request('/supplier/')
}

export function getSupplierById(id) {
  return request(`/supplier/${id}`)
}

export function getNextSupplierNumber() {
  return request('/supplier/next-number')
}

export function getPurchaseInwards(inwardType = '') {
  const query = inwardType ? `?inward_type=${encodeURIComponent(inwardType)}` : ''
  return request(`/purchase-inward/${query}`)
}

export function getNextPurchaseInwardNumber(inwardType = 'GRN') {
  return request(`/purchase-inward/next-number?inward_type=${encodeURIComponent(inwardType)}`)
}

export function createPurchaseInward(payload) {
  return request('/purchase-inward/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getPurchaseInvoiceNos({ inwardType = '', supplierId = '', query = '' } = {}) {
  const params = new URLSearchParams()
  if (inwardType) params.set('inward_type', inwardType)
  if (supplierId) params.set('supplier_id', supplierId)
  if (query) params.set('q', query)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return request(`/purchase-inward/invoice-nos${suffix}`)
}

export function getPurchaseReturns(returnType = '') {
  const query = returnType ? `?return_type=${encodeURIComponent(returnType)}` : ''
  return request(`/purchase-return/${query}`)
}

export function getPurchaseReturnById(id) {
  return request(`/purchase-return/${id}`)
}

export function getNextPurchaseReturnNumber(returnType = 'PO_DC_RETURN') {
  return request(`/purchase-return/next-number?return_type=${encodeURIComponent(returnType)}`)
}

export function createPurchaseReturn(payload) {
  return request('/purchase-return/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getNextInwardInspectionNumber() {
  return request('/quality/inward-inspection/next-number')
}

export function getInwardInspectionSources(inwardType) {
  const suffix = inwardType ? `?inward_type=${encodeURIComponent(inwardType)}` : ''
  return request(`/quality/inward-inspection/source${suffix}`)
}

export function getInwardInspectionSourceDetail(purchaseInwardId) {
  return request(`/quality/inward-inspection/source/${purchaseInwardId}`)
}

export function getInwardInspections() {
  return request('/quality/inward-inspection')
}

export function getInwardInspectionById(id) {
  return request(`/quality/inward-inspection/${id}`)
}

export function createInwardInspection(payload) {
  return request('/quality/inward-inspection', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getItemGroups() {
  return request('/quality/item-group')
}

export function createItemGroup(payload) {
  return request('/quality/item-group', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function deleteItemGroup(id) {
  return request(`/quality/item-group/${id}`, {
    method: 'DELETE',
  })
}

export function getRacks() {
  return request('/maintenance/racks')
}

export function createRack(payload) {
  return request('/maintenance/racks', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getBins() {
  return request('/maintenance/bins')
}

export function createBin(payload) {
  return request('/maintenance/bins', {
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

export function getSalesDCById(id) {
  return request(`/sales-dc/${id}`)
}

export function getNextSalesDCNumber() {
  return request('/sales-dc/next-number')
}

export function createSalesDC(payload) {
  return request('/sales-dc/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateSalesDC(id, payload) {
  return request(`/sales-dc/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteSalesDC(id) {
  return request(`/sales-dc/${id}`, {
    method: 'DELETE',
  })
}

export function getTaxInvoices() {
  return request('/tax-invoice/')
}

export function getTaxInvoiceById(id) {
  return request(`/tax-invoice/${id}`)
}

export function getNextTaxInvoiceNumber() {
  return request('/tax-invoice/next-number')
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

export function getSaleInvoiceById(id) {
  return request(`/sale-invoice/${id}`)
}

export function getNextSaleInvoiceNumber() {
  return request('/sale-invoice/next-number')
}

export function createSaleInvoice(payload) {
  return request('/sale-invoice/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateSaleInvoice(id, payload) {
  return request(`/sale-invoice/${id}`, {
    method: 'PUT',
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

export function getCompanyUsers() {
  return request('/auth/users')
}

export function createCompanyUser(payload) {
  return request('/auth/users', {
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

export function getCompanyInfo() {
  return request('/company/')
}

export function saveCompanyInfo(payload) {
  return request('/company/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
