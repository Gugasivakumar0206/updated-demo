import { useEffect, useState } from 'react'
import { PageContainer, StatusBadge } from '../../components/ui/index'
import DataTable from '../../components/tables/DataTable'
import { MOCK_DC } from '../../data/mockData'
import { getSalesDCs } from '../../lib/api'
import { Printer } from 'lucide-react'

const COLUMNS = [
  { key: 'dcNumber', label: 'DC Number', width: 130 },
  { key: 'dcDate', label: 'DC Date', width: 110 },
  { key: 'customer', label: 'Customer / Supplier' },
  { key: 'hsnCodes', label: 'HSN Code', width: 150 },
  { key: 'referenceNumber', label: 'Reference No.', width: 140 },
  { key: 'amount', label: 'Amount', width: 120, render: v => `₹${Number(v).toLocaleString()}` },
  { key: 'status', label: 'Status', width: 110, render: v => <StatusBadge status={v} /> },
]

export default function DCListPage({ type, basePath }) {
  const [data, setData] = useState(MOCK_DC)
  const [loading, setLoading] = useState(type === 'Sales DC')
  const [error, setError] = useState('')
  const rowActions = type === 'Sales DC'
    ? [
        {
          key: 'print',
          label: 'Print Sales DC',
          icon: Printer,
          to: (row) => `${basePath}/${row.id}/print`,
          target: '_blank',
          className: 'p-1.5 rounded-md hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors',
        },
      ]
    : type === 'Labour DC'
      ? [
          {
            key: 'print',
            label: 'Print Labour DC',
            icon: Printer,
            to: (row) => `${basePath}/${row.id}/print`,
            target: '_blank',
            className: 'p-1.5 rounded-md hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors',
          },
        ]
      : []

  useEffect(() => {
    if (type !== 'Sales DC') return

    async function loadSalesDC() {
      try {
        setLoading(true)
        setError('')
        const result = await getSalesDCs()
        setData(
          result.map((row) => ({
            id: row.id,
            dcNumber: row.dc_no,
            dcDate: row.dc_date,
            customer: row.customer_name || '-',
            hsnCodes: row.hsn_codes || '-',
            referenceNumber: row.reference_no || '-',
            amount: row.total_amount ?? 0,
            status: row.status || 'Open',
          }))
        )
      } catch (loadError) {
        setError(loadError.message || 'Unable to load Sales DC records.')
      } finally {
        setLoading(false)
      }
    }

    loadSalesDC()
  }, [type])

  return (
    <PageContainer title={type} subtitle={`Manage ${type} records`}>
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', fontWeight: '700' }}>
          {error}
        </div>
      )}
      {loading && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#eef2ff', color: '#4338ca', fontSize: '13px', fontWeight: '700' }}>
          Loading {type} records...
        </div>
      )}
      <DataTable
        columns={COLUMNS}
        data={data}
        addPath={`${basePath}/new`}
        addLabel={`New ${type}`}
        rowPath={basePath}
        rowActions={rowActions}
        onDelete={(row) => { if (confirm(`Delete ${row.dcNumber}?`)) setData(d => d.filter(r => r.id !== row.id)) }}
      />
    </PageContainer>
  )
}
