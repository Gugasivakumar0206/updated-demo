import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ActionButtons, FormGrid, FormInput, PageContainer, SectionCard, SelectDropdown, Textarea } from '../../components/ui/index'
import { createPurchaseInward, getCustomers, getItems, getSuppliers } from '../../lib/api'

function todayValue() {
  return new Date().toISOString().slice(0, 10)
}

export default function PurchaseFormPage({
  inwardType = 'GRN',
  title = 'Purchase Inward',
  subtitle = 'Inventory -> Purchase -> Stock inward entry',
  saveLabel = 'Save Purchase Inward',
  cancelPath = '/inventory/purchase',
  numberPrefix = 'PIN',
}) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [bootLoading, setBootLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [suppliers, setSuppliers] = useState([])
  const [customers, setCustomers] = useState([])
  const [items, setItems] = useState([])
  const [form, setForm] = useState({
    inwardNo: '',
    inwardDate: todayValue(),
    supplierId: '',
    customerId: '',
    invoiceNo: '',
    vehicleNo: '',
    itemId: '',
    qty: '',
    rate: '',
    remarks: '',
  })

  useEffect(() => {
    async function loadMasters() {
      try {
        setBootLoading(true)
        setError('')
        const [supplierResult, customerResult, itemResult] = await Promise.all([
          getSuppliers(),
          getCustomers(),
          getItems(),
        ])
        setSuppliers(supplierResult)
        setCustomers(customerResult)
        setItems(itemResult)
      } catch (loadError) {
        setError(loadError.message || 'Unable to load purchase master data.')
      } finally {
        setBootLoading(false)
      }
    }

    loadMasters()
  }, [])

  const supplierOptions = useMemo(
    () =>
      suppliers.map((supplier) => ({
        value: String(supplier.id),
        label: `${supplier.supplier_code} - ${supplier.supplier_name}`,
      })),
    [suppliers]
  )

  const customerOptions = useMemo(
    () =>
      customers.map((customer) => ({
        value: String(customer.id),
        label: `${customer.customer_code} - ${customer.customer_name}`,
      })),
    [customers]
  )

  const itemOptions = useMemo(
    () =>
      items.map((item) => ({
        value: String(item.id),
        label: `${item.item_code} - ${item.item_name}`,
      })),
    [items]
  )

  const selectedItem = items.find((item) => String(item.id) === form.itemId)
  const computedAmount =
    form.qty && form.rate ? (Number(form.qty || 0) * Number(form.rate || 0)).toFixed(2) : '0.00'

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSave() {
    if (!form.inwardNo || !form.supplierId || !form.itemId || !form.qty) {
      setSuccess('')
      setError('Inward No, Supplier, Item, and Qty are required.')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')
      const result = await createPurchaseInward({
        inwardType,
        inwardNo: form.inwardNo,
        inwardDate: form.inwardDate,
        supplierId: Number(form.supplierId),
        customerId: form.customerId ? Number(form.customerId) : null,
        invoiceNo: form.invoiceNo,
        vehicleNo: form.vehicleNo,
        itemId: Number(form.itemId),
        qty: form.qty,
        rate: form.rate || '0',
        remarks: form.remarks,
      })
      setSuccess(`${title} saved. ID: ${result.purchase?.id ?? '-'} | New Stock: ${result.stock?.new_balance ?? '-'}`)
      setForm({
        inwardNo: '',
        inwardDate: todayValue(),
        supplierId: '',
        customerId: '',
        invoiceNo: '',
        vehicleNo: '',
        itemId: '',
        qty: '',
        rate: '',
        remarks: '',
      })
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
      {bootLoading && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#eef2ff', color: '#4338ca', fontSize: '13px', fontWeight: '700' }}>
          Loading supplier, customer, and item masters...
        </div>
      )}

      <SectionCard title={`${title} Header`} defaultOpen>
        <FormGrid cols={3}>
          <FormInput label="Inward No" required value={form.inwardNo} onChange={(e) => updateField('inwardNo', e.target.value)} placeholder={`${numberPrefix}-0001`} />
          <FormInput label="Inward Date" required type="date" value={form.inwardDate} onChange={(e) => updateField('inwardDate', e.target.value)} />
          <SelectDropdown label="Supplier" required value={form.supplierId} onChange={(e) => updateField('supplierId', e.target.value)} options={supplierOptions} placeholder="Select supplier" />
          <SelectDropdown label="Customer (Optional)" value={form.customerId} onChange={(e) => updateField('customerId', e.target.value)} options={customerOptions} placeholder="Select customer" />
          <FormInput label="Invoice No" value={form.invoiceNo} onChange={(e) => updateField('invoiceNo', e.target.value)} placeholder="Supplier invoice no" />
          <FormInput label="Vehicle No" value={form.vehicleNo} onChange={(e) => updateField('vehicleNo', e.target.value)} placeholder="TN-00-AB-1234" />
        </FormGrid>
      </SectionCard>

      <SectionCard title="Item and Quantity" defaultOpen>
        <FormGrid cols={3}>
          <SelectDropdown label="Item" required value={form.itemId} onChange={(e) => updateField('itemId', e.target.value)} options={itemOptions} placeholder="Select item" />
          <FormInput label="Qty" required type="number" min="0" step="0.01" value={form.qty} onChange={(e) => updateField('qty', e.target.value)} placeholder="0.00" />
          <FormInput label="Rate" type="number" min="0" step="0.01" value={form.rate} onChange={(e) => updateField('rate', e.target.value)} placeholder="0.00" />
          <FormInput label="Amount" value={computedAmount} readOnly />
          <FormInput label="Selected Item Code" value={selectedItem?.item_code || ''} readOnly />
          <FormInput label="Selected Item Name" value={selectedItem?.item_name || ''} readOnly />
        </FormGrid>
        <div style={{ marginTop: '16px' }}>
          <Textarea label="Remarks" rows={3} value={form.remarks} onChange={(e) => updateField('remarks', e.target.value)} placeholder="Optional inward note, customer reference, transport note..." />
        </div>
      </SectionCard>
    </PageContainer>
  )
}
