import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import LoginPage from './pages/auth/LoginPage'
import { clearAuth, getCurrentUser, getStoredToken } from './lib/api'

import DashboardPage         from './pages/dashboard/DashboardPage'
import ItemsPage             from './pages/items/ItemsPage'
import ItemFormPage          from './pages/items/ItemFormPage'
import PurchaseItemPage      from './pages/items/PurchaseItemPage'
import PurchaseItemFormPage  from './pages/items/PurchaseItemFormPage'
import CustomerSuppliedPage  from './pages/items/CustomerSuppliedPage'
import CustomerSuppliedFormPage from './pages/items/CustomerSuppliedFormPage'
import PurchasePage          from './pages/purchase/PurchasePage'
import PurchaseFormPage      from './pages/purchase/PurchaseFormPage'
import ManufacturingPage     from './pages/manufacturing/ManufacturingPage'
import ManufacturingFormPage from './pages/manufacturing/ManufacturingFormPage'
import CustomerPage          from './pages/customer/CustomerPage'
import CustomerFormPage      from './pages/customer/CustomerFormPage'
import SupplierPage          from './pages/supplier/SupplierPage'
import ManufacturingDCPage   from './pages/dc/ManufacturingDCPage'
import LabourDCPage          from './pages/dc/LabourDCPage'
import SalesDCPage           from './pages/dc/SalesDCPage'
import DCFormPage            from './pages/dc/DCFormPage'
import SalesDCPrintPage      from './pages/dc/SalesDCPrintPage'
import LabourDCPrintPage     from './pages/dc/LabourDCPrintPage'
import TaxInvoicePage        from './pages/invoice/TaxInvoicePage'
import SaleInvoicePage       from './pages/invoice/SaleInvoicePage'
import LabourInvoicePage     from './pages/invoice/LabourInvoicePage'
import InvoiceFormPage       from './pages/invoice/InvoiceFormPage'
import TaxInvoicePrintPage   from './pages/invoice/TaxInvoicePrintPage'
import SaleInvoicePrintPage  from './pages/invoice/SaleInvoicePrintPage'
import RejectionReportPage   from './pages/rejection/RejectionReportPage'
import RejectionFormPage     from './pages/rejection/RejectionFormPage'
import UOMPage               from './pages/planning/UOMPage'
import ItemGroupPage         from './pages/quality/ItemGroupPage'
import RackPage              from './pages/maintenance/RackPage'
import BinPage               from './pages/maintenance/BinPage'
import ReportsPage           from './pages/reports/ReportsPage'
import InventoryReportPage   from './pages/reports/InventoryReportPage'
import BusinessReportPage    from './pages/reports/BusinessReportPage'
import SettingsPage          from './pages/settings/SettingsPage'
import CompanyInfoPage       from './pages/company/CompanyInfoPage'
import CustomerCreationPage  from './pages/master/CustomerPage'
import SupplierCreationPage  from './pages/master/SupplierPage'
import UserManagementPage    from './pages/master/UserManagementPage'
import ComingSoon            from './pages/ComingSoon'

