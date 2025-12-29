# Brand Category Sales Report - Deployment Configuration

SCRIPT_TYPE=Suitelet
SCRIPT_ID=customscript_brand_category_sales
DEPLOY_ID=customdeploy_brand_category_sales
DEPLOY_NUMBER=1
SCRIPT_FILE=brand_category_sales_suitelet.js
SCRIPT_INTERNAL_ID=4078
DEPLOYMENT_INTERNAL_ID=43787

## Deployment Instructions

**Deploy this script to NetSuite (automatically handles authentication):**
```bash
cd "/Users/ericsoloff/Library/CloudStorage/GoogleDrive-ericsoloffconsulting@gmail.com/My Drive/SuiteScripts"
npx playwright test tests/auto-deploy.spec.js
```

The auto-deploy script will automatically find this DEPLOYMENT_CONFIG.md file in the brand-category-sales directory.

If you have multiple DEPLOYMENT_CONFIG.md files, specify which one:
```bash
CONFIG_PATH="brand-category-sales/DEPLOYMENT_CONFIG.md" npx playwright test tests/auto-deploy.spec.js
```

This will:
- Deploy the suitelet script to NetSuite
- Automatically detect if authentication is needed
- Prompt for 2FA if session expired
- Retry deployment after successful authentication
- Navigate to the script deployment page
- Verify deployment configuration

**Advanced Options:**

Manual deployment (faster if already authenticated):
```bash
CONFIG_PATH="brand-category-sales/DEPLOYMENT_CONFIG.md" npx playwright test tests/deploy-script.spec.js --headed
```

Run with trace recording (for debugging):
```bash
CONFIG_PATH="brand-category-sales/DEPLOYMENT_CONFIG.md" npx playwright test tests/deploy-script.spec.js --headed --trace on
npx playwright show-trace test-results/*/trace.zip
```

Manual authentication only:
```bash
npx playwright test tests/netsuite-auth-setup.spec.js --headed
```

## Suitelet URL

**Access the Report:**
https://8289753.app.netsuite.com/app/site/hosting/scriptlet.nl?script=4078&deploy=1

**Script Deployment Page:**
https://8289753.app.netsuite.com/app/common/scripting/scriptrecord.nl?id=43787

## Script Purpose

The Brand Category Sales Report provides comprehensive sales analysis by brand and product classification:

### Features:
- **Summary View**: Aggregated sales by Category, Sub-Category, and Configuration
- **Detail View**: Drill-down to individual transactions with full line-item details
- **Multi-Brand Comparison**: Select up to 6 brands for side-by-side comparison
- **Parent Company Filter**: Quick-select all brands under a parent company
- **Date Range Filtering**: Filter by transaction date range
- **Selling Location Filter**: Filter by department/location
- **Advanced Search**: Multi-field search with OR operators (|)
- **Excel Export**: Export both summary and detail views

### Data Sources:
- Invoice line items (positive amounts)
- Credit memo line items (shown as positive, reversed sign)
- Product classification fields (Class 1, 2, 3)
- Brand custom field
- Department/location field

### Summary View Columns:
- Category (Class 1)
- Sub-Category (Class 2)
- Configuration (Class 3)
- Individual brand amounts (dynamic, based on selection)
- Selected Brands Total
- Selected Brands % (of category total)
- All Other Brands Total
- All Other Brands % (of category total)
- All Brands Total
- All Brands % (grand total)
- Quantity

### Detail View Columns:
- Category, Sub-Category, Configuration
- Selected Brand indicator (Yes/No)
- Brand name
- Item number
- Selling location
- Transaction number (clickable link)
- Date
- Customer
- Quantity
- Rate
- Amount

## Technical Notes

### Query Performance:
- Summary view uses aggregated SuiteQL query
- Detail view limited to 10,000 records (NetSuite governance limit)
- Includes record count display when results are truncated

### Special Handling:
- Credit memo amounts are reversed (displayed as positive)
- "Built-In" vs "BuiltIn" text formatting handled
- Category subtotals with toggle functionality
- Sticky table headers for better navigation

## Security & Roles

Ensure users have appropriate permissions:
- View Invoices
- View Credit Memos
- View Items
- View Customers
- Run SuiteQL queries

## Usage Notes

- Select up to 6 brands for comparison analysis
- Use Parent Company filter to auto-populate all brands under a company
- Search supports OR operators: "Category1|Category2" finds either
- Category subtotals dynamically update based on active filters
- Toggle subtotals and detail rows for cleaner views
- Export preserves all visible data and formatting
