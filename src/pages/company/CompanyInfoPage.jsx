import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Phone, FileText, Shield, Image,
  RefreshCw, Eye, EyeOff, Upload, X, Home, Save, ChevronDown, ChevronUp
} from 'lucide-react'
import { getCompanyInfo, saveCompanyInfo } from '../../lib/api'

const COMPANY_BRAND_CACHE_KEY = 'erp_company_brand'

/* ── Purple palette ─────────────────────────────────────────────────────── */
const P = {
  primary:    '#0176d3',
  dark:       '#032d60',
  maroon:     '#0b5cab',
  light:      '#eef4ff',
  border:     '#d6e6fb',
  inputBorder:'#bfd8f2',
  label:      '#032d60',
  text:       '#0f172a',
  muted:      '#6ea9db',
  sub:        '#5f6f86',
}

/* ── Label ──────────────────────────────────────────────────────────────── */
function Label({ text, required }) {
  return (
    <label style={{
      display: 'block', fontSize: '11px', fontWeight: '700',
      color: P.label, textTransform: 'uppercase',
      letterSpacing: '0.07em', marginBottom: '5px',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {text}{required && <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span>}
    </label>
  )
}

/* ── Input ──────────────────────────────────────────────────────────────── */
function Input({ label, required, type = 'text', value, onChange, placeholder, readOnly, suffix }) {
  return (
    <div>
      {label && <Label text={label} required={required} />}
      <div style={{ position: 'relative' }}>
        <input
          type={type} value={value} onChange={onChange}
          placeholder={placeholder || ''} readOnly={readOnly}
          style={{
            width: '100%', padding: '9px 12px', fontSize: '13px', fontWeight: '500',
            border: `1.5px solid ${P.inputBorder}`, borderRadius: '8px', outline: 'none',
            background: readOnly ? P.light : '#fff', color: P.text,
            paddingRight: suffix ? '120px' : '12px',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            fontFamily: "'DM Sans', sans-serif",
          }}
          onFocus={e => { if (!readOnly) { e.target.style.borderColor = P.primary; e.target.style.boxShadow = `0 0 0 3px rgba(143,101,147,0.15)` } }}
          onBlur={e => { e.target.style.borderColor = P.inputBorder; e.target.style.boxShadow = 'none' }}
        />
        {suffix}
      </div>
    </div>
  )
}

/* ── Password Input ─────────────────────────────────────────────────────── */
function PasswordInput({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <Label text={label} />
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'} value={value} onChange={onChange}
          placeholder={placeholder || ''}
          style={{
            width: '100%', padding: '9px 40px 9px 12px', fontSize: '13px', fontWeight: '500',
            border: `1.5px solid ${P.inputBorder}`, borderRadius: '8px', outline: 'none',
            color: P.text, transition: 'border-color 0.15s, box-shadow 0.15s',
            fontFamily: "'DM Sans', sans-serif",
          }}
          onFocus={e => { e.target.style.borderColor = P.primary; e.target.style.boxShadow = `0 0 0 3px rgba(143,101,147,0.15)` }}
          onBlur={e => { e.target.style.borderColor = P.inputBorder; e.target.style.boxShadow = 'none' }}
        />
        <button type="button" onClick={() => setShow(v => !v)} style={{
          position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', color: P.muted,
        }}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )
}

/* ── Select ─────────────────────────────────────────────────────────────── */
function Select({ label, required, value, onChange, options }) {
  return (
    <div>
      {label && <Label text={label} required={required} />}
      <div style={{ position: 'relative' }}>
        <select value={value} onChange={onChange} style={{
          width: '100%', padding: '9px 32px 9px 12px', fontSize: '13px', fontWeight: '500',
          border: `1.5px solid ${P.inputBorder}`, borderRadius: '8px', outline: 'none',
          background: '#fff', color: P.text, cursor: 'pointer', appearance: 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          fontFamily: "'DM Sans', sans-serif",
        }}
          onFocus={e => { e.target.style.borderColor = P.primary; e.target.style.boxShadow = `0 0 0 3px rgba(143,101,147,0.15)` }}
          onBlur={e => { e.target.style.borderColor = P.inputBorder; e.target.style.boxShadow = 'none' }}
        >
          <option value="">-- Select --</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: P.muted, pointerEvents: 'none' }} />
      </div>
    </div>
  )
}

