import { useEffect, useMemo, useState } from 'react'
import { PageContainer, StatusBadge } from '../../components/ui/index'
import DataTable from '../../components/tables/DataTable'
import { getCustomers, getSuppliers } from '../../lib/api'

const TYPE_COLUMN = {
  key: 'type',
  label: 'Type',
  width: 110,
  render: (v) => (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 10px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: '600',
      background: v === 'Customer' ? '#eff6ff' : '#f0fdf4',
      color: v === 'Customer' ? '#2563eb' : '#16a34a',
    }}>
      {v}
    </span>
  ),
}

const STATUS_COLUMN = {
  key: 'status',
  label: 'Status',
  width: 110,
  render: (v) => <StatusBadge status={v} />,
}

const CUSTOMER_COLUMNS = [
  { key: 'id', label: 'ID', width: 90 },
  { key: 'code', label: 'Customer Code', width: 130 },
  { key: 'name', label: 'Customer Name', width: 220 },
  { key: 'partyGroup', label: 'Group', width: 140 },
  { key: 'customerType', label: 'Type', width: 130 },
  { key: 'location', label: 'City / State', width: 180 },
  { key: 'mobile', label: 'Mobile', width: 130 },
  { key: 'email', label: 'Email', width: 220 },
  { key: 'gstin', label: 'GSTIN', width: 180 },
  { key: 'paymentTerms', label: 'Payment Terms', width: 140 },
  STATUS_COLUMN,
]

const SUPPLIER_COLUMNS = [
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
  STATUS_COLUMN,
]

const COMBINED_COLUMNS = [
  { key: 'id', label: 'ID', width: 90 },
  { key: 'code', label: 'Code', width: 130 },
  { key: 'name', label: 'Name', width: 220 },
  TYPE_COLUMN,
  { key: 'partyGroup', label: 'Group', width: 140 },
  { key: 'location', label: 'City / State', width: 180 },
  { key: 'mobile', label: 'Mobile', width: 130 },
  { key: 'email', label: 'Email', width: 220 },
  { key: 'gstin', label: 'GSTIN', width: 180 },
  STATUS_COLUMN,
]

const PAGE_CONFIG = {
  customer: {
    title: 'View Customer',
    subtitle: 'View all customer details correctly from the database',
    addPath: '/master/customer',
    addLabel: 'Create Customer',
    columns: CUSTOMER_COLUMNS,
  },
  supplier: {
    title: 'View Supplier',
    subtitle: 'View all supplier details correctly from the database',
    addPath: '/master/supplier',
    addLabel: 'Create Supplier',
    columns: SUPPLIER_COLUMNS,
  },
  customerSupplied: {
    title: 'Customer Supplied',
    subtitle: 'View customer and supplier details under inventory',
    columns: COMBINED_COLUMNS,
  },
}

export default function CustomerPage({ mode = 'customerSupplied' }) {
  const [customers, setCustomers] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadParties() {
      try {
        setLoading(true)
        setError('')
        const [customerResult, supplierResult] = await Promise.all([getCustomers(), getSuppliers()])
        setCustomers(customerResult)
        setSuppliers(supplierResult)
      } catch (loadError) {
        setError(loadError.message || 'Unable to load customer and supplier records.')
      } finally {
        setLoading(false)
      }
    }

    loadParties()
  }, [])

  const customerRows = useMemo(
    () => customers.map((row) => ({
      id: row.id,
      code: row.customer_code,
      name: row.customer_name,
      type: 'Customer',
      partyGroup: row.customer_group || '-',
      customerType: row.customer_type || '-',
      location: [row.city, row.state].filter(Boolean).join(', ') || '-',
      mobile: row.mobile || row.phone || '-',
      email: row.email || '-',
      gstin: row.gstin || '-',
      paymentTerms: row.payment_terms || '-',
      status: row.status || 'Active',
    })),
    [customers]
  )

  const supplierRows = useMemo(
    () => suppliers.map((row) => ({
      id: row.id,
      code: row.supplier_code,
      name: row.supplier_name,
      type: 'Supplier',
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

  const data = useMemo(() => {
    if (mode === 'customer') return customerRows
    if (mode === 'supplier') return supplierRows
    return [...customerRows, ...supplierRows]
  }, [customerRows, supplierRows, mode])

  const config = PAGE_CONFIG[mode] || PAGE_CONFIG.customerSupplied

  return (
    <PageContainer title={config.title} subtitle={config.subtitle}>
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', fontWeight: '700' }}>
          {error}
        </div>
      )}
      {loading && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#eef2ff', color: '#4338ca', fontSize: '13px', fontWeight: '700' }}>
          Loading records...
        </div>
      )}
      <DataTable
        columns={config.columns}
        data={data}
        addPath={config.addPath}
        addLabel={config.addLabel}
      />
    </PageContainer>
  )
}