export default function App() {
  const [authLoading, setAuthLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    async function bootstrapAuth() {
      const token = getStoredToken()

      if (!token) {
        setAuthLoading(false)
        return
      }

      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch {
        clearAuth()
        setUser(null)
      } finally {
        setAuthLoading(false)
      }
    }

    bootstrapAuth()
  }, [])

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#eef4ff', color: '#032d60', fontFamily: 'DM Sans, sans-serif', fontSize: '18px', fontWeight: '700' }}>
        Loading AR Precision...
      </div>
    )
  }

  if (!user) {
    return <LoginPage onAuthenticated={setUser} />
  }

  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        <Route path="inventory/items" element={<ItemsPage />} />
        <Route path="inventory/items/new" element={<ItemFormPage />} />
        <Route path="inventory/items/:id" element={<ItemFormPage />} />
        <Route path="inventory/items/purchase" element={<PurchaseItemPage />} />
        <Route path="inventory/items/purchase/new" element={<PurchaseItemFormPage />} />
        <Route path="inventory/items/purchase/:id" element={<PurchaseItemFormPage />} />
        <Route path="inventory/items/customer-supplied" element={<CustomerSuppliedPage />} />
        <Route path="inventory/items/customer-supplied/new" element={<CustomerSuppliedFormPage />} />
        <Route path="inventory/items/customer-supplied/:id" element={<CustomerSuppliedFormPage />} />
        <Route path="inventory/items/manufacturing" element={<ManufacturingPage />} />
        <Route path="inventory/items/manufacturing/new" element={<ManufacturingFormPage />} />
        <Route path="inventory/items/manufacturing/:id" element={<ManufacturingFormPage />} />

        <Route path="inventory/purchase" element={<PurchasePage inwardType="GRN" title="Purchase Inward" subtitle="Manage GRN purchase inward and stock updates" addLabel="Add Purchase Inward" basePath="/inventory/purchase" />} />
        <Route path="inventory/purchase/new" element={<PurchaseFormPage inwardType="GRN" title="Purchase Inward" subtitle="Inventory -> Purchase -> Stock inward entry" saveLabel="Save Purchase Inward" cancelPath="/inventory/purchase" numberPrefix="PIN" />} />
        <Route path="inventory/purchase/:id" element={<PurchaseFormPage inwardType="GRN" title="Purchase Inward" subtitle="Inventory -> Purchase -> Stock inward entry" saveLabel="Save Purchase Inward" cancelPath="/inventory/purchase" numberPrefix="PIN" />} />
        <Route path="inventory/inward/grn" element={<PurchasePage inwardType="GRN" title="GRN / Purchase Inward" subtitle="Manage goods receipt and purchase inward stock updates" addLabel="Add GRN / Purchase Inward" basePath="/inventory/inward/grn" />} />
        <Route path="inventory/inward/grn/new" element={<PurchaseFormPage inwardType="GRN" title="GRN / Purchase Inward" subtitle="Inventory -> Inward -> GRN / Purchase Inward" saveLabel="Save GRN / Purchase Inward" cancelPath="/inventory/inward/grn" numberPrefix="GRN" />} />
        <Route path="inventory/inward/grn/:id" element={<PurchaseFormPage inwardType="GRN" title="GRN / Purchase Inward" subtitle="Inventory -> Inward -> GRN / Purchase Inward" saveLabel="Save GRN / Purchase Inward" cancelPath="/inventory/inward/grn" numberPrefix="GRN" />} />
        <Route path="inventory/inward/po" element={<PurchasePage inwardType="PO" title="PO Inward" subtitle="Manage purchase order inward entries and stock updates" addLabel="Add PO Inward" basePath="/inventory/inward/po" />} />
        <Route path="inventory/inward/po/new" element={<PurchaseFormPage inwardType="PO" title="PO Inward" subtitle="Inventory -> Inward -> PO Inward" saveLabel="Save PO Inward" cancelPath="/inventory/inward/po" numberPrefix="POI" />} />
        <Route path="inventory/inward/po/:id" element={<PurchaseFormPage inwardType="PO" title="PO Inward" subtitle="Inventory -> Inward -> PO Inward" saveLabel="Save PO Inward" cancelPath="/inventory/inward/po" numberPrefix="POI" />} />
        <Route path="inventory/inward/lo" element={<PurchasePage inwardType="LO" title="LO Inward" subtitle="Manage LO inward entries and stock updates" addLabel="Add LO Inward" basePath="/inventory/inward/lo" />} />
        <Route path="inventory/inward/lo/new" element={<PurchaseFormPage inwardType="LO" title="LO Inward" subtitle="Inventory -> Inward -> LO Inward" saveLabel="Save LO Inward" cancelPath="/inventory/inward/lo" numberPrefix="LOI" />} />
        <Route path="inventory/inward/lo/:id" element={<PurchaseFormPage inwardType="LO" title="LO Inward" subtitle="Inventory -> Inward -> LO Inward" saveLabel="Save LO Inward" cancelPath="/inventory/inward/lo" numberPrefix="LOI" />} />
        <Route path="inventory/inward/jo" element={<PurchasePage inwardType="JO" title="JO Inward" subtitle="Manage JO inward entries and stock updates" addLabel="Add JO Inward" basePath="/inventory/inward/jo" />} />
        <Route path="inventory/inward/jo/new" element={<PurchaseFormPage inwardType="JO" title="JO Inward" subtitle="Inventory -> Inward -> JO Inward" saveLabel="Save JO Inward" cancelPath="/inventory/inward/jo" numberPrefix="JOI" />} />
        <Route path="inventory/inward/jo/:id" element={<PurchaseFormPage inwardType="JO" title="JO Inward" subtitle="Inventory -> Inward -> JO Inward" saveLabel="Save JO Inward" cancelPath="/inventory/inward/jo" numberPrefix="JOI" />} />
        <Route path="inventory/manufacturing" element={<ManufacturingPage />} />
        <Route path="inventory/manufacturing/new" element={<ManufacturingFormPage />} />
        <Route path="inventory/manufacturing/:id" element={<ManufacturingFormPage />} />
        <Route path="inventory/customer" element={<CustomerSuppliedPage />} />
        <Route path="inventory/customer/new" element={<CustomerSuppliedFormPage />} />
        <Route path="inventory/customer/:id" element={<CustomerSuppliedFormPage />} />

        <Route path="sales/dc" element={<SalesDCPage />} />
        <Route path="sales/dc/new" element={<DCFormPage type="Sales DC" />} />
        <Route path="sales/dc/:id" element={<DCFormPage type="Sales DC" />} />
        <Route path="sales/dc/:id/print" element={<SalesDCPrintPage />} />
        <Route path="sales/tax-invoice" element={<ComingSoon title="Tax Invoice (Sales)" />} />
        <Route path="sales/sale-invoice" element={<ComingSoon title="Sale Invoice" />} />

        <Route path="subcontractor/dc" element={<ComingSoon title="Subcontractor DC" />} />

        <Route path="purchase/jobwork/jodc" element={<ComingSoon title="Job Work - JODC" />} />
        <Route path="purchase/labour-invoice" element={<ComingSoon title="Labour Invoice (Purchase)" />} />

        <Route path="dc/manufacturing" element={<ManufacturingDCPage />} />
        <Route path="dc/manufacturing/new" element={<DCFormPage type="Manufacturing DC" />} />
        <Route path="dc/manufacturing/:id" element={<DCFormPage type="Manufacturing DC" />} />
        <Route path="dc/labour" element={<LabourDCPage />} />
        <Route path="dc/labour/new" element={<DCFormPage type="Labour DC" />} />
        <Route path="dc/labour/:id" element={<DCFormPage type="Labour DC" />} />
        <Route path="dc/labour/:id/print" element={<LabourDCPrintPage />} />

        <Route path="invoice/tax" element={<TaxInvoicePage />} />
        <Route path="invoice/tax/new" element={<InvoiceFormPage type="Tax Invoice" />} />
        <Route path="invoice/tax/:id" element={<InvoiceFormPage type="Tax Invoice" />} />
        <Route path="invoice/tax/:id/print" element={<TaxInvoicePrintPage />} />
        <Route path="invoice/sale" element={<SaleInvoicePage />} />
        <Route path="invoice/sale/new" element={<InvoiceFormPage type="Sale Invoice" />} />
        <Route path="invoice/sale/:id" element={<InvoiceFormPage type="Sale Invoice" />} />
        <Route path="invoice/sale/:id/print" element={<SaleInvoicePrintPage />} />
        <Route path="invoice/labour" element={<LabourInvoicePage />} />
        <Route path="invoice/labour/new" element={<InvoiceFormPage type="Labour Invoice" />} />
        <Route path="invoice/labour/:id" element={<InvoiceFormPage type="Labour Invoice" />} />

        <Route path="rejection" element={<RejectionReportPage />} />
        <Route path="rejection/new" element={<RejectionFormPage />} />
        <Route path="rejection/:id" element={<RejectionFormPage />} />

        <Route path="planning/uom" element={<UOMPage />} />
        <Route path="quality/item-group" element={<ItemGroupPage />} />
        <Route path="maintenance/rack" element={<RackPage />} />
        <Route path="maintenance/bin" element={<BinPage />} />

        <Route path="payroll/employee" element={<ComingSoon title="Employee (Payroll)" />} />
        <Route path="user/employee" element={<ComingSoon title="Employee (Users)" />} />

        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/inventory" element={<InventoryReportPage />} />
        <Route path="reports/inward" element={<BusinessReportPage reportKey="inward" />} />
        <Route path="reports/lo-inward" element={<BusinessReportPage reportKey="lo-inward" />} />
        <Route path="reports/purchase" element={<BusinessReportPage reportKey="purchase" />} />
        <Route path="reports/manufacturing" element={<BusinessReportPage reportKey="manufacturing" />} />
        <Route path="reports/sales" element={<BusinessReportPage reportKey="sales" />} />
        <Route path="reports/dc-summary" element={<BusinessReportPage reportKey="dc-summary" />} />
        <Route path="reports/invoice" element={<BusinessReportPage reportKey="invoice" />} />
        <Route path="reports/rejection" element={<BusinessReportPage reportKey="rejection" />} />
        <Route path="reports/supplier-performance" element={<BusinessReportPage reportKey="supplier-performance" />} />
        <Route path="reports/customer-supplied" element={<BusinessReportPage reportKey="customer-supplied" />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="company-info" element={<CompanyInfoPage />} />
        <Route path="master/users" element={<UserManagementPage />} />
        <Route path="master/customer" element={<CustomerCreationPage />} />
        <Route path="master/customer/view" element={<CustomerPage mode="customer" />} />
        <Route path="master/supplier" element={<SupplierCreationPage />} />
        <Route path="master/supplier/view" element={<SupplierPage />} />
      </Route>
    </Routes>
  )
}
