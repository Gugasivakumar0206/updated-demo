import { useEffect, useState } from 'react'
import { Boxes, Download, FileSpreadsheet, IndianRupee, Package, Printer } from 'lucide-react'

import { PageContainer } from '../../components/ui/index'
import { getInventoryReport, getInventoryReportCsvUrl } from '../../lib/api'

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export default function InventoryReportPage() {
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState({
    total_items: 0,
    total_stock_qty: 0,
    total_stock_value: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true)
        setError('')
        const result = await getInventoryReport()
        setRows(result.rows || [])
        setSummary(result.summary || {})
      } catch (err) {
        setError(err.message || 'Failed to load inventory report')
      } finally {
        setLoading(false)
      }
    }

    loadReport()
  }, [])

  function downloadExcel() {
    const tableRows = rows.map((row) => `
      <tr>
        <td>${escapeHtml(row.item_code)}</td>
        <td>${escapeHtml(row.item_name)}</td>
        <td>${escapeHtml(row.item_group || '-')}</td>
        <td>${escapeHtml(row.uom || '-')}</td>
        <td>${formatNumber(row.current_stock)}</td>
        <td>${formatCurrency(row.purchase_rate)}</td>
        <td>${formatCurrency(row.sales_rate)}</td>
        <td>${formatCurrency(row.stock_value)}</td>
        <td>${escapeHtml(row.status || '-')}</td>
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
          <h1>Inventory Report</h1>
          <p>Total Items: ${formatNumber(summary.total_items)} | Total Stock Qty: ${formatNumber(summary.total_stock_qty)} | Total Stock Value: ${formatCurrency(summary.total_stock_value)}</p>
          <table>
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>Group</th>
                <th>UOM</th>
                <th>Stock Qty</th>
                <th>Purchase Rate</th>
                <th>Sales Rate</th>
                <th>Stock Value</th>
                <th>Status</th>
              </tr>
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
    link.download = 'inventory-report.xls'
    link.click()
    URL.revokeObjectURL(url)
  }

  function downloadPdf() {
    const tableRows = rows.map((row) => `
      <tr>
        <td>${escapeHtml(row.item_code)}</td>
        <td>${escapeHtml(row.item_name)}</td>
        <td>${escapeHtml(row.item_group || '-')}</td>
        <td>${escapeHtml(row.uom || '-')}</td>
        <td style="text-align:right">${formatNumber(row.current_stock)}</td>
        <td style="text-align:right">${formatCurrency(row.purchase_rate)}</td>
        <td style="text-align:right">${formatCurrency(row.sales_rate)}</td>
        <td style="text-align:right">${formatCurrency(row.stock_value)}</td>
        <td>${escapeHtml(row.status || '-')}</td>
      </tr>
    `).join('')

    const printWindow = window.open('', '_blank', 'width=1200,height=800')
    if (!printWindow) {
      alert('Popup blocked. Please allow popups and try again.')
      return
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Inventory Report PDF</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
            h1 { margin-bottom: 8px; }
            .meta { margin-bottom: 18px; font-size: 13px; color: #475569; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; }
            th { background: #f8fafc; text-align: left; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>Inventory Report</h1>
          <div class="meta">
            Total Items: ${formatNumber(summary.total_items)} |
            Total Stock Qty: ${formatNumber(summary.total_stock_qty)} |
            Total Stock Value: ${formatCurrency(summary.total_stock_value)}
          </div>
          <table>
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>Group</th>
                <th>UOM</th>
                <th>Stock Qty</th>
                <th>Purchase Rate</th>
                <th>Sales Rate</th>
                <th>Stock Value</th>
                <th>Status</th>
              </tr>
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
      title="Inventory Report"
      subtitle="Current stock levels, purchase values, and item-wise inventory summary"
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
          <a href={getInventoryReportCsvUrl()} className="btn-secondary" target="_blank" rel="noreferrer">
            <Download size={15} />
            Download CSV
          </a>
        </>
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Package size={18} className="text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Items</p>
              <p className="text-2xl font-bold text-slate-800">{formatNumber(summary.total_items)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Boxes size={18} className="text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Stock Qty</p>
              <p className="text-2xl font-bold text-slate-800">{formatNumber(summary.total_stock_qty)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <IndianRupee size={18} className="text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Stock Value</p>
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(summary.total_stock_value)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-10 text-center text-slate-500 font-medium">Loading inventory report...</div>
        ) : error ? (
          <div className="py-10 text-center text-red-500 font-medium">{error}</div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-slate-500 font-medium">No items found for report generation.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Item Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Item Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Group</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">UOM</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Stock Qty</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Purchase Rate</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Sales Rate</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Stock Value</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-700 font-medium">{row.item_code}</td>
                    <td className="px-4 py-3 text-slate-700">{row.item_name}</td>
                    <td className="px-4 py-3 text-slate-500">{row.item_group || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{row.uom || '-'}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatNumber(row.current_stock)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(row.purchase_rate)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(row.sales_rate)}</td>
                    <td className="px-4 py-3 text-right text-slate-700 font-semibold">{formatCurrency(row.stock_value)}</td>
                    <td className="px-4 py-3 text-slate-500">{row.status || '-'}</td>
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
