import {
  LayoutDashboard, Package, BarChart3, Settings, Beaker, Wrench,
  Building2, BookOpen, ShoppingCart, TrendingUp, Hammer,
  AlertTriangle, Users, Truck,
} from 'lucide-react'

export const NAV_MENU = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },

  {
    label: 'Master',
    icon: BookOpen,
    children: [
      {
        label: 'Inventory',
        icon: Package,
        children: [
          {
            label: 'Items',
            path: '/inventory/items',
            children: [
              { label: 'Purchase Item', path: '/inventory/items/purchase' },
              { label: 'Customer Supplied', path: '/inventory/items/customer-supplied' },
              { label: 'Manufacturing Item', path: '/inventory/items/manufacturing' },
            ],
          },
          { label: 'Stock Details', path: '/reports/inventory' },
          {
            label: 'Quality',
            icon: Beaker,
            children: [
              { label: 'Item Group', path: '/quality/item-group' },
              { label: 'Inward Inspection', path: '/quality/inward-inspection' },
            ],
          },
        ],
      },
      {
        label: 'Planning',
        icon: BarChart3,
        children: [
          { label: 'UOM', path: '/planning/uom' },
        ],
      },
      {
        label: 'Maintenance',
        icon: Wrench,
        children: [
          { label: 'Rack', path: '/maintenance/rack' },
          { label: 'Bin', path: '/maintenance/bin' },
        ],
      },
      {
        label: 'Customer',
        icon: Users,
        path: '/master/customer/view',
      },
      {
        label: 'Supplier',
        icon: Truck,
        path: '/master/supplier/view',
      },
      {
        label: 'Users',
        icon: Users,
        path: '/master/users',
      },
      { label: 'Company Info', icon: Building2, path: '/company-info' },
    ],
  },

  {
    label: 'Sales',
    icon: TrendingUp,
    children: [
      { label: 'Sales DC', path: '/sales/dc' },
      { label: 'Tax Invoice', path: '/invoice/tax' },
      { label: 'Sale Invoice', path: '/invoice/sale' },
    ],
  },

  {
    label: 'Sub Contractor',
    icon: Hammer,
    children: [
      { label: 'Subcontractor DC', path: '/subcontractor/dc' },
    ],
  },

  {
    label: 'Inventory',
    icon: Package,
    children: [
      {
        label: 'Inward',
        path: '/inventory/inward',
        children: [
          { label: 'PO Inward', path: '/inventory/inward/po' },
          { label: 'LO Inward', path: '/inventory/inward/lo' },
          { label: 'JO Inward', path: '/inventory/inward/jo' },
        ],
      },
      {
        label: 'Return',
        path: '/inventory/return',
        children: [
          { label: 'PO DC Return', path: '/inventory/return/po-dc' },
          { label: 'PO Invoice Return', path: '/inventory/return/po-invoice' },
        ],
      },
    ],
  },

  {
    label: 'Purchase',
    icon: ShoppingCart,
    children: [
      {
        label: 'Job Work',
        children: [
          { label: 'JODC', path: '/purchase/jobwork/jodc' },
        ],
      },
      { label: 'Labour Invoice', path: '/purchase/labour-invoice' },
    ],
  },

  {
    label: 'Reports',
    icon: BarChart3,
    children: [
      { label: 'Stock Report', icon: Package, path: '/reports/inventory' },
      { label: 'Rejection Report', icon: AlertTriangle, path: '/rejection' },
      { label: 'Reports', icon: BarChart3, path: '/reports' },
    ],
  },

  { label: 'Settings', icon: Settings, path: '/settings' },
]
