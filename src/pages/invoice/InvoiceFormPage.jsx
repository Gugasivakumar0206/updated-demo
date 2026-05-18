import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  PageContainer, SectionCard, FormGrid, FormInput,
  SelectDropdown, DatePicker, ActionButtons
} from '../../components/ui/index'
import { Receipt, List, Calculator, Printer } from 'lucide-react'
import {
  createSaleInvoice,
  createTaxInvoice,
  deleteSaleInvoice,
  deleteTaxInvoice,
  getCompanyInfo,
  getCustomers,
  getItems,
  getNextSaleInvoiceNumber,
  getNextTaxInvoiceNumber,
  getSaleInvoiceById,
  getSalesDCs,
  getTaxInvoiceById,
  updateSaleInvoice,
  updateTaxInvoice,
} from '../../lib/api'

const emptyRow = () => ({ itemName: '', itemId: '', quantity: '', rate: '', tax: '18', amount: '' })

export default function InvoiceFormPage({ type }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({})
  const [rows, setRows] = useState([emptyRow()])
  const [customers, setCustomers] = useState([])
  const [items, setItems] = useState([])
  const [salesDCs, setSalesDCs] = useState([])
  const [companyInfo, setCompanyInfo] = useState(null)
  const dbBacked = type === 'Tax Invoice' || type === 'Sale Invoice'
  const showStatusField = type !== 'Tax Invoice'
  const [loadingMasters, setLoadingMasters] = useState(dbBacked)
  const [loadingInvoice, setLoadingInvoice] = useState(dbBacked && Boolean(id))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const bind = (k) => ({ value: form[k] || '', onChange: (e) => set(k, e.target.value) })

  useEffect(() => {
    if (!dbBacked) return

    async function loadMasters() {
      try {
        setLoadingMasters(true)
        setError('')
        const [customerResult, itemResult, salesDcResult] = await Promise.all([
          getCustomers(),
          getItems(),
          getSalesDCs(),
        ])
        setCustomers(customerResult)
        setItems(itemResult)
        setSalesDCs(salesDcResult)
      } catch (loadError) {
        setError(loadError.message || `Unable to load ${type.toLowerCase()} masters.`)
      } finally {
        setLoadingMasters(false)
      }
    }

    loadMasters()
  }, [dbBacked, type])

  useEffect(() => {
    if (!dbBacked || id) return

    async function loadNextNumber() {
      try {
        const result = type === 'Tax Invoice'
          ? await getNextTaxInvoiceNumber()
          : await getNextSaleInvoiceNumber()
        setForm((current) => current.invoiceNumber ? current : { ...current, invoiceNumber: result.nextNumber || '' })
      } catch {
      }
    }

    loadNextNumber()
  }, [dbBacked, id, type])

  useEffect(() => {
    if (!dbBacked || !id) {
      setLoadingInvoice(false)
      return
    }

    async function loadInvoice() {
      try {
        setLoadingInvoice(true)
        setError('')
        const invoice = type === 'Tax Invoice'
          ? await getTaxInvoiceById(id)
          : await getSaleInvoiceById(id)
        setForm({
          invoiceNumber: invoice.invoice_no || '',
          invoiceDate: invoice.invoice_date || '',
          party: invoice.customer_id ? String(invoice.customer_id) : '',
          referenceDC: invoice.sales_dc_id ? String(invoice.sales_dc_id) : '',
          addressType: invoice.address_type || 'billing',
          invoiceAddress: invoice.invoice_address || '',
          status: invoice.status || 'Draft',
          remarks: invoice.remarks || '',
        })
        setRows(
          invoice.items?.length
            ? invoice.items.map((item) => ({
                itemName: item.item_name || '',
                itemId: item.item_id ? String(item.item_id) : '',
                quantity: item.qty ? String(item.qty) : '',
                rate: item.rate ? String(item.rate) : '',
                tax: item.tax_percent ? String(item.tax_percent) : '18',
                amount: item.amount ? String(item.amount) : '',
              }))
            : [{
            itemName: invoice.item_name || '',
            itemId: invoice.item_id ? String(invoice.item_id) : '',
            quantity: invoice.qty ? String(invoice.qty) : '',
            rate: invoice.rate ? String(invoice.rate) : '',
            tax: invoice.tax_percent ? String(invoice.tax_percent) : '18',
            amount: invoice.amount ? String(invoice.amount) : '',
          }]
        )
      } catch (loadError) {
        setError(loadError.message || `Unable to load saved ${type.toLowerCase()}.`)
      } finally {
        setLoadingInvoice(false)
      }
    }

    loadInvoice()
  }, [dbBacked, id, type])

  useEffect(() => {
    async function loadCompany() {
      try {
        const result = await getCompanyInfo()
        setCompanyInfo(result?.company || null)
      } catch {
      }
    }

    loadCompany()
  }, [])

  const customerOptions = useMemo(
    () => customers.map((customer) => ({
      value: String(customer.id),
      label: `${customer.customer_code} - ${customer.customer_name}`,
    })),
    [customers]
  )

  const itemOptions = useMemo(
    () => items.map((item) => ({
      value: String(item.id),
      label: `${item.item_code} - ${item.item_name}`,
    })),
    [items]
  )

  const salesDcOptions = useMemo(
    () => salesDCs.map((dc) => ({
      value: String(dc.id),
      label: `${dc.dc_no} - ${dc.customer_name || 'Customer'}`,
    })),
    [salesDCs]
  )

  const selectedCustomer = useMemo(
    () => customers.find((customer) => String(customer.id) === String(form.party || '')),
    [customers, form.party]
  )

  useEffect(() => {
    if (!selectedCustomer) return

    const addressType = form.addressType || 'billing'
    if (addressType === 'custom') return

    const billingAddress = [selectedCustomer.address, selectedCustomer.city, selectedCustomer.state, selectedCustomer.pincode].filter(Boolean).join(', ')
    const deliveryAddress = selectedCustomer.delivery_address || billingAddress
    const nextAddress = addressType === 'delivery' ? deliveryAddress : billingAddress

    setForm((current) => (
      current.invoiceAddress === nextAddress && current.addressType === addressType
        ? current
        : { ...current, addressType, invoiceAddress: nextAddress }
    ))
  }, [selectedCustomer, form.addressType])

  const subtotal = useMemo(() => rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0), [rows])
  const gst = useMemo(() => rows.reduce((s, r) => {
    const amt = parseFloat(r.amount) || 0
    const tax = parseFloat(r.tax) || 0
    return s + (amt * tax / 100)
  }, 0), [rows])

  function handlePrintInvoice() {
    if (type === 'Tax Invoice' && id) {
      window.open(`/invoice/tax/${id}/print`, '_blank', 'noopener,noreferrer')
      return
    }
    if (type === 'Sale Invoice' && id) {
      window.open(`/invoice/sale/${id}/print`, '_blank', 'noopener,noreferrer')
    }
  }

  async function handleSave() {
    if (!dbBacked) {
      return
    }

    const cleanRows = rows.filter((row) => row.itemId && Number(row.quantity || 0) > 0 && Number(row.rate || 0) >= 0)
    if (!form.invoiceNumber || !form.invoiceDate || !form.party || cleanRows.length === 0) {
      setSuccess('')
      setError('Invoice Number, Date, Customer, and at least one valid item row are required.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')
      const payload = {
        invoiceNumber: form.invoiceNumber,
        invoiceDate: form.invoiceDate,
        customerId: Number(form.party),
        salesDcId: form.referenceDC ? Number(form.referenceDC) : null,
        addressType: form.addressType || 'billing',
        invoiceAddress: form.invoiceAddress || '',
        items: cleanRows.map((row) => ({
          itemId: Number(row.itemId),
          qty: row.quantity,
          rate: row.rate,
          taxPercent: row.tax || '0',
        })),
        remarks: form.remarks || '',
      }

      if (showStatusField) {
        payload.status = form.status || 'Draft'
      }

      const result = type === 'Tax Invoice'
        ? (id ? await updateTaxInvoice(id, payload) : await createTaxInvoice(payload))
        : (id ? await updateSaleInvoice(id, payload) : await createSaleInvoice(payload))

      setSuccess(`${type} saved. ID: ${result.invoice?.id ?? '-'} | Total: ${result.totals?.total_amount ?? '-'}`)

      if (result.invoice?.id && type === 'Tax Invoice') {
        navigate(`/invoice/tax/${result.invoice.id}`, { replace: true })
        return
      }

      if (result.invoice?.id && type === 'Sale Invoice') {
        navigate(`/invoice/sale/${result.invoice.id}`, { replace: true })
        return
      }

      setForm({})
      setRows([emptyRow()])
    } catch (saveError) {
      setError(saveError.message || `Unable to save ${type.toLowerCase()}.`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id) return

    const confirmed = window.confirm(`Delete this ${type}?`)
    if (!confirmed) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      if (type === 'Tax Invoice') {
        await deleteTaxInvoice(id)
        navigate('/invoice/tax')
        return
      }

      if (type === 'Sale Invoice') {
        await deleteSaleInvoice(id)
        navigate('/invoice/sale')
        return
      }
    } catch (deleteError) {
      setError(deleteError.message || `Unable to delete ${type.toLowerCase()}.`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContainer
      title={id ? `Edit ${type}` : `New ${type}`}
      actions={(
        <div className="flex items-center gap-2 flex-wrap">
          {id && (type === 'Tax Invoice' || type === 'Sale Invoice') && (
            <button className="btn-secondary" onClick={handlePrintInvoice}>
              <Printer size={15} />
              Print / PDF
            </button>
          )}
          <ActionButtons
            onSave={handleSave}
            onCancel={() => navigate(-1)}
            onDelete={id ? handleDelete : undefined}
            loading={saving}
          />
        </div>
      )}
    >
      {error && <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', fontWeight: '700' }}>{error}</div>}
      {success && <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#dcfce7', color: '#166534', fontSize: '13px', fontWeight: '700' }}>{success}</div>}
      {loadingMasters && <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#eef2ff', color: '#4338ca', fontSize: '13px', fontWeight: '700' }}>Loading {type} masters...</div>}
      {loadingInvoice && <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fef3c7', color: '#92400e', fontSize: '13px', fontWeight: '700' }}>Loading saved invoice details...</div>}

      <SectionCard title="Invoice Information" icon={Receipt}>
        <FormGrid>
          <FormInput label="Invoice Number" required {...bind('invoiceNumber')} placeholder="INV-0001" />
          <DatePicker label="Invoice Date" required {...bind('invoiceDate')} />
          <SelectDropdown label="Customer" options={customerOptions} {...bind('party')} />
          <SelectDropdown label="Reference Sales DC" options={salesDcOptions} {...bind('referenceDC')} />
          <SelectDropdown
            label="Invoice Address Type"
            options={[
              { value: 'billing', label: 'Billing Address' },
              { value: 'delivery', label: 'Delivery Address' },
              { value: 'custom', label: 'Custom Address' },
            ]}
            {...bind('addressType')}
          />
          {showStatusField && (
            <SelectDropdown label="Status" options={['Draft', 'Approved', 'Paid', 'Cancelled']} {...bind('status')} />
          )}
        </FormGrid>

        <div style={{ marginTop: '16px' }}>
          <label className="form-label">Invoice Address</label>
          <textarea
            rows={3}
            value={form.invoiceAddress || ''}
            onChange={(event) => set('invoiceAddress', event.target.value)}
            className="form-textarea"
            placeholder="Address to print in invoice"
            readOnly={(form.addressType || 'billing') !== 'custom'}
          />
        </div>

        <div style={{ marginTop: '16px', padding: '12px 14px', borderRadius: '10px', background: '#eef4ff', color: '#0b5cab', fontSize: '13px', fontWeight: '600', lineHeight: '1.7' }}>
          <div><strong>Demo Company:</strong> {companyInfo?.print_name || companyInfo?.company_name || 'Zyger ERP Demo'}</div>
          <div><strong>Customer:</strong> {selectedCustomer?.customer_name || '-'}</div>
          <div><strong>Selected Invoice Address:</strong> {form.invoiceAddress || '-'}</div>
        </div>
      </SectionCard>

      <SectionCard title="Item Details" icon={List}>
        <div className="overflow-x-auto rounded-lg border border-slate-200 mb-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                {['Item', 'Quantity', 'Rate', 'Tax %', 'Amount'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-2 py-1.5">
                    <select
                      value={row.itemId || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        const matched = items.find((item) => String(item.id) === value)
                        setRows((current) => current.map((entry, idx) => idx === i ? {
                          ...entry,
                          itemId: value,
                          itemName: matched?.item_name || '',
                          rate: matched?.sales_rate || '',
                          amount: entry.quantity && matched?.sales_rate ? String((Number(entry.quantity) * Number(matched.sales_rate)).toFixed(2)) : '',
                        } : entry))
                      }}
                      className="w-full px-2 py-1 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400 min-w-[140px]"
                    >
                      <option value="">Select item</option>
                      {itemOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </td>
                  {['quantity', 'rate', 'tax', 'amount'].map((k) => (
                    <td key={k} className="px-2 py-1.5">
                      <input
                        type="number"
                        value={row[k] || ''}
                        readOnly={k === 'amount'}
                        onChange={(e) => {
                          const value = e.target.value
                          setRows((current) => current.map((entry, idx) => {
                            if (idx !== i) return entry
                            const next = { ...entry, [k]: value }
                            const qty = Number(next.quantity || 0)
                            const rate = Number(next.rate || 0)
                            next.amount = qty && rate ? String((qty * rate).toFixed(2)) : ''
                            return next
                          }))
                        }}
                        className="w-full px-2 py-1 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400 min-w-[80px]"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    <button onClick={() => setRows((current) => current.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-400">x</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={() => setRows((current) => [...current, emptyRow()])} className="text-xs text-primary-600 hover:text-primary-700 font-medium">+ Add Row</button>
      </SectionCard>

      <SectionCard title="Amount Summary" icon={Calculator}>
        <div className="flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-medium">Rs.{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>GST</span>
              <span className="font-medium">Rs.{gst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-800 border-t border-slate-200 pt-2">
              <span>Total Amount</span>
              <span>Rs.{(subtotal + gst).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="flex justify-end mt-2">
        <ActionButtons onSave={handleSave} onCancel={() => navigate(-1)} loading={saving} />
      </div>
    </PageContainer>
  )
}
