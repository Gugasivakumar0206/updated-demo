import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  PageContainer, SectionCard, FormGrid, FormInput,
  SelectDropdown, Textarea, DatePicker, ActionButtons
} from '../../components/ui/index'
import { FileText, List } from 'lucide-react'
import { createSalesDC, getCustomers, getItems } from '../../lib/api'

function getTodayDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function ItemsTable({ rows, onAdd, onRemove, onChange, itemOptions = [], salesMode = false }) {
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              {['Item Name', 'Item Code', 'Quantity', 'Unit', 'Rate', 'Amount'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-slate-100">
                {['itemName', 'itemCode', 'quantity', 'unit', 'rate', 'amount'].map(k => {
                  if (salesMode && k === 'itemCode') {
                    return (
                      <td key={k} className="px-2 py-1.5">
                        <select
                          value={row[k] || ''}
                          onChange={e => onChange(i, k, e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400 min-w-[120px]"
                        >
                          <option value="">Select item</option>
                          {itemOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </td>
                    )
                  }

                  return (
                    <td key={k} className="px-2 py-1.5">
                      <input
                        type={['quantity', 'rate', 'amount'].includes(k) ? 'number' : 'text'}
                        value={row[k] || ''}
                        onChange={e => onChange(i, k, e.target.value)}
                        readOnly={salesMode && ['itemName', 'unit', 'amount'].includes(k)}
                        className="w-full px-2 py-1 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400 min-w-[80px]"
                      />
                    </td>
                  )
                })}
                <td className="px-2 py-1.5">
                  <button onClick={() => onRemove(i)} className="text-slate-300 hover:text-red-400">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={onAdd} className="mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium">+ Add Row</button>
    </div>
  )
}

const emptyRow = () => ({ itemName: '', itemCode: '', quantity: '', unit: '', rate: '', amount: '' })

export default function DCFormPage({ type }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ dcDate: getTodayDate() })
  const [rows, setRows] = useState([emptyRow()])
  const [customers, setCustomers] = useState([])
  const [items, setItems] = useState([])
  const [loadingMasters, setLoadingMasters] = useState(type === 'Sales DC')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const bind = (k) => ({ value: form[k] || '', onChange: e => set(k, e.target.value) })

  useEffect(() => {
    if (type !== 'Sales DC') return

    async function loadMasters() {
      try {
        setLoadingMasters(true)
        const [customerResult, itemResult] = await Promise.all([
          getCustomers(),
          getItems(),
        ])
        setCustomers(customerResult)
        setItems(itemResult)
      } catch (loadError) {
        setError(loadError.message || 'Unable to load Sales DC masters.')
      } finally {
        setLoadingMasters(false)
      }
    }

    loadMasters()
  }, [type])

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

  async function handleSave() {
    if (type !== 'Sales DC') {
      alert('Saved!')
      return
    }

    const firstRow = rows[0] || {}
    if (!form.dcNumber || !form.dcDate || !form.party || !firstRow.itemCode || !firstRow.quantity) {
      setSuccess('')
      setError('DC Number, DC Date, Customer, Item, and Qty are required.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')
      const result = await createSalesDC({
        dcNumber: form.dcNumber,
        dcDate: form.dcDate,
        customerId: Number(form.party),
        referenceNumber: form.referenceNumber || '',
        remarks: form.remarks || '',
        itemId: Number(firstRow.itemCode),
        qty: firstRow.quantity,
      })
      setSuccess(`Sales DC saved. ID: ${result.salesDc?.id ?? '-'} | Stock left: ${result.stock?.new_balance ?? '-'}`)
      setForm({ dcDate: getTodayDate() })
      setRows([emptyRow()])
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
        <ActionButtons
          onSave={handleSave}
          onCancel={() => navigate(-1)}
          onDelete={id ? () => navigate(-1) : undefined}
          loading={saving}
        />
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
      <SectionCard title="DC Information" icon={FileText}>
        <FormGrid>
          <FormInput label="DC Number" required {...bind('dcNumber')} placeholder="DC-0001" />
          <DatePicker label="DC Date" required {...bind('dcDate')} />
          <SelectDropdown
            label="Customer / Supplied"
            options={type === 'Sales DC' ? customerOptions : ['Maruti Suzuki', 'Tata Motors', 'Mahindra', 'Bajaj Auto', 'Tata Steel', 'Hindalco']}
            {...bind('party')}
          />
          <FormInput label="Reference Number" {...bind('referenceNumber')} />
          <SelectDropdown
            label="Status"
            options={['Draft', 'Pending', 'Approved', 'Completed']}
            {...bind('status')}
          />
        </FormGrid>
      </SectionCard>

      <SectionCard title="Item Details" icon={List}>
        <ItemsTable
          rows={rows}
          onAdd={() => setRows(r => [...r, emptyRow()])}
          onRemove={(i) => setRows(r => r.filter((_, ri) => ri !== i))}
          itemOptions={itemOptions}
          salesMode={type === 'Sales DC'}
          onChange={(i, k, v) => {
            if (type !== 'Sales DC') {
              setRows(r => r.map((row, ri) => ri === i ? { ...row, [k]: v } : row))
              return
            }

            setRows((current) =>
              current.map((row, ri) => {
                if (ri !== i) return row
                const nextRow = { ...row, [k]: v }
                if (k === 'itemCode') {
                  const matched = items.find((item) => String(item.id) === v)
                  nextRow.itemName = matched?.item_name || ''
                  nextRow.unit = matched?.uom || ''
                  nextRow.rate = matched?.sales_rate || ''
                }
                if (k === 'quantity' || k === 'rate' || k === 'itemCode') {
                  const qty = Number(nextRow.quantity || 0)
                  const rate = Number(nextRow.rate || 0)
                  nextRow.amount = qty && rate ? String((qty * rate).toFixed(2)) : ''
                }
                return nextRow
              })
            )
          }}
        />
        {type === 'Sales DC' && (
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
            Sales DC uses current item sales rate and will reduce stock after save.
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
