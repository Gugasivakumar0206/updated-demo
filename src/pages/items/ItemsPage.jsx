import { useEffect, useState } from 'react'
import { PageContainer, StatusBadge } from '../../components/ui/index'
import DataTable from '../../components/tables/DataTable'
import { deleteItem, getItems } from '../../lib/api'

const COLUMNS = [
  { key: 'itemCode', label: 'Item Code', width: 120 },
  { key: 'itemName', label: 'Item Name' },
  { key: 'itemGroup', label: 'Item Group', width: 140 },
  { key: 'stockUOM', label: 'UOM', width: 80 },
  { key: 'location', label: 'Location', width: 100 },
  { key: 'purchaseRate', label: 'Purchase Rate', width: 120, render: v => `₹${v}` },
  { key: 'sellingRate', label: 'Selling Rate', width: 120, render: v => `₹${v}` },
  { key: 'status', label: 'Status', width: 100, render: v => <StatusBadge status={v} /> },
]

export default function ItemsPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadItems() {
      try {
        setLoading(true)
        setError('')
        const result = await getItems()
        setData(
          result.map(item => ({
            id: item.id,
            itemCode: item.item_code,
            itemName: item.item_name,
            printName: item.print_name,
            itemGroup: item.item_group,
            stockUOM: item.uom,
            location: item.rack || item.bin || '-',
            purchaseRate: item.purchase_rate ?? 0,
            sellingRate: item.sales_rate ?? 0,
            status: item.status || 'Active',
          }))
        )
      } catch (loadError) {
        setError(loadError.message || 'Unable to load items.')
      } finally {
        setLoading(false)
      }
    }

    loadItems()
  }, [])

  return (
    <PageContainer title="Items" subtitle="Manage item master records">
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', fontWeight: '700' }}>
          {error}
        </div>
      )}
      {loading && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#eef2ff', color: '#4338ca', fontSize: '13px', fontWeight: '700' }}>
          Loading items...
        </div>
      )}
      <DataTable
        columns={COLUMNS}
        data={data}
        addPath="/inventory/items/new"
        addLabel="Add Item"
        rowPath="/inventory/items"
        onDelete={async (row) => {
          if (!confirm(`Delete ${row.itemName}?`)) return
          try {
            await deleteItem(row.id)
            setData((current) => current.filter((record) => record.id !== row.id))
          } catch (deleteError) {
            setError(deleteError.message || 'Unable to delete item.')
          }
        }}
      />
    </PageContainer>
  )
}