/* ── Textarea ────────────────────────────────────────────────────────────── */
function Textarea({ label, value, onChange, rows = 2, placeholder }) {
  return (
    <div>
      {label && <Label text={label} />}
      <textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder || ''} style={{
        width: '100%', padding: '9px 12px', fontSize: '13px', fontWeight: '500',
        border: `1.5px solid ${P.inputBorder}`, borderRadius: '8px', outline: 'none',
        color: P.text, resize: 'vertical', fontFamily: "'DM Sans', sans-serif",
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
        onFocus={e => { e.target.style.borderColor = P.primary; e.target.style.boxShadow = `0 0 0 3px rgba(143,101,147,0.15)` }}
        onBlur={e => { e.target.style.borderColor = P.inputBorder; e.target.style.boxShadow = 'none' }}
      />
    </div>
  )
}

/* ── Section Card ────────────────────────────────────────────────────────── */
function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{
      background: '#fff', borderRadius: '14px',
      boxShadow: '0 2px 12px rgba(143,101,147,0.08)',
      border: `1px solid ${P.border}`, overflow: 'hidden', marginBottom: '20px',
    }}>
      {/* Header */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: P.primary, cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon size={15} color="#fff" />
          </div>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff', fontFamily: "'Sora', sans-serif" }}>
            {title}
          </span>
        </div>
        {open
          ? <ChevronUp size={15} color="rgba(255,255,255,0.8)" />
          : <ChevronDown size={15} color="rgba(255,255,255,0.8)" />
        }
      </div>
      {/* Body */}
      {open && <div style={{ padding: '22px' }}>{children}</div>}
    </div>
  )
}

/* ── Grid ────────────────────────────────────────────────────────────────── */
function Grid({ children, cols = 3 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '16px' }}
      className={`ci-grid-${cols}`}
    >{children}</div>
  )
}

/* ── Subsection divider ─────────────────────────────────────────────────── */
function SubSection({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0 14px' }}>
      <span style={{ fontSize: '11px', fontWeight: '700', color: P.primary, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: '1px', background: P.border }} />
    </div>
  )
}

/* ── Logo Uploader ───────────────────────────────────────────────────────── */
function LogoUploader({ label, value, onChange }) {
  const inputRef = useRef(null)
  return (
    <div style={{
      background: P.light, borderRadius: '12px', border: `1.5px dashed ${P.inputBorder}`,
      padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center',
    }}>
      <Label text={label} />
      <div style={{
        width: '100px', height: '76px', borderRadius: '10px',
        border: `2px solid ${P.border}`, background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        {value
          ? <img src={value} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : <Image size={24} style={{ color: P.muted }} />
        }
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" onClick={() => inputRef.current?.click()} style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '6px 14px', fontSize: '12px', fontWeight: '700',
          border: `1.5px solid ${P.inputBorder}`, borderRadius: '8px',
          background: '#fff', color: P.dark, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = P.light; e.currentTarget.style.borderColor = P.primary }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = P.inputBorder }}
        ><Upload size={12} /> Upload</button>
        {value && (
          <button type="button" onClick={() => onChange('')} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '6px 12px', fontSize: '12px', fontWeight: '700',
            border: '1px solid #fecaca', borderRadius: '8px',
            background: '#fff0f0', color: '#ef4444', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}><X size={12} /> Remove</button>
        )}
      </div>
      <span style={{ fontSize: '10px', color: P.sub }}>PNG, JPG up to 2MB</span>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) { const r = new FileReader(); r.onload = ev => onChange(ev.target.result); r.readAsDataURL(file) }
        }}
      />
    </div>
  )
}

/* ── Regenerate button ───────────────────────────────────────────────────── */
function RegenBtn({ onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
      display: 'flex', alignItems: 'center', gap: '5px',
      padding: '5px 10px', fontSize: '11px', fontWeight: '700',
      border: `1px solid ${P.border}`, borderRadius: '6px',
      background: P.light, color: P.dark, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = P.border }}
      onMouseLeave={e => { e.currentTarget.style.background = P.light }}
    ><RefreshCw size={11} /> Regenerate</button>
  )
}

