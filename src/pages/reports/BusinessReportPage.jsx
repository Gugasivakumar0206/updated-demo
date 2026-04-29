import { useEffect, useMemo, useState } from 'react'
import { Boxes, Download, FileSpreadsheet, IndianRupee, Package, Printer } from 'lucide-react'

import { PageContainer } from '../../components/ui/index'
import { getBusinessReport, getBusinessReportCsvUrl } from '../../lib/api'

const REPORT_META = {
  purchase: {
    title: 'Purchase Report',
    subtitle: 'Purchase inward summary, suppliers, customer tags, and line values',
    columns: [
      ['inward_no', 'Inward No'],
      ['inward_date', 'Date'],
      ['supplier_name', 'Supplier'],
      ['customer_name', 'Customer'],
      ['item_code', 'Item Code'],
      ['item_name', 'Item Name'],
      ['qty', 'Qty'],
      ['rate', 'Rate'],
      ['amount', 'Amount'],
      ['status', 'Status'],
    ],
  },
  manufacturing: {
    title: 'Manufacturing Report',
    subtitle: 'Manufacturing-ready item stock and status summary',
    columns: [
      ['item_code', 'Item Code'],
      ['item_name', 'Item Name'],
      ['item_group', 'Group'],
      ['uom', 'UOM'],
      ['current_stock', 'Stock Qty'],
      ['sales_rate', 'Sales Rate'],
      ['status', 'Status'],
    ],
  },
  sales: {
    title: 'Sales Report',
    subtitle: 'Sales DC based customer dispatch and value report',
    columns: [
      ['dc_no', 'DC No'],
      ['dc_date', 'Date'],
      ['customer_name', 'Customer'],
      ['item_code', 'Item Code'],
      ['item_name', 'Item Name'],
      ['uom', 'UOM'],
      ['qty', 'Qty'],
      ['rate', 'Rate'],
      ['amount', 'Amount'],
      ['status', 'Status'],
    ],
  },
  'dc-summary': {
    title: 'DC Summary Report',
    subtitle: 'Delivery challan quantity, pending, and returned summary',
    columns: [
      ['dc_no', 'DC No'],
      ['dc_date', 'Date'],
      ['customer_name', 'Customer'],
      ['item_code', 'Item Code'],
      ['item_name', 'Item Name'],
      ['qty', 'Qty'],
      ['returned_qty', 'Returned Qty'],
      ['pending_qty', 'Pending Qty'],
      ['status', 'Status'],
    ],
  },
  invoice: {
    title: 'Invoice Report',
    subtitle: 'Tax and sale invoice totals, GST values, and customer invoice status',
    columns: [
      ['invoice_type', 'Invoice Type'],
      ['invoice_no', 'Invoice No'],
      ['invoice_date', 'Date'],
      ['customer_name', 'Customer'],
      ['subtotal', 'Subtotal'],
      ['gst_amount', 'GST'],
      ['total_amount', 'Total'],
      ['status', 'Status'],
    ],
  },
  rejection: {
    title: 'Rejection Analysis',
    subtitle: 'Returned and pending quantities tracked from sales DC lines',
    columns: [
      ['dc_no', 'DC No'],
      ['dc_date', 'Date'],
      ['customer_name', 'Customer'],
      ['item_code', 'Item Code'],
      ['item_name', 'Item Name'],
      ['qty', 'Qty'],
      ['returned_qty', 'Returned Qty'],
      ['pending_qty', 'Pending Qty'],
    ],
  },
  'supplier-performance': {
    title: 'Supplier Performance',
    subtitle: 'Supplier inward count, received quantity, and purchase values',
    columns: [
      ['supplier_code', 'Supplier Code'],
      ['supplier_name', 'Supplier Name'],
      ['inward_count', 'Inward Count'],
      ['total_qty', 'Total Qty'],
      ['total_amount', 'Total Amount'],
    ],
  },
  'customer-supplied': {
    title: 'Customer Supplied Report',
    subtitle: 'Customer supplied item lines from sales DC entries',
    columns: [
      ['dc_no', 'DC No'],
      ['dc_date', 'Date'],
      ['customer_code', 'Customer Code'],
      ['customer_name', 'Customer'],
      ['item_code', 'Item Code'],
      ['item_name', 'Item Name'],
      ['uom', 'UOM'],
      ['qty', 'Qty'],
      ['rate', 'Rate'],
      ['amount', 'Amount'],
      ['status', 'Status'],
    ],
  },
}

