import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, MapPin, FileText, CreditCard, Phone, Save, Home, Plus, Trash2, Package } from 'lucide-react'
import { createSupplier, getNextSupplierNumber, getSupplierById, updateSupplier } from '../../lib/api'

function Label({ text, required }) {
  return (
    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#0f4c81', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
      {text}{required && <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span>}
    </label>
  )
}

const inputBase = {
  width: '100%',
  padding: '9px 12px',
  fontSize: '13px',
  fontWeight: '600',
  border: '1.5px solid rgba(59,130,246,0.24)',
  borderRadius: '8px',
  outline: 'none',
  color: '#0f172a',
  background: 'rgba(255,255,255,0.96)',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  fontFamily: 'inherit',
}

const focusStyle = (e) => {
  e.target.style.borderColor = '#4facfe'
  e.target.style.boxShadow = '0 0 0 3px rgba(79,172,254,0.15)'
}

const blurStyle = (e) => {
  e.target.style.borderColor = 'rgba(79,172,254,0.22)'
  e.target.style.boxShadow = 'none'
}

function Input({ label, required, value, onChange, placeholder, type = 'text', readOnly }) {
  return (
    <div>
      <Label text={label} required={required} />
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder || ''}
        readOnly={readOnly}
        style={{ ...inputBase, background: readOnly ? '#f0f7ff' : 'rgba(255,255,255,0.9)' }}
        onFocus={focusStyle}
        onBlur={blurStyle}
      />
    </div>
  )
}

function Select({ label, required, value, onChange, options }) {
  return (
    <div>
      <Label text={label} required={required} />
      <select value={value} onChange={onChange} style={{ ...inputBase, cursor: 'pointer' }} onFocus={focusStyle} onBlur={blurStyle}>
        <option value="">-- Select --</option>
        {options.map((o) => typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  )
}

function Textarea({ label, value, onChange, rows = 2, placeholder }) {
  return (
    <div>
      <Label text={label} />
      <textarea
        value={value}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder || ''}
        style={{ ...inputBase, resize: 'vertical' }}
        onFocus={focusStyle}
        onBlur={blurStyle}
      />
    </div>
  )
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '5px',
          flexShrink: 0,
          cursor: 'pointer',
          border: checked ? 'none' : '2px solid rgba(79,172,254,0.35)',
          background: checked ? '#3b82f6' : 'rgba(255,255,255,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked && (
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
            <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f4c81' }}>{label}</span>
    </label>
  )
}

function Section({ title, icon: Icon, children }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderRadius: '14px', border: '1px solid #d7e8ff', boxShadow: '0 4px 20px rgba(59,130,246,0.10)', marginBottom: '20px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 20px', background: 'linear-gradient(135deg, #0f5cab 0%, #3b82f6 100%)' }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} color="#fff" />
        </div>
        <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff', fontFamily: 'Sora, sans-serif' }}>{title}</span>
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  )
}

function Grid({ cols = 3, children }) {
  return <div className="g3" style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: '16px' }}>{children}</div>
}

const STATES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal']
const GST_STATES = ['01-Jammu & Kashmir', '02-Himachal Pradesh', '03-Punjab', '04-Chandigarh', '05-Uttarakhand', '06-Haryana', '07-Delhi', '08-Rajasthan', '09-Uttar Pradesh', '10-Bihar', '18-Assam', '19-West Bengal', '20-Jharkhand', '21-Odisha', '22-Chhattisgarh', '23-Madhya Pradesh', '24-Gujarat', '27-Maharashtra', '29-Karnataka', '32-Kerala', '33-Tamil Nadu', '36-Telangana']
const PAYMENT_TERMS = ['Immediate', '7 Days', '15 Days', '30 Days', '45 Days', '60 Days', '90 Days', 'Against Advance', 'Letter of Credit']
const CURRENCIES = ['INR - Indian Rupee', 'USD - US Dollar', 'EUR - Euro', 'GBP - British Pound', 'AED - UAE Dirham']

