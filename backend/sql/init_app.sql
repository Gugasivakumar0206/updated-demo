CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    customer_code VARCHAR(50) NOT NULL UNIQUE,
    customer_name VARCHAR(200) NOT NULL,
    print_name VARCHAR(200),
    customer_group VARCHAR(100),
    customer_type VARCHAR(100),
    territory VARCHAR(100),
    industry VARCHAR(100),
    status VARCHAR(30) DEFAULT 'Active',
    pricing_group VARCHAR(100),
    tax_invoice BOOLEAN DEFAULT TRUE,
    einvoice BOOLEAN DEFAULT FALSE,
    ewaybill BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    address TEXT,
    delivery_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    phone VARCHAR(30),
    mobile VARCHAR(30),
    email VARCHAR(150),
    website VARCHAR(200),
    fax VARCHAR(50),
    gst_type VARCHAR(100),
    gstin VARCHAR(50),
    gst_state VARCHAR(100),
    pan_no VARCHAR(30),
    cin_no VARCHAR(50),
    msme_no VARCHAR(100),
    msme_type VARCHAR(50),
    tds_applicable BOOLEAN DEFAULT FALSE,
    tcs_applicable BOOLEAN DEFAULT FALSE,
    currency VARCHAR(50),
    payment_terms VARCHAR(100),
    credit_limit NUMERIC(14,2),
    credit_days INTEGER,
    discount NUMERIC(10,2),
    ledger_group VARCHAR(100),
    opening_balance NUMERIC(14,2),
    opening_balance_type VARCHAR(10) DEFAULT 'Dr',
    transport_mode VARCHAR(100),
    transporter VARCHAR(150),
    delivery_terms VARCHAR(100),
    lead_days INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
    id BIGSERIAL PRIMARY KEY,
    supplier_code VARCHAR(50) NOT NULL UNIQUE,
    supplier_name VARCHAR(200) NOT NULL,
    print_name VARCHAR(200),
    supplier_group VARCHAR(100),
    supplier_type VARCHAR(100),
    territory VARCHAR(100),
    industry VARCHAR(100),
    status VARCHAR(30) DEFAULT 'Active',
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    phone VARCHAR(30),
    mobile VARCHAR(30),
    email VARCHAR(150),
    website VARCHAR(200),
    gst_type VARCHAR(100),
    gstin VARCHAR(50),
    gst_state VARCHAR(100),
    pan_no VARCHAR(30),
    msme_no VARCHAR(100),
    payment_terms VARCHAR(100),
    credit_days INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
    id BIGSERIAL PRIMARY KEY,
    item_type VARCHAR(50) DEFAULT 'Purchase Item',
    item_code VARCHAR(50) NOT NULL UNIQUE,
    item_name VARCHAR(200) NOT NULL,
    print_name VARCHAR(200),
    item_group VARCHAR(100),
    uom VARCHAR(50),
    hsn_code VARCHAR(50),
    rack VARCHAR(100),
    bin VARCHAR(100),
    min_stock NUMERIC(14,2),
    max_stock NUMERIC(14,2),
    reorder_level NUMERIC(14,2),
    purchase_rate NUMERIC(14,2),
    sales_rate NUMERIC(14,2),
    gst_percent NUMERIC(10,2),
    status VARCHAR(30) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_inward (
    id BIGSERIAL PRIMARY KEY,
    inward_type VARCHAR(30) DEFAULT 'GRN',
    inward_no VARCHAR(50) NOT NULL UNIQUE,
    inward_date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_id BIGINT REFERENCES suppliers(id),
    customer_id BIGINT REFERENCES customers(id),
    invoice_no VARCHAR(100),
    vehicle_no VARCHAR(50),
    remarks TEXT,
    status VARCHAR(30) DEFAULT 'Posted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_inward_items (
    id BIGSERIAL PRIMARY KEY,
    inward_id BIGINT NOT NULL REFERENCES purchase_inward(id) ON DELETE CASCADE,
    item_id BIGINT NOT NULL REFERENCES items(id),
    qty NUMERIC(14,2) NOT NULL DEFAULT 0,
    rate NUMERIC(14,2) DEFAULT 0,
    amount NUMERIC(14,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_ledger (
    id BIGSERIAL PRIMARY KEY,
    entry_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    item_id BIGINT NOT NULL REFERENCES items(id),
    ref_type VARCHAR(50) NOT NULL,
    ref_id BIGINT,
    inward_qty NUMERIC(14,2) DEFAULT 0,
    outward_qty NUMERIC(14,2) DEFAULT 0,
    balance_qty NUMERIC(14,2) DEFAULT 0,
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS sales_dc (
    id BIGSERIAL PRIMARY KEY,
    dc_no VARCHAR(50) NOT NULL UNIQUE,
    dc_date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    reference_no VARCHAR(100),
    vehicle_no VARCHAR(50),
    mode_of_transport VARCHAR(50),
    remarks TEXT,
    status VARCHAR(30) DEFAULT 'Draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_dc_items (
    id BIGSERIAL PRIMARY KEY,
    sales_dc_id BIGINT NOT NULL REFERENCES sales_dc(id) ON DELETE CASCADE,
    item_id BIGINT NOT NULL REFERENCES items(id),
    qty NUMERIC(14,2) NOT NULL DEFAULT 0,
    returned_qty NUMERIC(14,2) DEFAULT 0,
    pending_qty NUMERIC(14,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tax_invoices (
    id BIGSERIAL PRIMARY KEY,
    invoice_no VARCHAR(50) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    sales_dc_id BIGINT REFERENCES sales_dc(id),
    subtotal NUMERIC(14,2) DEFAULT 0,
    gst_amount NUMERIC(14,2) DEFAULT 0,
    total_amount NUMERIC(14,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'Draft',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tax_invoice_items (
    id BIGSERIAL PRIMARY KEY,
    tax_invoice_id BIGINT NOT NULL REFERENCES tax_invoices(id) ON DELETE CASCADE,
    item_id BIGINT NOT NULL REFERENCES items(id),
    qty NUMERIC(14,2) DEFAULT 0,
    rate NUMERIC(14,2) DEFAULT 0,
    tax_percent NUMERIC(10,2) DEFAULT 0,
    amount NUMERIC(14,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_invoices (
    id BIGSERIAL PRIMARY KEY,
    invoice_no VARCHAR(50) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    sales_dc_id BIGINT REFERENCES sales_dc(id),
    subtotal NUMERIC(14,2) DEFAULT 0,
    gst_amount NUMERIC(14,2) DEFAULT 0,
    total_amount NUMERIC(14,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'Draft',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_invoice_items (
    id BIGSERIAL PRIMARY KEY,
    sale_invoice_id BIGINT NOT NULL REFERENCES sale_invoices(id) ON DELETE CASCADE,
    item_id BIGINT NOT NULL REFERENCES items(id),
    qty NUMERIC(14,2) DEFAULT 0,
    rate NUMERIC(14,2) DEFAULT 0,
    tax_percent NUMERIC(10,2) DEFAULT 0,
    amount NUMERIC(14,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_info (
    id BIGSERIAL PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL,
    print_name VARCHAR(200),
    address TEXT,
    delivery_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    pin_no VARCHAR(50),
    mobile_no VARCHAR(30),
    email VARCHAR(150),
    website VARCHAR(200),
    contact_person VARCHAR(150),
    latitude VARCHAR(50),
    longitude VARCHAR(50),
    company_display_type VARCHAR(100),
    msme_no VARCHAR(100),
    tan_no VARCHAR(50),
    pan_it_no VARCHAR(50),
    pf_no VARCHAR(50),
    esi_no VARCHAR(50),
    import_export_code VARCHAR(50),
    cin VARCHAR(100),
    gstin VARCHAR(50),
    gst_state VARCHAR(100),
    gstin_user VARCHAR(100),
    einvoice_user VARCHAR(100),
    einvoice_password TEXT,
    ewaybill_user VARCHAR(100),
    ewaybill_password TEXT,
    api_key TEXT,
    access_token TEXT,
    company_logo TEXT,
    iso_logo TEXT,
    bis_logo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
