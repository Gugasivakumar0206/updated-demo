import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ActionButtons, FormGrid, FormInput, PageContainer, SectionCard, SelectDropdown, Textarea } from '../../components/ui/index'
import { createPurchaseReturn, getItems, getNextPurchaseReturnNumber, getPurchaseInwards, getPurchaseReturnById, getSuppliers } from '../../lib/api'

function todayValue() {
  return new Date().toISOString().slice(0, 10)
}

function emptyRow() {
  return { itemId: '', itemName: '', itemCode: '', qty: '', rate: '', rejectedQty: '0', amount: '', printCode: '' }
}

export default function PurchaseReturnFormPage({
  returnType = 'PO_DC_RETURN',
  title = 'PO DC Return',
  subtitle = 'Inventory -> Return -> PO DC Return',
  saveLabel = 'Save Return',
  cancelPath = '/inventory/return/po-dc',
}) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [bootLoading, setBootLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [suppliers, setSuppliers] = useState([])
  const [items, setItems] = useState([])
  const [inwards, setInwards] = useState([])
  const [rows, setRows] = useState([emptyRow()])
  const [form, setForm] = useState({
    returnNo: '',
    returnDate: todayValue(),
    supplierId: '',
    purchaseInwardId: '',
    referenceNo: '',
    referenceDate: todayValue(),
    purchaseLedger: '',
    lrNo: '',
    soNumber: '',
    taxPercent: returnType === 'PO_INVOICE_RETURN' ? '12' : '18',
    status: 'Posted',
    approvalStatus: 'Pending',
    remarks: '',
  })

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    async function loadMasters() {
      try {
        setBootLoading(true)
        const [supplierResult, itemResult, inwardResult] = await Promise.all([
          getSuppliers(),
          getItems(),
          getPurchaseInwards('PO'),
        ])
        setSuppliers(supplierResult || [])
        setItems(itemResult || [])
        setInwards(inwardResult || [])
      } catch (loadError) {
        setError(loadError.message || 'Unable to load return master data.')
      } finally {
        setBootLoading(false)
      }
    }

    loadMasters()
  }, [])

  useEffect(() => {
    if (id) return

    async function loadNextNumber() {
      try {
        const result = await getNextPurchaseReturnNumber(returnType)
        setForm((current) => current.returnNo ? current : { ...current, returnNo: result.nextNumber || '' })
      } catch {
      }
    }

    loadNextNumber()
  }, [id, returnType])

  useEffect(() => {
    if (!id) return

    async function loadReturn() {
      try {
        setBootLoading(true)
        const result = await getPurchaseReturnById(id)
        setForm({
          returnNo: result.return_no || '',
          returnDate: result.return_date || todayValue(),
          supplierId: result.supplier_id ? String(result.supplier_id) : '',
          purchaseInwardId: result.purchase_inward_id ? String(result.purchase_inward_id) : '',
          referenceNo: result.reference_no || '',
          referenceDate: result.reference_date || todayValue(),
          purchaseLedger: result.purchase_ledger || '',
          lrNo: result.lr_no || '',
          soNumber: result.so_number || '',
          taxPercent: result.tax_percent || '0',
          status: result.status || 'Posted',
          approvalStatus: result.approval_status || 'Pending',
          remarks: result.remarks || '',
        })
        setRows(result.items?.length ? result.items.map((item) => ({
          itemId: String(item.item_id || ''),
          itemName: item.item_name || '',
          itemCode: item.item_code || '',
          qty: item.qty || '',
          rate: item.rate || '',
          rejectedQty: item.rejected_qty || '0',
          amount: item.amount || '',
          printCode: item.print_code || item.item_code || '',
        })) : [emptyRow()])
      } catch (loadError) {
        setError(loadError.message || 'Unable to load return record.')
      } finally {
        setBootLoading(false)
      }
    }

    loadReturn()
  }, [id])

  const supplierOptions = useMemo(() => suppliers.map((supplier) => ({
    value: String(supplier.id),
    label: `${supplier.supplier_code} - ${supplier.supplier_name}`,
  })), [suppliers])

  const inwardOptions = useMemo(() => inwards.map((inward) => ({
    value: String(inward.id),
    label: `${inward.inward_no} - ${inward.supplier_name || 'Supplier'} - Qty ${inward.qty || 0}`,
  })), [inwards])

  const itemOptions = useMemo(() => items.map((item) => ({
    value: String(item.id),
    label: `${item.item_code} - ${item.item_name}`,
  })), [items])

  const subtotal = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)
  const taxAmount = subtotal * Number(form.taxPercent || 0) / 100
  const totalAmount = subtotal + taxAmount
  const totalQty = rows.reduce((sum, row) => sum + Number(row.qty || 0), 0)

  function updateRow(index, key, value) {
    setRows((current) => current.map((row, rowIndex) => {
      if (rowIndex !== index) return row
      const next = { ...row, [key]: value }
      if (key === 'itemId') {
        const matched = items.find((item) => String(item.id) === value)
        next.itemName = matched?.item_name || ''
        next.itemCode = matched?.item_code || ''
        next.printCode = matched?.item_code || ''
        next.rate = matched?.purchase_rate || ''
      }
      if (key === 'qty' || key === 'rate' || key === 'itemId') {
        next.amount = Number(next.qty || 0) && Number(next.rate || 0) ? String((Number(next.qty || 0) * Number(next.rate || 0)).toFixed(2)) : ''
      }
      return next
    }))
  }

  async function handleSave() {
    const cleanRows = rows.filter((row) => row.itemId && Number(row.qty || 0) > 0)
    if (!form.returnNo || !form.returnDate || !form.supplierId || cleanRows.length === 0) {
      setSuccess('')
      setError('Return No, Return Date, Supplier, and at least one item are required.')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')
      const result = await createPurchaseReturn({
        returnType,
        returnNo: form.returnNo,
        returnDate: form.returnDate,
        supplierId: Number(form.supplierId),
        purchaseInwardId: form.purchaseInwardId ? Number(form.purchaseInwardId) : null,
        referenceNo: form.referenceNo,
        referenceDate: form.referenceDate,
        purchaseLedger: form.purchaseLedger,
        lrNo: form.lrNo,
        soNumber: form.soNumber,
        taxPercent: form.taxPercent || '0',
        status: form.status,
        approvalStatus: form.approvalStatus,
        remarks: form.remarks,
        items: cleanRows.map((row) => ({
          itemId: Number(row.itemId),
          qty: row.qty,
          rate: row.rate || '0',
          rejectedQty: row.rejectedQty || '0',
          printCode: row.printCode || row.itemCode,
        })),
      })
      setSuccess(`${title} saved. ID: ${result.return?.id ?? '-'} | Total: ${result.totals?.total_amount ?? '-'}`)
      navigate(cancelPath)
    } catch (saveError) {
      setError(saveError.message || `Unable to save ${title.toLowerCase()}.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer
      title={id ? `Edit ${title}` : `New ${title}`}
      subtitle={subtitle}
      actions={<ActionButtons onSave={handleSave} onCancel={() => navigate(cancelPath)} saveLabel={saveLabel} loading={loading} />}
    >
      {error && <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', fontWeight: '700' }}>{error}</div>}
      {success && <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#dcfce7', color: '#166534', fontSize: '13px', fontWeight: '700' }}>{success}</div>}
      {bootLoading && <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#eef2ff', color: '#4338ca', fontSize: '13px', fontWeight: '700' }}>Loading return data...</div>}

      <SectionCard title="General Details" defaultOpen>
        <FormGrid cols={3}>
          <FormInput label="Entry Type" value={title} readOnly />
          <FormInput label="Return No" required value={form.returnNo} onChange={(event) => set('returnNo', event.target.value)} />
          <FormInput label="Return Date" required type="date" value={form.returnDate} onChange={(event) => set('returnDate', event.target.value)} />
          <SelectDropdown label="Supplier" required options={supplierOptions} value={form.supplierId} onChange={(event) => set('supplierId', event.target.value)} />
          <SelectDropdown label="PO Inward Reference" options={inwardOptions} value={form.purchaseInwardId} onChange={(event) => set('purchaseInwardId', event.target.value)} />
          <FormInput label="Reference No" value={form.referenceNo} onChange={(event) => set('referenceNo', event.target.value)} />
          <FormInput label="Reference Date" type="date" value={form.referenceDate} onChange={(event) => set('referenceDate', event.target.value)} />
          <FormInput label="Purchase Ledger" value={form.purchaseLedger} onChange={(event) => set('purchaseLedger', event.target.value)} placeholder="FIN018 - Purchase" />
          <FormInput label="LR No" value={form.lrNo} onChange={(event) => set('lrNo', event.target.value)} />
          <FormInput label="SO Number" value={form.soNumber} onChange={(event) => set('soNumber', event.target.value)} />
          <SelectDropdown label="Status" options={['Posted', 'Draft', 'Cancelled']} value={form.status} onChange={(event) => set('status', event.target.value)} />
          <SelectDropdown label="Approval Status" options={['Pending', 'Approved', 'Rejected']} value={form.approvalStatus} onChange={(event) => set('approvalStatus', event.target.value)} />
        </FormGrid>
      </SectionCard>

      <SectionCard title="Item Details" defaultOpen>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                {['Item', 'Qty', 'Unit Rate', 'Amount', 'Rej Qty', 'Print Code', 'Action'].map((header) => (
                  <th key={header} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-t border-slate-100">
                  <td className="px-2 py-1.5">
                    <select value={row.itemId} onChange={(event) => updateRow(index, 'itemId', event.target.value)} className="w-full px-2 py-1 text-sm border border-slate-200 rounded-md min-w-[220px]">
                      <option value="">Select item</option>
                      {itemOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </td>
                  {[
                    ['qty', 'number'],
                    ['rate', 'number'],
                    ['amount', 'number'],
                    ['rejectedQty', 'number'],
                    ['printCode', 'text'],
                  ].map(([key, inputType]) => (
                    <td key={key} className="px-2 py-1.5">
                      <input type={inputType} value={row[key] || ''} readOnly={key === 'amount'} onChange={(event) => updateRow(index, key, event.target.value)} className="w-full px-2 py-1 text-sm border border-slate-200 rounded-md min-w-[100px]" />
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    <button onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))} className="text-slate-300 hover:text-red-400">x</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={() => setRows((current) => [...current, emptyRow()])} className="mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium">+ Add Items</button>
      </SectionCard>

      <SectionCard title="Addition / Deduction / Tax Details" defaultOpen={false}>
        <FormGrid cols={3}>
          <FormInput label="Tax %" type="number" value={form.taxPercent} onChange={(event) => set('taxPercent', event.target.value)} />
          <FormInput label="Total Qty" value={totalQty.toFixed(2)} readOnly />
          <FormInput label="Assessable Value" value={subtotal.toFixed(2)} readOnly />
          <FormInput label="Tax Amount" value={taxAmount.toFixed(2)} readOnly />
          <FormInput label="Net Amount" value={totalAmount.toFixed(2)} readOnly />
        </FormGrid>
      </SectionCard>

      <SectionCard title="Remarks" defaultOpen>
        <Textarea label="Remarks" rows={3} value={form.remarks} onChange={(event) => set('remarks', event.target.value)} placeholder="Material return reason, without process material return to supplier..." />
      </SectionCard>
    </PageContainer>
  )
}
