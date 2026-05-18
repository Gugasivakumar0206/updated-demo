import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'

import { PageContainer, StatusBadge } from '../../components/ui/index'
import DataTable from '../../components/tables/DataTable'
import { MOCK_DC } from '../../data/mockData'
import { deleteSalesDC, getSalesDCs } from '../../lib/api'

const COLUMNS = [
  { key: 'dcNumber', label: 'DC Number', width: 130 },
  { key: 'dcDate', label: 'DC Date', width: 110 },
  { key: 'customer', label: 'Customer / Supplier' },
  { key: 'poNumber', label: 'PO Number', width: 130 },
  { key: 'linkedInvoices', label: 'Linked Invoices', width: 130 },
  { key: 'hsnCodes', label: 'HSN Code', width: 150 },
  { key: 'quantity', label: 'Qty', width: 100, render: (value) => Number(value || 0).toLocaleString('en-IN') },
  { key: 'referenceNumber', label: 'Reference No.', width: 140 },
  { key: 'completionStatus', label: 'DC Completion', width: 140, render: (value) => <StatusBadge status={value} /> },
  { key: 'amount', label: 'Amount', width: 120, render: (value) => `Rs.${Number(value || 0).toLocaleString('en-IN')}` },
  { key: 'status', label: 'Status', width: 110, render: (value) => <StatusBadge status={value} /> },
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
            poNumber: row.po_number || '-',
            linkedInvoices: Array.isArray(row.linked_invoice_ids) ? row.linked_invoice_ids.length : 0,
            hsnCodes: row.hsn_codes || '-',
            quantity: row.total_qty ?? 0,
            referenceNumber: row.reference_no || '-',
            completionStatus: row.status === 'Completed' ? 'Completed' : 'Pending',
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
  }, [type, basePath])

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
        onDelete={async (row) => {
          if (!confirm(`Delete ${row.dcNumber}?`)) return
          try {
            await deleteSalesDC(row.id)
            setData((current) => current.filter((record) => record.id !== row.id))
          } catch (deleteError) {
            setError(deleteError.message || 'Unable to delete Sales DC.')
          }
        }}
      />
    </PageContainer>
  )
}
