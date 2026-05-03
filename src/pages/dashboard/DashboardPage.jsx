import { useEffect, useState } from 'react'
import { PageContainer } from '../../components/ui/index'
import {
  Package, ShoppingCart, Factory, Users, Truck,
  TrendingUp, TrendingDown, Activity
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  INVENTORY_TREND, PURCHASE_TREND,
  PRODUCTION_OUTPUT, RECENT_ACTIVITY
} from '../../data/mockData'
import { getDashboardSummary } from '../../lib/api'

const KPI_CARDS = [
  {
    label: 'Total Items',
    key: 'totalItems',
    icon: Package,
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    change: 'DB',
    trend: 'up',
  },
  {
    label: 'Total Purchases',
    key: 'totalPurchases',
    icon: ShoppingCart,
    lightColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    change: 'DB',
    trend: 'up',
  },
  {
    label: 'Manufacturing Orders',
    key: 'totalManufacturingOrders',
    icon: Factory,
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    change: 'DB',
    trend: 'up',
  },
  {
    label: 'Total Customers',
    key: 'totalCustomers',
    icon: Users,
    lightColor: 'bg-amber-50',
    textColor: 'text-amber-600',
    change: 'DB',
    trend: 'up',
  },
  {
    label: 'Total Suppliers',
    key: 'totalSuppliers',
    icon: Truck,
    lightColor: 'bg-rose-50',
    textColor: 'text-rose-600',
    change: 'DB',
    trend: 'up',
  },
]

const activityColors = {
  create: 'bg-emerald-100 text-emerald-700',
  approve: 'bg-blue-100 text-blue-700',
  update: 'bg-amber-100 text-amber-700',
  report: 'bg-red-100 text-red-700',
}

export default function DashboardPage() {
  const [summary, setSummary] = useState({
    totalItems: 0,
    totalPurchases: 0,
    totalManufacturingOrders: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadSummary() {
      try {
        setLoading(true)
        setError('')
        const result = await getDashboardSummary()
        setSummary({
          totalItems: Number(result.total_items || 0),
          totalPurchases: Number(result.total_purchases || 0),
          totalManufacturingOrders: Number(result.total_manufacturing_orders || 0),
          totalCustomers: Number(result.total_customers || 0),
          totalSuppliers: Number(result.total_suppliers || 0),
        })
      } catch (loadError) {
        setError(loadError.message || 'Unable to load dashboard summary.')
      } finally {
        setLoading(false)
      }
    }

    loadSummary()
  }, [])

  return (
    <PageContainer
      title="Dashboard"
      subtitle="Manufacturing ERP Overview"
    >
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', fontWeight: '700' }}>
          {error}
        </div>
      )}
      {loading && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#eef2ff', color: '#4338ca', fontSize: '13px', fontWeight: '700' }}>
          Loading dashboard counts...
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {KPI_CARDS.map((kpi) => (
          <div key={kpi.key} className="kpi-card">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${kpi.lightColor}`}>
                <kpi.icon size={20} className={kpi.textColor} />
              </div>
              <span className={`flex items-center gap-0.5 text-xs font-medium ${kpi.trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
                {kpi.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {kpi.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-800 font-display mb-0.5">
              {(summary[kpi.key] || 0).toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 font-medium">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 font-display mb-4">Inventory Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={INVENTORY_TREND} margin={{ top: 2, right: 4, left: -20, bottom: 2 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }} />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 font-display mb-4">Purchase Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={PURCHASE_TREND} margin={{ top: 2, right: 4, left: -20, bottom: 2 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                formatter={(v) => [`Rs.${v.toLocaleString()}`, 'Amount']}
              />
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 font-display mb-4">Production Output</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={PRODUCTION_OUTPUT} margin={{ top: 2, right: 4, left: -20, bottom: 2 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="planned" fill="#c7d2fe" radius={[3, 3, 0, 0]} name="Planned" />
              <Bar dataKey="actual" fill="#6366f1" radius={[3, 3, 0, 0]} name="Actual" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Activity size={16} className="text-primary-500" />
          <h3 className="text-sm font-semibold text-slate-700 font-display">Recent Activity</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {RECENT_ACTIVITY.map((item) => (
            <div key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/50 transition-colors">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${activityColors[item.type]}`}>
                {item.module}
              </span>
              <span className="text-sm text-slate-700 flex-1">{item.action}</span>
              <span className="text-xs text-slate-400 hidden sm:block">{item.user}</span>
              <span className="text-xs text-slate-400">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  )
}
