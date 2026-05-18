
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import dashboard_router
from routers import auth_router
from routers.master import inventory_router, planning_router, quality_router, maintenance_router, customer_router, supplier_router, company_router
from routers.sales import sales_dc_router, tax_invoice_router, sale_invoice_router
from routers.subcontract import subcontract_dc_router
from routers.purchase import job_work_router, labour_invoice_router, purchase_inward_router, purchase_return_router
from routers.reports import rejection_report_router, reports_router
from routers.settings import user_settings_router, system_settings_router

app = FastAPI(title="Manufacturing ERP Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard_router.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(auth_router.router, prefix="/auth", tags=["Auth"])

app.include_router(inventory_router.router, prefix="/inventory", tags=["Inventory"])
app.include_router(planning_router.router, prefix="/planning", tags=["Planning"])
app.include_router(quality_router.router, prefix="/quality", tags=["Quality"])
app.include_router(maintenance_router.router, prefix="/maintenance", tags=["Maintenance"])
app.include_router(customer_router.router, prefix="/customer", tags=["Customer"])
app.include_router(supplier_router.router, prefix="/supplier", tags=["Supplier"])
app.include_router(company_router.router, prefix="/company", tags=["Company"])

app.include_router(sales_dc_router.router, prefix="/sales-dc", tags=["Sales DC"])
app.include_router(tax_invoice_router.router, prefix="/tax-invoice", tags=["Tax Invoice"])
app.include_router(sale_invoice_router.router, prefix="/sale-invoice", tags=["Sale Invoice"])

app.include_router(subcontract_dc_router.router, prefix="/subcontract-dc", tags=["Subcontract DC"])

app.include_router(purchase_inward_router.router, prefix="/purchase-inward", tags=["Purchase Inward"])
app.include_router(purchase_return_router.router, prefix="/purchase-return", tags=["Purchase Return"])
app.include_router(job_work_router.router, prefix="/job-work", tags=["Job Work"])
app.include_router(labour_invoice_router.router, prefix="/labour-invoice", tags=["Labour Invoice"])

app.include_router(rejection_report_router.router, prefix="/rejection-report", tags=["Rejection Report"])
app.include_router(reports_router.router, prefix="/reports", tags=["Reports"])

app.include_router(user_settings_router.router, prefix="/user-settings", tags=["User Settings"])
app.include_router(system_settings_router.router, prefix="/system-settings", tags=["System Settings"])

@app.get("/")
def root():
    return {"message": "Manufacturing ERP Backend Running"}