function ContactRow({ contact, onChange, onRemove }) {
  const set = (k, v) => onChange({ ...contact, [k]: v })
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 36px', gap: '10px', alignItems: 'end', padding: '12px', background: 'rgba(59,130,246,0.05)', borderRadius: '10px', marginBottom: '8px', border: '1px solid rgba(59,130,246,0.12)' }}>
      <Input label="Contact Name" value={contact.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name" />
      <Input label="Designation" value={contact.designation} onChange={(e) => set('designation', e.target.value)} placeholder="Manager / Director" />
      <Input label="Mobile" value={contact.mobile} onChange={(e) => set('mobile', e.target.value)} placeholder="+91 00000 00000" />
      <Input label="Email" value={contact.email} onChange={(e) => set('email', e.target.value)} placeholder="email@company.com" />
      <button onClick={onRemove} style={{ width: '36px', height: '36px', border: '1px solid #fee2e2', borderRadius: '8px', background: '#fff', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function BankRow({ bank, onChange, onRemove }) {
  const set = (k, v) => onChange({ ...bank, [k]: v })
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 36px', gap: '10px', alignItems: 'end', padding: '12px', background: 'rgba(59,130,246,0.05)', borderRadius: '10px', marginBottom: '8px', border: '1px solid rgba(59,130,246,0.12)' }}>
      <Input label="Bank Name" value={bank.bankName} onChange={(e) => set('bankName', e.target.value)} placeholder="Bank name" />
      <Input label="Account No" value={bank.accountNo} onChange={(e) => set('accountNo', e.target.value)} placeholder="Account number" />
      <Input label="IFSC Code" value={bank.ifsc} onChange={(e) => set('ifsc', e.target.value)} placeholder="XXXXXXXXXX" />
      <Input label="Branch" value={bank.branch} onChange={(e) => set('branch', e.target.value)} placeholder="Branch name" />
      <Select label="Account Type" value={bank.accountType} onChange={(e) => set('accountType', e.target.value)} options={['Current', 'Savings', 'CC', 'OD']} />
      <button onClick={onRemove} style={{ width: '36px', height: '36px', border: '1px solid #fee2e2', borderRadius: '8px', background: '#fff', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function ItemRow({ item, onChange, onRemove }) {
  const set = (k, v) => onChange({ ...item, [k]: v })
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 36px', gap: '10px', alignItems: 'end', padding: '12px', background: 'rgba(59,130,246,0.05)', borderRadius: '10px', marginBottom: '8px', border: '1px solid rgba(59,130,246,0.12)' }}>
      <Input label="Item Code" value={item.itemCode} onChange={(e) => set('itemCode', e.target.value)} placeholder="Item code" />
      <Input label="Item Name" value={item.itemName} onChange={(e) => set('itemName', e.target.value)} placeholder="Item description" />
      <Input label="Supplier Part No" value={item.partNo} onChange={(e) => set('partNo', e.target.value)} placeholder="Vendor's part number" />
      <Input label="Lead Days" value={item.leadDays} onChange={(e) => set('leadDays', e.target.value)} placeholder="Days" type="number" />
      <button onClick={onRemove} style={{ width: '36px', height: '36px', border: '1px solid #fee2e2', borderRadius: '8px', background: '#fff', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function AddRowBtn({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: '700', border: '1.5px dashed rgba(59,130,246,0.42)', borderRadius: '8px', background: 'rgba(59,130,246,0.06)', color: '#0f5cab', cursor: 'pointer', marginTop: '4px' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(79,172,254,0.12)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(79,172,254,0.05)' }}
    >
      <Plus size={13} /> {label}
    </button>
  )
}

export default function SupplierCreationPage() {
  const navigate = useNavigate()
  const editId = window.location.pathname.match(/\/master\/supplier\/(\d+)/)?.[1]
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  const [form, setForm] = useState({
    supplierCode: '',
    supplierName: '',
    printName: '',
    supplierGroup: '',
    supplierType: '',
    territory: '',
    industry: '',
    status: 'Active',
    address: '',
    deliveryAddress: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    phone: '',
    mobile: '',
    email: '',
    website: '',
    fax: '',
    gstin: '',
    gstType: '',
    gstState: '',
    panNo: '',
    cinNo: '',
    msmeNo: '',
    msmeType: '',
    tdsApplicable: false,
    currency: 'INR - Indian Rupee',
    paymentTerms: '',
    creditLimit: '',
    creditDays: '',
    openingBalance: '',
    openingBalanceType: 'Cr',
    ledgerGroup: '',
    discount: '',
    purchaseOrderType: '',
    minOrderQty: '',
    minOrderValue: '',
    deliveryTerms: '',
    transportMode: '',
    transporter: '',
    qualityRequired: false,
    inspectionRequired: false,
    active: true,
  })

  const [contacts, setContacts] = useState([{ name: '', designation: '', mobile: '', email: '' }])
  const [banks, setBanks] = useState([{ bankName: '', accountNo: '', ifsc: '', branch: '', accountType: '' }])
  const [items, setItems] = useState([{ itemCode: '', itemName: '', partNo: '', leadDays: '' }])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const bind = (k) => ({ value: form[k], onChange: (e) => set(k, e.target.value) })

  const addContact = () => setContacts((c) => [...c, { name: '', designation: '', mobile: '', email: '' }])
  const removeContact = (i) => setContacts((c) => c.filter((_, idx) => idx !== i))
  const updateContact = (i, v) => setContacts((c) => c.map((x, idx) => idx === i ? v : x))

  const addBank = () => setBanks((b) => [...b, { bankName: '', accountNo: '', ifsc: '', branch: '', accountType: '' }])
  const removeBank = (i) => setBanks((b) => b.filter((_, idx) => idx !== i))
  const updateBank = (i, v) => setBanks((b) => b.map((x, idx) => idx === i ? v : x))

  const addItem = () => setItems((it) => [...it, { itemCode: '', itemName: '', partNo: '', leadDays: '' }])
  const removeItem = (i) => setItems((it) => it.filter((_, idx) => idx !== i))
  const updateItem = (i, v) => setItems((it) => it.map((x, idx) => idx === i ? v : x))

  useEffect(() => {
    if (editId) return

    async function loadNextSupplierCode() {
      try {
        const result = await getNextSupplierNumber()
        setForm((current) => current.supplierCode ? current : { ...current, supplierCode: result.nextNumber || '' })
      } catch {
      }
    }

    loadNextSupplierCode()
  }, [editId])

  const handleSave = async () => {
    if (!form.supplierCode.trim() || !form.supplierName.trim()) {
      setSaveSuccess('')
      setSaveError('Supplier Code and Supplier Name are required.')
      return
    }
    if (!form.gstin.trim()) {
      setSaveSuccess('')
      setSaveError('GSTIN is mandatory.')
      return
    }

    setSaving(true)
    setSaveError('')
    setSaveSuccess('')

    try {
      const payload = {
        ...form,
        contacts,
        banks,
        items,
      }
      const result = editId ? await updateSupplier(editId, payload) : await createSupplier(payload)
      setSaveSuccess(`Supplier saved successfully. ID: ${result.supplier?.id ?? editId ?? 'created'}`)
    } catch (error) {
      setSaveError(error.message || 'Unable to save supplier.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <style>{`
        @media(max-width:1024px){.g3{grid-template-columns:repeat(2,1fr)!important;}}
        @media(max-width:640px){.g3,.g2{grid-template-columns:1fr!important;}}
      `}</style>

      <div style={{ margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #0f5cab 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(79,172,254,0.35)' }}>
              <Truck size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0, background: 'linear-gradient(135deg, #0f5cab 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'Sora,sans-serif' }}>
                Supplier Creation
              </h1>
              <p style={{ fontSize: '13px', color: '#475569', margin: 0, marginTop: '2px', fontWeight: '600' }}>Master â†’ Supplier</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => navigate(-1)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', fontSize: '13px', fontWeight: '700', border: '1.5px solid #c9dfff', borderRadius: '10px', background: 'rgba(255,255,255,0.9)', color: '#334155', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(219,238,255,0.5)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.9)' }}
            >
              <Home size={14} /> Back
            </button>
            <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 22px', fontSize: '13px', fontWeight: '700', border: 'none', borderRadius: '10px', background: 'linear-gradient(135deg, #0f5cab 0%, #3b82f6 100%)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 4px 14px rgba(79,172,254,0.35)' }}>
              <Save size={14} /> {saving ? 'Saving...' : 'Save Supplier'}
            </button>
          </div>
        </div>

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

        <Section title="Basic Information" icon={Truck}>
          <Grid cols={3}>
            <Input label="Supplier Code" required {...bind('supplierCode')} placeholder="Auto / Manual code" />
            <Input label="Supplier Name" required {...bind('supplierName')} placeholder="Full legal name" />
            <Input label="Print Name" {...bind('printName')} placeholder="Short name for prints" />
            <Select label="Supplier Group" value={form.supplierGroup} onChange={(e) => set('supplierGroup', e.target.value)} options={['Raw Material', 'Component', 'Packing', 'Service', 'Subcontractor', 'Tooling', 'Capital Goods', 'Others']} />
            <Select label="Supplier Type" value={form.supplierType} onChange={(e) => set('supplierType', e.target.value)} options={['Manufacturer', 'Trader', 'Importer', 'Service Provider', 'Subcontractor', 'OEM']} />
            <Input label="Territory / Region" {...bind('territory')} placeholder="e.g. South India" />
            <Select label="Industry" value={form.industry} onChange={(e) => set('industry', e.target.value)} options={['Automobile', 'Aerospace', 'Electronics', 'FMCG', 'Pharma', 'Textile', 'Construction', 'Engineering', 'Others']} />
            <Select label="Status" value={form.status} onChange={(e) => set('status', e.target.value)} options={['Active', 'Inactive', 'Blocked', 'Under Evaluation', 'Approved', 'Blacklisted']} />
          </Grid>
          <div style={{ marginTop: '16px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <Checkbox label="Active" checked={form.active} onChange={(v) => set('active', v)} />
            <Checkbox label="Quality Certificate Required" checked={form.qualityRequired} onChange={(v) => set('qualityRequired', v)} />
            <Checkbox label="Inspection Required" checked={form.inspectionRequired} onChange={(v) => set('inspectionRequired', v)} />
          </div>
        </Section>

        <Section title="Address Details" icon={MapPin}>
          <Grid cols={3}>
            <div style={{ gridColumn: 'span 2' }}>
              <Textarea label="Billing Address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Door no, Street, Area" rows={2} />
            </div>
            <Textarea label="Factory / Dispatch Address" value={form.deliveryAddress} onChange={(e) => set('deliveryAddress', e.target.value)} placeholder="If different from billing" rows={2} />
            <Input label="City" {...bind('city')} placeholder="City" />
            <Select label="State" value={form.state} onChange={(e) => set('state', e.target.value)} options={STATES} />
            <Input label="Pincode" {...bind('pincode')} placeholder="000000" />
            <Input label="Country" {...bind('country')} placeholder="India" />
          </Grid>
        </Section>

        <Section title="Contact Information" icon={Phone}>
          <Grid cols={3}>
            <Input label="Phone" {...bind('phone')} placeholder="Office landline" />
            <Input label="Mobile" {...bind('mobile')} placeholder="+91 00000 00000" />
            <Input label="Email" type="email" {...bind('email')} placeholder="info@supplier.com" />
            <Input label="Website" {...bind('website')} placeholder="https://www.supplier.com" />
            <Input label="Fax" {...bind('fax')} placeholder="Fax number" />
          </Grid>
          <p style={{ fontSize: '11px', fontWeight: '700', color: '#0f5cab', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '16px 0 10px' }}>Contact Persons</p>
          {contacts.map((c, i) => (
            <ContactRow key={i} contact={c} onChange={(v) => updateContact(i, v)} onRemove={() => removeContact(i)} />
          ))}
          <AddRowBtn label="Add Contact Person" onClick={addContact} />
        </Section>

        <Section title="Statutory & Tax" icon={FileText}>
          <Grid cols={3}>
            <Select label="GST Registration Type" value={form.gstType} onChange={(e) => set('gstType', e.target.value)} options={['Regular', 'Composition', 'Unregistered', 'SEZ', 'Overseas']} />
            <Input label="GSTIN" required {...bind('gstin')} placeholder="00XXXXX0000X0XX" />
            <Select label="GST State" value={form.gstState} onChange={(e) => set('gstState', e.target.value)} options={GST_STATES} />
            <Input label="PAN No" {...bind('panNo')} placeholder="XXXXXXXXXX" />
            <Input label="CIN No" {...bind('cinNo')} placeholder="L00000XX0000XXX000000" />
            <Input label="MSME No" {...bind('msmeNo')} placeholder="MSME registration no" />
            <Select label="MSME Type" value={form.msmeType} onChange={(e) => set('msmeType', e.target.value)} options={['Micro', 'Small', 'Medium', 'Not Applicable']} />
          </Grid>
          <div style={{ marginTop: '16px' }}>
            <Checkbox label="TDS Applicable" checked={form.tdsApplicable} onChange={(v) => set('tdsApplicable', v)} />
          </div>
        </Section>

        <Section title="Purchase Terms" icon={Package}>
          <Grid cols={3}>
            <Select label="Currency" value={form.currency} onChange={(e) => set('currency', e.target.value)} options={CURRENCIES} />
            <Select label="Payment Terms" value={form.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value)} options={PAYMENT_TERMS} />
            <Input label="Credit Days" {...bind('creditDays')} placeholder="30" type="number" />
            <Input label="Min Order Qty" {...bind('minOrderQty')} placeholder="Minimum order quantity" type="number" />
            <Input label="Min Order Value (Rs)" {...bind('minOrderValue')} placeholder="0.00" type="number" />
            <Input label="Discount %" {...bind('discount')} placeholder="0.00" type="number" />
            <Select label="Delivery Terms" value={form.deliveryTerms} onChange={(e) => set('deliveryTerms', e.target.value)} options={['Ex-Works', 'FOB', 'CIF', 'Door Delivery', 'FOR Destination']} />
            <Select label="Transport Mode" value={form.transportMode} onChange={(e) => set('transportMode', e.target.value)} options={['Road', 'Rail', 'Air', 'Sea', 'Courier', 'Hand Delivery']} />
            <Input label="Transporter" {...bind('transporter')} placeholder="Logistics company name" />
            <Input label="Ledger Group" {...bind('ledgerGroup')} placeholder="Sundry Creditors" />
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <Input label="Opening Balance (Rs)" {...bind('openingBalance')} placeholder="0.00" type="number" />
              </div>
              <div style={{ width: '80px' }}>
                <Select label="Dr / Cr" value={form.openingBalanceType} onChange={(e) => set('openingBalanceType', e.target.value)} options={['Dr', 'Cr']} />
              </div>
            </div>
          </Grid>
        </Section>

        <Section title="Bank Details" icon={CreditCard}>
          {banks.map((b, i) => (
            <BankRow key={i} bank={b} onChange={(v) => updateBank(i, v)} onRemove={() => removeBank(i)} />
          ))}
          <AddRowBtn label="Add Bank Account" onClick={addBank} />
        </Section>

        <Section title="Items Supplied" icon={Package}>
          <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', margin: '0 0 12px' }}>List of items this supplier provides to your company</p>
          {items.map((it, i) => (
            <ItemRow key={i} item={it} onChange={(v) => updateItem(i, v)} onRemove={() => removeItem(i)} />
          ))}
          <AddRowBtn label="Add Item" onClick={addItem} />
        </Section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingBottom: '32px' }}>
          <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', fontSize: '13px', fontWeight: '700', border: '1.5px solid #c9dfff', borderRadius: '10px', background: 'rgba(255,255,255,0.9)', color: '#334155', cursor: 'pointer' }}>
            <Home size={14} /> Back
          </button>
          <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 26px', fontSize: '13px', fontWeight: '700', border: 'none', borderRadius: '10px', background: 'linear-gradient(135deg, #0f5cab 0%, #3b82f6 100%)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 4px 14px rgba(79,172,254,0.35)' }}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save Supplier'}
          </button>
        </div>
      </div>
    </>
  )
}

