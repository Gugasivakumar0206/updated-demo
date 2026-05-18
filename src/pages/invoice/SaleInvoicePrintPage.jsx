import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import logo from '../../assets/ar-precision-logo.svg'
import { getCompanyInfo, getSaleInvoiceById } from '../../lib/api'

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB')
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function SaleInvoicePrintPage() {
  const { id } = useParams()
  const [record, setRecord] = useState(null)
  const [companyInfo, setCompanyInfo] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadRecord() {
      try {
        setLoading(true)
        setError('')
        const [invoiceResult, companyResult] = await Promise.all([
          getSaleInvoiceById(id),
          getCompanyInfo(),
        ])
        setRecord(invoiceResult)
        setCompanyInfo(companyResult?.company || null)
      } catch (loadError) {
        setError(loadError.message || 'Unable to load sale invoice print preview.')
      } finally {
        setLoading(false)
      }
    }

    loadRecord()
  }, [id])

  const billedAddress = useMemo(() => {
    if (!record) return '-'
    return record.invoice_address || [record.address, record.city, record.state, record.pincode].filter(Boolean).join(', ')
  }, [record])

  const companyDisplayAddress = useMemo(() => {
    if (!companyInfo) return '-'
    return [companyInfo.address, companyInfo.city, companyInfo.state, companyInfo.pincode].filter(Boolean).join(', ')
  }, [companyInfo])

  if (loading) return <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>Loading sale invoice print preview...</div>
  if (error) return <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', color: '#b91c1c' }}>{error}</div>
  if (!record) return null

  const taxableAmount = Number(record.amount || 0)
  const taxAmount = Number(record.gst_amount || 0)
  const netAmount = Number(record.total_amount || taxableAmount + taxAmount)
  const invoiceItems = record.items?.length ? record.items : [record]

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        body { margin: 0; background: #f3f4f6; font-family: Arial, sans-serif; }
        @media print {
          body { background: white; }
          .print-toolbar { display: none !important; }
          .print-shell { margin: 0 !important; box-shadow: none !important; }
        }
      `}</style>

      <div className="print-toolbar" style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '16px' }}>
        <button onClick={() => window.print()} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#0f766e', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
          Print PDF
        </button>
      </div>

      <div className="print-shell" style={{ width: '840px', margin: '0 auto 24px', background: 'white', boxShadow: '0 12px 40px rgba(15,23,42,0.15)', border: '1px solid #d1d5db' }}>
        <div style={{ padding: '18px 22px' }}>
          <div style={{ textAlign: 'right', fontSize: '14px', marginBottom: '8px' }}>ORIGINAL COPY</div>
          <div style={{ border: '1px solid #4b5563' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr', gap: '14px', alignItems: 'center', padding: '14px', borderBottom: '1px solid #4b5563' }}>
              <div style={{ width: '76px', height: '76px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={companyInfo?.company_logo || logo} alt={companyInfo?.print_name || companyInfo?.company_name || 'Zyger ERP Demo'} style={{ width: '68px', height: '68px', objectFit: 'contain' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800 }}>{companyInfo?.print_name || companyInfo?.company_name || 'Zyger ERP Demo'}</div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>{companyDisplayAddress}</div>
                <div style={{ fontSize: '13px', marginTop: '6px', fontWeight: 700 }}>
                  PAN No: {companyInfo?.pan_it_no || '-'} , GSTIN: {companyInfo?.gstin || '-'}
                </div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>
                  Email id: {companyInfo?.email || '-'} &nbsp;&nbsp; Phone No: {companyInfo?.mobile_no || '-'}
                </div>
              </div>
            </div>

            <div style={{ background: '#bde7f3', borderBottom: '1px solid #4b5563', textAlign: 'center', fontSize: '20px', fontWeight: 800, padding: '6px 0' }}>
              SALE INVOICE
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ borderRight: '1px solid #4b5563', borderBottom: '1px solid #4b5563', padding: '10px 12px' }}>
                <div><strong>Invoice No</strong> : <span style={{ color: '#dc2626', fontWeight: 800 }}>{record.invoice_no}</span></div>
                <div style={{ marginTop: '6px' }}><strong>Invoice Date</strong> : {formatDate(record.invoice_date)}</div>
                <div style={{ marginTop: '6px' }}><strong>DC No</strong> : {record.dc_no || '-'}</div>
                <div style={{ marginTop: '6px' }}><strong>Vendor Code</strong> : {record.customer_code || '-'}</div>
              </div>
              <div style={{ borderBottom: '1px solid #4b5563', padding: '10px 12px' }}>
                <div><strong>Transportation Mode</strong> : {record.transport_mode || 'By Road'}</div>
                <div style={{ marginTop: '6px' }}><strong>Place Of Supply</strong> : {record.state || '-'}</div>
                <div style={{ marginTop: '6px' }}><strong>Payment Terms</strong> : {record.payment_terms || '-'}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '180px' }}>
              <div style={{ borderRight: '1px solid #4b5563', borderBottom: '1px solid #4b5563', padding: '10px 12px' }}>
                <div style={{ fontWeight: 800, marginBottom: '10px' }}>Billed To</div>
                <div><strong>Name</strong> : {record.customer_name || '-'}</div>
                <div style={{ marginTop: '8px' }}><strong>Address</strong> : {billedAddress}</div>
                <div style={{ marginTop: '8px' }}><strong>State</strong> : {record.state || '-'}</div>
                <div style={{ marginTop: '8px' }}><strong>GSTIN</strong> : {record.gstin || '-'}</div>
                <div style={{ marginTop: '8px' }}><strong>E-Mail</strong> : {record.email || '-'}</div>
                <div style={{ marginTop: '8px' }}><strong>Contact</strong> : {record.mobile || record.phone || '-'}</div>
              </div>
              <div style={{ borderBottom: '1px solid #4b5563', padding: '10px 12px' }}>
                <div style={{ fontWeight: 800, marginBottom: '10px' }}>Shipped To</div>
                <div><strong>Name</strong> : {record.customer_name || '-'}</div>
                <div style={{ marginTop: '8px' }}><strong>Address</strong> : {billedAddress}</div>
                <div style={{ marginTop: '8px' }}><strong>State</strong> : {record.state || '-'}</div>
                <div style={{ marginTop: '8px' }}><strong>GSTIN</strong> : {record.gstin || '-'}</div>
                <div style={{ marginTop: '8px' }}><strong>E-Mail</strong> : {record.email || '-'}</div>
                <div style={{ marginTop: '8px' }}><strong>Contact</strong> : {record.mobile || record.phone || '-'}</div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#bde7f3' }}>
                  {['S.No', 'PART NO', 'ITEM DESCRIPTION', 'QTY', 'UOM', 'HSN/SAC', 'RATE (Rs)', 'AMOUNT (Rs)'].map((label) => (
                    <th key={label} style={{ border: '1px solid #4b5563', padding: '8px 6px', fontSize: '13px', fontWeight: 800 }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoiceItems.map((item, index) => (
                  <tr key={item.id || index}>
                    <td style={{ border: '1px solid #4b5563', padding: '8px 6px', textAlign: 'center' }}>{index + 1}</td>
                    <td style={{ border: '1px solid #4b5563', padding: '8px 6px' }}>{item.item_code || '-'}</td>
                    <td style={{ border: '1px solid #4b5563', padding: '8px 6px' }}>{item.item_name || '-'}</td>
                    <td style={{ border: '1px solid #4b5563', padding: '8px 6px', textAlign: 'right' }}>{formatMoney(item.qty || 0)}</td>
                    <td style={{ border: '1px solid #4b5563', padding: '8px 6px', textAlign: 'center' }}>{item.uom || 'NOS'}</td>
                    <td style={{ border: '1px solid #4b5563', padding: '8px 6px', textAlign: 'center' }}>{item.hsn_code || '-'}</td>
                    <td style={{ border: '1px solid #4b5563', padding: '8px 6px', textAlign: 'right' }}>{formatMoney(item.rate || 0)}</td>
                    <td style={{ border: '1px solid #4b5563', padding: '8px 6px', textAlign: 'right' }}>{formatMoney(item.amount || 0)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan="3" style={{ border: '1px solid #4b5563', padding: '8px 6px', textAlign: 'right', fontWeight: 800 }}>Qty</td>
                  <td style={{ border: '1px solid #4b5563', padding: '8px 6px', textAlign: 'right', fontWeight: 800 }}>{formatMoney(invoiceItems.reduce((sum, item) => sum + Number(item.qty || 0), 0))}</td>
                  <td colSpan="3" style={{ border: '1px solid #4b5563', padding: '8px 6px', textAlign: 'right', fontWeight: 800 }}>Amount(Rs)</td>
                  <td style={{ border: '1px solid #4b5563', padding: '8px 6px', textAlign: 'right', fontWeight: 800 }}>{formatMoney(record.amount || 0)}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', borderBottom: '1px solid #4b5563' }}>
              <div style={{ padding: '10px 12px', borderRight: '1px solid #4b5563' }}>
                <div><strong>Packing details</strong> : -</div>
                <div style={{ marginTop: '8px' }}><strong>LR No</strong> : -</div>
                <div style={{ marginTop: '8px' }}><strong>Amount in Words</strong> : Rupees {formatMoney(netAmount)} Only</div>
                <div style={{ marginTop: '8px' }}><strong>Tax Value in Words</strong> : Rupees {formatMoney(taxAmount)} Only</div>
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div><strong>IGST {record.tax_percent || 0}%</strong></div>
                <div style={{ marginTop: '8px', textAlign: 'right' }}>{formatMoney(taxAmount)}</div>
                <div style={{ marginTop: '18px', fontWeight: 800 }}><strong>Net Total(Rs)</strong></div>
                <div style={{ marginTop: '8px', textAlign: 'right', fontWeight: 800 }}>{formatMoney(netAmount)}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '160px' }}>
              <div style={{ borderRight: '1px solid #4b5563', padding: '10px 12px' }}>
                <div><strong>Bank:</strong> -</div>
                <div style={{ marginTop: '6px' }}><strong>Branch:</strong> -</div>
                <div style={{ marginTop: '6px' }}><strong>A/c No:</strong> -</div>
                <div style={{ marginTop: '6px' }}><strong>IFSC:</strong> -</div>
                <div style={{ marginTop: '6px' }}><strong>A/c Type:</strong> Current Account</div>
                <div style={{ marginTop: '50px', textAlign: 'center', fontWeight: 700 }}>Receiver&apos;s Signature</div>
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontWeight: 800 }}>Our Terms & Condition of Sale</div>
                <div style={{ marginTop: '8px', fontSize: '13px', lineHeight: 1.7 }}>
                  <div>1) Goods once sold will not be taken back or exchanged.</div>
                  <div>2) Our responsibility ceases once the goods leave our premises.</div>
                  <div>3) Interest may be payable if invoice is not paid within due days.</div>
                  <div>4) Payments are to be made by cheque/draft in favour of {companyInfo?.print_name || companyInfo?.company_name || 'Zyger ERP Demo'}.</div>
                </div>
                <div style={{ marginTop: '40px', textAlign: 'center', fontWeight: 700 }}>Authorised Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