/* ══ MAIN PAGE ══════════════════════════════════════════════════════════════ */
export default function CompanyInfoPage() {
  const navigate = useNavigate()

  const INITIAL_FORM = {
    companyName: '', printName: '', address: '', deliveryAddress: '',
    city: '', state: '', pincode: '', pinNo: '',
    mobileNo: '', email: '', website: '', contactPerson: '',
    latitude: '', longitude: '', companyDisplayType: '', msmeNo: '', tanNo: '',
    panItNo: '', pfNo: '', esiNo: '', importExportCode: '',
    cin: '', gstin: '', gstState: '', gstinUser: '',
    eInvoiceUser: '', eInvoicePassword: '', ewaybillUser: '', ewaybillPassword: '',
    apiKey: 'sk-mfg-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    accessToken: 'at-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    companyLogo: '', isoLogo: '', bisLogo: '',
  }

  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const bind = (key) => ({ value: form[key], onChange: e => set(key, e.target.value) })

  const regenerateKey = (field) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    const rand = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    set(field, `${field === 'apiKey' ? 'sk-mfg' : 'at'}-${rand(8)}-${rand(4)}-${rand(4)}-${rand(4)}-${rand(12)}`)
  }

  useEffect(() => {
    async function loadCompany() {
      try {
        setLoading(true)
        setSaveError('')
        const result = await getCompanyInfo()
        const company = result?.company
        if (!company) return

        setForm({
          ...INITIAL_FORM,
          companyName: company.company_name || '',
          printName: company.print_name || '',
          address: company.address || '',
          deliveryAddress: company.delivery_address || '',
          city: company.city || '',
          state: company.state || '',
          pincode: company.pincode || '',
          pinNo: company.pin_no || '',
          mobileNo: company.mobile_no || '',
          email: company.email || '',
          website: company.website || '',
          contactPerson: company.contact_person || '',
          latitude: company.latitude || '',
          longitude: company.longitude || '',
          companyDisplayType: company.company_display_type || '',
          msmeNo: company.msme_no || '',
          tanNo: company.tan_no || '',
          panItNo: company.pan_it_no || '',
          pfNo: company.pf_no || '',
          esiNo: company.esi_no || '',
          importExportCode: company.import_export_code || '',
          cin: company.cin || '',
          gstin: company.gstin || '',
          gstState: company.gst_state || '',
          gstinUser: company.gstin_user || '',
          eInvoiceUser: company.einvoice_user || '',
          eInvoicePassword: company.einvoice_password || '',
          ewaybillUser: company.ewaybill_user || '',
          ewaybillPassword: company.ewaybill_password || '',
          apiKey: company.api_key || INITIAL_FORM.apiKey,
          accessToken: company.access_token || INITIAL_FORM.accessToken,
          companyLogo: company.company_logo || '',
          isoLogo: company.iso_logo || '',
          bisLogo: company.bis_logo || '',
        })
      } catch (error) {
        setSaveError(error.message || 'Unable to load company info.')
      } finally {
        setLoading(false)
      }
    }

    loadCompany()
  }, [])

  const handleSave = async () => {
    if (!form.companyName.trim()) {
      setSaveSuccess('')
      setSaveError('Company Name is required.')
      return
    }

    try {
      setSaving(true)
      setSaveError('')
      setSaveSuccess('')

      const result = await saveCompanyInfo(form)
      const company = result?.company

      if (company) {
        setForm(current => ({
          ...current,
          apiKey: company.api_key || current.apiKey,
          accessToken: company.access_token || current.accessToken,
          companyLogo: company.company_logo || current.companyLogo,
          isoLogo: company.iso_logo || current.isoLogo,
          bisLogo: company.bis_logo || current.bisLogo,
        }))

        const nextBrand = {
          logo: company.company_logo || '',
          name: company.print_name || company.company_name || 'AR Precision',
          subtitle: 'Enterprise System',
        }
        localStorage.setItem(COMPANY_BRAND_CACHE_KEY, JSON.stringify(nextBrand))
        window.dispatchEvent(new Event('company-brand-updated'))
      }

      setSaveSuccess(`Company info saved successfully. ID: ${company?.id ?? '-'}`)
    } catch (error) {
      setSaveSuccess('')
      setSaveError(error.message || 'Unable to save company info.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <style>{`
        @media(max-width:1024px){ .ci-grid-3{grid-template-columns:repeat(2,minmax(0,1fr))!important;} }
        @media(max-width:640px) { .ci-grid-3,.ci-grid-2{grid-template-columns:1fr!important;} }
      `}</style>

      <div style={{margin: '0 auto' }}>

        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div style={{
          background: '#fff', borderRadius: '16px', padding: '20px 24px',
          marginBottom: '24px', border: `1px solid ${P.border}`,
          boxShadow: '0 2px 12px rgba(143,101,147,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Icon badge */}
            <div style={{
              width: '48px', height: '48px', borderRadius: '13px',
              background: `linear-gradient(135deg, ${P.primary}, ${P.dark})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 14px rgba(143,101,147,0.38)`, flexShrink: 0,
            }}>
              <Building2 size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{
                fontSize: '20px', fontWeight: '800', color: P.dark,
                margin: 0, fontFamily: "'Sora', sans-serif",
              }}>Company Info</h1>
              <p style={{ fontSize: '13px', color: P.sub, margin: 0, marginTop: '3px', fontWeight: '500' }}>
                Manage your company details, statutory info and security settings
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => navigate('/dashboard')} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 18px', fontSize: '13px', fontWeight: '700',
              border: `1.5px solid ${P.inputBorder}`, borderRadius: '10px',
              background: '#fff', color: P.dark, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = P.light; e.currentTarget.style.borderColor = P.primary }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = P.inputBorder }}
            ><Home size={14} /> Back to Home</button>

            <button onClick={handleSave} disabled={saving} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 22px', fontSize: '13px', fontWeight: '700',
              border: 'none', borderRadius: '10px',
              background: P.primary, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              boxShadow: `0 4px 14px rgba(143,101,147,0.38)`,
              fontFamily: "'DM Sans', sans-serif", transition: 'opacity 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            ><Save size={14} /> {saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>

        {loading && (
          <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#eef4ff', color: '#0b5cab', fontSize: '13px', fontWeight: '700' }}>
            Loading company info...
          </div>
        )}

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

        {/* ══ SECTION 1 — Communication ════════════════════════════════════ */}
        <Section title="Communication" icon={Phone}>
          <Grid cols={3}>
            <Input label="Company Name" required {...bind('companyName')} placeholder="Enter company name" />
            <Input label="Print Name" {...bind('printName')} placeholder="Name as printed on documents" />
            <Select label="Company Display Type"
              value={form.companyDisplayType} onChange={e => set('companyDisplayType', e.target.value)}
              options={['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Proprietorship', 'OPC']}
            />
          </Grid>

          <SubSection label="Address" />
          <Grid cols={3}>
            <div style={{ gridColumn: 'span 2' }}>
              <Textarea label="Registered Address" value={form.address} onChange={e => set('address', e.target.value)} rows={2} placeholder="Enter full registered address" />
            </div>
            <Textarea label="Delivery Address" value={form.deliveryAddress} onChange={e => set('deliveryAddress', e.target.value)} rows={2} placeholder="Enter delivery address" />
          </Grid>

          <div style={{ marginTop: '16px' }}>
            <Grid cols={3}>
              <Input label="City" {...bind('city')} placeholder="City" />
              <Select label="State" value={form.state} onChange={e => set('state', e.target.value)}
                options={['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal']}
              />
              <Input label="Pincode" {...bind('pincode')} placeholder="000000" />
            </Grid>
          </div>

          <SubSection label="Contact Details" />
          <Grid cols={3}>
            <Input label="Mobile No" {...bind('mobileNo')} placeholder="+91 00000 00000" />
            <Input label="Email" type="email" {...bind('email')} placeholder="info@company.com" />
            <Input label="Website" {...bind('website')} placeholder="https://www.company.com" />
            <Input label="Contact Person" {...bind('contactPerson')} placeholder="Contact person name" />
            <Input label="Pin No" {...bind('pinNo')} placeholder="Pin number" />
            <Input label="MSME No" {...bind('msmeNo')} placeholder="MSME registration number" />
            <Input label="TAN No" {...bind('tanNo')} placeholder="XXXXXXXXXX" />
            <Input label="Latitude" {...bind('latitude')} placeholder="12.9716° N" />
            <Input label="Longitude" {...bind('longitude')} placeholder="77.5946° E" />
          </Grid>
        </Section>

        {/* ══ SECTION 2 — Statutory ════════════════════════════════════════ */}
        <Section title="Statutory" icon={FileText}>
          <Grid cols={3}>
            <Input label="PAN / IT No" {...bind('panItNo')} placeholder="XXXXXXXXXX" />
            <Input label="PF No" {...bind('pfNo')} placeholder="PF registration number" />
            <Input label="ESI No" {...bind('esiNo')} placeholder="ESI registration number" />
            <Input label="Import / Export Code" {...bind('importExportCode')} placeholder="IEC number" />
            <Input label="CIN" {...bind('cin')} placeholder="L00000XX0000XXX000000" />
            <Input label="GSTIN" {...bind('gstin')} placeholder="00XXXXX0000X0XX" />
            <Select label="GST State" value={form.gstState} onChange={e => set('gstState', e.target.value)}
              options={['01-Jammu & Kashmir','02-Himachal Pradesh','03-Punjab','04-Chandigarh','05-Uttarakhand','06-Haryana','07-Delhi','08-Rajasthan','09-Uttar Pradesh','10-Bihar','18-Assam','19-West Bengal','21-Odisha','24-Gujarat','27-Maharashtra','29-Karnataka','32-Kerala','33-Tamil Nadu','36-Telangana']}
            />
            <Input label="GSTIN User" {...bind('gstinUser')} placeholder="GST portal username" />
          </Grid>

          <SubSection label="E-Invoice & E-Waybill Credentials" />
          <div style={{ background: P.light, borderRadius: '10px', border: `1px solid ${P.border}`, padding: '16px' }}>
            <Grid cols={3}>
              <Input label="E-Invoice User" {...bind('eInvoiceUser')} placeholder="E-invoice portal username" />
              <PasswordInput label="E-Invoice Password" value={form.eInvoicePassword} onChange={e => set('eInvoicePassword', e.target.value)} placeholder="E-invoice password" />
              <div />
              <Input label="E-Waybill User" {...bind('ewaybillUser')} placeholder="E-waybill portal username" />
              <PasswordInput label="E-Waybill Password" value={form.ewaybillPassword} onChange={e => set('ewaybillPassword', e.target.value)} placeholder="E-waybill password" />
            </Grid>
          </div>
        </Section>

        {/* ══ SECTION 3 — Security ═════════════════════════════════════════ */}
        <Section title="Security" icon={Shield}>
          <Grid cols={3}>
            <div style={{ gridColumn: 'span 2' }}>
              <Input label="API Key" value={form.apiKey} onChange={e => set('apiKey', e.target.value)} readOnly
                suffix={<RegenBtn onClick={() => regenerateKey('apiKey')} />}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <Input label="Access Token" value={form.accessToken} onChange={e => set('accessToken', e.target.value)} readOnly
                suffix={<RegenBtn onClick={() => regenerateKey('accessToken')} />}
              />
            </div>
          </Grid>

          <div style={{
            marginTop: '16px', padding: '12px 16px',
            background: '#fffbeb', border: '1px solid #fde68a',
            borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <Shield size={15} style={{ color: '#d97706', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#92400e', fontWeight: '500' }}>
              Keep your API Key and Access Token confidential. Do not share them with unauthorized parties.
              Regenerating will invalidate the previous token.
            </span>
          </div>
        </Section>

        {/* ══ SECTION 4 — Company Logos ════════════════════════════════════ */}
        <Section title="Company Logos" icon={Image}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '20px' }}>
            <LogoUploader label="Company Logo"  value={form.companyLogo} onChange={v => set('companyLogo', v)} />
            <LogoUploader label="ISO Logo"       value={form.isoLogo}     onChange={v => set('isoLogo', v)} />
            <LogoUploader label="BIS Logo"       value={form.bisLogo}     onChange={v => set('bisLogo', v)} />
          </div>
        </Section>

        {/* ── Bottom action bar ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingBottom: '36px' }}>
          <button onClick={() => navigate('/dashboard')} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 20px', fontSize: '13px', fontWeight: '700',
            border: `1.5px solid ${P.inputBorder}`, borderRadius: '10px',
            background: '#fff', color: P.dark, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = P.light; e.currentTarget.style.borderColor = P.primary }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = P.inputBorder }}
          ><Home size={14} /> Back to Home</button>

          <button onClick={handleSave} disabled={saving} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 26px', fontSize: '13px', fontWeight: '700',
            border: 'none', borderRadius: '10px',
            background: P.primary, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            boxShadow: `0 4px 14px rgba(143,101,147,0.38)`,
            fontFamily: "'DM Sans', sans-serif", transition: 'opacity 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          ><Save size={14} /> {saving ? 'Saving...' : 'Save Company Info'}</button>
        </div>

      </div>
    </>
  )
}
