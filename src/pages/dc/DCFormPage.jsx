import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  PageContainer, SectionCard, FormGrid, FormInput,
  SelectDropdown, Textarea, DatePicker, ActionButtons
} from '../../components/ui/index'
import { FileText, List, Printer } from 'lucide-react'
import { createSalesDC, getCustomers, getItems, getSalesDCById, updateSalesDC } from '../../lib/api'

function getTodayDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function emptyRow() {
  return {
    itemName: '',
    itemCode: '',
    hsnCode: '',
    quantity: '',
    unit: '',
    rate: '',
    amount: '',
  }
}

function ItemsTable({ rows, onAdd, onRemove, onChange, itemOptions = [], salesMode = false }) {
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              {['Item Name', 'Item Code', 'HSN', 'Quantity', 'Unit', 'Rate', 'Amount'].map((header) => (
                <th key={header} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {header}
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>

          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={row.itemName || ''}
                    onChange={(event) => onChange(i, 'itemName', event.target.value)}
                    readOnly={salesMode}
                    placeholder="Item name"
                    className="w-full px-2 py-1 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400 min-w-[160px]"
                  />
                </td>

                <td className="px-2 py-1.5">
                  {salesMode ? (
                    <select
                      value={row.itemCode || ''}
                      onChange={(event) => onChange(i, 'itemCode', event.target.value)}
                      className="w-full px-2 py-1 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400 min-w-[150px]"
                    >
                      <option value="">Select item</option>
                      {itemOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={row.itemCode || ''}
                      onChange={(event) => onChange(i, 'itemCode', event.target.value)}
                      placeholder="Item code"
                      className="w-full px-2 py-1 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400 min-w-[120px]"
                    />
                  )}
                </td>

                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={row.hsnCode || ''}
                    onChange={(event) => onChange(i, 'hsnCode', event.target.value)}
                    placeholder="Enter HSN"
                    className="w-full px-2 py-1 text-sm border border-blue-200 bg-blue-50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400 min-w-[120px]"
                  />
                </td>

                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    value={row.quantity || ''}
                    onChange={(event) => onChange(i, 'quantity', event.target.value)}
                    placeholder="Qty"
                    className="w-full px-2 py-1 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400 min-w-[90px]"
                  />
                </td>

                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={row.unit || ''}
                    onChange={(event) => onChange(i, 'unit', event.target.value)}
                    readOnly={salesMode}
                    placeholder="UOM"
                    className="w-full px-2 py-1 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400 min-w-[90px]"
                  />
                </td>

                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    value={row.rate || ''}
                    onChange={(event) => onChange(i, 'rate', event.target.value)}
                    placeholder="Rate"
                    className="w-full px-2 py-1 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400 min-w-[90px]"
                  />
                </td>

                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    value={row.amount || ''}
                    onChange={(event) => onChange(i, 'amount', event.target.value)}
                    readOnly={salesMode}
                    placeholder="Amount"
                    className="w-full px-2 py-1 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400 min-w-[110px]"
                  />
                </td>

                <td className="px-2 py-1.5">
                  <button onClick={() => onRemove(i)} className="text-slate-300 hover:text-red-400">x</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={onAdd} className="mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium">
        + Add Row
      </button>
    </div>
  )
}

export default function DCFormPage({ type }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const isSalesDC = type === 'Sales DC'

  const [form, setForm] = useState({
    dcDate: getTodayDate(),
    status: 'Open',
    modeOfTransport: 'By Road',
  })
  const [rows, setRows] = useState([emptyRow()])
  const [customers, setCustomers] = useState([])
  const [items, setItems] = useState([])
  const [loadingMasters, setLoadingMasters] = useState(isSalesDC)
  const [saving, setSaving] = useState(false)
  const [loadingRecord, setLoadingRecord] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const bind = (key) => ({ value: form[key] || '', onChange: (event) => set(key, event.target.value) })

  useEffect(() => {
    if (!isSalesDC) return

    async function loadMasters() {
      try {
        setLoadingMasters(true)
        const [customerResult, itemResult] = await Promise.all([
          getCustomers(),
          getItems(),
        ])
        setCustomers(customerResult || [])
        setItems(itemResult || [])
      } catch (loadError) {
        setError(loadError.message || 'Unable to load Sales DC masters.')
      } finally {
        setLoadingMasters(false)
      }
    }

    loadMasters()
  }, [isSalesDC])

  useEffect(() => {
    if (!isSalesDC || !id) return

    async function loadSalesDC() {
      try {
        setLoadingRecord(true)
        setError('')
        const result = await getSalesDCById(id)
        setForm({
          dcNumber: result.dc_no || '',
          dcDate: result.dc_date || getTodayDate(),
          party: String(result.customer?.id || ''),
          referenceNumber: result.reference_no || '',
          vehicleNo: result.vehicle_no || '',
          modeOfTransport: result.mode_of_transport || 'By Road',
          status: result.status || 'Open',
          remarks: result.remarks || '',
        })
        setRows(
          result.items?.length
            ? result.items.map((row) => ({
                itemName: row.item_name || '',
                itemCode: String(row.item_id || ''),
                hsnCode: row.hsn_code || '',
                quantity: row.qty || '',
                unit: row.uom || '',
                rate: row.sales_rate || '',
                amount: row.amount || '',
              }))
            : [emptyRow()]
        )
      } catch (loadError) {
        setError(loadError.message || 'Unable to load Sales DC record.')
      } finally {
        setLoadingRecord(false)
      }
    }

    loadSalesDC()
  }, [id, isSalesDC])

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

  const totalQty = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0).toFixed(2)
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2)

  async function handleSave() {
    if (!isSalesDC) {
      alert('Saved!')
      return
    }

    const cleanRows = rows.filter((row) => row.itemCode && Number(row.quantity || 0) > 0)
    if (!form.dcNumber || !form.dcDate || !form.party || cleanRows.length === 0) {
      setSuccess('')
      setError('DC Number, DC Date, Customer, and at least one item row are required.')
      return
    }

    const payload = {
      dcNumber: form.dcNumber,
      dcDate: form.dcDate,
      customerId: Number(form.party),
      referenceNumber: form.referenceNumber || '',
      vehicleNo: form.vehicleNo || '',
      modeOfTransport: form.modeOfTransport || '',
      status: form.status || 'Open',
      remarks: form.remarks || '',
      items: cleanRows.map((row) => ({
        itemId: Number(row.itemCode),
        qty: row.quantity,
        hsnCode: row.hsnCode || '',
      })),
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')
      const result = id
        ? await updateSalesDC(id, payload)
        : await createSalesDC(payload)

      setSuccess(`${type} saved. ID: ${result.salesDc?.id ?? '-'} | Total Qty: ${result.summary?.total_qty ?? '-'}`)
      if (!id) {
        setForm({
          dcDate: getTodayDate(),
          status: 'Open',
          modeOfTransport: 'By Road',
        })
        setRows([emptyRow()])
      }
    } catch (saveError) {
      setError(saveError.message || 'Unable to save Sales DC.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContainer
      title={id ? `Edit ${type}` : `New ${type}`}
      subtitle={`${type} details`}
      actions={
        <div className="flex items-center gap-2">
          {isSalesDC && id && (
            <button
              onClick={() => window.open(`/sales/dc/${id}/print`, '_blank', 'noopener,noreferrer')}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <Printer size={14} />
              Print
            </button>
          )}
          <ActionButtons
            onSave={handleSave}
            onCancel={() => navigate(-1)}
            onDelete={id ? () => navigate(-1) : undefined}
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

      {(loadingMasters || loadingRecord) && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#eef2ff', color: '#4338ca', fontSize: '13px', fontWeight: '700' }}>
          Loading {type} data...
        </div>
      )}

      <SectionCard title="DC Information" icon={FileText}>
        <FormGrid>
          <FormInput label="DC Number" required {...bind('dcNumber')} placeholder="SODC-0001" />
          <DatePicker label="DC Date" required {...bind('dcDate')} />
          <SelectDropdown
            label="Customer"
            options={isSalesDC ? customerOptions : ['Maruti Suzuki', 'Tata Motors', 'Mahindra', 'Bajaj Auto', 'Tata Steel', 'Hindalco']}
            {...bind('party')}
          />
          <FormInput label="Reference Number" {...bind('referenceNumber')} />
          <FormInput label="Vehicle No" {...bind('vehicleNo')} placeholder="KA51AB2241" />
          <SelectDropdown
            label="Mode Of Transport"
            options={['By Road', 'By Air', 'By Rail', 'Courier', 'Hand Delivery']}
            {...bind('modeOfTransport')}
          />
          <SelectDropdown
            label="Status"
            options={['Open', 'Draft', 'Pending', 'Approved', 'Completed']}
            {...bind('status')}
          />
        </FormGrid>
      </SectionCard>

      <SectionCard title="Item Details" icon={List}>
        <ItemsTable
          rows={rows}
          onAdd={() => setRows((current) => [...current, emptyRow()])}
          onRemove={(index) => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
          itemOptions={itemOptions}
          salesMode={isSalesDC}
          onChange={(index, key, value) => {
            if (!isSalesDC) {
              setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row))
              return
            }

            setRows((current) =>
              current.map((row, rowIndex) => {
                if (rowIndex !== index) return row
                const nextRow = { ...row, [key]: value }

                if (key === 'itemCode') {
                  const matched = items.find((item) => String(item.id) === value)
                  nextRow.itemName = matched?.item_name || ''
                  nextRow.unit = matched?.uom || ''
                  nextRow.rate = matched?.sales_rate || ''
                  nextRow.hsnCode = matched?.hsn_code || ''
                }

                if (key === 'quantity' || key === 'rate' || key === 'itemCode') {
                  const qty = Number(nextRow.quantity || 0)
                  const rate = Number(nextRow.rate || 0)
                  nextRow.amount = qty && rate ? String((qty * rate).toFixed(2)) : ''
                }

                return nextRow
              })
            )
          }}
        />

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            Total Qty: <span className="text-slate-900">{totalQty}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            Total Amount: <span className="text-slate-900">Rs.{totalAmount}</span>
          </div>
        </div>

        {isSalesDC && (
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
            Select Item Code first. HSN will auto-fill in the HSN column, and you can edit it manually if needed.
          </div>
        )}
      </SectionCard>

      <SectionCard title="Remarks" icon={FileText} defaultOpen={false}>
        <Textarea label="Remarks" rows={3} {...bind('remarks')} />
      </SectionCard>

      <div className="flex justify-end mt-2">
        <ActionButtons onSave={handleSave} onCancel={() => navigate(-1)} loading={saving} />
      </div>
    </PageContainer>
  )
}
