import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createItem, deleteItem, getItemById, getNextItemNumber, updateItem } from '../../lib/api'
import {
  SectionCard, FormGrid, FormInput, NumberInput, SelectDropdown,
  Textarea, Checkbox, DatePicker, ImageUploader,
  ActionButtons, PageContainer
} from '../ui/index'
import {
  Info, ShoppingCart, Tag, Cpu, Maximize, Package,
  Users, Truck, Settings, Grid, Box, RefreshCw, Replace,
  FileDigit, Hash
} from 'lucide-react'

// ─── Inline editable table ────────────────────────────────────────────────────
function InlineTable({ columns, rows, onAdd, onRemove, onChange, addLabel = '+ Add Row' }) {
  return (
    <div>
      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#94a3b8', width: '40px', borderBottom: '1px solid #e2e8f0' }}>S.No</th>
              {columns.map(col => (
                <th key={col.key} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                  {col.label}
                </th>
              ))}
              <th style={{ padding: '8px 10px', width: '40px', borderBottom: '1px solid #e2e8f0' }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                  No rows added yet
                </td>
              </tr>
            ) : rows.map((row, ri) => (
              <tr key={ri} style={{ borderTop: '1px solid #f1f5f9' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '6px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>{ri + 1}</td>
                {columns.map(col => (
                  <td key={col.key} style={{ padding: '4px 6px' }}>
                    {col.type === 'select' ? (
                      <select
                        value={row[col.key] || ''}
                        onChange={e => onChange(ri, col.key, e.target.value)}
                        style={{ width: '100%', padding: '5px 8px', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '6px', outline: 'none', background: '#fff', minWidth: '100px' }}
                      >
                        <option value="">Select</option>
                        {(col.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type={col.type || 'text'}
                        value={row[col.key] || ''}
                        onChange={e => onChange(ri, col.key, e.target.value)}
                        placeholder={col.placeholder || col.label}
                        style={{ width: '100%', padding: '5px 8px', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '6px', outline: 'none', minWidth: '90px' }}
                        onFocus={e => e.target.style.borderColor = '#93c5fd'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      />
                    )}
                  </td>
                ))}
                <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                  <button onClick={() => onRemove(ri)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: '16px', lineHeight: 1 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
                  >✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={onAdd}
        style={{ marginTop: '8px', fontSize: '12px', color: '#2563eb', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        onMouseEnter={e => e.currentTarget.style.color = '#1d4ed8'}
        onMouseLeave={e => e.currentTarget.style.color = '#2563eb'}
      >
        {addLabel}
      </button>
    </div>
  )
}

function useTableRows(cols) {
  const empty = () => Object.fromEntries(cols.map(c => [c.key, '']))
  const [rows, setRows] = useState([])
  return {
    rows,
    addRow: () => setRows(r => [...r, empty()]),
    removeRow: (i) => setRows(r => r.filter((_, ri) => ri !== i)),
    changeRow: (i, key, val) => setRows(r => r.map((row, ri) => ri === i ? { ...row, [key]: val } : row)),
  }
}

// ─── Tax fields block (HSN/SAC section reused) ───────────────────────────────
function TaxBlock({ prefix, form, bind, label = 'HSN' }) {
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginTop: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
        <SelectDropdown label={`${label} No`} options={['No Tax', '5%', '12%', '18%', '28%']} {...bind(`${prefix}HsnNo`)} />
        <NumberInput label="Input IGST %" {...bind(`${prefix}InputIGST`)} placeholder="0" />
        <NumberInput label="Input CGST %" {...bind(`${prefix}InputCGST`)} placeholder="0" />
        <NumberInput label="Input SGST %" {...bind(`${prefix}InputSGST`)} placeholder="0" />
        <NumberInput label="Output IGST %" {...bind(`${prefix}OutputIGST`)} placeholder="0" />
        <NumberInput label="Output CGST %" {...bind(`${prefix}OutputCGST`)} placeholder="0" />
        <NumberInput label="Output SGST %" {...bind(`${prefix}OutputSGST`)} placeholder="0" />
      </div>
    </div>
  )
}

// ─── MAIN FORM ────────────────────────────────────────────────────────────────
export default function ItemMasterForm({
  title = 'Item Master',
  subtitle,
  showSections = 'all',
  initialData = {},
}) {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialData)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const bind = (key) => ({ value: form[key] ?? '', onChange: e => set(key, e.target.value) })
  const bindCheck = (key) => ({ checked: !!form[key], onChange: v => set(key, v) })
  const show = (n) => showSections === 'all' || showSections.includes(n)

  useEffect(() => {
    if (initialData.id || form.itemCode) return

    async function loadNextItemCode() {
      try {
        const itemType = form.itemType || form.groupType || 'Purchase Item'
        const result = await getNextItemNumber(itemType)
        setForm((current) => current.itemCode ? current : { ...current, itemCode: result.nextNumber || '' })
      } catch {
      }
    }

    loadNextItemCode()
  }, [form.groupType, form.itemCode, form.itemType, initialData.id])

  useEffect(() => {
    if (!initialData.id) return

    async function loadItemForEdit() {
      try {
        const item = await getItemById(initialData.id)
        setForm({
          ...(item.form_data || {}),
          id: item.id,
          itemType: item.item_type,
          itemCode: item.item_code,
          itemName: item.item_name,
          printName: item.print_name || '',
          itemGroup: item.item_group || '',
          stockUOM: item.uom || '',
          hsnCode: item.hsn_code || '',
          rack: item.rack || '',
          bin: item.bin || '',
          minStock: item.min_stock || '',
          maxStock: item.max_stock || '',
          reorderLevel: item.reorder_level || '',
          purchaseRate: item.purchase_rate || '',
          sellingRate: item.sales_rate || '',
          gstPercent: item.gst_percent || '',
          engineeringDocumentName: item.engineering_document_name || '',
          engineeringDocumentData: item.engineering_document_data || '',
          status: item.status || 'Active',
        })
      } catch (error) {
        setSaveError(error.message || 'Unable to load item for edit.')
      }
    }

    loadItemForEdit()
  }, [initialData.id])

  function handleEngineeringPdfUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      setSaveError('Only PDF files are allowed for engineering document upload.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        engineeringDocumentName: file.name,
        engineeringDocumentData: reader.result,
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!String(form.itemCode ?? '').trim() || !String(form.itemName ?? '').trim()) {
      setSaveSuccess('')
      setSaveError('Item Code and Item Name are required.')
      return
    }

    setSaving(true)
    setSaveError('')
    setSaveSuccess('')

    try {
      const payload = {
        itemType: form.itemType || form.groupType || 'Purchase Item',
        itemCode: form.itemCode,
        itemName: form.itemName,
        printName: form.printName,
        itemGroup: form.itemGroup,
        stockUOM: form.stockUOM,
        hsnCode: form.saleHsnNo || form.purchaseHsnNo || form.hsnCode,
        rack: form.rack,
        bin: form.bin,
        location: form.location,
        minStock: form.minStock,
        maxStock: form.maxStock,
        reorderLevel: form.rol || form.reorderLevel,
        purchaseRate: form.purchaseRate,
        sellingRate: form.sellingRate,
        gstPercent: form.saleOutputIGST || form.purchaseInputIGST || form.gstPercent,
        engineeringDocumentName: form.engineeringDocumentName,
        engineeringDocumentData: form.engineeringDocumentData,
        formData: form,
        status: form.status || 'Active',
      }
      const result = initialData.id
        ? await updateItem(initialData.id, payload)
        : await createItem(payload)
      setSaveSuccess(`Item saved successfully. ID: ${result.item?.id ?? 'created'}`)
    } catch (error) {
      setSaveError(error.message || 'Unable to save item.')
    } finally {
      setSaving(false)
    }
  }

  // ── Inline table hooks ──────────────────────────────────────────────────────
  const divLoc = useTableRows([
    { key: 'division', label: 'Division' },
    { key: 'rack', label: 'Rack', type: 'select', options: ['Rack A', 'Rack B', 'Rack C'] },
    { key: 'bin', label: 'Bin', type: 'select', options: ['Bin 01', 'Bin 02', 'Bin 03'] },
    { key: 'minStockCap', label: 'Min Stock/Capacity', type: 'number' },
    { key: 'rol', label: 'ROL', type: 'number' },
    { key: 'sequence', label: 'Sequence Order', type: 'number' },
  ])
  const accessories = useTableRows([
    { key: 'itemName', label: 'Accessories Item Name' },
    { key: 'qty', label: 'Qty', type: 'number' },
  ])
  const uomConv = useTableRows([
    { key: 'uomName', label: 'UOM Name', type: 'select', options: ['Nos', 'Kg', 'Mtr', 'Ltr', 'Box', 'Pcs', 'Set'] },
    { key: 'ratio', label: 'Conversion Ratio', type: 'number' },
    { key: 'decimal', label: 'Decimal Point', type: 'number' },
    { key: 'mrp', label: 'MRP', type: 'number' },
    { key: 'rate', label: 'Rate', type: 'number' },
  ])
  const altItems = useTableRows([
    { key: 'item', label: 'Alternative Item' },
    { key: 'code', label: 'Alternative Item Code' },
    { key: 'name', label: 'Alternative Item Name' },
  ])
  const custPartTable = useTableRows([
    { key: 'partNo', label: 'Part No' },
    { key: 'description', label: 'Description' },
    { key: 'hsnNo', label: 'HSN No' },
    { key: 'hsnIgstIn', label: 'HSN IGST In', type: 'number' },
    { key: 'hsnCgstIn', label: 'HSN CGST In', type: 'number' },
    { key: 'hsnSgstIn', label: 'HSN SGST In', type: 'number' },
    { key: 'hsnIgstOut', label: 'HSN IGST Out', type: 'number' },
    { key: 'hsnCgstOut', label: 'HSN CGST Out', type: 'number' },
    { key: 'hsnSgstOut', label: 'HSN SGST Out', type: 'number' },
    { key: 'sacNo', label: 'SAC No' },
    { key: 'sacIgstIn', label: 'SAC IGST In', type: 'number' },
    { key: 'sacCgstIn', label: 'SAC CGST In', type: 'number' },
    { key: 'sacSgstIn', label: 'SAC SGST In', type: 'number' },
    { key: 'sacIgstOut', label: 'SAC IGST Out', type: 'number' },
    { key: 'sacCgstOut', label: 'SAC CGST Out', type: 'number' },
    { key: 'sacSgstOut', label: 'SAC SGST Out', type: 'number' },
  ])
  const suppPartTable = useTableRows([
    { key: 'partNo', label: 'Part No' },
    { key: 'description', label: 'Description' },
    { key: 'hsnNo', label: 'HSN No' },
    { key: 'hsnIgstIn', label: 'HSN IGST In', type: 'number' },
    { key: 'hsnCgstIn', label: 'HSN CGST In', type: 'number' },
    { key: 'hsnSgstIn', label: 'HSN SGST In', type: 'number' },
    { key: 'hsnIgstOut', label: 'HSN IGST Out', type: 'number' },
    { key: 'hsnCgstOut', label: 'HSN CGST Out', type: 'number' },
    { key: 'hsnSgstOut', label: 'HSN SGST Out', type: 'number' },
    { key: 'sacNo', label: 'SAC No' },
    { key: 'sacIgstIn', label: 'SAC IGST In', type: 'number' },
    { key: 'sacCgstIn', label: 'SAC CGST In', type: 'number' },
    { key: 'sacSgstIn', label: 'SAC SGST In', type: 'number' },
    { key: 'sacIgstOut', label: 'SAC IGST Out', type: 'number' },
    { key: 'sacCgstOut', label: 'SAC CGST Out', type: 'number' },
    { key: 'sacSgstOut', label: 'SAC SGST Out', type: 'number' },
  ])

  return (
    <PageContainer
      title={title}
      subtitle={subtitle}
      actions={
        <ActionButtons
          onSave={handleSave}
          onCancel={() => navigate(-1)}
            onDelete={initialData.id ? async () => {
              if (!confirm('Delete this record?')) return
              try {
                await deleteItem(initialData.id)
                navigate(-1)
              } catch (error) {
                setSaveError(error.message || 'Unable to delete item.')
              }
            } : undefined}
        />
      }
    >
      {saveError && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', fontWeight: '700' }}>
          {saveError}
        </div>
      )}

      {saveSuccess && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#dcfce7', color: '#166534', fontSize: '13px', fontWeight: '700' }}>
          {saveSuccess}
        </div>
      )}

      {/* ══ SECTION 1 — General Information ══════════════════════════════════ */}
      {show(1) && (
        <SectionCard title="Item Information" icon={Info}>
          <FormGrid cols={3}>
            <SelectDropdown label="Group Type" required
              options={['Purchase Item', 'Customer Supplied', 'Manufacturing Item']}
              {...bind('groupType')} />
            <FormInput label="Item Code" required {...bind('itemCode')} placeholder="ITM-0001" />
            <SelectDropdown label="Item Group"
              options={['Mechanical', 'Electrical', 'Electronic', 'Structural', 'Raw Material', 'Finished Good']}
              {...bind('itemGroup')} />
            <FormInput label="Item Name" required {...bind('itemName')} placeholder="Enter item name" />
            <FormInput label="Print Name" {...bind('printName')} />
            <SelectDropdown label="Location"
              options={['MAIN', 'Store A', 'Store B', 'Store C', 'Warehouse']}
              {...bind('location')} />
            <SelectDropdown label="Stock UOM"
              options={['NOS', 'Kg', 'Mtr', 'Ltr', 'Set', 'Box', 'Pcs', 'Roll', 'Sheet']}
              {...bind('stockUOM')} />
            <Textarea label="Description" className="lg:col-span-2" rows={2} {...bind('description')} />
          </FormGrid>

          {/* Checkboxes row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '16px', padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <Checkbox label="Stock Maintain" {...bindCheck('stockMaintain')} />
            <Checkbox label="BOM Maintain" {...bindCheck('bomMaintain')} />
            <Checkbox label="Billing Item" {...bindCheck('billingItem')} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Storage</span>
              <SelectDropdown placeholder="Bin / Box / Tray / Trolley"
                options={['Bin', 'Box', 'Tray', 'Trolley']}
                {...bind('storageType')}
                className="w-44"
              />
            </div>
          </div>

          {/* Image upload */}
          <div style={{ marginTop: '12px' }}>
            <ImageUploader label="Item Image" />
          </div>
        </SectionCard>
      )}

      {/* ══ SECTION 2 — Purchase Information ════════════════════════════════ */}
      {show(2) && (
        <SectionCard title="Purchase Information" icon={ShoppingCart} defaultOpen={true}>
          <FormGrid cols={3}>
            <NumberInput label="Purchase Rate" {...bind('purchaseRate')} placeholder="0" />
            <NumberInput label="Scrap Rate" {...bind('scrapRate')} placeholder="0" />
            <NumberInput label="Purchase Allowance (%)" {...bind('purchaseAllowancePercent')} placeholder="0" />
            <SelectDropdown label="Purchase Ledger"
              options={['Purchase Account', 'Import Purchase', 'Local Purchase']}
              {...bind('purchaseLedger')} />
            <NumberInput label="Inventory Rate" {...bind('inventoryRate')} placeholder="0" />
            <NumberInput label="Maximum Purchase Rate" {...bind('maxPurchaseRate')} placeholder="0" />
            <SelectDropdown label="Warranty Type"
              options={['None', 'Manufacturer Warranty', 'Service Warranty', 'Extended Warranty']}
              {...bind('warrantyType')} />
            <NumberInput label="Warranty Period (months)" {...bind('warrantyPeriod')} placeholder="0" />
          </FormGrid>
        </SectionCard>
      )}

      {/* ══ SECTION 3 — Sales Information ════════════════════════════════════ */}
      {show(3) && (
        <SectionCard title="Sale Information" icon={Tag} defaultOpen={false}>
          <FormGrid cols={3}>
            <NumberInput label="Selling Rate" {...bind('sellingRate')} placeholder="0" />
            <NumberInput label="Item Cost" {...bind('itemCost')} placeholder="0" />
            <NumberInput label="Sales Allowance (%)" {...bind('salesAllowancePercent')} placeholder="0" />
            <SelectDropdown label="Sales Ledger"
              options={['Sales Account', 'Export Sales', 'Local Sales']}
              {...bind('salesLedger')} />
            <NumberInput label="Minimum Selling Rate" {...bind('minSellingRate')} placeholder="0" />
            <NumberInput label="MRP Rate" {...bind('mrpRate')} placeholder="0" />
          </FormGrid>
        </SectionCard>
      )}

      {/* ══ SECTION 4 — Engineering Information ═════════════════════════════ */}
      {show(4) && (
        <SectionCard title="Engineering Information" icon={Cpu} defaultOpen={false}>
          {/* Row 1 */}
          <FormGrid cols={3}>
            <FormInput label="Drawing No" {...bind('drawingNo')} />
            <FormInput label="Revision No" {...bind('revisionNo')} />
            <DatePicker label="Revision Date" {...bind('revisionDate')} />
            <SelectDropdown label="Batch Expiry" options={['None', 'Yes', 'No']} {...bind('batchExpiry')} />
            <NumberInput label="Expiry Period" {...bind('expiryPeriod')} placeholder="0" />
          </FormGrid>

          {/* Row 2 */}
          <FormGrid cols={3} className="mt-3">
            <NumberInput label="Purchase Pack Size" {...bind('purchasePackSize')} placeholder="0" />
            <NumberInput label="Issue Pack Size" {...bind('issuePackSize')} placeholder="0" />
            <NumberInput label="Batch Qty" {...bind('batchQty')} placeholder="0" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
              <Checkbox label="Inspection Report" {...bindCheck('inspectionReport')} />
            </div>
            <SelectDropdown label="Kanban Stock Policy" options={['None', 'FIFO', 'LIFO', 'FEFO']} {...bind('kanbanStockPolicy')} />
            <NumberInput label="Pallet Size" {...bind('palletSize')} placeholder="0" />
          </FormGrid>

          <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '14px', paddingTop: '14px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Engineering Document Attachment</p>
            <FormGrid cols={3}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Upload Drawing / Engineering PDF</label>
                <input type="file" accept="application/pdf" onChange={handleEngineeringPdfUpload} className="form-input" />
                {form.engineeringDocumentName && (
                  <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '700', color: '#0f5cab' }}>
                    Saved file: {form.engineeringDocumentName}
                  </div>
                )}
              </div>
              {form.engineeringDocumentData && (
                <a href={form.engineeringDocumentData} target="_blank" rel="noreferrer" className="btn-secondary self-end">
                  View PDF
                </a>
              )}
            </FormGrid>
          </div>

          {/* Row 3 — Purchase extra fields from PDF */}
          <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '14px', paddingTop: '14px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Purchase Controls</p>
            <FormGrid cols={3}>
              <NumberInput label="Rejection Allowance" {...bind('rejectionAllowance')} placeholder="0" />
              <NumberInput label="Inward/Outward Allowance %" {...bind('inwardOutwardAllowance')} placeholder="0" />
              <NumberInput label="Issue Allowance" {...bind('issueAllowance')} placeholder="0" />
              <NumberInput label="Scrap Allowance" {...bind('scrapAllowance')} placeholder="0" />
              <NumberInput label="Kanban Qty/Per Day Plan" {...bind('kanbanQtyPerDay')} placeholder="0" />
              <NumberInput label="Excess Production % (+/-)" {...bind('excessProductionPct')} placeholder="0" />
              <NumberInput label="Production RM Consumption % (+/-)" {...bind('productionRMConsumption')} placeholder="0" />
              <NumberInput label="Excess Work Order %" {...bind('excessWorkOrderPct')} placeholder="0" />
              <NumberInput label="Excess Routesheet %" {...bind('excessRoutesheetPct')} placeholder="0" />
              <NumberInput label="Lead Days" {...bind('leadDays')} placeholder="0" />
            </FormGrid>
          </div>

          {/* Dimension fields (from PDF — shown in Engineering section) */}
          <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '14px', paddingTop: '14px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Dimensions</p>
            <FormGrid cols={3}>
              <SelectDropdown label="Shape" options={['--Select--', 'Round', 'Square', 'Rectangle', 'Hexagon', 'Custom']} {...bind('shape')} />
              <SelectDropdown label="UOM" options={['--Select--', 'mm', 'cm', 'Mtr', 'inch']} {...bind('dimensionUOM')} />
              <NumberInput label="Length" {...bind('length')} placeholder="0" />
              <NumberInput label="Width" {...bind('width')} placeholder="0" />
              <NumberInput label="Height" {...bind('height')} placeholder="0" />
              <NumberInput label="Volume" {...bind('volume')} placeholder="0" />
              <FormInput label="RM Cut Size" {...bind('rmCutSize')} />
              <NumberInput label="Dia" {...bind('diameter')} placeholder="0" />
              <NumberInput label="Inner Dia" {...bind('innerDia')} placeholder="0" />
              <NumberInput label="Outer Dia" {...bind('outerDia')} placeholder="0" />
              <NumberInput label="Surface Area" {...bind('surfaceArea')} placeholder="0" />
              <NumberInput label="Net Weight" {...bind('netWeight')} placeholder="0" />
              <FormInput label="Color Pallet" {...bind('colorPallet')} />
            </FormGrid>
          </div>
        </SectionCard>
      )}

      {/* ══ SECTION 5 — Dimension Information (standalone) ══════════════════ */}
      {show(5) && !show(4) && (
        <SectionCard title="Dimension Information" icon={Maximize} defaultOpen={false}>
          <FormGrid cols={3}>
            <SelectDropdown label="Shape" options={['--Select--', 'Round', 'Square', 'Rectangle', 'Hexagon', 'Custom']} {...bind('shape')} />
            <SelectDropdown label="UOM" options={['--Select--', 'mm', 'cm', 'Mtr', 'inch']} {...bind('dimensionUOM')} />
            <NumberInput label="Length" {...bind('length')} placeholder="0" />
            <NumberInput label="Width" {...bind('width')} placeholder="0" />
            <NumberInput label="Height" {...bind('height')} placeholder="0" />
            <NumberInput label="Volume" {...bind('volume')} placeholder="0" />
            <FormInput label="RM Cut Size" {...bind('rmCutSize')} />
            <NumberInput label="Dia" {...bind('diameter')} placeholder="0" />
            <NumberInput label="Inner Dia" {...bind('innerDia')} placeholder="0" />
            <NumberInput label="Outer Dia" {...bind('outerDia')} placeholder="0" />
            <NumberInput label="Surface Area" {...bind('surfaceArea')} placeholder="0" />
            <NumberInput label="Net Weight" {...bind('netWeight')} placeholder="0" />
            <FormInput label="Color Pallet" {...bind('colorPallet')} />
          </FormGrid>
        </SectionCard>
      )}

      {/* ══ SECTION 6 — Inventory Information ════════════════════════════════ */}
      {show(6) && (
        <SectionCard title="Inventory Information" icon={Package} defaultOpen={false}>
          <FormGrid cols={3}>
            <SelectDropdown label="Inventory Calculation"
              options={['Moving Average', 'Standard Cost', 'FIFO', 'Actual Cost']}
              {...bind('inventoryCalculation')} />
            <NumberInput label="Minimum Stock" {...bind('minimumStock')} placeholder="0" />
            <NumberInput label="Minimum Stock Days" {...bind('minimumStockDays')} placeholder="0" />
            <NumberInput label="Maximum Stock" {...bind('maximumStock')} placeholder="0" />
            <NumberInput label="Minimum Order Qty" {...bind('moq')} placeholder="0" />
            <NumberInput label="FIFO Rate" {...bind('fifoRate')} placeholder="0" />
            <NumberInput label="ROL" {...bind('rol')} placeholder="0" />
            <NumberInput label="EOQ" {...bind('eoq')} placeholder="0" />
            <SelectDropdown label="Material Name"
              options={['--Select--', 'Steel', 'Aluminium', 'Copper', 'Plastic', 'Rubber', 'Composite']}
              {...bind('materialName')} />
            <NumberInput label="Maximum Order Qty" {...bind('maxOrderQty')} placeholder="0" />
            <NumberInput label="Minimum Route Sheet Qty" {...bind('minRouteSheetQty')} placeholder="0" />
            <FormInput label="Rack Name" {...bind('rackName')} />
            <FormInput label="Bin Name" {...bind('binName')} />
            <FormInput label="Make Name" {...bind('makeName')} />
            <FormInput label="Model" {...bind('model')} />
            <FormInput label="Brand" {...bind('brand')} />
            <FormInput label="Category" {...bind('category')} />
            <FormInput label="End Bit Item" {...bind('endBitItem')} />
          </FormGrid>
        </SectionCard>
      )}

      {/* ══ SECTION 7 — Customer Part Information ════════════════════════════ */}
      {show(7) && (
        <SectionCard title="Customer Part Information" icon={Users} defaultOpen={false}>
          {/* Main fields */}
          <FormGrid cols={3}>
            <SelectDropdown label="Customer"
              options={['--Select--', 'Maruti Suzuki', 'Tata Motors', 'Mahindra', 'Bajaj Auto', 'Hero MotoCorp', 'TVS Motors']}
              {...bind('customer')} />
            <FormInput label="Customer Part No" {...bind('customerPartNo')} />
            <FormInput label="Customer Description" {...bind('customerDescription')} />
          </FormGrid>

          {/* HSN block */}
          <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '14px', paddingTop: '12px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>HSN Statutory Information</p>
            <FormGrid cols={3}>
              <SelectDropdown label="HSN No" options={['--Select--', 'No Tax', '84', '85', '73', '39']} {...bind('custHsnNo')} />
              <NumberInput label="Input IGST %" {...bind('custHsnInputIGST')} placeholder="0" />
              <NumberInput label="Input CGST %" {...bind('custHsnInputCGST')} placeholder="0" />
              <NumberInput label="Input SGST %" {...bind('custHsnInputSGST')} placeholder="0" />
              <NumberInput label="Output IGST %" {...bind('custHsnOutputIGST')} placeholder="0" />
              <NumberInput label="Output CGST %" {...bind('custHsnOutputCGST')} placeholder="0" />
              <NumberInput label="Output SGST %" {...bind('custHsnOutputSGST')} placeholder="0" />
            </FormGrid>
          </div>

          {/* SAC block */}
          <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '14px', paddingTop: '12px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>SAC Statutory Information</p>
            <FormGrid cols={3}>
              <SelectDropdown label="SAC No" options={['--Select--', 'No Tax', '9954', '9987', '9988']} {...bind('custSacNo')} />
              <NumberInput label="Input IGST %" {...bind('custSacInputIGST')} placeholder="0" />
              <NumberInput label="Input CGST %" {...bind('custSacInputCGST')} placeholder="0" />
              <NumberInput label="Input SGST %" {...bind('custSacInputSGST')} placeholder="0" />
              <NumberInput label="Output IGST %" {...bind('custSacOutputIGST')} placeholder="0" />
              <NumberInput label="Output CGST %" {...bind('custSacOutputCGST')} placeholder="0" />
              <NumberInput label="Output SGST %" {...bind('custSacOutputSGST')} placeholder="0" />
            </FormGrid>
          </div>

          {/* Customer Part inline table */}
          <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '14px', paddingTop: '12px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Customer Part Details</p>
            <InlineTable
              columns={[
                { key: 'customer', label: 'Customer' },
                { key: 'partNo', label: 'Part No' },
                { key: 'description', label: 'Description' },
                { key: 'hsnNo', label: 'HSN No' },
                { key: 'hsnIgstIn', label: 'HSN IGST In', type: 'number' },
                { key: 'hsnCgstIn', label: 'HSN CGST In', type: 'number' },
                { key: 'hsnSgstIn', label: 'HSN SGST In', type: 'number' },
                { key: 'hsnIgstOut', label: 'HSN IGST Out', type: 'number' },
                { key: 'hsnCgstOut', label: 'HSN CGST Out', type: 'number' },
                { key: 'hsnSgstOut', label: 'HSN SGST Out', type: 'number' },
                { key: 'sacNo', label: 'SAC No' },
                { key: 'sacIgstIn', label: 'SAC IGST In', type: 'number' },
                { key: 'sacCgstIn', label: 'SAC CGST In', type: 'number' },
                { key: 'sacSgstIn', label: 'SAC SGST In', type: 'number' },
                { key: 'sacIgstOut', label: 'SAC IGST Out', type: 'number' },
              ]}
              rows={custPartTable.rows}
              onAdd={custPartTable.addRow}
              onRemove={custPartTable.removeRow}
              onChange={custPartTable.changeRow}
              addLabel="+ Add Customer Part"
            />
          </div>
        </SectionCard>
      )}

      {/* ══ SECTION 8 — Supplier Part Information ════════════════════════════ */}
      {show(8) && (
        <SectionCard title="Supplier Part Information" icon={Truck} defaultOpen={false}>
          <FormGrid cols={3}>
            <SelectDropdown label="Supplier"
              options={['--Select--', 'Tata Steel', 'Hindalco', 'Precision Parts', 'ABC Metals', 'XYZ Components']}
              {...bind('supplier')} />
            <FormInput label="Supplier Part No" {...bind('supplierPartNo')} />
            <FormInput label="Supplier Description" {...bind('supplierDescription')} />
            <FormInput label="Tool" {...bind('tool')} />
          </FormGrid>

          {/* HSN block */}
          <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '14px', paddingTop: '12px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>HSN Statutory Information</p>
            <FormGrid cols={3}>
              <SelectDropdown label="HSN No" options={['--Select--', 'No Tax', '84', '85', '73', '39']} {...bind('suppHsnNo')} />
              <NumberInput label="Input IGST %" {...bind('suppHsnInputIGST')} placeholder="0" />
              <NumberInput label="Input CGST %" {...bind('suppHsnInputCGST')} placeholder="0" />
              <NumberInput label="Input SGST %" {...bind('suppHsnInputSGST')} placeholder="0" />
              <NumberInput label="Output IGST %" {...bind('suppHsnOutputIGST')} placeholder="0" />
              <NumberInput label="Output CGST %" {...bind('suppHsnOutputCGST')} placeholder="0" />
              <NumberInput label="Output SGST %" {...bind('suppHsnOutputSGST')} placeholder="0" />
            </FormGrid>
          </div>

          {/* SAC block */}
          <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '14px', paddingTop: '12px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>SAC Statutory Information</p>
            <FormGrid cols={3}>
              <SelectDropdown label="SAC No" options={['--Select--', 'No Tax', '9954', '9987', '9988']} {...bind('suppSacNo')} />
              <NumberInput label="Input IGST %" {...bind('suppSacInputIGST')} placeholder="0" />
              <NumberInput label="Input CGST %" {...bind('suppSacInputCGST')} placeholder="0" />
              <NumberInput label="Input SGST %" {...bind('suppSacInputSGST')} placeholder="0" />
              <NumberInput label="Output IGST %" {...bind('suppSacOutputIGST')} placeholder="0" />
              <NumberInput label="Output CGST %" {...bind('suppSacOutputCGST')} placeholder="0" />
              <NumberInput label="Output SGST %" {...bind('suppSacOutputSGST')} placeholder="0" />
            </FormGrid>
          </div>

          {/* Supplier Part inline table */}
          <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '14px', paddingTop: '12px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Supplier Part Details</p>
            <InlineTable
              columns={[
                { key: 'supplier', label: 'Supplier' },
                { key: 'partNo', label: 'Part No' },
                { key: 'description', label: 'Description' },
                { key: 'hsnNo', label: 'HSN No' },
                { key: 'hsnIgstIn', label: 'HSN IGST In', type: 'number' },
                { key: 'hsnCgstIn', label: 'HSN CGST In', type: 'number' },
                { key: 'hsnSgstIn', label: 'HSN SGST In', type: 'number' },
                { key: 'hsnIgstOut', label: 'HSN IGST Out', type: 'number' },
                { key: 'hsnCgstOut', label: 'HSN CGST Out', type: 'number' },
                { key: 'hsnSgstOut', label: 'HSN SGST Out', type: 'number' },
                { key: 'sacNo', label: 'SAC No' },
                { key: 'sacIgstIn', label: 'SAC IGST In', type: 'number' },
                { key: 'sacCgstIn', label: 'SAC CGST In', type: 'number' },
                { key: 'sacSgstIn', label: 'SAC SGST In', type: 'number' },
                { key: 'sacIgstOut', label: 'SAC IGST Out', type: 'number' },
              ]}
              rows={suppPartTable.rows}
              onAdd={suppPartTable.addRow}
              onRemove={suppPartTable.removeRow}
              onChange={suppPartTable.changeRow}
              addLabel="+ Add Supplier Part"
            />
          </div>
        </SectionCard>
      )}

      {/* ══ SECTION 9 — Extra Information ════════════════════════════════════ */}
      {show(9) && (
        <SectionCard title="Extra Information" icon={Settings} defaultOpen={false}>
          {/* Checkboxes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
            <Checkbox label="Inspection Required" {...bindCheck('inspectionRequired')} />
            <Checkbox label="Cost Control Required" {...bindCheck('costControlRequired')} />
            <Checkbox label="SPC Required" {...bindCheck('spcRequired')} />
            <Checkbox label="Include In Inventory Cost" {...bindCheck('includeInInventoryCost')} />
            <Checkbox label="RM Scan Mandatory" {...bindCheck('rmScanMandatory')} />
            <Checkbox label="Load In RM Label" {...bindCheck('loadInRMLabel')} />
          </div>

          <FormGrid cols={3}>
            <SelectDropdown label="Packing Type" options={['Month', 'Week', 'Day', 'Box', 'Bag', 'Tray', 'Pallet']} {...bind('packingType')} />
            <NumberInput label="Packing Period" {...bind('packingPeriod')} placeholder="0" />
            <SelectDropdown label="PO Inward Type" options={['Month', 'Direct', 'Quality Check', 'Batch']} {...bind('poInwardType')} />
            <NumberInput label="PO Inward Period" {...bind('poInwardPeriod')} placeholder="0" />
            <NumberInput label="Maturation Period (Mins)" {...bind('maturationPeriod')} placeholder="0" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
              <Checkbox label="Chemical Item" {...bindCheck('chemicalItem')} />
            </div>
          </FormGrid>
        </SectionCard>
      )}

      {/* ══ SECTION 10 — Division wise Location ══════════════════════════════ */}
      {show(10) && (
        <SectionCard title="Division wise Location" icon={Grid} defaultOpen={false}>
          <InlineTable
            columns={[
              { key: 'division', label: 'Division', type: 'select', options: ['MAIN', 'Division A', 'Division B'] },
              { key: 'rack', label: 'Rack', type: 'select', options: ['--Select--', 'Rack A', 'Rack B', 'Rack C', 'Rack D'] },
              { key: 'bin', label: 'Bin', type: 'select', options: ['--Select--', 'Bin 01', 'Bin 02', 'Bin 03', 'Bin 04'] },
              { key: 'minStockCap', label: 'Minimum Stock/Capacity', type: 'number' },
              { key: 'rol', label: 'ROL', type: 'number' },
              { key: 'sequence', label: 'Sequence Order', type: 'number' },
            ]}
            rows={divLoc.rows}
            onAdd={divLoc.addRow}
            onRemove={divLoc.removeRow}
            onChange={divLoc.changeRow}
            addLabel="+ Add"
          />
        </SectionCard>
      )}

      {/* ══ SECTION 11 — Accessories Information ════════════════════════════ */}
      {show(11) && (
        <SectionCard title="Accessories Information" icon={Box} defaultOpen={false}>
          {/* Input row */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Accessories Item</label>
              <input
                type="text"
                placeholder="Search by item name"
                value={form.newAccessoryItem || ''}
                onChange={e => set('newAccessoryItem', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none' }}
              />
            </div>
            <div style={{ width: '120px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Qty</label>
              <input
                type="number"
                placeholder="0"
                value={form.newAccessoryQty || ''}
                onChange={e => set('newAccessoryQty', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none' }}
              />
            </div>
            <button
              onClick={() => {
                if (form.newAccessoryItem) {
                  accessories.addRow()
                  set('newAccessoryItem', '')
                  set('newAccessoryQty', '')
                }
              }}
              style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Add
            </button>
          </div>
          <InlineTable
            columns={[
              { key: 'itemCode', label: 'Accessories Item Code' },
              { key: 'itemName', label: 'Accessories Item Name' },
              { key: 'qty', label: 'Item Qty', type: 'number' },
            ]}
            rows={accessories.rows}
            onAdd={accessories.addRow}
            onRemove={accessories.removeRow}
            onChange={accessories.changeRow}
            addLabel="+ Add Row"
          />
        </SectionCard>
      )}

      {/* ══ SECTION 12 — UOM Conversion ══════════════════════════════════════ */}
      {show(12) && (
        <SectionCard title="UOM Conversion" icon={RefreshCw} defaultOpen={false}>
          <InlineTable
            columns={[
              { key: 'uomName', label: 'UOM Name', type: 'select', options: ['NOS', 'Kg', 'Mtr', 'Ltr', 'Box', 'Pcs', 'Set', 'BAG', 'Roll'] },
              { key: 'ratio', label: 'Conversion Ratio', type: 'number' },
              { key: 'decimal', label: 'Decimal Point', type: 'number' },
              { key: 'mrp', label: 'MRP', type: 'number' },
              { key: 'rate', label: 'Rate', type: 'number' },
            ]}
            rows={uomConv.rows}
            onAdd={uomConv.addRow}
            onRemove={uomConv.removeRow}
            onChange={uomConv.changeRow}
            addLabel="+ Add"
          />
        </SectionCard>
      )}

      {/* ══ SECTION 13 — Alternative Item Information ════════════════════════ */}
      {show(13) && (
        <SectionCard title="Alternative Item Information" icon={Replace} defaultOpen={false}>
          <InlineTable
            columns={[
              { key: 'alternativeItem', label: 'Alternative Item' },
              { key: 'alternativeItemCode', label: 'Alternative Item Code' },
              { key: 'alternativeItemName', label: 'Alternative Item Name' },
            ]}
            rows={altItems.rows}
            onAdd={altItems.addRow}
            onRemove={altItems.removeRow}
            onChange={altItems.changeRow}
            addLabel="+ Add"
          />
        </SectionCard>
      )}

      {/* Bottom Save / Cancel */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', paddingBottom: '24px' }}>
        <ActionButtons
          onSave={handleSave}
          onCancel={() => navigate(-1)}
          saveLabel={saving ? 'Saving...' : 'Save'}
        />
      </div>
    </PageContainer>
  )
}
