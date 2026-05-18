import { useEffect, useState } from 'react'
import { PageContainer, StatusBadge } from '../../components/ui/index'
import DataTable from '../../components/tables/DataTable'
import { getSaleInvoices, getTaxInvoices } from '../../lib/api'
import { MOCK_INVOICES } from '../../data/mockData'
import { Printer } from 'lucide-react'

const COLUMNS = [
  { key: 'invoiceNumber', label: 'Invoice No.', width: 130 },
  { key: 'invoiceDate', label: 'Date', width: 110 },
  { key: 'customer', label: 'Customer / Supplier' },
  { key: 'itemCount', label: 'Items', width: 90 },
  { key: 'totalQty', label: 'Qty', width: 100, render: (v) => Number(v || 0).toLocaleString('en-IN') },
  { key: 'totalAmount', label: 'Total Amount', width: 140, render: (v) => `Rs.${Number(v).toLocaleString()}` },
  { key: 'pdfStatus', label: 'PDF', width: 120, render: (v) => <StatusBadge status={v} /> },
  { key: 'status', label: 'Status', width: 110, render: (v) => <StatusBadge status={v} /> },
]

function InvoiceListPage({ type, basePath }) {
  const dbBacked = type === 'Tax Invoice' || type === 'Sale Invoice'
  const [data, setData] = useState(dbBacked ? [] : MOCK_INVOICES)
  const [loading, setLoading] = useState(dbBacked)
  const [error, setError] = useState('')

  const rowActions = type === 'Tax Invoice' || type === 'Sale Invoice'
    ? [
        {
          key: 'print',
          label: `Print ${type}`,
          icon: Printer,
          to: (row) => `${basePath}/${row.id}/print`,
          target: '_blank',
          className: 'p-1.5 rounded-md hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors',
        },
      ]
    : []

  useEffect(() => {
    if (!dbBacked) return

    async function loadInvoices() {
      try {
        setLoading(true)
        setError('')
        const result = type === 'Tax Invoice' ? await getTaxInvoices() : await getSaleInvoices()
        setData(
          result.map((row) => ({
            id: row.id,
            invoiceNumber: row.invoice_no,
            invoiceDate: row.invoice_date,
            customer: row.customer_name || '-',
            itemCount: row.item_count ?? 0,
            totalQty: row.total_qty ?? 0,
            totalAmount: row.total_amount ?? 0,
            pdfStatus: row.pdf_file_name ? 'Saved' : 'Pending',
            status: row.status || 'Draft',
          }))
        )
      } catch (loadError) {
        setError(loadError.message || `Unable to load ${type.toLowerCase()} records.`)
      } finally {
        setLoading(false)
      }
    }

    loadInvoices()
  }, [dbBacked, type])

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
      />
    </PageContainer>
  )
}

export function TaxInvoicePage() {
  return <InvoiceListPage type="Tax Invoice" basePath="/invoice/tax" />
}

export function LabourInvoicePage() {
  return <InvoiceListPage type="Labour Invoice" basePath="/invoice/labour" />
}

export function SaleInvoicePage() {
  return <InvoiceListPage type="Sale Invoice" basePath="/invoice/sale" />
}
