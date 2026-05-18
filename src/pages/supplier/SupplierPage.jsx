import { useEffect, useMemo, useState } from 'react'
import { PageContainer, StatusBadge } from '../../components/ui/index'
import DataTable from '../../components/tables/DataTable'
import { deleteSupplier, getSuppliers } from '../../lib/api'

const COLUMNS = [
  { key: 'id', label: 'ID', width: 90 },
  { key: 'code', label: 'Supplier Code', width: 130 },
  { key: 'name', label: 'Supplier Name', width: 220 },
  { key: 'partyGroup', label: 'Group', width: 140 },
  { key: 'supplierType', label: 'Type', width: 130 },
  { key: 'location', label: 'City / State', width: 180 },
  { key: 'mobile', label: 'Mobile', width: 130 },
  { key: 'email', label: 'Email', width: 220 },
  { key: 'gstin', label: 'GSTIN', width: 180 },
  { key: 'paymentTerms', label: 'Payment Terms', width: 140 },
  { key: 'status', label: 'Status', width: 110, render: (v) => <StatusBadge status={v} /> },
]

export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadSuppliers() {
      try {
        setLoading(true)
        setError('')
        const supplierResult = await getSuppliers()
        setSuppliers(supplierResult)
      } catch (loadError) {
        setError(loadError.message || 'Unable to load supplier records.')
      } finally {
        setLoading(false)
      }
    }

    loadSuppliers()
  }, [])

  const data = useMemo(
    () =>
      suppliers.map((row) => ({
        id: row.id,
        code: row.supplier_code,
        name: row.supplier_name,
        partyGroup: row.supplier_group || '-',
        supplierType: row.supplier_type || '-',
        location: [row.city, row.state].filter(Boolean).join(', ') || '-',
        mobile: row.mobile || row.phone || '-',
        email: row.email || '-',
        gstin: row.gstin || '-',
        paymentTerms: row.payment_terms || '-',
        status: row.status || 'Active',
      })),
    [suppliers]
  )

  async function handleDelete(row) {
    if (!confirm(`Delete ${row.name}?`)) return
    await deleteSupplier(row.id)
    setSuppliers((current) => current.filter((supplier) => supplier.id !== row.id))
  }

  return (
    <PageContainer title="Supplier" subtitle="Existing supplier list with create option">
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', fontWeight: '700' }}>
          {error}
        </div>
      )}
      {loading && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#eef2ff', color: '#4338ca', fontSize: '13px', fontWeight: '700' }}>
          Loading supplier records...
        </div>
      )}
      <DataTable
        columns={COLUMNS}
        data={data}
        addPath="/master/supplier"
        addLabel="Create Supplier"
        rowPath="/master/supplier"
        onDelete={handleDelete}
      />
    </PageContainer>
  )
}
