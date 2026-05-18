import { useEffect, useState } from 'react'
import { PageContainer, StatusBadge } from '../../components/ui/index'
import DataTable from '../../components/tables/DataTable'
import { getPurchaseReturns } from '../../lib/api'

const COLUMNS = [
  { key: 'returnNo', label: 'Return No', width: 150 },
  { key: 'returnDate', label: 'Return Date', width: 120 },
  { key: 'supplier', label: 'Supplier' },
  { key: 'referenceNo', label: 'Reference No', width: 140 },
  { key: 'inwardNo', label: 'PO Inward No', width: 150 },
  { key: 'itemCount', label: 'Items', width: 90 },
  { key: 'totalQty', label: 'Total Qty', width: 110, render: (value) => Number(value || 0).toLocaleString('en-IN') },
  { key: 'totalAmount', label: 'Total Amount', width: 130, render: (value) => `Rs.${Number(value || 0).toLocaleString('en-IN')}` },
  { key: 'approvalStatus', label: 'Approval', width: 120, render: (value) => <StatusBadge status={value} /> },
  { key: 'status', label: 'Status', width: 110, render: (value) => <StatusBadge status={value} /> },
]

export default function PurchaseReturnPage({
  returnType = 'PO_DC_RETURN',
  title = 'PO DC Return',
  subtitle = 'Manage material returns and stock outward entries',
  addLabel = 'Create New',
  basePath = '/inventory/return/po-dc',
}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadReturns() {
      try {
        setLoading(true)
        setError('')
        const result = await getPurchaseReturns(returnType)
        setData((result || []).map((row) => ({
          id: row.id,
          returnNo: row.return_no,
          returnDate: row.return_date,
          supplier: row.supplier_name || '-',
          referenceNo: row.reference_no || '-',
          inwardNo: row.inward_no || '-',
          itemCount: row.item_count || 0,
          totalQty: row.total_qty || 0,
          totalAmount: row.total_amount || 0,
          approvalStatus: row.approval_status || 'Pending',
          status: row.status || 'Posted',
        })))
      } catch (loadError) {
        setError(loadError.message || `Unable to load ${title.toLowerCase()} records.`)
      } finally {
        setLoading(false)
      }
    }

    loadReturns()
  }, [returnType, title])

  return (
    <PageContainer title={title} subtitle={subtitle}>
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', fontWeight: '700' }}>
          {error}
        </div>
      )}
      {loading && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#eef2ff', color: '#4338ca', fontSize: '13px', fontWeight: '700' }}>
          Loading {title.toLowerCase()} records...
        </div>
      )}
      <DataTable
        columns={COLUMNS}
        data={data}
        addPath={`${basePath}/new`}
        addLabel={addLabel}
        rowPath={basePath}
      />
    </PageContainer>
  )
}
