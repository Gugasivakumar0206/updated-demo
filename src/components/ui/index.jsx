import { useState } from 'react'
import { ChevronDown, Upload, Image, X, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import clsx from 'clsx'
import { useLocation, useNavigate } from 'react-router-dom'

export function FormInput({ label, required, className, ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="form-label">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <input className="form-input" {...props} />
    </div>
  )
}

export function NumberInput({ label, required, className, ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="form-label">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <input type="number" className="form-input" {...props} />
    </div>
  )
}

export function SelectDropdown({ label, required, options = [], className, placeholder = 'Select...', ...props }) {
  return (
    <div className={clsx('relative', className)}>
      {label && (
        <label className="form-label">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <div className="relative">
        <select className="form-select pr-8" {...props}>
          <option value="">{placeholder}</option>
          {options.map(opt => (
            typeof opt === 'string'
              ? <option key={opt} value={opt}>{opt}</option>
              : <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  )
}

export function Textarea({ label, required, rows = 3, className, ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="form-label">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <textarea rows={rows} className="form-textarea" {...props} />
    </div>
  )
}

export function Checkbox({ label, checked, onChange, className }) {
  return (
    <label className={clsx('flex items-center gap-2 cursor-pointer select-none', className)}>
      <div style={{
        width: '17px', height: '17px', borderRadius: '5px', flexShrink: 0,
        border: checked ? 'none' : '2px solid #8ecdf8',
        background: checked ? '#0176d3' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      }} onClick={() => onChange(!checked)}>
        {checked && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span style={{ fontSize: '13px', color: '#3d2b40', fontWeight: '600' }}>{label}</span>
    </label>
  )
}

export function DatePicker({ label, required, className, ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="form-label">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <input type="date" className="form-input" {...props} />
    </div>
  )
}

export function FileUploader({ label, className, accept }) {
  const [fileName, setFileName] = useState(null)

  return (
    <div className={className}>
      {label && <label className="form-label">{label}</label>}
      <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors">
        <Upload size={15} className="text-slate-400" />
        <span className="text-sm text-slate-500">{fileName || 'Click to upload file'}</span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => setFileName(e.target.files[0]?.name || null)}
        />
      </label>
    </div>
  )
}

export function ImageUploader({ label, className }) {
  const [preview, setPreview] = useState(null)

  const handleChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => setPreview(ev.target.result)
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className={className}>
      {label && <label className="form-label">{label}</label>}
      {preview ? (
        <div className="relative inline-block">
          <img src={preview} alt="Preview" className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
          <button
            onClick={() => setPreview(null)}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <X size={10} />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors">
          <Image size={20} className="text-slate-300 mb-1" />
          <span className="text-xs text-slate-400">Upload</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleChange} />
        </label>
      )}
    </div>
  )
}

export function ActionButtons({ onSave, onCancel, onDelete, saveLabel = 'Save', loading }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button className="btn-primary" onClick={onSave} disabled={loading}>
        {loading ? (
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : null}
        {saveLabel}
      </button>
      {onCancel && (
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
      )}
      {onDelete && (
        <button className="btn-danger ml-auto" onClick={onDelete}>Delete</button>
      )}
    </div>
  )
}

export function SectionCard({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="section-card mb-4">
      <div className="section-header" onClick={() => setOpen(v => !v)}>
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} style={{ color: '#bfdbfe' }} />}
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff', margin: 0, fontFamily: 'Sora, sans-serif' }}>{title}</h3>
        </div>
        <ChevronDown size={15} style={{ color: '#bfdbfe', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </div>
      {open && <div className="section-body">{children}</div>}
    </div>
  )
}

export function PageContainer({ title, subtitle, actions, children, showBackButton }) {
  const location = useLocation()
  const navigate = useNavigate()
  const autoShowBack = showBackButton ?? (location.pathname.includes('/new') || /\/\d+$/.test(location.pathname))

  return (
    <div>
      <div className="flex items-start justify-between mb-5 gap-4">
        <div>
          {autoShowBack && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary mb-3"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={14} />
              Back
            </button>
          )}
          <h1 className="page-title">{title}</h1>
          {subtitle && <p style={{ fontSize: '13px', color: '#0176d3', marginTop: '3px', fontWeight: '500' }}>{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

export function FormGrid({ children, cols = 3 }) {
  return (
    <div className={clsx(
      'grid gap-4',
      cols === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      cols === 2 && 'grid-cols-1 md:grid-cols-2',
      cols === 1 && 'grid-cols-1',
    )}>
      {children}
    </div>
  )
}

export function StatusBadge({ status }) {
  const map = {
    Active: 'badge-green',
    Inactive: 'badge-gray',
    Pending: 'badge-yellow',
    Approved: 'badge-green',
    Rejected: 'badge-red',
    Draft: 'badge-gray',
    Completed: 'badge-blue',
  }
  return <span className={clsx('badge', map[status] || 'badge-gray')}>{status}</span>
}
