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
  getCustomers,
  getItems,
  getSalesDCs,
  getTaxInvoiceById,
  updateTaxInvoice,
} from '../../lib/api'

const emptyRow = () => ({ itemName: '', itemId: '', quantity: '', rate: '', tax: '18', amount: '' })

const COMPANY = {
  name: 'ManufactERP Industries',
  subtitle: 'Certified Manufacturing Company',
  address: 'Hosur Road, Electronic City, Bangalore - 560100',
  pan: 'PAN: AAAAA0000A',
  gstin: 'GSTIN: 29AAAAA0000A1Z5',
  email: 'info@manufacterp.com',
  phone: '+91 90000 00000',
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export default function InvoiceFormPage({ type }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({})
  const [rows, setRows] = useState([emptyRow()])
  const [customers, setCustomers] = useState([])
  const [items, setItems] = useState([])
  const [salesDCs, setSalesDCs] = useState([])
  const dbBacked = type === 'Tax Invoice' || type === 'Sale Invoice'
  const showStatusField = type !== 'Tax Invoice'
  const [loadingMasters, setLoadingMasters] = useState(dbBacked)
  const [loadingInvoice, setLoadingInvoice] = useState(type === 'Tax Invoice' && Boolean(id))
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
    if (type !== 'Tax Invoice' || !id) {
      setLoadingInvoice(false)
      return
    }

    async function loadInvoice() {
      try {
        setLoadingInvoice(true)
        setError('')
        const invoice = await getTaxInvoiceById(id)
        setForm({
          invoiceNumber: invoice.invoice_no || '',
          invoiceDate: invoice.invoice_date || '',
          party: invoice.customer_id ? String(invoice.customer_id) : '',
          referenceDC: invoice.sales_dc_id ? String(invoice.sales_dc_id) : '',
          remarks: invoice.remarks || '',
        })
        setRows([
          {
            itemName: invoice.item_name || '',
            itemId: invoice.item_id ? String(invoice.item_id) : '',
            quantity: invoice.qty ? String(invoice.qty) : '',
            rate: invoice.rate ? String(invoice.rate) : '',
            tax: invoice.tax_percent ? String(invoice.tax_percent) : '18',
            amount: invoice.amount ? String(invoice.amount) : '',
          },
        ])
      } catch (loadError) {
        setError(loadError.message || 'Unable to load saved tax invoice.')
      } finally {
        setLoadingInvoice(false)
      }
    }

    loadInvoice()
  }, [id, type])

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

  const selectedSalesDc = useMemo(
    () => salesDCs.find((dc) => String(dc.id) === String(form.referenceDC || '')),
    [salesDCs, form.referenceDC]
  )

  const subtotal = useMemo(() => rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0), [rows])
  const gst = useMemo(() => rows.reduce((s, r) => {
    const amt = parseFloat(r.amount) || 0
    const tax = parseFloat(r.tax) || 0
    return s + (amt * tax / 100)
  }, 0), [rows])

  function handlePrintInvoice() {
    if (type !== 'Tax Invoice') {
      return
    }

    const printableRows = rows
      .filter((row) => row.itemId || row.itemName)
      .map((row, index) => {
        const item = items.find((entry) => String(entry.id) === String(row.itemId || ''))
        return {
          sno: index + 1,
          partNo: item?.item_code || row.itemName || '-',
          description: item?.item_name || row.itemName || '-',
          qty: row.quantity || '0',
          uom: item?.uom || 'NOS',
          hsn: item?.hsn_code || '-',
          rate: row.rate || '0',
          amount: row.amount || '0',
        }
      })

    if (!form.invoiceNumber || !form.invoiceDate || !selectedCustomer || printableRows.length === 0) {
      setError('Fill Invoice Number, Date, Customer, and at least one item before printing.')
      return
    }

    const invoiceHtml = printableRows.map((row) => `
      <tr>
        <td>${row.sno}</td>
        <td>${escapeHtml(row.partNo)}</td>
        <td>${escapeHtml(row.description)}</td>
        <td style="text-align:right">${escapeHtml(row.qty)}</td>
        <td>${escapeHtml(row.uom)}</td>
        <td>${escapeHtml(row.hsn)}</td>
        <td style="text-align:right">${formatMoney(row.rate)}</td>
        <td style="text-align:right">${formatMoney(row.amount)}</td>
      </tr>
    `).join('')

    const printWindow = window.open('', '_blank', 'width=1200,height=900')
    if (!printWindow) {
      setError('Popup blocked. Please allow popups and try again.')
      return
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${type} - ${escapeHtml(form.invoiceNumber)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 18px; color: #111827; }
            .sheet { border: 1px solid #4b5563; }
            .header { text-align: center; padding: 18px 16px 10px; border-bottom: 1px solid #4b5563; }
            .company-name { font-size: 28px; font-weight: 800; margin-bottom: 6px; }
            .company-sub { font-size: 13px; margin-bottom: 4px; }
            .title-bar { background: #bfe7f3; text-align: center; font-size: 18px; font-weight: 800; padding: 6px 0; border-top: 1px solid #4b5563; border-bottom: 1px solid #4b5563; }
            .info-grid { width: 100%; border-collapse: collapse; }
            .info-grid td { border: 1px solid #4b5563; padding: 8px; vertical-align: top; font-size: 13px; }
            .section-head { font-weight: 800; margin-bottom: 6px; }
            .invoice-table { width: 100%; border-collapse: collapse; }
            .invoice-table th, .invoice-table td { border: 1px solid #4b5563; padding: 7px 6px; font-size: 12px; vertical-align: top; }
            .invoice-table th { background: #bfe7f3; font-weight: 800; }
            .totals { width: 100%; border-collapse: collapse; }
            .totals td { border: 1px solid #4b5563; padding: 8px; font-size: 13px; }
            .footer { width: 100%; border-collapse: collapse; }
            .footer td { border: 1px solid #4b5563; padding: 12px; height: 110px; vertical-align: top; font-size: 13px; }
            .sign { text-align: center; font-weight: 700; padding-top: 46px; }
            @media print {
              body { margin: 0; }
              .sheet { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="header">
              <div class="company-name">${escapeHtml(COMPANY.name)}</div>
              <div class="company-sub">${escapeHtml(COMPANY.subtitle)}</div>
              <div class="company-sub">${escapeHtml(COMPANY.address)}</div>
              <div class="company-sub">${escapeHtml(COMPANY.pan)} , ${escapeHtml(COMPANY.gstin)}</div>
              <div class="company-sub">${escapeHtml(COMPANY.email)} &nbsp;&nbsp; Phone: ${escapeHtml(COMPANY.phone)}</div>
            </div>

            <div class="title-bar">TAX INVOICE</div>

            <table class="info-grid">
              <tr>
                <td style="width:50%">
                  <div class="section-head">Billed To</div>
                  <div><strong>${escapeHtml(selectedCustomer.customer_name || '-')}</strong></div>
                  <div>${escapeHtml(selectedCustomer.address || '-')}</div>
                  <div>${escapeHtml(selectedCustomer.city || '')} ${escapeHtml(selectedCustomer.state || '')} ${escapeHtml(selectedCustomer.pincode || '')}</div>
                  <div>GSTIN: ${escapeHtml(selectedCustomer.gstin || '-')}</div>
                  <div>Phone: ${escapeHtml(selectedCustomer.mobile || selectedCustomer.phone || '-')}</div>
                  <div>Email: ${escapeHtml(selectedCustomer.email || '-')}</div>
                </td>
                <td style="width:50%">
                  <table style="width:100%; border-collapse: collapse;">
                    <tr><td style="padding:4px 0;"><strong>Invoice No</strong></td><td>: ${escapeHtml(form.invoiceNumber)}</td></tr>
                    <tr><td style="padding:4px 0;"><strong>Invoice Date</strong></td><td>: ${escapeHtml(form.invoiceDate)}</td></tr>
                    <tr><td style="padding:4px 0;"><strong>DC No</strong></td><td>: ${escapeHtml(selectedSalesDc?.dc_no || '-')}</td></tr>
                    <tr><td style="padding:4px 0;"><strong>Transportation Mode</strong></td><td>: ${escapeHtml(selectedCustomer.transport_mode || 'By Road')}</td></tr>
                    <tr><td style="padding:4px 0;"><strong>Place Of Supply</strong></td><td>: ${escapeHtml(selectedCustomer.state || '-')}</td></tr>
                    <tr><td style="padding:4px 0;"><strong>Payment Terms</strong></td><td>: ${escapeHtml(selectedCustomer.payment_terms || '-')}</td></tr>
                  </table>
                </td>
              </tr>
            </table>

            <table class="invoice-table">
              <thead>
                <tr>
                  <th style="width:5%">S.No</th>
                  <th style="width:19%">Part No</th>
                  <th>Item Description</th>
                  <th style="width:10%">Qty</th>
                  <th style="width:8%">UOM</th>
                  <th style="width:10%">HSN/SAC</th>
                  <th style="width:10%">Rate (Rs)</th>
                  <th style="width:12%">Amount (Rs)</th>
                </tr>
              </thead>
              <tbody>
                ${invoiceHtml}
              </tbody>
            </table>

            <table class="totals">
              <tr>
                <td style="width:65%"><strong>Amount In Words:</strong> Rupees ${escapeHtml(formatMoney(subtotal + gst))} Only</td>
                <td style="width:20%"><strong>Tax ${rows[0]?.tax || 0}%</strong></td>
                <td style="width:15%; text-align:right">${formatMoney(gst)}</td>
              </tr>
              <tr>
                <td><strong>Remarks:</strong> ${escapeHtml(form.remarks || '-')}</td>
                <td><strong>Net Total (Rs)</strong></td>
                <td style="text-align:right"><strong>${formatMoney(subtotal + gst)}</strong></td>
              </tr>
            </table>

            <table class="footer">
              <tr>
                <td style="width:50%">
                  <strong>Terms & Conditions</strong>
                  <div style="margin-top:8px;">1) Goods once sold will not be taken back.</div>
                  <div>2) Subject to local jurisdiction.</div>
                  <div>3) Please verify material at the time of delivery.</div>
                </td>
                <td style="width:25%">
                  <div class="sign">Receiver's Signature</div>
                </td>
                <td style="width:25%">
                  <div class="sign">Authorised Signatory</div>
                </td>
              </tr>
            </table>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 400)
  }

  async function handleSave() {
    if (!dbBacked) {
      alert('Saved!')
      return
    }

    const firstRow = rows[0] || {}
    if (!form.invoiceNumber || !form.invoiceDate || !form.party || !firstRow.itemId || !firstRow.quantity || !firstRow.rate) {
      setSuccess('')
      setError('Invoice Number, Date, Customer, Item, Qty, and Rate are required.')
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
        itemId: Number(firstRow.itemId),
        qty: firstRow.quantity,
        rate: firstRow.rate,
        taxPercent: firstRow.tax || '0',
        remarks: form.remarks || '',
      }

      if (showStatusField) {
        payload.status = form.status || 'Draft'
      }

      const result = type === 'Tax Invoice'
        ? (id ? await updateTaxInvoice(id, payload) : await createTaxInvoice(payload))
        : await createSaleInvoice(payload)
      setSuccess(`${type} saved. ID: ${result.invoice?.id ?? '-'} | Total: ${result.totals?.total_amount ?? '-'}`)
      if (type === 'Tax Invoice' && result.invoice?.id) {
        navigate(`/invoice/tax/${result.invoice.id}`, { replace: true })
        return
      }
      setForm({})
      setRows([emptyRow()])
    } catch (saveError) {
      setError(saveError.message || 'Unable to save tax invoice.')
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
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          {type === 'Tax Invoice' && (
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
      }
    >
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', fontWeight: '700' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#dcfce7', color: '#166534', fontSize: '13px', fontWeight: '700' }}>
          {success}
        </div>
      )}
      {loadingMasters && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#eef2ff', color: '#4338ca', fontSize: '13px', fontWeight: '700' }}>
          Loading {type} masters...
        </div>
      )}
      {loadingInvoice && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fef3c7', color: '#92400e', fontSize: '13px', fontWeight: '700' }}>
          Loading saved invoice details...
        </div>
      )}

      <SectionCard title="Invoice Information" icon={Receipt}>
        <FormGrid>
          <FormInput label="Invoice Number" required {...bind('invoiceNumber')} placeholder="INV-0001" />
          <DatePicker label="Invoice Date" required {...bind('invoiceDate')} />
          <SelectDropdown label="Customer" options={dbBacked ? customerOptions : []} {...bind('party')} />
          <SelectDropdown label="Reference Sales DC" options={dbBacked ? salesDcOptions : []} {...bind('referenceDC')} />
          {showStatusField && (
            <SelectDropdown label="Status" options={['Draft', 'Approved', 'Paid', 'Cancelled']} {...bind('status')} />
          )}
        </FormGrid>
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
