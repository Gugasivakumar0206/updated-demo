import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, MapPin, FileText, CreditCard, Phone, Save, Home, Plus, Trash2 } from 'lucide-react'
import { createCustomer, getCustomers } from '../../lib/api'

/* ─── Shared Field Components ───────────────────────────────────────────── */
function Label({ text, required }) {
  return (
    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#5C3D61', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
      {text}{required && <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span>}
    </label>
  )
}
const inputBase = { width: '100%', padding: '9px 12px', fontSize: '13px', fontWeight: '600', border: '1.5px solid rgba(143,101,147,0.22)', borderRadius: '8px', outline: 'none', color: '#0f172a', background: 'rgba(255,255,255,0.9)', transition: 'border-color 0.15s, box-shadow 0.15s', fontFamily: 'inherit' }
const focusStyle = (e) => { e.target.style.borderColor = '#4facfe'; e.target.style.boxShadow = '0 0 0 3px rgba(79,172,254,0.15)' }
const blurStyle  = (e) => { e.target.style.borderColor = 'rgba(79,172,254,0.22)'; e.target.style.boxShadow = 'none' }

function Input({ label, required, value, onChange, placeholder, type = 'text', readOnly }) {
  return (
    <div>
      <Label text={label} required={required} />
      <input type={type} value={value} onChange={onChange} placeholder={placeholder || ''} readOnly={readOnly}
        style={{ ...inputBase, background: readOnly ? '#f0f7ff' : 'rgba(255,255,255,0.9)' }}
        onFocus={focusStyle} onBlur={blurStyle} />
    </div>
  )
}
function Select({ label, required, value, onChange, options }) {
  return (
    <div>
      <Label text={label} required={required} />
      <select value={value} onChange={onChange} style={{ ...inputBase, cursor: 'pointer' }} onFocus={focusStyle} onBlur={blurStyle}>
        <option value="">-- Select --</option>
        {options.map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  )
}
function Textarea({ label, value, onChange, rows = 2, placeholder }) {
  return (
    <div>
      <Label text={label} />
      <textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder || ''}
        style={{ ...inputBase, resize: 'vertical' }} onFocus={focusStyle} onBlur={blurStyle} />
    </div>
  )
}
function Checkbox({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
      <div onClick={() => onChange(!checked)} style={{
        width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0, cursor: 'pointer',
        border: checked ? 'none' : '2px solid rgba(79,172,254,0.35)',
        background: checked ? '#8F6593' : 'rgba(255,255,255,0.9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <span style={{ fontSize: '13px', fontWeight: '600', color: '#5C3D61' }}>{label}</span>
    </label>
  )
}

/* ─── Section Card ───────────────────────────────────────────────────────── */
function Section({ title, icon: Icon, color, children }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderRadius: '14px', border: '1px solid #e4d4e6', boxShadow: '0 4px 20px rgba(143,101,147,0.08)', marginBottom: '20px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 20px', background: '#8F6593' }}>
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
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: '16px' }}>{children}</div>
}

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal']
const GST_STATES = ['01-Jammu & Kashmir','02-Himachal Pradesh','03-Punjab','04-Chandigarh','05-Uttarakhand','06-Haryana','07-Delhi','08-Rajasthan','09-Uttar Pradesh','10-Bihar','18-Assam','19-West Bengal','20-Jharkhand','21-Odisha','22-Chhattisgarh','23-Madhya Pradesh','24-Gujarat','27-Maharashtra','29-Karnataka','32-Kerala','33-Tamil Nadu','36-Telangana']
const PAYMENT_TERMS = ['Immediate','7 Days','15 Days','30 Days','45 Days','60 Days','90 Days','Against Advance','Letter of Credit']
const CURRENCIES = ['INR - Indian Rupee','USD - US Dollar','EUR - Euro','GBP - British Pound','AED - UAE Dirham']

