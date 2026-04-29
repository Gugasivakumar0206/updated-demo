import { useEffect, useState } from 'react'
import { PageContainer, StatusBadge } from '../../components/ui/index'
import DataTable from '../../components/tables/DataTable'
import { getItems } from '../../lib/api'

const COLUMNS = [
  { key: 'id', label: 'MFG ID', width: 100 },
  { key: 'itemCode', label: 'Item Code', width: 120 },
  { key: 'itemName', label: 'Item Name' },
  { key: 'itemGroup', label: 'Item Group', width: 140 },
  { key: 'uom', label: 'UOM', width: 100 },
  { key: 'hsnCode', label: 'HSN Code', width: 120 },
  { key: 'status', label: 'Status', width: 100, render: (v) => <StatusBadge status={v} /> },
]

export default function ManufacturingPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadPurchaseItems() {
      try {
        setLoading(true)
        setError('')
        const result = await getItems()
        setData(
          result.map((item) => ({
            id: item.id,
            itemCode: item.item_code,
            itemName: item.item_name,
            itemGroup: item.item_group || '-',
            uom: item.uom || '-',
            hsnCode: item.hsn_code || '-',
            status: item.status || 'Active',
          }))
        )
      } catch (loadError) {
        setError(loadError.message || 'Unable to load purchase items.')
      } finally {
        setLoading(false)
      }
    }

    loadPurchaseItems()
  }, [])

  return (
    <PageContainer title="Purchase" subtitle="View purchase item master records from the database">
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', fontWeight: '700' }}>
          {error}
        </div>
      )}
      {loading && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#eef2ff', color: '#4338ca', fontSize: '13px', fontWeight: '700' }}>
          Loading purchase items...
        </div>
      )}
      <DataTable
        columns={COLUMNS}
        data={data}
        addPath="/inventory/manufacturing/new"
        addLabel="Add Purchase Item"
        rowPath="/inventory/manufacturing"
      />
    </PageContainer>
  )
}
