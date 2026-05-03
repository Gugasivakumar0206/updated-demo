import { useEffect, useState } from 'react'
import { PageContainer, SectionCard, FormGrid, FormInput, ActionButtons } from '../../components/ui/index'
import { createCompanyUser, getCompanyUsers, getStoredUser } from '../../lib/api'

export default function UserManagementPage() {
  const currentUser = getStoredUser()
  const [users, setUsers] = useState([])
  const [limit, setLimit] = useState(2)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    password: '',
    confirm_password: '',
  })

  const canCreateUsers = Boolean(currentUser?.is_company_head || currentUser?.role === 'admin' || currentUser?.role === 'company_head')
  const remainingSlots = Math.max(limit - users.length, 0)

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function loadUsers() {
    try {
      setLoading(true)
      setError('')
      const result = await getCompanyUsers()
      setUsers(result.users || [])
      setLimit(result.limit || 2)
    } catch (loadError) {
      setError(loadError.message || 'Unable to load company users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function handleSave() {
    if (!canCreateUsers) {
      setSuccess('')
      setError('Only company head can create users.')
      return
    }
    if (remainingSlots <= 0) {
      setSuccess('')
      setError('Company user limit reached.')
      return
    }
    if (!form.full_name || !form.phone_number || !form.email || !form.password || !form.confirm_password) {
      setSuccess('')
      setError('All fields are required.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')
      await createCompanyUser(form)
      setSuccess('User created successfully.')
      setForm({
        full_name: '',
        phone_number: '',
        email: '',
        password: '',
        confirm_password: '',
      })
      await loadUsers()
    } catch (saveError) {
      setSuccess('')
      setError(saveError.message || 'Unable to create user.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContainer title="Users" subtitle="Admin can create only one additional company user">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="card">
          <p className="text-xs text-slate-500">Total Users</p>
          <p className="text-2xl font-bold text-slate-800">{users.length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500">User Limit</p>
          <p className="text-2xl font-bold text-slate-800">{limit}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500">Remaining Slots</p>
          <p className="text-2xl font-bold text-slate-800">{remainingSlots}</p>
        </div>
      </div>

      {loading ? (
        <div className="card mb-4">
          <div className="py-6 text-center text-slate-500 font-medium">Loading user limit...</div>
        </div>
      ) : null}

      <SectionCard title="Create User" defaultOpen>
        {!canCreateUsers && (
          <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fff7ed', color: '#9a3412', fontSize: '13px', fontWeight: '700' }}>
            Only company head can create second user.
          </div>
        )}
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#f8fafc', color: '#475569', fontSize: '13px', fontWeight: '600', lineHeight: '1.7' }}>
          <div>Default admin login is created automatically.</div>
          <div>Users list is hidden in this screen.</div>
          <div>Once total users reach 2, new user creation will be blocked.</div>
        </div>
        <FormGrid>
          <FormInput label="Full Name" required value={form.full_name} onChange={(e) => setField('full_name', e.target.value)} placeholder="Enter full name" />
          <FormInput label="Phone Number" required value={form.phone_number} onChange={(e) => setField('phone_number', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" />
          <FormInput label="Email" required type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="user@company.com" />
          <FormInput label="Password" required type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} placeholder="Minimum 6 characters" />
          <FormInput label="Confirm Password" required type="password" value={form.confirm_password} onChange={(e) => setField('confirm_password', e.target.value)} placeholder="Re-enter password" />
        </FormGrid>
        <div className="mt-4">
          <ActionButtons onSave={handleSave} saveLabel="Create User" loading={saving} />
        </div>
      </SectionCard>
    </PageContainer>
  )
}