/* ─── Contact Row ────────────────────────────────────────────────────────── */
function ContactRow({ contact, onChange, onRemove, index }) {
  const set = (k, v) => onChange({ ...contact, [k]: v })
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 36px', gap: '10px', alignItems: 'end', padding: '12px', background: 'rgba(143,101,147,0.04)', borderRadius: '10px', marginBottom: '8px', border: '1px solid rgba(143,101,147,0.1)' }}>
      <Input label="Contact Name" value={contact.name} onChange={e => set('name', e.target.value)} placeholder="Full name" />
      <Input label="Designation" value={contact.designation} onChange={e => set('designation', e.target.value)} placeholder="Manager / Director" />
      <Input label="Mobile" value={contact.mobile} onChange={e => set('mobile', e.target.value)} placeholder="+91 00000 00000" />
      <Input label="Email" value={contact.email} onChange={e => set('email', e.target.value)} placeholder="email@company.com" />
      <button onClick={onRemove} style={{ width: '36px', height: '36px', border: '1px solid #fee2e2', borderRadius: '8px', background: '#fff', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Trash2 size={14} />
      </button>
    </div>
  )
}

/* ─── Bank Row ───────────────────────────────────────────────────────────── */
function BankRow({ bank, onChange, onRemove }) {
  const set = (k, v) => onChange({ ...bank, [k]: v })
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 36px', gap: '10px', alignItems: 'end', padding: '12px', background: 'rgba(143,101,147,0.04)', borderRadius: '10px', marginBottom: '8px', border: '1px solid rgba(143,101,147,0.1)' }}>
      <Input label="Bank Name" value={bank.bankName} onChange={e => set('bankName', e.target.value)} placeholder="Bank name" />
      <Input label="Account No" value={bank.accountNo} onChange={e => set('accountNo', e.target.value)} placeholder="Account number" />
      <Input label="IFSC Code" value={bank.ifsc} onChange={e => set('ifsc', e.target.value)} placeholder="XXXXXXXXXX" />
      <Input label="Branch" value={bank.branch} onChange={e => set('branch', e.target.value)} placeholder="Branch name" />
      <Select label="Account Type" value={bank.accountType} onChange={e => set('accountType', e.target.value)} options={['Current','Savings','CC','OD']} />
      <button onClick={onRemove} style={{ width: '36px', height: '36px', border: '1px solid #fee2e2', borderRadius: '8px', background: '#fff', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Trash2 size={14} />
      </button>
    </div>
  )
}

/* ─── Add Row Button ─────────────────────────────────────────────────────── */
function AddRowBtn({ label, onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: '700', border: '1.5px dashed rgba(143,101,147,0.4)', borderRadius: '8px', background: 'rgba(143,101,147,0.05)', color: '#8F6593', cursor: 'pointer', marginTop: '4px' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,172,254,0.12)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(79,172,254,0.05)'}
    >
      <Plus size={13} /> {label}
    </button>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function CustomerCreationPage() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [customers, setCustomers] = useState([])
  const [loadingCustomers, setLoadingCustomers] = useState(true)

  const [form, setForm] = useState({
    // Basic
    customerCode: '', customerName: '', printName: '', customerGroup: '',
    customerType: '', territory: '', industry: '', status: 'Active',
    // Address
    address: '', deliveryAddress: '', city: '', state: '', pincode: '', country: 'India',
    // Contact
    phone: '', mobile: '', email: '', website: '', fax: '',
    // Statutory
    gstin: '', gstType: '', gstState: '', panNo: '', cinNo: '',
    msmeNo: '', msmeType: '', tdsApplicable: false, tcsApplicable: false,
    // Financial
    currency: 'INR - Indian Rupee', paymentTerms: '', creditLimit: '',
    creditDays: '', openingBalance: '', openingBalanceType: 'Dr',
    ledgerGroup: '', pricingGroup: '', discount: '',
    // Logistics
    transportMode: '', transporter: '', deliveryTerms: '', leadDays: '',
    // Flags
    taxInvoice: true, einvoice: false, ewaybill: false, active: true,
  })

  const [contacts, setContacts] = useState([{ name: '', designation: '', mobile: '', email: '' }])
  const [banks, setBanks] = useState([{ bankName: '', accountNo: '', ifsc: '', branch: '', accountType: '' }])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const bind = (k) => ({ value: form[k], onChange: e => set(k, e.target.value) })

  const addContact = () => setContacts(c => [...c, { name: '', designation: '', mobile: '', email: '' }])
  const removeContact = (i) => setContacts(c => c.filter((_, idx) => idx !== i))
  const updateContact = (i, v) => setContacts(c => c.map((x, idx) => idx === i ? v : x))

  const addBank = () => setBanks(b => [...b, { bankName: '', accountNo: '', ifsc: '', branch: '', accountType: '' }])
  const removeBank = (i) => setBanks(b => b.filter((_, idx) => idx !== i))
  const updateBank = (i, v) => setBanks(b => b.map((x, idx) => idx === i ? v : x))

  useEffect(() => {
    async function loadCustomers() {
      try {
        setLoadingCustomers(true)
        const result = await getCustomers()
        setCustomers(result || [])
      } catch {
        setCustomers([])
      } finally {
        setLoadingCustomers(false)
      }
    }

    loadCustomers()
  }, [])

  const handleSave = async () => {
    if (!form.customerCode.trim() || !form.customerName.trim()) {
      setSaveSuccess('')
      setSaveError('Customer Code and Customer Name are required.')
      return
    }

    setSaving(true)
    setSaveError('')
    setSaveSuccess('')

    try {
      const result = await createCustomer({
        ...form,
        contacts,
        banks,
      })
      setSaveSuccess(`Customer saved successfully. ID: ${result.customer?.id ?? 'created'}`)
      const customerResult = await getCustomers()
      setCustomers(customerResult || [])
    } catch (error) {
      setSaveError(error.message || 'Unable to save customer.')
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

      <div style={{margin: '0 auto' }}>

        {/* Page Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#8F6593', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(79,172,254,0.35)' }}>
              <Users size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0, background: '#8F6593', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'Sora,sans-serif' }}>
                Customer Creation
              </h1>
              <p style={{ fontSize: '13px', color: '#475569', margin: 0, marginTop: '2px', fontWeight: '600' }}>Master → Customer</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', fontSize: '13px', fontWeight: '700', border: '1.5px solid #c9a8cc', borderRadius: '10px', background: 'rgba(255,255,255,0.9)', color: '#334155', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(219,238,255,0.5)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.9)'}
            ><Home size={14} /> Back</button>
            <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 22px', fontSize: '13px', fontWeight: '700', border: 'none', borderRadius: '10px', background: '#8F6593', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 4px 14px rgba(79,172,254,0.35)' }}>
              <Save size={14} /> {saving ? 'Saving...' : 'Save Customer'}
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

        {/* ── 1. Basic Information ───────────────────────────────────────── */}
        <Section title="Basic Information" icon={Users}>
          <div className="g3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '16px' }}>
            <Input label="Customer Code" required {...bind('customerCode')} placeholder="Auto / Manual code" />
            <Input label="Customer Name" required {...bind('customerName')} placeholder="Full legal name" />
            <Input label="Print Name" {...bind('printName')} placeholder="Short name for prints" />
            <Select label="Customer Group" value={form.customerGroup} onChange={e => set('customerGroup', e.target.value)}
              options={['Retail','Wholesale','OEM','Distributor','Dealer','Export','Government','Others']} />
            <Select label="Customer Type" value={form.customerType} onChange={e => set('customerType', e.target.value)}
              options={['B2B','B2C','B2G','Export']} />
            <Input label="Territory / Region" {...bind('territory')} placeholder="e.g. South India" />
            <Select label="Industry" value={form.industry} onChange={e => set('industry', e.target.value)}
              options={['Automobile','Aerospace','Electronics','FMCG','Pharma','Textile','Construction','Engineering','Others']} />
            <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)}
              options={['Active','Inactive','Blocked','Prospect']} />
            <Input label="Pricing Group" {...bind('pricingGroup')} placeholder="Standard / Premium" />
          </div>
          <div style={{ marginTop: '16px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <Checkbox label="Tax Invoice Applicable" checked={form.taxInvoice} onChange={v => set('taxInvoice', v)} />
            <Checkbox label="E-Invoice Applicable" checked={form.einvoice} onChange={v => set('einvoice', v)} />
            <Checkbox label="E-Waybill Applicable" checked={form.ewaybill} onChange={v => set('ewaybill', v)} />
            <Checkbox label="Active" checked={form.active} onChange={v => set('active', v)} />
          </div>
        </Section>

        {/* ── 2. Address ────────────────────────────────────────────────── */}
        <Section title="Address Details" icon={MapPin}>
          <div className="g3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '16px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <Textarea label="Billing Address" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Door no, Street, Area" rows={2} />
            </div>
            <Textarea label="Delivery Address" value={form.deliveryAddress} onChange={e => set('deliveryAddress', e.target.value)} placeholder="If different from billing" rows={2} />
            <Input label="City" {...bind('city')} placeholder="City" />
            <Select label="State" value={form.state} onChange={e => set('state', e.target.value)} options={STATES} />
            <Input label="Pincode" {...bind('pincode')} placeholder="000000" />
            <Input label="Country" {...bind('country')} placeholder="India" />
          </div>
        </Section>

        {/* ── 3. Contact Information ────────────────────────────────────── */}
        <Section title="Contact Information" icon={Phone}>
          <div className="g3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '16px', marginBottom: '16px' }}>
            <Input label="Phone" {...bind('phone')} placeholder="Office landline" />
            <Input label="Mobile" {...bind('mobile')} placeholder="+91 00000 00000" />
            <Input label="Email" type="email" {...bind('email')} placeholder="info@customer.com" />
            <Input label="Website" {...bind('website')} placeholder="https://www.customer.com" />
            <Input label="Fax" {...bind('fax')} placeholder="Fax number" />
          </div>
          <p style={{ fontSize: '11px', fontWeight: '700', color: '#8F6593', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Contact Persons</p>
          {contacts.map((c, i) => (
            <ContactRow key={i} index={i} contact={c} onChange={v => updateContact(i, v)} onRemove={() => removeContact(i)} />
          ))}
          <AddRowBtn label="Add Contact Person" onClick={addContact} />
        </Section>

        {/* ── 4. Statutory / Tax ───────────────────────────────────────── */}
        <Section title="Statutory & Tax" icon={FileText}>
          <div className="g3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '16px' }}>
            <Select label="GST Registration Type" value={form.gstType} onChange={e => set('gstType', e.target.value)}
              options={['Regular','Composition','Unregistered','Consumer','SEZ','Overseas','Deemed Export']} />
            <Input label="GSTIN" {...bind('gstin')} placeholder="00XXXXX0000X0XX" />
            <Select label="GST State" value={form.gstState} onChange={e => set('gstState', e.target.value)} options={GST_STATES} />
            <Input label="PAN No" {...bind('panNo')} placeholder="XXXXXXXXXX" />
            <Input label="CIN No" {...bind('cinNo')} placeholder="L00000XX0000XXX000000" />
            <Input label="MSME No" {...bind('msmeNo')} placeholder="MSME registration no" />
            <Select label="MSME Type" value={form.msmeType} onChange={e => set('msmeType', e.target.value)}
              options={['Micro','Small','Medium','Not Applicable']} />
          </div>
          <div style={{ marginTop: '16px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <Checkbox label="TDS Applicable" checked={form.tdsApplicable} onChange={v => set('tdsApplicable', v)} />
            <Checkbox label="TCS Applicable" checked={form.tcsApplicable} onChange={v => set('tcsApplicable', v)} />
          </div>
        </Section>

        {/* ── 5. Financial / Credit ─────────────────────────────────────── */}
        <Section title="Financial & Credit" icon={CreditCard}>
          <div className="g3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '16px' }}>
            <Select label="Currency" value={form.currency} onChange={e => set('currency', e.target.value)} options={CURRENCIES} />
            <Select label="Payment Terms" value={form.paymentTerms} onChange={e => set('paymentTerms', e.target.value)} options={PAYMENT_TERMS} />
            <Input label="Credit Limit (₹)" {...bind('creditLimit')} placeholder="0.00" type="number" />
            <Input label="Credit Days" {...bind('creditDays')} placeholder="30" type="number" />
            <Input label="Discount %" {...bind('discount')} placeholder="0.00" type="number" />
            <Input label="Ledger Group" {...bind('ledgerGroup')} placeholder="Sundry Debtors" />
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <Input label="Opening Balance (₹)" {...bind('openingBalance')} placeholder="0.00" type="number" />
              </div>
              <div style={{ width: '80px' }}>
                <Select label="Dr / Cr" value={form.openingBalanceType} onChange={e => set('openingBalanceType', e.target.value)} options={['Dr','Cr']} />
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div style={{ marginTop: '20px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#8F6593', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Bank Details</p>
            {banks.map((b, i) => (
              <BankRow key={i} bank={b} onChange={v => updateBank(i, v)} onRemove={() => removeBank(i)} />
            ))}
            <AddRowBtn label="Add Bank Account" onClick={addBank} />
          </div>
        </Section>

        {/* ── 6. Logistics ──────────────────────────────────────────────── */}
        <Section title="Logistics & Delivery" icon={MapPin}>
          <div className="g3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '16px' }}>
            <Select label="Transport Mode" value={form.transportMode} onChange={e => set('transportMode', e.target.value)}
              options={['Road','Rail','Air','Sea','Courier','Hand Delivery']} />
            <Input label="Transporter Name" {...bind('transporter')} placeholder="Transporter / Logistics co." />
            <Select label="Delivery Terms" value={form.deliveryTerms} onChange={e => set('deliveryTerms', e.target.value)}
              options={['Ex-Works','FOB','CIF','Door Delivery','Godown','FOR Destination']} />
            <Input label="Lead Days" {...bind('leadDays')} placeholder="Delivery lead days" type="number" />
          </div>
        </Section>

        <Section title="Customer List" icon={Users}>
          {loadingCustomers ? (
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>
              Loading customer records...
            </div>
          ) : customers.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>
              No customer records found.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #eaddec' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8f1f8' }}>
                    {['Code', 'Name', 'Group', 'Type', 'City', 'Mobile', 'Email', 'GSTIN', 'Status'].map((label) => (
                      <th key={label} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '800', color: '#6b4b70', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #eaddec', whiteSpace: 'nowrap' }}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} style={{ borderTop: '1px solid #f3e8f4' }}>
                      <td style={{ padding: '10px 12px', color: '#334155', fontWeight: '700' }}>{customer.customer_code || '-'}</td>
                      <td style={{ padding: '10px 12px', color: '#334155' }}>{customer.customer_name || '-'}</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{customer.customer_group || '-'}</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{customer.customer_type || '-'}</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{customer.city || '-'}</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{customer.mobile || customer.phone || '-'}</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{customer.email || '-'}</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{customer.gstin || '-'}</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{customer.status || 'Active'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingBottom: '32px' }}>
          <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', fontSize: '13px', fontWeight: '700', border: '1.5px solid #c9a8cc', borderRadius: '10px', background: 'rgba(255,255,255,0.9)', color: '#334155', cursor: 'pointer' }}>
            <Home size={14} /> Back
          </button>
          <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 26px', fontSize: '13px', fontWeight: '700', border: 'none', borderRadius: '10px', background: '#8F6593', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 4px 14px rgba(79,172,254,0.35)' }}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save Customer'}
          </button>
        </div>

      </div>
    </>
  )
}
