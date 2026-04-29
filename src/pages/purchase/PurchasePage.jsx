import { useEffect, useState } from 'react'
import { PageContainer, StatusBadge } from '../../components/ui/index'
import DataTable from '../../components/tables/DataTable'
import { getPurchaseInwards } from '../../lib/api'

const COLUMNS = [
  { key: 'inwardNo', label: 'Inward No', width: 130 },
  { key: 'inwardDate', label: 'Date', width: 120 },
  { key: 'itemCode', label: 'Item Code', width: 120 },
  { key: 'itemName', label: 'Item Name' },
  { key: 'supplier', label: 'Supplier', width: 160 },
  { key: 'customer', label: 'Customer', width: 160 },
  { key: 'qty', label: 'Qty', width: 100 },
  { key: 'purchaseRate', label: 'Rate', width: 120, render: (v) => `Rs.${v}` },
  { key: 'amount', label: 'Amount', width: 120, render: (v) => `Rs.${v}` },
  { key: 'status', label: 'Status', width: 100, render: (v) => <StatusBadge status={v} /> },
]

export default function PurchasePage({
  inwardType = 'GRN',
  title = 'Purchase Inward',
  subtitle = 'Manage supplier inward and stock updates',
  addLabel = 'Add Purchase Inward',
  basePath = '/inventory/purchase',
}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadPurchases() {
      try {
        setLoading(true)
        setError('')
        const result = await getPurchaseInwards(inwardType)
        setData(
          result.map((row) => ({
            id: row.id,
            inwardType: row.inward_type || inwardType,
            inwardNo: row.inward_no,
            inwardDate: row.inward_date,
            itemCode: row.item_code,
            itemName: row.item_name,
            supplier: row.supplier_name || '-',
            customer: row.customer_name || '-',
            qty: row.qty ?? 0,
            purchaseRate: row.rate ?? 0,
            amount: row.amount ?? 0,
            status: row.status || 'Posted',
          }))
        )
      } catch (loadError) {
        setError(loadError.message || `Unable to load ${title.toLowerCase()} records.`)
      } finally {
        setLoading(false)
      }
    }

    loadPurchases()
  }, [inwardType, title])

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