function formatValue(key, value) {
  if (value == null || value === '') return '-'
  if (typeof value === 'number' && (key.includes('amount') || key.includes('rate') || key.includes('value') || key.includes('subtotal') || key.includes('gst'))) {
    return Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (typeof value === 'number') {
    return Number(value).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }
  return String(value)
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export default function BusinessReportPage({ reportKey }) {
  const meta = REPORT_META[reportKey]
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true)
        setError('')
        const result = await getBusinessReport(reportKey)
        setRows(result.rows || [])
        setSummary(result.summary || {})
      } catch (err) {
        setError(err.message || `Failed to load ${meta.title}`)
      } finally {
        setLoading(false)
      }
    }

    loadReport()
  }, [reportKey, meta.title])

  const summaryEntries = useMemo(() => Object.entries(summary || {}), [summary])

  function downloadExcel() {
    const tableRows = rows.map((row) => `
      <tr>
        ${meta.columns.map(([key]) => `<td>${escapeHtml(formatValue(key, row[key]))}</td>`).join('')}
      </tr>
    `).join('')

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
            th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; }
            th { background: #f3f4f6; text-align: left; }
            h1 { font-family: Arial, sans-serif; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(meta.title)}</h1>
          <table>
            <thead>
              <tr>${meta.columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join('')}</tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${reportKey}-report.xls`
    link.click()
    URL.revokeObjectURL(url)
  }

  function downloadPdf() {
    const tableRows = rows.map((row) => `
      <tr>
        ${meta.columns.map(([key]) => `<td>${escapeHtml(formatValue(key, row[key]))}</td>`).join('')}
      </tr>
    `).join('')

    const printWindow = window.open('', '_blank', 'width=1200,height=900')
    if (!printWindow) {
      alert('Popup blocked. Please allow popups and try again.')
      return
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${escapeHtml(meta.title)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
            h1 { margin-bottom: 8px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; }
            th { background: #f8fafc; text-align: left; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(meta.title)}</h1>
          <table>
            <thead>
              <tr>${meta.columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join('')}</tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 400)
  }

  return (
    <PageContainer
      title={meta.title}
      subtitle={meta.subtitle}
      actions={(
        <>
          <button type="button" className="btn-secondary" onClick={downloadExcel}>
            <FileSpreadsheet size={15} />
            Download Sheet
          </button>
          <button type="button" className="btn-secondary" onClick={downloadPdf}>
            <Printer size={15} />
            Download PDF
          </button>
          <a href={getBusinessReportCsvUrl(reportKey)} className="btn-secondary" target="_blank" rel="noreferrer">
            <Download size={15} />
            Download CSV
          </a>
        </>
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {summaryEntries.slice(0, 3).map(([key, value], index) => {
          const icons = [Package, Boxes, IndianRupee]
          const Icon = icons[index] || Package
          return (
            <div className="card" key={key}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                  <Icon size={18} className="text-primary-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{key.replaceAll('_', ' ')}</p>
                  <p className="text-2xl font-bold text-slate-800">{formatValue(key, value)}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-10 text-center text-slate-500 font-medium">Loading report...</div>
        ) : error ? (
          <div className="py-10 text-center text-red-500 font-medium">{error}</div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-slate-500 font-medium">No records found for this report.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {meta.columns.map(([, label]) => (
                    <th key={label} className="px-4 py-3 text-left font-semibold text-slate-600">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={row.id ?? rowIndex} className="border-t border-slate-100">
                    {meta.columns.map(([key]) => (
                      <td key={`${row.id ?? rowIndex}-${key}`} className="px-4 py-3 text-slate-700">
                        {formatValue(key, row[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
