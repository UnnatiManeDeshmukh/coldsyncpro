import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, RefreshCw, BarChart2, FileText } from 'lucide-react'
import api from '../utils/api'

const REPORT_TYPES = [
  { id: 'sales',     label: '📦 Sales Report',     desc: 'Orders, revenue, payment status' },
  { id: 'stock',     label: '🏭 Stock Report',      desc: 'Current inventory levels' },
  { id: 'customers', label: '👥 Customer Report',   desc: 'Top customers by spend' },
  { id: 'products',  label: '🥤 Products Report',   desc: 'Best selling products' },
  { id: 'monthly',   label: '📈 Monthly Revenue',   desc: 'Month-wise revenue breakdown' },
  { id: 'low_stock', label: '⚠️ Low Stock Alerts',  desc: 'Products needing reorder' },
]

const today = new Date().toISOString().split('T')[0]
const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

export default function AdminReportBuilder() {
  const [type, setType] = useState('sales')
  const [dateFrom, setDateFrom] = useState(monthAgo)
  const [dateTo, setDateTo] = useState(today)
  const [format, setFormat] = useState('json')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const buildUrl = (fmt) => {
    const params = new URLSearchParams({ report_type: type, format: fmt })
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    return `/api/reports/download/?${params}`
  }

  const runPreview = async () => {
    setLoading(true)
    setError(null)
    setPreview(null)
    try {
      const r = await api.get(buildUrl('json'))
      setPreview(r.data)
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load report')
    } finally { setLoading(false) }
  }

  const downloadFile = async (fmt) => {
    try {
      const r = await api.get(buildUrl(fmt), { responseType: 'blob' })
      const ext = fmt === 'pdf' ? 'pdf' : 'xlsx'
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_report_${dateFrom}_${dateTo}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Download failed') }
  }

  const previewRows = preview?.data || preview?.stocks || preview?.customers ||
    preview?.products || preview?.months || preview?.alerts || []
  const previewKeys = previewRows.length > 0 ? Object.keys(previewRows[0]).slice(0, 6) : []

  return (
    <div className="min-h-screen" style={{ background: '#07091A', fontFamily: "'Inter',sans-serif" }}>
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-white/10" style={{ background: 'rgba(7,9,26,0.97)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/admin-reports')} className="text-white/60 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <span className="text-white font-bold text-sm">🔧 Custom Report Builder</span>
        </div>
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg,#1E6FFF,#7C3AED,#C00000)' }} />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Report Type Selector */}
        <div className="rounded-2xl p-5 border border-white/10 space-y-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-white font-bold text-sm flex items-center gap-2"><BarChart2 size={15} style={{ color: '#74b9ff' }} /> Report Type</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {REPORT_TYPES.map(rt => (
              <button key={rt.id} onClick={() => { setType(rt.id); setPreview(null) }}
                className="text-left p-3 rounded-xl border transition-all"
                style={{
                  background: type === rt.id ? 'rgba(30,111,255,0.15)' : 'rgba(255,255,255,0.03)',
                  borderColor: type === rt.id ? 'rgba(30,111,255,0.5)' : 'rgba(255,255,255,0.1)',
                }}>
                <p className="text-white text-xs font-semibold">{rt.label}</p>
                <p className="text-white/40 text-xs mt-0.5">{rt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl p-5 border border-white/10 space-y-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-white font-bold text-sm">🗓️ Date Range & Filters</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-white/50 text-xs block mb-1">From Date</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-white text-xs border border-white/15 outline-none"
                style={{ background: '#0d1b35' }} />
            </div>
            <div>
              <label className="text-white/50 text-xs block mb-1">To Date</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-white text-xs border border-white/15 outline-none"
                style={{ background: '#0d1b35' }} />
            </div>
            <div>
              <label className="text-white/50 text-xs block mb-1">Quick Range</label>
              <select onChange={e => {
                const days = +e.target.value
                if (!days) return
                const from = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
                setDateFrom(from); setDateTo(today)
              }} className="w-full px-3 py-2 rounded-xl text-white text-xs border border-white/15 outline-none"
                style={{ background: '#0d1b35' }}>
                <option value="">Custom</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 3 months</option>
                <option value="180">Last 6 months</option>
                <option value="365">Last 1 year</option>
              </select>
            </div>
            <div>
              <label className="text-white/50 text-xs block mb-1">Export Format</label>
              <select value={format} onChange={e => setFormat(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-white text-xs border border-white/15 outline-none"
                style={{ background: '#0d1b35' }}>
                <option value="json">Preview (JSON)</option>
                <option value="pdf">PDF</option>
                <option value="excel">Excel (.xlsx)</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <button onClick={runPreview} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#1E6FFF,#7C3AED)' }}>
              {loading ? <RefreshCw size={13} className="animate-spin" /> : <FileText size={13} />}
              {loading ? 'Loading...' : 'Preview Report'}
            </button>
            <button onClick={() => downloadFile('pdf')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all border border-white/15 hover:bg-white/8">
              <Download size={13} /> PDF
            </button>
            <button onClick={() => downloadFile('excel')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all border border-white/15 hover:bg-white/8">
              <Download size={13} /> Excel
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl px-4 py-3 text-xs" style={{ background: 'rgba(192,0,0,0.15)', color: '#ff6b6b' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Preview Table */}
        {preview && (
          <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
              <p className="text-white font-bold text-sm">📊 Preview — {REPORT_TYPES.find(r => r.id === type)?.label}</p>
              <p className="text-white/40 text-xs">{previewRows.length} rows · {dateFrom} → {dateTo}</p>
            </div>

            {/* Summary stats if available */}
            {(preview.total_revenue || preview.total_orders || preview.total_sales) && (
              <div className="flex gap-4 px-5 py-3 border-b border-white/10 flex-wrap">
                {preview.total_revenue && <span className="text-xs text-white/60">Revenue: <span className="text-white font-bold">₹{parseFloat(preview.total_revenue).toLocaleString('en-IN')}</span></span>}
                {preview.total_orders && <span className="text-xs text-white/60">Orders: <span className="text-white font-bold">{preview.total_orders}</span></span>}
                {preview.total_sales && <span className="text-xs text-white/60">Sales: <span className="text-white font-bold">₹{parseFloat(preview.total_sales).toLocaleString('en-IN')}</span></span>}
                {preview.total_products && <span className="text-xs text-white/60">Products: <span className="text-white font-bold">{preview.total_products}</span></span>}
                {preview.total_alerts && <span className="text-xs text-white/60">Alerts: <span className="text-white font-bold">{preview.total_alerts}</span></span>}
              </div>
            )}

            {previewRows.length === 0 ? (
              <p className="text-white/30 text-xs text-center py-10">No data for selected range</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      {previewKeys.map(k => (
                        <th key={k} className="px-4 py-2.5 text-left text-white/50 font-semibold capitalize whitespace-nowrap">
                          {k.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 50).map((row, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-all">
                        {previewKeys.map(k => (
                          <td key={k} className="px-4 py-2.5 text-white/70 whitespace-nowrap">
                            {typeof row[k] === 'number' && k.includes('amount') || k.includes('revenue') || k.includes('spent')
                              ? `₹${parseFloat(row[k]).toLocaleString('en-IN')}`
                              : String(row[k] ?? '—').slice(0, 40)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewRows.length > 50 && (
                  <p className="text-white/30 text-xs text-center py-3">Showing 50 of {previewRows.length} rows — download for full data</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
