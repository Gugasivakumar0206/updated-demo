import { useEffect, useState } from 'react'
import { PageContainer, StatusBadge } from '../../components/ui/index'
import DataTable from '../../components/tables/DataTable'
import { deleteItem, getItems } from '../../lib/api'

const COLUMNS = [
  { key: 'id', label: 'ID', width: 100 },
  { key: 'itemCode', label: 'Item Code', width: 130 },
  { key: 'itemName', label: 'Item Name' },
  { key: 'itemGroup', label: 'Item Group', width: 150 },
  { key: 'uom', label: 'UOM', width: 100 },
  { key: 'hsnCode', label: 'HSN Code', width: 120 },
  { key: 'purchaseRate', label: 'Purchase Rate', width: 120, render: (v) => `Rs.${v}` },
  { key: 'sellingRate', label: 'Selling Rate', width: 120, render: (v) => `Rs.${v}` },
  { key: 'status', label: 'Status', width: 100, render: (v) => <StatusBadge status={v} /> },
]

export default function ItemTypePage({
  itemType,
  title,
  subtitle,
  addPath,
  addLabel,
  rowPath,
}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadItems() {
      try {
        setLoading(true)
        setError('')
        const result = await getItems(itemType)
        setData(
          result.map((item) => ({
            id: item.id,
            itemCode: item.item_code,
            itemName: item.item_name,
            itemGroup: item.item_group || '-',
            uom: item.uom || '-',
            hsnCode: item.hsn_code || '-',
            purchaseRate: item.purchase_rate ?? 0,
            sellingRate: item.sales_rate ?? 0,
            status: item.status || 'Active',
          }))
        )
      } catch (loadError) {
        setError(loadError.message || `Unable to load ${title.toLowerCase()} records.`)
      } finally {
        setLoading(false)
      }
    }

    loadItems()
  }, [itemType, title])

  return (
    <PageContainer title={title} subtitle={subtitle}>
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', fontWeight: '700' }}>
          {error}
        </div>
      )}
      {loading && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#eef2ff', color: '#4338ca', fontSize: '13px', fontWeight: '700' }}>
          Loading {title.toLowerCase()}...
        </div>
      )}
      <DataTable
        columns={COLUMNS}
        data={data}
        addPath={addPath}
        addLabel={addLabel}
        rowPath={rowPath}
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
