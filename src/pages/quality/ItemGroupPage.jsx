import { useEffect, useState } from 'react'
import { PlusCircle } from 'lucide-react'

import { FormGrid, FormInput, PageContainer, SectionCard, StatusBadge } from '../../components/ui/index'
import DataTable from '../../components/tables/DataTable'
import { createItemGroup, deleteItemGroup, getItemGroups } from '../../lib/api'

const COLUMNS = [
  { key: 'id', label: 'Group ID', width: 120 },
  { key: 'groupName', label: 'Group Name', width: 180 },
  { key: 'description', label: 'Description' },
  { key: 'inspectionRequired', label: 'Inspection Needed', width: 150, render: (value) => <StatusBadge status={value ? 'Required' : 'Not Required'} /> },
  { key: 'isActive', label: 'Status', width: 100, render: (value) => <StatusBadge status={value ? 'Active' : 'Inactive'} /> },
]

export default function ItemGroupPage() {
  const [data, setData] = useState([])
  const [form, setForm] = useState({ groupName: '', description: '', inspectionRequired: false, isActive: true })
  const [error, setError] = useState('')

  async function loadGroups() {
    try {
      setError('')
      const result = await getItemGroups()
      setData((result || []).map((row) => ({
        id: row.id,
        groupName: row.group_name,
        description: row.description || '-',
        inspectionRequired: row.inspection_required,
        isActive: row.is_active,
      })))
    } catch (loadError) {
      setError(loadError.message || 'Unable to load item groups.')
    }
  }

  useEffect(() => {
    loadGroups()
  }, [])

  async function addGroup() {
    if (!form.groupName.trim()) {
      alert('Group name is required.')
      return
    }

    await createItemGroup({ ...form, groupName: form.groupName.trim() })
    setForm({ groupName: '', description: '', inspectionRequired: false, isActive: true })
    await loadGroups()
  }

  async function handleDelete(row) {
    if (!confirm('Delete item group?')) return
    await deleteItemGroup(row.id)
    await loadGroups()
  }

  return (
    <PageContainer title="Item Group" subtitle="Master -> Quality. Define item group and whether inspection is required.">
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', fontWeight: '700' }}>
          {error}
        </div>
      )}
      <SectionCard title="Add Item Group" icon={PlusCircle} defaultOpen>
        <FormGrid cols={3}>
          <FormInput label="Group Name" required value={form.groupName} onChange={(event) => setForm((current) => ({ ...current, groupName: event.target.value }))} />
          <FormInput label="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          <div className="flex items-center gap-5 pt-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={form.inspectionRequired} onChange={(event) => setForm((current) => ({ ...current, inspectionRequired: event.target.checked }))} />
              Inspection Required
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
              Active
            </label>
          </div>
        </FormGrid>

        <button className="btn-primary mt-4" onClick={addGroup}>
          Add Item Group
        </button>
      </SectionCard>

      <DataTable
        columns={COLUMNS}
        data={data}
        onDelete={handleDelete}
      />
    </PageContainer>
  )
}
