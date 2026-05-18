import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import logo from '../../assets/ar-precision-logo.svg'
import { getSalesDCById } from '../../lib/api'

const COMPANY = {
  name: 'AR Precision',
  address: '96/4, Muneshwara Nagar, Kammasandra Road, Hebbagodi, Post, Hebbagodi, Bengaluru, Karnataka 560100',
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB')
}

export default function SalesDCPrintPage() {
  const { id } = useParams()
  const [record, setRecord] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadRecord() {
      try {
        setLoading(true)
        setError('')
        const result = await getSalesDCById(id)
        setRecord(result)
      } catch (loadError) {
        setError(loadError.message || 'Unable to load Sales DC print preview.')
      } finally {
        setLoading(false)
      }
    }

    loadRecord()
  }, [id])

  const customerAddress = useMemo(() => {
    if (!record?.customer) return '-'
    return [
      record.customer.address,
      record.customer.delivery_address,
      record.customer.city,
      record.customer.state,
      record.customer.pincode,
    ].filter(Boolean).join(', ')
  }, [record])

  if (loading) {
    return <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>Loading Sales DC print preview...</div>
  }

  if (error) {
    return <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', color: '#b91c1c' }}>{error}</div>
  }

  if (!record) return null

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 12mm; }
        body { margin: 0; background: #f3f4f6; font-family: Arial, sans-serif; }
        @media print {
          body { background: white; }
          .print-toolbar { display: none !important; }
          .print-shell { margin: 0 !important; box-shadow: none !important; }
        }
      `}</style>

      <div className="print-toolbar" style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '16px' }}>
        <button onClick={() => window.print()} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#0b6fb7', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
          Print PDF
        </button>
      </div>

      <div className="print-shell" style={{ width: '820px', margin: '0 auto 24px', background: 'white', boxShadow: '0 12px 40px rgba(15,23,42,0.15)', border: '1px solid #d1d5db' }}>
        <div style={{ padding: '18px 22px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr', gap: '14px', alignItems: 'center', borderBottom: '2px solid #94d2e8', paddingBottom: '12px' }}>
            <div style={{ width: '76px', height: '76px', border: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={logo} alt="AR Precision" style={{ width: '62px', height: '62px', objectFit: 'contain' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '0.02em' }}>{COMPANY.name}</div>
              <div style={{ marginTop: '6px', fontSize: '14px', lineHeight: 1.5 }}>{COMPANY.address}</div>
            </div>
          </div>

          <div style={{ background: '#bde7f3', borderTop: '1px solid #4b5563', borderBottom: '1px solid #4b5563', textAlign: 'center', fontSize: '26px', fontWeight: 800, padding: '8px 0', marginTop: '10px' }}>
            SALES DC
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.95fr', borderLeft: '1px solid #4b5563', borderRight: '1px solid #4b5563', borderBottom: '1px solid #4b5563' }}>
            <div style={{ padding: '10px 12px', borderRight: '1px solid #4b5563' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>To</div>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>{record.customer.customer_name}</div>
              <div style={{ marginTop: '8px', fontSize: '14px', lineHeight: 1.5 }}>{customerAddress || '-'}</div>
              <div style={{ marginTop: '10px', fontSize: '14px' }}><strong>Vendor Code:</strong> {record.customer.customer_code || '-'}</div>
              <div style={{ marginTop: '6px', fontSize: '14px' }}><strong>GSTIN:</strong> {record.customer.gstin || '-'}</div>
              <div style={{ marginTop: '6px', fontSize: '14px' }}><strong>Contact:</strong> {record.customer.mobile || record.customer.phone || '-'}</div>
              <div style={{ marginTop: '6px', fontSize: '14px' }}><strong>Email:</strong> {record.customer.email || '-'}</div>
            </div>
            <div style={{ padding: '0' }}>
              {[
                ['DC No.', record.dc_no],
                ['DC Date', formatDate(record.dc_date)],
                ['Ref No', record.reference_no || '-'],
                ['Mode Of Transport', record.mode_of_transport || '-'],
                ['Vehicle No', record.vehicle_no || '-'],
                ['Status', record.status || '-'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #4b5563' }}>
                  <div style={{ padding: '10px 12px', fontSize: '14px', fontWeight: 700, borderRight: '1px solid #4b5563' }}>{label}</div>
                  <div style={{ padding: '10px 12px', fontSize: '14px', fontWeight: 700, color: label === 'DC No.' || label === 'DC Date' ? '#dc2626' : '#111827' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0' }}>
            <thead>
              <tr style={{ background: '#bde7f3' }}>
                {['S.No', 'Particulars', 'HSN/SAC', 'Qty', 'UOM', 'Rate', 'Amount'].map((label) => (
                  <th key={label} style={{ border: '1px solid #4b5563', padding: '8px 6px', fontSize: '14px', fontWeight: 800, textAlign: 'center' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {record.items.map((item, index) => (
                <tr key={item.id || index}>
                  <td style={{ border: '1px solid #4b5563', padding: '8px 6px', fontSize: '13px', textAlign: 'center', verticalAlign: 'top' }}>{index + 1}</td>
                  <td style={{ border: '1px solid #4b5563', padding: '8px 8px', fontSize: '13px', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 700 }}>{item.item_code}</div>
                    <div style={{ marginTop: '4px' }}>{item.item_name}</div>
                  </td>
                  <td style={{ border: '1px solid #4b5563', padding: '8px 6px', fontSize: '13px', textAlign: 'center', verticalAlign: 'top' }}>{item.hsn_code || '-'}</td>
                  <td style={{ border: '1px solid #4b5563', padding: '8px 6px', fontSize: '13px', textAlign: 'right', verticalAlign: 'top' }}>{Number(item.qty || 0).toFixed(2)}</td>
                  <td style={{ border: '1px solid #4b5563', padding: '8px 6px', fontSize: '13px', textAlign: 'center', verticalAlign: 'top' }}>{item.uom || '-'}</td>
                  <td style={{ border: '1px solid #4b5563', padding: '8px 6px', fontSize: '13px', textAlign: 'right', verticalAlign: 'top' }}>{Number(item.sales_rate || 0).toFixed(2)}</td>
                  <td style={{ border: '1px solid #4b5563', padding: '8px 6px', fontSize: '13px', textAlign: 'right', verticalAlign: 'top' }}>{Number(item.amount || 0).toFixed(2)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan="3" style={{ border: '1px solid #4b5563', padding: '8px 10px', fontSize: '14px', fontWeight: 800, textAlign: 'right' }}>Total</td>
                <td style={{ border: '1px solid #4b5563', padding: '8px 6px', fontSize: '14px', fontWeight: 800, textAlign: 'right' }}>{Number(record.summary.total_qty || 0).toFixed(2)}</td>
                <td style={{ border: '1px solid #4b5563' }} />
                <td style={{ border: '1px solid #4b5563' }} />
                <td style={{ border: '1px solid #4b5563', padding: '8px 6px', fontSize: '14px', fontWeight: 800, textAlign: 'right' }}>{Number(record.summary.total_amount || 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ border: '1px solid #4b5563', borderTop: 'none', padding: '12px 14px', minHeight: '100px' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '8px' }}>Terms and Conditions:</div>
            <div style={{ fontSize: '13px', lineHeight: 1.6 }}>{record.remarks || 'Material delivered as per Sales DC reference.'}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderLeft: '1px solid #4b5563', borderRight: '1px solid #4b5563', borderBottom: '1px solid #4b5563' }}>
            <div style={{ padding: '12px', minHeight: '130px', borderRight: '1px solid #4b5563', fontSize: '13px', lineHeight: 1.6 }}>
              <div><strong>Our GSTIN:</strong> {record.customer.gstin || '-'}</div>
              <div><strong>Our PAN:</strong> -</div>
              <div><strong>Party GSTIN:</strong> {record.customer.gstin || '-'}</div>
              <div><strong>Party Name:</strong> {record.customer.customer_name || '-'}</div>
            </div>
            <div style={{ padding: '12px', minHeight: '130px', borderRight: '1px solid #4b5563', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '14px', fontWeight: 800 }}>Received Items in Good Condition</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700 }}>Receiver&apos;s Signature</div>
                <div style={{ marginTop: '12px', fontSize: '12px' }}>This is Computer Generated DC</div>
              </div>
            </div>
            <div style={{ padding: '12px', minHeight: '130px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '14px', fontWeight: 800 }}>For {COMPANY.name}</div>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>Authorised Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
