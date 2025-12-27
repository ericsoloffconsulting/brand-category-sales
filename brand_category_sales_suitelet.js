/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * 
 * Brand Category Sales Report
 * 
 * Purpose: Displays invoice and credit memo sales data by brand and product classification
 * 
 * This report provides both summary and detailed views of sales by:
 * - Product Classification (Class 1, 2, 3)
 * - Brand (GE, Profile, Cafe, Hotpoint, Monogram)
 */
define(['N/ui/serverWidget', 'N/query', 'N/log', 'N/runtime', 'N/url'],
    /**
     * @param {serverWidget} serverWidget
     * @param {query} query
     * @param {log} log
     * @param {runtime} runtime
     * @param {url} url
     */
    function (serverWidget, query, log, runtime, url) {

        /**
         * Handles GET and POST requests to the Suitelet
         * @param {Object} context - NetSuite context object containing request/response
         */
        function onRequest(context) {
            if (context.request.method === 'GET') {
                handleGet(context);
            } else {
                // POST requests just redirect back to GET
                handleGet(context);
            }
        }

        /**
         * Handles GET requests
         * @param {Object} context
         */
        function handleGet(context) {
            var request = context.request;
            var response = context.response;

            log.debug('GET Request', 'Parameters: ' + JSON.stringify(request.parameters));

            // Create NetSuite form
            var form = serverWidget.createForm({
                title: 'Sales by Brand and Product Category'
            });

            try {
                // Build and add HTML content
                var htmlContent = buildPageHTML(request.parameters);

                var htmlField = form.addField({
                    id: 'custpage_html_content',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'Content'
                });

                htmlField.defaultValue = htmlContent;

            } catch (e) {
                log.error('Error Building Form', {
                    error: e.message,
                    stack: e.stack
                });

                var errorField = form.addField({
                    id: 'custpage_error',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'Error'
                });
                errorField.defaultValue = '<p style="color:red;">Error loading portal: ' + escapeHtml(e.message) + '</p>';
            }

            context.response.writePage(form);
        }

        /**
         * Builds the main page HTML
         * @param {Object} params - URL parameters
         * @returns {string} HTML content
         */
        function buildPageHTML(params) {
            try {
                log.debug('buildPageHTML Start', 'Params: ' + JSON.stringify(params));
                
                var scriptUrl = url.resolveScript({
                    scriptId: runtime.getCurrentScript().id,
                    deploymentId: runtime.getCurrentScript().deploymentId,
                    returnExternalUrl: false
                });

                // Check if data should be loaded
                var shouldLoadData = params.loadData === 'T';
                log.debug('Load Data Decision', 'shouldLoadData: ' + shouldLoadData);

                // Get parameters
                var viewMode = params.view || 'summary';
                var filterClass1 = params.class1 || null;
                var filterClass2 = params.class2 || null;
                var filterClass3 = params.class3 || null;
                var filterBrand = params.brand || null;
                var startDate = params.startdate || '2025-01-01';
                var endDate = params.enddate || '2025-12-31';
                
                // Extract brand parameters with defaults only on initial load
                // If params exist (even as empty string), use them; only default when undefined
                var brand1Id = params.brand1 !== undefined ? params.brand1 : '48';  // Default: PROFILE
                var brand2Id = params.brand2 !== undefined ? params.brand2 : '26';  // Default: GE
                var brand3Id = params.brand3 !== undefined ? params.brand3 : '15';  // Default: CAFE
                var brand4Id = params.brand4 !== undefined ? params.brand4 : '43';  // Default: MONOGRAM
                var brand5Id = params.brand5 !== undefined ? params.brand5 : '32';  // Default: HOTPOINT
                var brand6Id = params.brand6 !== undefined ? params.brand6 : '30';  // Default: HAIER
                
                log.debug('Brand Parameters', {
                    brand1: brand1Id,
                    brand2: brand2Id,
                    brand3: brand3Id,
                    brand4: brand4Id,
                    brand5: brand5Id,
                    brand6: brand6Id
                });

                var html = '';

                // Loading spinner overlay - FIRST with inline styles so it renders immediately
                html += '<div id="loadingOverlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.95);display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:9999;display:none;">';
                html += '<div style="width:50px;height:50px;border:4px solid #e0e0e0;border-top:4px solid #4CAF50;border-radius:50%;animation:spin 1s linear infinite;"></div>';
                html += '<div style="margin-top:15px;font-size:16px;color:#333;font-weight:500;">Loading data...</div>';
                html += '<style>@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style>';
                html += '</div>';

                // If data not requested, show landing page with Load button
                if (!shouldLoadData) {
                    var separator = scriptUrl.indexOf('?') > -1 ? '&' : '?';
                    var loadDataUrl = scriptUrl + separator + 'loadData=T&startdate=' + startDate + '&enddate=' + endDate;
                    
                    // Load brand list for selectors
                    var brandList = getBrandList();
                    
                    html += '<style>' + getStyles() + '</style>';
                    html += '<div class="portal-container">';
                    html += '<div style="text-align:center;padding:15px 20px;">';
                    html += '<h1 style="color:#1a237e;font-size:32px;margin-bottom:10px;">Sales by Brand and Product Category</h1>';
                    html += '<p style="color:#666;font-size:16px;margin-bottom:20px;">Invoice and Credit Memo Inventory Line Items<br/>Split by Category, Sub-Category and Configuration.</p>';
                    
                    // Filters section on landing page
                    html += '<div style="max-width:700px;margin:0 auto 20px auto;background:#fff;border:1px solid #cbd5e1;border-radius:6px;padding:25px;">';
                    html += '<div style="margin-bottom:20px;font-weight:600;color:#333;font-size:18px;text-align:center;">Report Filters</div>';
                    
                    // Date filter section
                    html += '<div style="margin-bottom:25px;">';
                    html += '<div style="margin-bottom:10px;font-weight:500;color:#555;">Date Range:</div>';
                    html += '<div style="display:flex;gap:15px;justify-content:center;flex-wrap:wrap;">';
                    html += '<div style="display:flex;flex-direction:column;gap:5px;">';
                    html += '<label for="startdate_landing" style="font-size:14px;color:#666;">Start Date:</label>';
                    html += '<input type="date" id="startdate_landing" value="' + startDate + '" style="padding:8px 10px;border:1px solid #cbd5e1;border-radius:4px;font-size:14px;">';
                    html += '</div>';
                    html += '<div style="display:flex;flex-direction:column;gap:5px;">';
                    html += '<label for="enddate_landing" style="font-size:14px;color:#666;">End Date:</label>';
                    html += '<input type="date" id="enddate_landing" value="' + endDate + '" style="padding:8px 10px;border:1px solid #cbd5e1;border-radius:4px;font-size:14px;">';
                    html += '</div>';
                    html += '</div>';
                    html += '</div>';
                    
                    // Brand selectors
                    html += '<div style="margin-bottom:20px;">';
                    html += '<div style="margin-bottom:10px;font-weight:500;color:#555;">Selected Brands (Choose up to 6):</div>';
                    html += buildBrandSelectors(brandList, brand1Id, brand2Id, brand3Id, brand4Id, brand5Id, brand6Id);
                    html += '</div>';
                    
                    html += '</div>';
                    
                    html += '<button onclick="loadReportData()" id="loadDataBtn" style="padding:15px 40px;font-size:18px;font-weight:bold;color:#fff;background:#4CAF50;border:none;border-radius:6px;cursor:pointer;box-shadow:0 2px 8px rgba(76,175,80,0.3);transition:all 0.2s;">Load Report Data</button>';
                    html += '</div>';
                    html += '</div>';
                    html += '<script>';
                    html += 'function loadReportData() {';
                    html += '  var btn = document.getElementById("loadDataBtn");';
                    html += '  btn.disabled = true;';
                    html += '  btn.textContent = "Loading...";';
                    html += '  var overlay = document.getElementById("loadingOverlay");';
                    html += '  if (overlay) overlay.style.display = "flex";';
                    html += '  var startDate = document.getElementById("startdate_landing").value;';
                    html += '  var endDate = document.getElementById("enddate_landing").value;';
                    html += '  var brand1 = document.getElementById("brand1").value;';
                    html += '  var brand2 = document.getElementById("brand2").value;';
                    html += '  var brand3 = document.getElementById("brand3").value;';
                    html += '  var brand4 = document.getElementById("brand4").value;';
                    html += '  var brand5 = document.getElementById("brand5").value;';
                    html += '  var brand6 = document.getElementById("brand6").value;';
                    html += '  var url = "' + scriptUrl + '" + "' + separator + 'loadData=T";';
                    html += '  if (startDate) url += "&startdate=" + encodeURIComponent(startDate);';
                    html += '  if (endDate) url += "&enddate=" + encodeURIComponent(endDate);';
                    html += '  url += "&brand1=" + encodeURIComponent(brand1);';
                    html += '  url += "&brand2=" + encodeURIComponent(brand2);';
                    html += '  url += "&brand3=" + encodeURIComponent(brand3);';
                    html += '  url += "&brand4=" + encodeURIComponent(brand4);';
                    html += '  url += "&brand5=" + encodeURIComponent(brand5);';
                    html += '  url += "&brand6=" + encodeURIComponent(brand6);';
                    html += '  window.location.href = url;';
                    html += '}';
                    html += '</script>';
                    return html;
                }

                // Data requested - load everything
                log.debug('Data Loading', 'Starting to load report data');

                // Add styles
                html += '<style>' + getStyles() + '</style>';

                // Main container
                html += '<div class="portal-container">';

                if (viewMode === 'detail') {
                    // Show detail view
                    var department = params.department || '';
                    html += buildDetailView(filterClass1, filterClass2, filterClass3, filterBrand, scriptUrl, startDate, endDate, department, brand1Id, brand2Id, brand3Id, brand4Id, brand5Id, brand6Id);
                } else {
                    // Show summary view
                    var department = params.department || '';
                    html += buildSummaryView(scriptUrl, startDate, endDate, department, brand1Id, brand2Id, brand3Id, brand4Id, brand5Id, brand6Id);
                }

                html += '</div>'; // Close portal-container

                // Add SheetJS library for Excel export
                html += '<script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"></script>';

                // Add JavaScript
                html += '<script>' + getJavaScript(scriptUrl) + '</script>';

                log.debug('buildPageHTML Complete', 'HTML generated successfully');
                return html;
                
            } catch (e) {
                log.error('Error in buildPageHTML', {
                    error: e.message,
                    stack: e.stack,
                    params: JSON.stringify(params)
                });
                // Return error page
                var errorHtml = '<style>body{font-family:Arial,sans-serif;padding:40px;}</style>';
                errorHtml += '<div style="max-width:600px;margin:0 auto;">';
                errorHtml += '<h1 style="color:#d32f2f;">Error Loading Portal</h1>';
                errorHtml += '<p><strong>Error:</strong> ' + escapeHtml(e.message) + '</p>';
                errorHtml += '<p><strong>Details:</strong> Check execution log for details.</p>';
                errorHtml += '<pre style="background:#f5f5f5;padding:15px;overflow:auto;">' + escapeHtml(e.stack || 'No stack trace available') + '</pre>';
                errorHtml += '</div>';
                return errorHtml;
            }
        }

        /**
         * Builds the summary view
         * @param {string} scriptUrl - Suitelet URL
         * @param {string} startDate - Start date filter
         * @param {string} endDate - End date filter
         * @param {string} department - Department filter
         * @param {string} brand1Id - Brand 1 ID
         * @param {string} brand2Id - Brand 2 ID
         * @param {string} brand3Id - Brand 3 ID
         * @param {string} brand4Id - Brand 4 ID
         * @returns {string} HTML content
         */
        function buildSummaryView(scriptUrl, startDate, endDate, department, brand1Id, brand2Id, brand3Id, brand4Id, brand5Id, brand6Id) {
            var html = '';
            
            // Load brand list for selectors
            var brandList = getBrandList();
            
            html += '<div class="section-description">Invoice and Credit Memo Inventory Line Items, Split by Category, Sub-Category and Configuration. Click Any Row for Drill Down Transaction Details.</div>';

            // Date and brand filter section
            html += '<div class="date-filter-section">';
            html += '<div class="date-filter-inputs">';
            html += '<label for="startdate">Start Date:</label>';
            html += '<input type="date" id="startdate" name="startdate" value="' + (startDate || '') + '">';
            html += '<label for="enddate">End Date:</label>';
            html += '<input type="date" id="enddate" name="enddate" value="' + (endDate || '') + '">';
            html += '<label for="department">Selling Location:</label>';
            html += '<input type="text" id="department" name="department" value="' + (department || '') + '" placeholder="Enter location..." style="padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 14px; width: 200px;">';
            html += '</div>';
            
            // Brand selectors
            html += '<div style="margin-top: 15px;">';
            html += '<div style="margin-bottom: 8px; font-weight: 500; color: #555;">Selected Brands:</div>';
            html += buildBrandSelectors(brandList, brand1Id, brand2Id, brand3Id, brand4Id, brand5Id, brand6Id);
            html += '</div>';
            
            html += '<div style="margin-top: 15px;">';
            html += '<button type="button" class="filter-btn" onclick="applyDateFilter()">Apply Filter</button>';
            html += '<button type="button" class="clear-btn" onclick="clearDateFilter()" style="margin-left: 10px;">Clear</button>';
            html += '</div>';
            html += '</div>';

            // Get summary data
            var summaryDataResult = getSummaryData(startDate, endDate, department, brand1Id, brand2Id, brand3Id, brand4Id, brand5Id, brand6Id);
            var summaryData = summaryDataResult.records;
            var categoryTotals = summaryDataResult.categoryTotals;
            var selectedBrands = summaryDataResult.selectedBrands;
            var brandCount = summaryDataResult.brandCount;

            html += '<div class="search-section">';
            html += '<div class="search-box-container">';
            html += '<input type="text" id="searchCategory-summary" class="search-box" placeholder="Search Category..." onkeyup="filterTable(\'summary\')" style="flex:1;">';
            html += '<input type="text" id="searchSubCategory-summary" class="search-box" placeholder="Search Sub-Category..." onkeyup="filterTable(\'summary\')" style="flex:1;">';
            html += '<input type="text" id="searchConfiguration-summary" class="search-box" placeholder="Search Configuration..." onkeyup="filterTable(\'summary\')" style="flex:1;">';
            html += '<button type="button" class="export-btn" onclick="exportToExcel(\'summary\')">📥 Export to Excel</button>';
            html += '</div>';
            html += '<span class="search-results-count" id="searchCount-summary"></span>';
            html += buildSummaryTable(summaryData, categoryTotals, selectedBrands, brandCount, scriptUrl, startDate, endDate, department, brand1Id, brand2Id, brand3Id, brand4Id, brand5Id, brand6Id);
            html += '</div>';

            return html;
        }

        /**
         * Builds the detail view
         * @param {string} class1 - Class 1 filter
         * @param {string} class2 - Class 2 filter
         * @param {string} class3 - Class 3 filter
         * @param {string} brand - Brand filter
         * @param {string} scriptUrl - Suitelet URL
         * @param {string} startDate - Start date filter
         * @param {string} endDate - End date filter
         * @param {string} department - Department filter
         * @param {string} brand1Id - Brand 1 ID
         * @param {string} brand2Id - Brand 2 ID
         * @param {string} brand3Id - Brand 3 ID
         * @param {string} brand4Id - Brand 4 ID
         * @returns {string} HTML content
         */
        function buildDetailView(class1, class2, class3, brand, scriptUrl, startDate, endDate, department, brand1Id, brand2Id, brand3Id, brand4Id, brand5Id, brand6Id) {
            var html = '';
            
            // Back button with date params and brand params
            html += '<div class="back-button-container">';
            var backUrl = scriptUrl + '&loadData=T';
            if (startDate) backUrl += '&startdate=' + encodeURIComponent(startDate);
            if (endDate) backUrl += '&enddate=' + encodeURIComponent(endDate);
            if (department) backUrl += '&department=' + encodeURIComponent(department);
            if (brand1Id) backUrl += '&brand1=' + encodeURIComponent(brand1Id);
            if (brand2Id) backUrl += '&brand2=' + encodeURIComponent(brand2Id);
            if (brand3Id) backUrl += '&brand3=' + encodeURIComponent(brand3Id);
            if (brand4Id) backUrl += '&brand4=' + encodeURIComponent(brand4Id);
            html += '<a href="' + backUrl + '" class="back-button">← Back to Summary</a>';
            html += '</div>';

            // Filter display
            html += '<h2 class="section-title">Transaction Details</h2>';
            html += '<div class="filter-display">';
            html += '<strong>Filters:</strong> ';
            var filters = [];
            if (class1) filters.push('Category: ' + escapeHtml(class1));
            if (class2) filters.push('Sub-Category: ' + escapeHtml(class2));
            if (class3) filters.push('Configuration: ' + escapeHtml(class3));
            if (startDate) filters.push('From: ' + startDate);
            if (endDate) filters.push('To: ' + endDate);
            if (department) filters.push('Selling Location: ' + escapeHtml(department));
            html += filters.join(' | ');
            html += '</div>';

            // Get detail data
            var detailData = getDetailData(class1, class2, class3, brand, startDate, endDate, department, brand1Id, brand2Id, brand3Id, brand4Id, brand5Id, brand6Id);

            // Display record count
            html += '<div class="record-count">';
            html += '<strong>Records:</strong> Showing ' + detailData.displayedCount.toLocaleString() + ' of ' + detailData.totalCount.toLocaleString() + ' total';
            if (detailData.displayedCount < detailData.totalCount) {
                html += ' <span class="limit-warning">(⚠️ Results limited to ' + detailData.displayedCount.toLocaleString() + ' records)</span>';
            }
            html += '</div>';

            html += '<div class="search-section">';
            html += '<div class="search-box-container">';
            html += '<div style="display:flex;align-items:center;gap:8px;">';
            html += '<label for="selectedBrandFilter" style="font-weight:500;white-space:nowrap;">Selected Brand:</label>';
            html += '<select id="selectedBrandFilter" onchange="filterDetailBySelectedBrand()" style="padding:8px 10px;border:1px solid #cbd5e1;border-radius:4px;font-size:14px;">';
            html += '<option value="both">Both</option>';
            html += '<option value="yes">Yes</option>';
            html += '<option value="no">No</option>';
            html += '</select>';
            html += '</div>';
            html += '<input type="text" id="searchBox-detail" class="search-box" placeholder="Search this table..." onkeyup="filterTable(\'detail\')">';
            html += '<button type="button" class="export-btn" onclick="exportToExcel(\'detail\')">📥 Export to Excel</button>';
            html += '</div>';
            html += '<span class="search-results-count" id="searchCount-detail"></span>';
            html += buildDetailTable(detailData.records, scriptUrl);
            html += '</div>';

            return html;
        }

        /**
         * Gets summary data from database
         * @param {string} startDate - Start date filter
         * @param {string} endDate - End date filter
         * @param {string} department - Department filter
         * @returns {Object} Summary data with category totals
         */
function getSummaryData(startDate, endDate, department, brand1Id, brand2Id, brand3Id, brand4Id, brand5Id, brand6Id) {
            var results = [];
            var categoryTotals = {};
            
            try {
                // Get brand list and filter selected brands
                var brandList = getBrandList();
                var brandIds = [brand1Id, brand2Id, brand3Id, brand4Id, brand5Id, brand6Id].filter(function(id) { return id && id !== ''; });
                log.debug('Brand IDs', 'brandIds: ' + JSON.stringify(brandIds));
                
                var selectedBrands = getBrandNames(brandList, brandIds);
                log.debug('Selected Brands', 'selectedBrands: ' + JSON.stringify(selectedBrands));
                
                // Build dynamic brand CASE statements for amounts and quantities
                var brandCases = '';
                var brandQtyCases = '';
                for (var i = 0; i < brandIds.length; i++) {
                    brandCases += '    SUM(CASE WHEN i.custitem_bas_item_brand = ' + brandIds[i] + ' THEN tl.netAmount * -1 ELSE 0 END) AS brand' + i + '_amount, ';
                    brandQtyCases += '    SUM(CASE WHEN i.custitem_bas_item_brand = ' + brandIds[i] + ' THEN tl.quantity * -1 ELSE 0 END) AS brand' + i + '_qty, ';
                }
                
                // Build NOT IN clause for other brands
                var otherBrandsCondition = brandIds.length > 0 
                    ? 'i.custitem_bas_item_brand NOT IN (' + brandIds.join(', ') + ')' 
                    : 'i.custitem_bas_item_brand IS NOT NULL';
                
                var sql = 
                    'SELECT ' +
                    '    CASE ' +
                    '        WHEN INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') > 0 ' +
                    '        THEN SUBSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), 1, INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') - 1) ' +
                    '        ELSE REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\') ' +
                    '    END AS class_1, ' +
                    '    CASE ' +
                    '        WHEN INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\', 1, 2) > 0 ' +
                    '        THEN SUBSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), ' +
                    '                   INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') + 1, ' +
                    '                   INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\', 1, 2) - INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') - 1) ' +
                    '        WHEN INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') > 0 ' +
                    '        THEN SUBSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') + 1) ' +
                    '        ELSE NULL ' +
                    '    END AS class_2, ' +
                    '    CASE ' +
                    '        WHEN INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\', 1, 2) > 0 ' +
                    '        THEN SUBSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\', 1, 2) + 1) ' +
                    '        ELSE NULL ' +
                    '    END AS class_3, ' +
                    brandCases +
                    brandQtyCases +
                    '    SUM(CASE WHEN ' + otherBrandsCondition + ' THEN tl.netAmount * -1 ELSE 0 END) AS other_brands_amount, ' +
                    '    SUM(CASE WHEN ' + otherBrandsCondition + ' THEN tl.quantity * -1 ELSE 0 END) AS other_brands_qty, ' +
                    '    SUM(tl.netAmount * -1) AS total_amount, ' +
                    '    COUNT(DISTINCT t.id) AS transaction_count, ' +
                    '    SUM(tl.quantity * -1) AS line_count ' +
                    'FROM transaction t ' +
                    'INNER JOIN transactionline tl ON tl.transaction = t.id ' +
                    'INNER JOIN item i ON tl.item = i.id ' +
                    'LEFT JOIN department dept ON dept.id = tl.department ' +
                    'WHERE t.type IN (\'CustInvc\', \'CustCred\') ' +
                    '    AND i.custitem_ns_temp_prod IS NOT NULL ';

                // Add date filters
                if (startDate) {
                    sql += ' AND t.trandate >= TO_DATE(\'' + startDate + '\', \'YYYY-MM-DD\')';
                }
                if (endDate) {
                    sql += ' AND t.trandate <= TO_DATE(\'' + endDate + '\', \'YYYY-MM-DD\')';
                }
                
                // Add department filter (case-insensitive)
                if (department) {
                    sql += ' AND UPPER(dept.name) LIKE \'%' + department.replace(/'/g, '\'\'').toUpperCase() + '%\'';
                }

                sql += ' ' +
                    'GROUP BY ' +
                    '    CASE WHEN INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') > 0 THEN SUBSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), 1, INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') - 1) ELSE REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\') END, ' +
                    '    CASE WHEN INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\', 1, 2) > 0 THEN SUBSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') + 1, INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\', 1, 2) - INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') - 1) WHEN INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') > 0 THEN SUBSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') + 1) ELSE NULL END, ' +
                    '    CASE WHEN INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\', 1, 2) > 0 THEN SUBSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\', 1, 2) + 1) ELSE NULL END ' +
                    'ORDER BY class_1, class_2, class_3';

                log.debug('Summary SQL', sql);

                var resultSet = query.runSuiteQL({
                    query: sql
                });

                var mappedResults = resultSet.asMappedResults();
                log.debug('Summary Results', 'Count: ' + mappedResults.length);

                for (var i = 0; i < mappedResults.length; i++) {
                    var row = mappedResults[i];
                    var category = row.class_1 || '-';
                    
                    // Initialize category totals if not exists
                    if (!categoryTotals[category]) {
                        categoryTotals[category] = {
                            brandAmounts: [],
                            otherBrandsAmount: 0,
                            totalAmount: 0
                        };
                        // Initialize brand amounts array
                        for (var b = 0; b < brandIds.length; b++) {
                            categoryTotals[category].brandAmounts.push(0);
                        }
                    }
                    
                    // Accumulate category totals for each brand
                    for (var b = 0; b < brandIds.length; b++) {
                        var brandAmount = parseFloat(row['brand' + b + '_amount']) || 0;
                        categoryTotals[category].brandAmounts[b] += brandAmount;
                    }
                    categoryTotals[category].otherBrandsAmount += parseFloat(row.other_brands_amount) || 0;
                    categoryTotals[category].totalAmount += parseFloat(row.total_amount) || 0;
                    
                    // Build result record with dynamic brand amounts and quantities
                    var record = {
                        class1: category,
                        class2: row.class_2 || '-',
                        class3: row.class_3 || '-',
                        brandAmounts: [],
                        brandQuantities: [],
                        otherBrandsAmount: parseFloat(row.other_brands_amount) || 0,
                        otherBrandsQty: parseInt(row.other_brands_qty) || 0,
                        totalAmount: parseFloat(row.total_amount) || 0,
                        transactionCount: parseInt(row.transaction_count) || 0,
                        lineCount: parseInt(row.line_count) || 0
                    };
                    
                    // Add brand amounts and quantities to record
                    for (var b = 0; b < brandIds.length; b++) {
                        record.brandAmounts.push(parseFloat(row['brand' + b + '_amount']) || 0);
                        record.brandQuantities.push(parseInt(row['brand' + b + '_qty']) || 0);
                    }
                    
                    results.push(record);
                }

            } catch (e) {
                log.error('Error in getSummaryData', {
                    error: e.message,
                    stack: e.stack
                });
            }

            return {
                records: results,
                categoryTotals: categoryTotals,
                selectedBrands: selectedBrands,
                brandCount: brandIds.length
            };
        }

        /**
         * Gets list of all brands from database
         * @returns {Array} Array of brand objects with id, name, and parent_company
         */
        function getBrandList() {
            try {
                var sql = 
                    'SELECT brand.id, brand.name, parent.name AS parent_company ' +
                    'FROM customrecord_bas_brand_name_list brand ' +
                    'LEFT JOIN customlist_bas_parent_company_list parent ' +
                    '    ON parent.id = brand.custrecord_bas_parent_company ' +
                    'ORDER BY brand.name';
                
                var resultSet = query.runSuiteQL({query: sql});
                var brands = resultSet.asMappedResults();
                
                log.debug('Brand List Loaded', brands.length + ' brands found');
                return brands;
            } catch (e) {
                log.error('Error loading brand list', {
                    error: e.message,
                    stack: e.stack
                });
                return [];
            }
        }

        /**
         * Gets brand names from brand IDs
         * @param {Array} brandList - Full list of brands
         * @param {Array} brandIds - Array of brand IDs to lookup
         * @returns {Array} Array of brand name strings
         */
        function getBrandNames(brandList, brandIds) {
            var names = [];
            for (var i = 0; i < brandIds.length; i++) {
                if (!brandIds[i]) {
                    names.push(null);
                    continue;
                }
                var brand = null;
                for (var j = 0; j < brandList.length; j++) {
                    // Compare as strings to handle type mismatches
                    if (String(brandList[j].id) === String(brandIds[i])) {
                        brand = brandList[j];
                        break;
                    }
                }
                names.push(brand ? brand.name : null);
            }
            return names;
        }

        /**
         * Builds brand selector dropdowns
         * @param {Array} brandList - List of all brands
         * @param {string} brand1Id - Selected brand 1 ID
         * @param {string} brand2Id - Selected brand 2 ID
         * @param {string} brand3Id - Selected brand 3 ID
         * @param {string} brand4Id - Selected brand 4 ID
         * @returns {string} HTML for brand selector dropdowns
         */
        function buildBrandSelectors(brandList, brand1Id, brand2Id, brand3Id, brand4Id, brand5Id, brand6Id) {
            var html = '';
            
            html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">';
            
            var brandIds = [brand1Id, brand2Id, brand3Id, brand4Id, brand5Id, brand6Id];
            var labels = ['Brand 1:', 'Brand 2:', 'Brand 3:', 'Brand 4:', 'Brand 5:', 'Brand 6:'];
            
            for (var b = 0; b < 6; b++) {
                html += '<div>';
                html += '<label for="brand' + (b + 1) + '" style="display: block; margin-bottom: 5px; font-weight: 500;">' + labels[b] + '</label>';
                html += '<select id="brand' + (b + 1) + '" name="brand' + (b + 1) + '" style="padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 14px; width: 100%;">';
                html += '<option value="">-- None --</option>';
                
                for (var i = 0; i < brandList.length; i++) {
                    // Compare as strings to handle type mismatches
                    var selected = String(brandList[i].id) === String(brandIds[b]) ? ' selected' : '';
                    var displayName = escapeHtml(brandList[i].name);
                    if (brandList[i].parent_company) {
                        displayName += ' (' + escapeHtml(brandList[i].parent_company) + ')';
                    }
                    html += '<option value="' + escapeHtml(brandList[i].id) + '"' + selected + '>' + displayName + '</option>';
                }
                
                html += '</select>';
                html += '</div>';
            }
            
            html += '</div>';
            
            return html;
        }

        /**
         * Gets detail data from database
         * @param {string} class1 - Class 1 filter
         * @param {string} class2 - Class 2 filter
         * @param {string} class3 - Class 3 filter
         * @param {string} brand - Brand filter
         * @param {string} startDate - Start date filter
         * @param {string} endDate - End date filter
         * @param {string} department - Department filter
         * @param {string} brand1Id - Brand 1 ID
         * @param {string} brand2Id - Brand 2 ID
         * @param {string} brand3Id - Brand 3 ID
         * @param {string} brand4Id - Brand 4 ID
         * @returns {Object} Detail data with count info
         */
        function getDetailData(class1, class2, class3, brand, startDate, endDate, department, brand1Id, brand2Id, brand3Id, brand4Id, brand5Id, brand6Id) {
            var results = [];
            var totalCount = 0;
            
            // Build list of selected brand IDs for comparison
            var selectedBrandIds = [brand1Id, brand2Id, brand3Id, brand4Id, brand5Id, brand6Id].filter(function(id) { return id && id !== ''; });

            try {
                // First, get the total count
                var countSql = 
                    'SELECT COUNT(*) AS total_count ' +
                    'FROM transaction t ' +
                    'INNER JOIN transactionline tl ON tl.transaction = t.id ' +
                    'INNER JOIN item i ON tl.item = i.id ' +
                    'LEFT JOIN customrecord_bas_brand_name_list brand ON brand.id = i.custitem_bas_item_brand ' +
                    'LEFT JOIN customer cust ON cust.id = t.entity ' +
                    'LEFT JOIN department dept ON dept.id = tl.department ' +
                    'WHERE t.type IN (\'CustInvc\', \'CustCred\') ' +
                    '    AND i.custitem_ns_temp_prod IS NOT NULL ';

                // Add filters to count query
                var conditions = [];
                if (class1 && class1 !== '-') {
                    conditions.push('CASE WHEN INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') > 0 THEN SUBSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), 1, INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') - 1) ELSE REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\') END = \'' + class1.replace(/'/g, '\'\'') + '\'');
                }
                if (class2 && class2 !== '-') {
                    conditions.push('CASE WHEN INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\', 1, 2) > 0 THEN SUBSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') + 1, INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\', 1, 2) - INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') - 1) WHEN INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') > 0 THEN SUBSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') + 1) ELSE NULL END = \'' + class2.replace(/'/g, '\'\'') + '\'');
                }
                if (class3 && class3 !== '-') {
                    conditions.push('CASE WHEN INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\', 1, 2) > 0 THEN SUBSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\', 1, 2) + 1) ELSE NULL END = \'' + class3.replace(/'/g, '\'\'') + '\'');
                }
                if (brand && brand !== '-') {
                    conditions.push('brand.name = \'' + brand.replace(/'/g, '\'\'') + '\'');
                }
                if (department) {
                    conditions.push('UPPER(dept.name) LIKE \'%' + department.replace(/'/g, '\'\'').toUpperCase() + '%\'');
                }

                if (conditions.length > 0) {
                    countSql += ' AND ' + conditions.join(' AND ');
                }

                // Add date filters to count query
                if (startDate) {
                    countSql += ' AND t.trandate >= TO_DATE(\'' + startDate + '\', \'YYYY-MM-DD\')';
                }
                if (endDate) {
                    countSql += ' AND t.trandate <= TO_DATE(\'' + endDate + '\', \'YYYY-MM-DD\')';
                }

                log.debug('Count SQL', countSql);

                var countResultSet = query.runSuiteQL({
                    query: countSql
                });

                var countResults = countResultSet.asMappedResults();
                if (countResults.length > 0) {
                    totalCount = parseInt(countResults[0].total_count) || 0;
                }

                log.debug('Total Count', totalCount);

                // Now get the detail data
                var sql = 
                    'SELECT ' +
                    '    CASE ' +
                    '        WHEN INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') > 0 ' +
                    '        THEN SUBSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), 1, INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') - 1) ' +
                    '        ELSE REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\') ' +
                    '    END AS class_1, ' +
                    '    CASE ' +
                    '        WHEN INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\', 1, 2) > 0 ' +
                    '        THEN SUBSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), ' +
                    '                   INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') + 1, ' +
                    '                   INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\', 1, 2) - INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') - 1) ' +
                    '        WHEN INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') > 0 ' +
                    '        THEN SUBSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') + 1) ' +
                    '        ELSE NULL ' +
                    '    END AS class_2, ' +
                    '    CASE ' +
                    '        WHEN INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\', 1, 2) > 0 ' +
                    '        THEN SUBSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\', 1, 2) + 1) ' +
                    '        ELSE NULL ' +
                    '    END AS class_3, ' +
                    '    i.custitem_bas_item_brand AS item_brand_id, ' +
                    '    brand.name AS item_brand_name, ' +
                    '    i.itemid AS item_number, ' +
                    '    dept.name AS department_name, ' +
                    '    t.id AS transaction_id, ' +
                    '    t.tranid AS transaction_number, ' +
                    '    t.trandate AS transaction_date, ' +
                    '    cust.altname AS customer_name, ' +
                    '    tl.quantity * -1 AS quantity, ' +
                    '    CASE WHEN t.type = \'CustCred\' THEN tl.rate * -1 ELSE tl.rate END AS rate, ' +
                    '    CASE WHEN i.custitem_bas_item_brand = 48 THEN tl.netAmount * -1 ELSE 0 END AS profile_amount, ' +
                    '    CASE WHEN i.custitem_bas_item_brand = 26 THEN tl.netAmount * -1 ELSE 0 END AS ge_amount, ' +
                    '    CASE WHEN i.custitem_bas_item_brand = 15 THEN tl.netAmount * -1 ELSE 0 END AS cafe_amount, ' +
                    '    CASE WHEN i.custitem_bas_item_brand = 43 THEN tl.netAmount * -1 ELSE 0 END AS monogram_amount, ' +
                    '    CASE WHEN i.custitem_bas_item_brand NOT IN (48, 26, 15, 43) THEN tl.netAmount * -1 ELSE 0 END AS other_brands_amount, ' +
                    '    tl.netAmount * -1 AS amount ' +
                    'FROM transaction t ' +
                    'INNER JOIN transactionline tl ON tl.transaction = t.id ' +
                    'INNER JOIN item i ON tl.item = i.id ' +
                    'LEFT JOIN customrecord_bas_brand_name_list brand ON brand.id = i.custitem_bas_item_brand ' +
                    'LEFT JOIN customer cust ON cust.id = t.entity ' +
                    'LEFT JOIN department dept ON dept.id = tl.department ' +
                    'WHERE t.type IN (\'CustInvc\', \'CustCred\') ' +
                    '    AND i.custitem_ns_temp_prod IS NOT NULL ';

                // Add filters
                var conditions = [];
                if (class1 && class1 !== '-') {
                    conditions.push('CASE WHEN INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') > 0 THEN SUBSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), 1, INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') - 1) ELSE REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\') END = \'' + class1.replace(/'/g, '\'\'') + '\'');
                }
                if (class2 && class2 !== '-') {
                    conditions.push('CASE WHEN INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\', 1, 2) > 0 THEN SUBSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') + 1, INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\', 1, 2) - INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') - 1) WHEN INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') > 0 THEN SUBSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\') + 1) ELSE NULL END = \'' + class2.replace(/'/g, '\'\'') + '\'');
                }
                if (class3 && class3 !== '-') {
                    conditions.push('CASE WHEN INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\', 1, 2) > 0 THEN SUBSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), INSTR(REPLACE(i.custitem_ns_temp_prod, \'Built-In\', \'BuiltIn\'), \'-\', 1, 2) + 1) ELSE NULL END = \'' + class3.replace(/'/g, '\'\'') + '\'');
                }
                if (brand && brand !== '-') {
                    conditions.push('brand.name = \'' + brand.replace(/'/g, '\'\'') + '\'');
                }
                if (department) {
                    conditions.push('UPPER(dept.name) LIKE \'%' + department.replace(/'/g, '\'\'').toUpperCase() + '%\'');
                }

                if (conditions.length > 0) {
                    sql += ' AND ' + conditions.join(' AND ');
                }

                // Add date filters to detail query
                if (startDate) {
                    sql += ' AND t.trandate >= TO_DATE(\'' + startDate + '\', \'YYYY-MM-DD\')';
                }
                if (endDate) {
                    sql += ' AND t.trandate <= TO_DATE(\'' + endDate + '\', \'YYYY-MM-DD\')';
                }

                sql += ' ORDER BY t.trandate DESC, t.id, tl.id';

                log.debug('Detail SQL', sql);

                var resultSet = query.runSuiteQL({
                    query: sql
                });

                var mappedResults = resultSet.asMappedResults();
                log.debug('Detail Results', 'Count: ' + mappedResults.length);

                for (var i = 0; i < mappedResults.length; i++) {
                    var row = mappedResults[i];
                    
                    // Check if this item's brand is in the selected brands
                    var itemBrandId = row.item_brand_id ? String(row.item_brand_id) : '';
                    var isSelectedBrand = false;
                    for (var b = 0; b < selectedBrandIds.length; b++) {
                        if (String(selectedBrandIds[b]) === itemBrandId) {
                            isSelectedBrand = true;
                            break;
                        }
                    }
                    
                    results.push({
                        class1: row.class_1 || '-',
                        class2: row.class_2 || '-',
                        class3: row.class_3 || '-',
                        brand: row.item_brand_name || '-',
                        itemNumber: row.item_number || '-',
                        department: row.department_name || '-',
                        transactionId: row.transaction_id,
                        transactionNumber: row.transaction_number || '-',
                        transactionDate: row.transaction_date || null,
                        customerName: row.customer_name || '-',
                        quantity: parseFloat(row.quantity) || 0,
                        rate: parseFloat(row.rate) || 0,
                        profileAmount: parseFloat(row.profile_amount) || 0,
                        geAmount: parseFloat(row.ge_amount) || 0,
                        cafeAmount: parseFloat(row.cafe_amount) || 0,
                        monogramAmount: parseFloat(row.monogram_amount) || 0,
                        amount: parseFloat(row.amount) || 0,
                        isSelectedBrand: isSelectedBrand
                    });
                }

            } catch (e) {
                log.error('Error in getDetailData', {
                    error: e.message,
                    stack: e.stack
                });
            }

            return {
                records: results,
                totalCount: totalCount,
                displayedCount: results.length
            };
        }

        /**
         * Builds the summary table
         * @param {Array} data - Summary data
         * @param {Object} categoryTotals - Category totals for percentage calculations
         * @param {Array} selectedBrands - Array of selected brand names
         * @param {number} brandCount - Number of selected brands
         * @param {string} scriptUrl - Suitelet URL
         * @param {string} startDate - Start date filter
         * @param {string} endDate - End date filter
         * @param {string} department - Department filter
         * @param {string} brand1Id - Brand 1 ID
         * @param {string} brand2Id - Brand 2 ID
         * @param {string} brand3Id - Brand 3 ID
         * @param {string} brand4Id - Brand 4 ID
         * @returns {string} HTML table
         */
        function buildSummaryTable(data, categoryTotals, selectedBrands, brandCount, scriptUrl, startDate, endDate, department, brand1Id, brand2Id, brand3Id, brand4Id, brand5Id, brand6Id) {
            var html = '';
            
            // Sort data by category for subtotal grouping
            var sortedData = data.slice().sort(function(a, b) {
                var catCompare = (a.class1 || '').localeCompare(b.class1 || '');
                if (catCompare !== 0) return catCompare;
                var subCatCompare = (a.class2 || '').localeCompare(b.class2 || '');
                if (subCatCompare !== 0) return subCatCompare;
                return (a.class3 || '').localeCompare(b.class3 || '');
            });

            html += '<div class="table-container">';
            html += '<table class="data-table" id="table-summary" data-brand-count="' + brandCount + '">';
            html += '<thead>';
            html += '<tr>';
            html += '<th onclick="sortTable(\'summary\', 0)">Category</th>';
            html += '<th onclick="sortTable(\'summary\', 1)">Sub-Category</th>';
            html += '<th onclick="sortTable(\'summary\', 2)">Configuration</th>';
            
            // Dynamic brand headers
            var colIndex = 3;
            for (var b = 0; b < selectedBrands.length; b++) {
                html += '<th onclick="sortTable(\'summary\', ' + colIndex + ')">' + selectedBrands[b] + '</th>';
                colIndex++;
                html += '<th onclick="sortTable(\'summary\', ' + colIndex + ')">' + selectedBrands[b] + ' %</th>';
                colIndex++;
            }
            
            html += '<th onclick="sortTable(\'summary\', ' + colIndex + ')">Selected Brands Total</th>';
            colIndex++;
            html += '<th onclick="sortTable(\'summary\', ' + colIndex + ')">Selected Brands %</th>';
            colIndex++;
            html += '<th onclick="sortTable(\'summary\', ' + colIndex + ')">All Other Brands Total</th>';
            colIndex++;
            html += '<th onclick="sortTable(\'summary\', ' + colIndex + ')">All Other Brands %</th>';
            colIndex++;
            html += '<th onclick="sortTable(\'summary\', ' + colIndex + ')">All Brands Total</th>';
            colIndex++;
            html += '<th onclick="sortTable(\'summary\', ' + colIndex + ')">All Brands %</th>';
            colIndex++;
            html += '<th onclick="sortTable(\'summary\', ' + colIndex + ')">QTY</th>';
            html += '</tr>';
            html += '</thead>';
            html += '<tbody>';
            
            // Track category for subtotals
            var currentCategory = null;
            var categorySubtotals = null;

            // Initialize totals
            var totals = {
                brandAmounts: [],
                brandQuantities: [],
                selectedBrandsTotal: 0,
                selectedBrandsQty: 0,
                otherBrandsAmount: 0,
                otherBrandsQty: 0,
                totalAmount: 0,
                transactionCount: 0,
                lineCount: 0
            };
            for (var b = 0; b < brandCount; b++) {
                totals.brandAmounts.push(0);
                totals.brandQuantities.push(0);
            }

            for (var i = 0; i < sortedData.length; i++) {
                var row = sortedData[i];
                
                // Check if category changed - insert subtotal for previous category
                if (currentCategory !== null && row.class1 !== currentCategory) {
                    html += generateCategorySubtotal(currentCategory, categorySubtotals, brandCount);
                    categorySubtotals = null;
                }
                
                // Initialize new category tracking
                if (categorySubtotals === null) {
                    currentCategory = row.class1;
                    categorySubtotals = {
                        brandAmounts: [],
                        brandQuantities: [],
                        selectedBrandsTotal: 0,
                        selectedBrandsQty: 0,
                        otherBrandsAmount: 0,
                        otherBrandsQty: 0,
                        totalAmount: 0,
                        lineCount: 0
                    };
                    for (var b = 0; b < brandCount; b++) {
                        categorySubtotals.brandAmounts.push(0);
                        categorySubtotals.brandQuantities.push(0);
                    }
                }
                
                var rowClass = (i % 2 === 0) ? 'even-row' : 'odd-row';

                // Calculate selected brands total for this row
                var selectedBrandsTotal = 0;
                var selectedBrandsQty = 0;
                for (var b = 0; b < row.brandAmounts.length; b++) {
                    selectedBrandsTotal += row.brandAmounts[b];
                    selectedBrandsQty += row.brandQuantities[b];
                    totals.brandAmounts[b] += row.brandAmounts[b];
                    totals.brandQuantities[b] += row.brandQuantities[b];
                }
                
                // Accumulate totals
                totals.selectedBrandsTotal += selectedBrandsTotal;
                totals.selectedBrandsQty += selectedBrandsQty;
                totals.otherBrandsAmount += row.otherBrandsAmount;
                totals.otherBrandsQty += row.otherBrandsQty;
                totals.totalAmount += row.totalAmount;
                totals.transactionCount += row.transactionCount;
                totals.lineCount += row.lineCount;
                
                // Add to category subtotals
                for (var b = 0; b < row.brandAmounts.length; b++) {
                    categorySubtotals.brandAmounts[b] += row.brandAmounts[b];
                    categorySubtotals.brandQuantities[b] += row.brandQuantities[b];
                }
                categorySubtotals.selectedBrandsTotal += selectedBrandsTotal;
                categorySubtotals.selectedBrandsQty += selectedBrandsQty;
                categorySubtotals.otherBrandsAmount += row.otherBrandsAmount;
                categorySubtotals.otherBrandsQty += row.otherBrandsQty;
                categorySubtotals.totalAmount += row.totalAmount;
                categorySubtotals.lineCount += row.lineCount;

                // Build drill-down URLs for different classification levels
                var baseUrl = scriptUrl + '&loadData=T&view=detail';
                var dateParams = '';
                if (startDate) dateParams += '&startdate=' + encodeURIComponent(startDate);
                if (endDate) dateParams += '&enddate=' + encodeURIComponent(endDate);
                if (department) dateParams += '&department=' + encodeURIComponent(department);
                var brandParams = '';
                if (brand1Id) brandParams += '&brand1=' + encodeURIComponent(brand1Id);
                if (brand2Id) brandParams += '&brand2=' + encodeURIComponent(brand2Id);
                if (brand3Id) brandParams += '&brand3=' + encodeURIComponent(brand3Id);
                if (brand4Id) brandParams += '&brand4=' + encodeURIComponent(brand4Id);
                if (brand5Id) brandParams += '&brand5=' + encodeURIComponent(brand5Id);
                if (brand6Id) brandParams += '&brand6=' + encodeURIComponent(brand6Id);
                
                // URL with only Category
                var class1Url = baseUrl + '&class1=' + encodeURIComponent(row.class1) + dateParams + brandParams;
                
                // URL with Category + Sub-Category
                var class2Url = baseUrl + '&class1=' + encodeURIComponent(row.class1) + '&class2=' + encodeURIComponent(row.class2) + dateParams + brandParams;
                
                // URL with all three (Category + Sub-Category + Configuration)
                var drillUrl = baseUrl + '&class1=' + encodeURIComponent(row.class1) + '&class2=' + encodeURIComponent(row.class2) + '&class3=' + encodeURIComponent(row.class3) + dateParams + brandParams;

                // Calculate percentages for this row
                var catTotal = categoryTotals[row.class1] || {brandAmounts: [], otherBrandsAmount: 0, totalAmount: 0};
                
                html += '<tr class="' + rowClass + ' clickable-row" onclick="window.location.href=\'' + drillUrl + '\'">';
                html += '<td class="class-cell" onclick="event.stopPropagation(); window.location.href=\'' + class1Url + '\'" title="Click to view all ' + escapeHtml(formatDisplayText(row.class1)) + ' items">' + escapeHtml(formatDisplayText(row.class1)) + '</td>';
                html += '<td class="class-cell" onmouseover="highlightClassificationCells(this.parentNode, 1)" onmouseout="clearClassificationHighlight(this.parentNode)" onclick="event.stopPropagation(); window.location.href=\'' + class2Url + '\'" title="Click to view ' + escapeHtml(formatDisplayText(row.class1)) + ' > ' + escapeHtml(formatDisplayText(row.class2)) + ' items">' + escapeHtml(formatDisplayText(row.class2)) + '</td>';
                html += '<td class="class-cell" onmouseover="highlightClassificationCells(this.parentNode, 2)" onmouseout="clearClassificationHighlight(this.parentNode)" onclick="event.stopPropagation(); window.location.href=\'' + drillUrl + '\'" title="Click to view ' + escapeHtml(formatDisplayText(row.class1)) + ' > ' + escapeHtml(formatDisplayText(row.class2)) + ' > ' + escapeHtml(formatDisplayText(row.class3)) + ' items">' + escapeHtml(formatDisplayText(row.class3)) + '</td>';
                
                // Dynamic brand columns
                for (var b = 0; b < row.brandAmounts.length; b++) {
                    var brandAmount = row.brandAmounts[b];
                    var brandQty = row.brandQuantities[b];
                    var catBrandTotal = catTotal.brandAmounts && catTotal.brandAmounts[b] ? catTotal.brandAmounts[b] : 0;
                    var brandPct = catBrandTotal > 0 ? (brandAmount / catBrandTotal * 100).toFixed(2) : '0.00';
                    
                    html += '<td class="amount" style="background-color: rgba(144, 238, 144, 0.15);" title="Quantity: ' + brandQty + '">' + formatCurrency(brandAmount) + '</td>';
                    html += '<td class="amount percent">' + brandPct + '%</td>';
                }
                
                var selectedBrandsPct = catTotal.totalAmount > 0 ? (selectedBrandsTotal / catTotal.totalAmount * 100).toFixed(2) : '0.00';
                var otherBrandsPct = catTotal.otherBrandsAmount > 0 ? (row.otherBrandsAmount / catTotal.otherBrandsAmount * 100).toFixed(2) : '0.00';
                var allBrandsPct = catTotal.totalAmount > 0 ? (row.totalAmount / catTotal.totalAmount * 100).toFixed(2) : '0.00';

                html += '<td class="amount total-amount" title="Quantity: ' + selectedBrandsQty + '">' + formatCurrency(selectedBrandsTotal) + '</td>';
                html += '<td class="amount percent">' + selectedBrandsPct + '%</td>';
                html += '<td class="amount total-amount" title="Quantity: ' + row.otherBrandsQty + '">' + formatCurrency(row.otherBrandsAmount) + '</td>';
                html += '<td class="amount percent">' + otherBrandsPct + '%</td>';
                html += '<td class="amount total-amount">' + formatCurrency(row.totalAmount) + '</td>';
                html += '<td class="amount percent">' + allBrandsPct + '%</td>';
                html += '<td class="center">' + row.lineCount + '</td>';
                html += '</tr>';
            }
            
            // Add final category subtotal
            if (currentCategory !== null && categorySubtotals !== null) {
                html += generateCategorySubtotal(currentCategory, categorySubtotals, brandCount);
            }
            
            // Helper function to generate category subtotal row
            function generateCategorySubtotal(category, subtotals, brandCount) {
                var subtotalHtml = '<tr class="category-subtotal-row" data-category="' + escapeHtml(category || '') + '">';
                subtotalHtml += '<td colspan="3">Subtotal: ' + escapeHtml(formatDisplayText(category || 'Unknown')) + '</td>';
                
                for (var b = 0; b < brandCount; b++) {
                    subtotalHtml += '<td class="amount" style="background-color: rgba(144, 238, 144, 0.15);" title="Quantity: ' + subtotals.brandQuantities[b] + '">' + formatCurrency(subtotals.brandAmounts[b]) + '</td>';
                    subtotalHtml += '<td></td>';
                }
                
                subtotalHtml += '<td class="amount total-amount" title="Quantity: ' + subtotals.selectedBrandsQty + '">' + formatCurrency(subtotals.selectedBrandsTotal) + '</td>';
                subtotalHtml += '<td></td>';
                subtotalHtml += '<td class="amount total-amount" title="Quantity: ' + subtotals.otherBrandsQty + '">' + formatCurrency(subtotals.otherBrandsAmount) + '</td>';
                subtotalHtml += '<td></td>';
                subtotalHtml += '<td class="amount total-amount">' + formatCurrency(subtotals.totalAmount) + '</td>';
                subtotalHtml += '<td></td>';
                subtotalHtml += '<td class="center">' + subtotals.lineCount + '</td>';
                subtotalHtml += '</tr>';
                
                return subtotalHtml;
            }

            // Add summary row
            html += '<tr class="summary-row">';
            html += '<td></td>'; // Empty cell for Category column
            html += '<td></td>'; // Empty cell for Sub-Category column
            html += '<td style="text-align: right; font-weight: bold;">Total:</td>';
            
            // Dynamic brand totals
            for (var b = 0; b < totals.brandAmounts.length; b++) {
                html += '<td class="amount" style="background-color: rgba(144, 238, 144, 0.15);" title="Quantity: ' + totals.brandQuantities[b] + '">' + formatCurrency(totals.brandAmounts[b]) + '</td>';
                html += '<td></td>'; // Empty cell for brand %
            }
            
            html += '<td class="amount total-amount" title="Quantity: ' + totals.selectedBrandsQty + '">' + formatCurrency(totals.selectedBrandsTotal) + '</td>';
            html += '<td></td>'; // Empty cell for Selected Brands %
            html += '<td class="amount total-amount" title="Quantity: ' + totals.otherBrandsQty + '">' + formatCurrency(totals.otherBrandsAmount) + '</td>';
            html += '<td></td>'; // Empty cell for All Other Brands %
            html += '<td class="amount total-amount">' + formatCurrency(totals.totalAmount) + '</td>';
            html += '<td></td>'; // Empty cell for All Brands %
            html += '<td class="center">' + totals.lineCount + '</td>';
            html += '</tr>';

            html += '</tbody>';
            html += '</table>';
            html += '</div>';

            return html;
        }

        /**
         * Builds the detail table
         * @param {Array} data - Detail data
         * @param {string} scriptUrl - Suitelet URL
         * @returns {string} HTML table
         */
        function buildDetailTable(data, scriptUrl) {
            var html = '';

            html += '<div class="table-container">';
            html += '<table class="data-table" id="table-detail">';
            html += '<thead>';
            html += '<tr>';
            html += '<th onclick="sortTable(\'detail\', 0)">Category</th>';
            html += '<th onclick="sortTable(\'detail\', 1)">Sub-Category</th>';
            html += '<th onclick="sortTable(\'detail\', 2)">Config</th>';
            html += '<th onclick="sortTable(\'detail\', 3)">Selected Brand</th>';
            html += '<th onclick="sortTable(\'detail\', 4)">Brand</th>';
            html += '<th onclick="sortTable(\'detail\', 5)">Item #</th>';
            html += '<th onclick="sortTable(\'detail\', 6)">Selling Location</th>';
            html += '<th onclick="sortTable(\'detail\', 7)">Transaction #</th>';
            html += '<th onclick="sortTable(\'detail\', 8)">Date</th>';
            html += '<th onclick="sortTable(\'detail\', 9)">Customer</th>';
            html += '<th onclick="sortTable(\'detail\', 10)">Qty</th>';
            html += '<th onclick="sortTable(\'detail\', 11)">Rate</th>';
            html += '<th onclick="sortTable(\'detail\', 12)">Amount</th>';
            html += '</tr>';
            html += '</thead>';
            html += '<tbody>';

            // Calculate totals
            var totals = {
                quantity: 0,
                amount: 0
            };

            for (var i = 0; i < data.length; i++) {
                var row = data[i];
                var rowClass = (i % 2 === 0) ? 'even-row' : 'odd-row';

                // Accumulate totals
                totals.quantity += row.quantity;
                totals.amount += row.amount;

                html += '<tr class="' + rowClass + '" data-selected-brand="' + (row.isSelectedBrand ? 'yes' : 'no') + '">';
                html += '<td>' + escapeHtml(formatDisplayText(row.class1)) + '</td>';
                html += '<td>' + escapeHtml(formatDisplayText(row.class2)) + '</td>';
                html += '<td>' + escapeHtml(formatDisplayText(row.class3)) + '</td>';
                html += '<td class="center" style="' + (row.isSelectedBrand ? 'font-weight:bold;color:#2E7D32;' : 'color:#666;') + '">' + (row.isSelectedBrand ? 'Yes' : 'No') + '</td>';
                html += '<td>' + escapeHtml(row.brand) + '</td>';
                html += '<td>' + escapeHtml(row.itemNumber) + '</td>';
                html += '<td>' + escapeHtml(row.department) + '</td>';
                html += '<td><a href="/app/accounting/transactions/custinvc.nl?id=' + row.transactionId + '" target="_blank">' + escapeHtml(row.transactionNumber) + '</a></td>';
                html += '<td data-date="' + (row.transactionDate || '') + '">' + formatDate(row.transactionDate) + '</td>';
                html += '<td>' + escapeHtml(row.customerName) + '</td>';
                html += '<td class="amount">' + row.quantity.toFixed(2) + '</td>';
                html += '<td class="amount" data-value="' + row.rate + '">' + formatCurrency(row.rate, true) + '</td>';
                html += '<td class="amount total-amount" data-value="' + row.amount + '">' + formatCurrency(row.amount, true) + '</td>';
                html += '</tr>';
            }

            // Add summary row
            html += '<tr class="summary-row">';
            html += '<td colspan="10" style="text-align: right; font-weight: bold;">Total:</td>';
            html += '<td class="amount">' + totals.quantity.toFixed(2) + '</td>';
            html += '<td class="amount"></td>'; // Empty Rate column
            html += '<td class="amount total-amount" data-value="' + totals.amount + '">' + formatCurrency(totals.amount, true) + '</td>';
            html += '</tr>';

            html += '</tbody>';
            html += '</table>';
            html += '</div>';

            return html;
        }

        /**
         * Formats a currency value
         * @param {number} value - Currency value
         * @param {boolean} preserveSign - If true, preserve negative sign for detail view
         * @returns {string} Formatted currency
         */
        function formatCurrency(value, preserveSign) {
            if (!value && value !== 0) return '$0.00';
            var absValue = Math.abs(value);
            var formatted = '$' + absValue.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
            if (preserveSign && value < 0) {
                formatted = '(' + formatted + ')';
            }
            return formatted;
        }

        /**
         * Formats a date value
         * @param {string} dateValue - Date string
         * @returns {string} Formatted date
         */
        function formatDate(dateValue) {
            if (!dateValue) return '-';

            try {
                var date = new Date(dateValue);
                var month = date.getMonth() + 1;
                var day = date.getDate();
                var year = date.getFullYear();
                return month + '/' + day + '/' + year;
            } catch (e) {
                return dateValue;
            }
        }

        /**
         * Formats display text to convert BuiltIn back to Built-In
         * @param {string} text - Text to format
         * @returns {string} Formatted text
         */
        function formatDisplayText(text) {
            if (!text || text === '-') return text;
            return text.replace(/BuiltIn/g, 'Built-In');
        }

        /**
         * Escapes HTML special characters
         * @param {string} text - Text to escape
         * @returns {string} Escaped text
         */
        function escapeHtml(text) {
            if (!text) return '';
            var map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return String(text).replace(/[&<>"']/g, function (m) { return map[m]; });
        }

        /**
         * Returns CSS styles for the page
         * @returns {string} CSS content
         */
        function getStyles() {
            return '' +
                '/* Remove NetSuite default borders */' +
                '.uir-page-title-secondline { border: none !important; margin: 0 !important; padding: 0 !important; }' +
                '.uir-record-type { border: none !important; }' +
                '.bglt { border: none !important; }' +
                '.smalltextnolink { border: none !important; }' +
                '' +
                '/* Main container */' +
                '.portal-container { margin: 0; padding: 10px 20px 10px 5px; border: none; background: transparent; position: relative; box-sizing: border-box; max-width: 100vw; }' +
                '' +
                '/* Section styles */' +
                '.section-title { font-size: 24px; font-weight: bold; margin: 0 0 10px 0; color: #333; }' +
                '.section-description { font-style: italic; color: #666; margin: 0 0 20px 0; font-size: 14px; }' +
                '' +
                '/* Date filter section */' +
                '.date-filter-section { background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 15px; margin: 0 15px 20px 0; box-sizing: border-box; overflow-x: auto; }' +
                '.date-filter-inputs { display: flex; gap: 15px; align-items: center; flex-wrap: wrap; }' +
                '.date-filter-inputs label { font-weight: 600; color: #333; font-size: 14px; }' +
                '.date-filter-inputs input[type="date"] { padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 14px; }' +
                '.filter-btn { padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s; }' +
                '.filter-btn:hover { background: #45a049; }' +
                '.clear-btn { padding: 8px 16px; background: #757575; color: white; border: none; border-radius: 4px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s; }' +
                '.clear-btn:hover { background: #616161; }' +
                '' +
                '/* Back button */' +
                '.back-button-container { margin-bottom: 20px; }' +
                '.back-button { display: inline-block; padding: 10px 16px; background: #607D8B; color: white; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 600; transition: background 0.2s; }' +
                '.back-button:hover { background: #546E7A; text-decoration: none; }' +
                '' +
                '/* Filter display */' +
                '.filter-display { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 14px; color: #333; box-sizing: border-box; overflow-x: auto; }' +
                '' +
                '/* Record count display */' +
                '.record-count { background: #e8f5e9; border: 1px solid #a5d6a7; border-radius: 6px; padding: 12px; margin-bottom: 15px; font-size: 14px; color: #2e7d32; box-sizing: border-box; }' +
                '.limit-warning { color: #ff6f00; font-weight: bold; }' +
                '' +
                '/* Search section */' +
                '.search-section { margin-bottom: 30px; }' +
                '' +
                '/* Search box container */' +
                '.search-box-container { margin: 0 0 15px 0; padding: 12px 10px; background: white; border-bottom: 3px solid #4CAF50; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); display: flex; gap: 10px; align-items: center; box-sizing: border-box; overflow-x: auto; }' +
                '.search-box { flex: 1; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 14px; box-sizing: border-box; min-width: 0; }' +
                '.search-box:focus { outline: none; border-color: #4CAF50; box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.15); }' +
                '.search-results-count { display: none; margin-left: 10px; color: #6c757d; font-size: 13px; font-style: italic; }' +
                '.export-btn { padding: 10px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: background 0.2s; flex-shrink: 0; }' +
                '.export-btn:hover { background: #45a049; }' +
                '.export-btn:active { background: #3d8b40; }' +
                '' +
                '/* Table container */' +
                '.table-container { overflow: visible; }' +
                '' +
                '/* Data table styles */' +
                'table.data-table { border-collapse: separate; border-spacing: 0; width: 100%; margin: 0; border: 1px solid #ddd; background: white; }' +
                'table.data-table thead th { position: -webkit-sticky; position: sticky; top: 0; z-index: 101; background-color: #f8f9fa; border: 1px solid #ddd; padding: 10px 8px; text-align: left; vertical-align: top; font-weight: bold; color: #333; font-size: 12px; cursor: pointer; user-select: none; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }' +
                'table.data-table thead th:hover { background-color: #e9ecef; }' +
                'table.data-table th, table.data-table td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; color: #000; }' +
                'table.data-table tbody tr:nth-child(even) td { background-color: #f9f9f9; }' +
                'table.data-table tbody tr:hover td { background-color: #fffae6 !important; }' +
                'table.data-table td.class-cell { cursor: pointer; position: relative; }' +
                'table.data-table td.class-cell:hover { background-color: #ffd700 !important; font-weight: 500; }' +
                'table.data-table td.class-cell.hierarchy-hover { background-color: #ffd700 !important; font-weight: 500; }' +
                'table.data-table a { color: #0c5460; text-decoration: none; }' +
                'table.data-table a:hover { text-decoration: underline; }' +
                'table.data-table td.amount { text-align: right !important; white-space: nowrap; }' +
                'table.data-table td.center { text-align: center !important; }' +
                'table.data-table td.total-amount { font-weight: bold; color: #2E7D32; }' +
                'table.data-table td.percent { color: #666; font-size: 11px; }' +
                '' +
                '/* Clickable rows */' +
                '.clickable-row { cursor: pointer; transition: background-color 0.2s; }' +
                '.clickable-row:hover td { background-color: #e3f2fd !important; }' +
                '' +
                '/* Category subtotal row styles */' +
                '.category-subtotal-row { background: #fff3cd !important; font-weight: 600; border-top: 2px solid #ffc107 !important; border-bottom: 2px solid #ffc107 !important; }' +
                '.category-subtotal-row td { background: #fff3cd !important; }' +
                '.category-subtotal-row:hover td { background: #fff3cd !important; }' +
                '.category-subtotal-row td:first-child { font-style: italic; color: #856404; padding-left: 20px !important; }' +
                '' +
                '/* Summary row */' +
                '.summary-row { background-color: #f0f0f0 !important; border-top: 2px solid #333 !important; font-weight: bold; position: sticky; bottom: 0; z-index: 100; box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1); }' +
                '.summary-row td { background-color: #f0f0f0 !important; font-weight: bold; }' +
                '.summary-row:hover td { background-color: #e0e0e0 !important; }';
        }

        /**
         * Returns JavaScript for the page
         * @param {string} scriptUrl - Suitelet URL
         * @returns {string} JavaScript content
         */
        function getJavaScript(scriptUrl) {
            return '' +
                '/* Format currency value */' +
                'function formatCurrency(value, preserveSign) {' +
                '    if (!value && value !== 0) return \'$0.00\';' +
                '    var absValue = Math.abs(value);' +
                '    var formatted = \'$\' + absValue.toFixed(2).replace(/\\d(?=(\\d{3})+\\.)/g, \'$&,\');' +
                '    if (preserveSign && value < 0) {' +
                '        formatted = \'(\' + formatted + \')\';' +
                '    }' +
                '    return formatted;' +
                '}' +
                '' +
                '/* Apply date filter */' +
                'function applyDateFilter() {' +
                '    var startDate = document.getElementById("startdate").value;' +
                '    var endDate = document.getElementById("enddate").value;' +
                '    var department = document.getElementById("department").value;' +
                '    var brand1 = document.getElementById("brand1").value;' +
                '    var brand2 = document.getElementById("brand2").value;' +
                '    var brand3 = document.getElementById("brand3").value;' +
                '    var brand4 = document.getElementById("brand4").value;' +
                '    var brand5 = document.getElementById("brand5").value;' +
                '    var brand6 = document.getElementById("brand6").value;' +
                '    var overlay = document.getElementById("loadingOverlay");' +
                '    if (overlay) overlay.style.display = "flex";' +
                '    var url = "' + scriptUrl + '&loadData=T";' +
                '    if (startDate) url += "&startdate=" + encodeURIComponent(startDate);' +
                '    if (endDate) url += "&enddate=" + encodeURIComponent(endDate);' +
                '    if (department) url += "&department=" + encodeURIComponent(department);' +
                '    url += "&brand1=" + encodeURIComponent(brand1);' +
                '    url += "&brand2=" + encodeURIComponent(brand2);' +
                '    url += "&brand3=" + encodeURIComponent(brand3);' +
                '    url += "&brand4=" + encodeURIComponent(brand4);' +
                '    url += "&brand5=" + encodeURIComponent(brand5);' +
                '    url += "&brand6=" + encodeURIComponent(brand6);' +
                '    window.location.href = url;' +
                '}' +
                '' +
                '/* Clear date filter */' +
                'function clearDateFilter() {' +
                '    window.location.href = "' + scriptUrl + '";' +
                '}' +
                '' +
                '/* Filter detail table by Selected Brand */' +
                'function filterDetailBySelectedBrand() {' +
                '    filterTable("detail");' +
                '}' +
                '' +
                '/* Filter table */' +
                'function filterTable(sectionId) {' +
                '    console.log(\'filterTable called with sectionId:\', sectionId);' +
                '    var categoryInput = document.getElementById(\'searchCategory-\' + sectionId);' +
                '    var subCategoryInput = document.getElementById(\'searchSubCategory-\' + sectionId);' +
                '    var configurationInput = document.getElementById(\'searchConfiguration-\' + sectionId);' +
                '    var generalSearchInput = document.getElementById(\'searchBox-\' + sectionId);' +
                '    var selectedBrandFilter = document.getElementById(\'selectedBrandFilter\');' +
                '    ' +
                '    var categoryFilter = categoryInput ? categoryInput.value.toUpperCase() : \'\';' +
                '    var subCategoryFilter = subCategoryInput ? subCategoryInput.value.toUpperCase() : \'\';' +
                '    var configurationFilter = configurationInput ? configurationInput.value.toUpperCase() : \'\';' +
                '    var generalFilter = generalSearchInput ? generalSearchInput.value.toUpperCase() : \'\';' +
                '    var brandFilter = selectedBrandFilter ? selectedBrandFilter.value : \'both\';' +
                '    console.log(\'Filters - general:\', generalFilter, \', brand:\', brandFilter);' +
                '    ' +
                '    var tbody = document.querySelector(\'#table-\' + sectionId + \' tbody\');' +
                '    var rows = tbody.querySelectorAll(\'tr:not(.summary-row)\');' +
                '    var visibleCount = 0;' +
                '    var visibleCategories = {};' +
                '    ' +
                '    for (var i = 0; i < rows.length; i++) {' +
                '        var row = rows[i];' +
                '        var cells = row.cells;' +
                '        ' +
                '        if (cells.length < 3) {' +
                '            row.style.display = \'\';' +
                '            continue;' +
                '        }' +
                '        ' +
                '        if (row.classList.contains("category-subtotal-row")) {' +
                '            continue;' +
                '        }' +
                '        ' +
                '        var textMatch = true;' +
                '        if (generalFilter) {' +
                '            var text = (row.textContent || row.innerText).toUpperCase();' +
                '            textMatch = text.indexOf(generalFilter) > -1;' +
                '        } else {' +
                '            var categoryText = (cells[0].textContent || cells[0].innerText).toUpperCase();' +
                '            var subCategoryText = (cells[1].textContent || cells[1].innerText).toUpperCase();' +
                '            var configurationText = (cells[2].textContent || cells[2].innerText).toUpperCase();' +
                '            ' +
                '            var categoryMatch = !categoryFilter || categoryText.indexOf(categoryFilter) > -1;' +
                '            var subCategoryMatch = !subCategoryFilter || subCategoryText.indexOf(subCategoryFilter) > -1;' +
                '            var configurationMatch = !configurationFilter || configurationText.indexOf(configurationFilter) > -1;' +
                '            ' +
                '            textMatch = categoryMatch && subCategoryMatch && configurationMatch;' +
                '        }' +
                '        ' +
                '        var brandMatch = true;' +
                '        if (sectionId === \'detail\' && brandFilter !== \'both\') {' +
                '            var selectedBrand = row.getAttribute(\'data-selected-brand\');' +
                '            brandMatch = selectedBrand === brandFilter;' +
                '        }' +
                '        ' +
                '        if (textMatch && brandMatch) {' +
                '            row.style.display = \'\';' +
                '            visibleCount++;' +
                '            var categoryCell = cells[0];' +
                '            if (categoryCell) {' +
                '                var categoryText = categoryCell.textContent || categoryCell.innerText;' +
                '                visibleCategories[categoryText] = true;' +
                '            }' +
                '        } else {' +
                '            row.style.display = \'none\';' +
                '        }' +
                '    }' +
                '    ' +
                '    var subtotalRows = tbody.querySelectorAll(\'tr.category-subtotal-row\');' +
                '    for (var i = 0; i < subtotalRows.length; i++) {' +
                '        var subtotalRow = subtotalRows[i];' +
                '        var category = subtotalRow.getAttribute(\'data-category\');' +
                '        if (visibleCategories[category]) {' +
                '            subtotalRow.style.display = \'\';' +
                '        } else {' +
                '            subtotalRow.style.display = \'none\';' +
                '        }' +
                '    }' +
                '    ' +
                '    var countSpan = document.getElementById(\'searchCount-\' + sectionId);' +
                '    if (categoryFilter || subCategoryFilter || configurationFilter || generalFilter || (brandFilter && brandFilter !== \'both\')) {' +
                '        countSpan.textContent = \'Showing \' + visibleCount + \' of \' + rows.length + \' results\';' +
                '        countSpan.style.display = \'inline\';' +
                '    } else {' +
                '        countSpan.style.display = \'none\';' +
                '    }' +
                '    ' +
                '    console.log(\'About to check sectionId for recalc. sectionId=\', sectionId);' +
                '    if (sectionId === \'summary\') {' +
                '        console.log(\'Calling recalculatePercentages\');' +
                '        recalculatePercentages(sectionId);' +
                '    } else if (sectionId === \'detail\') {' +
                '        console.log(\'Calling recalculateDetailTotals\');' +
                '        recalculateDetailTotals();' +
                '    } else {' +
                '        console.log(\'No recalc - sectionId did not match\');' +
                '    }' +
                '}' +
                '' +
                '/* Clear search filters and recalculate percentages */' +
                'function clearSearchAndRecalc(sectionId) {' +
                '    var categoryInput = document.getElementById(\'searchCategory-\' + sectionId);' +
                '    var subCategoryInput = document.getElementById(\'searchSubCategory-\' + sectionId);' +
                '    var configurationInput = document.getElementById(\'searchConfiguration-\' + sectionId);' +
                '    if (categoryInput) categoryInput.value = \'\';' +
                '    if (subCategoryInput) subCategoryInput.value = \'\';' +
                '    if (configurationInput) configurationInput.value = \'\';' +
                '    filterTable(sectionId);' +
                '    recalculatePercentages(sectionId);' +
                '}' +
                '' +
                '/* Hierarchical classification cell highlighting */' +
                'function highlightClassificationCells(row, cellIndex) {' +
                '    var cells = row.querySelectorAll("td.class-cell");' +
                '    for (var i = 0; i < cellIndex && i < cells.length; i++) {' +
                '        cells[i].classList.add("hierarchy-hover");' +
                '    }' +
                '}' +
                '' +
                'function clearClassificationHighlight(row) {' +
                '    var cells = row.querySelectorAll("td.class-cell");' +
                '    for (var i = 0; i < cells.length; i++) {' +
                '        cells[i].classList.remove("hierarchy-hover");' +
                '    }' +
                '}' +
                '' +
                '/* Sort table */' +
                'function sortTable(sectionId, columnIndex) {' +
                '    var table = document.getElementById(\'table-\' + sectionId);' +
                '    var tbody = table.querySelector(\'tbody\');' +
                '    var rows = Array.from(tbody.querySelectorAll(\'tr:not(.summary-row)\'));' +
                '    var currentSort = table.getAttribute(\'data-sort-col\');' +
                '    var currentDir = table.getAttribute(\'data-sort-dir\') || \'asc\';' +
                '    var newDir = (currentSort == columnIndex && currentDir == \'asc\') ? \'desc\' : \'asc\';' +
                '    ' +
                '    rows.sort(function(a, b) {' +
                '        var aCell = a.cells[columnIndex];' +
                '        var bCell = b.cells[columnIndex];' +
                '        var aVal = aCell.getAttribute(\'data-value\') || aCell.getAttribute(\'data-date\') || aCell.textContent.trim();' +
                '        var bVal = bCell.getAttribute(\'data-value\') || bCell.getAttribute(\'data-date\') || bCell.textContent.trim();' +
                '        ' +
                '        if (aCell.hasAttribute(\'data-value\')) {' +
                '            aVal = parseFloat(aVal) || 0;' +
                '            bVal = parseFloat(bVal) || 0;' +
                '        } else if (aCell.classList.contains(\'amount\') || aCell.classList.contains(\'center\')) {' +
                '            aVal = parseFloat(aVal.replace(/[^0-9.-]/g, \'\')) || 0;' +
                '            bVal = parseFloat(bVal.replace(/[^0-9.-]/g, \'\')) || 0;' +
                '        } else if (aCell.hasAttribute(\'data-date\')) {' +
                '            var parseDate = function(d) {' +
                '                if (!d || d === \'-\') return 0;' +
                '                if (d.indexOf(\'/\') > 0) {' +
                '                    var parts = d.split(\'/\');' +
                '                    return parseInt(parts[2]) * 10000 + parseInt(parts[0]) * 100 + parseInt(parts[1]);' +
                '                }' +
                '                return parseInt(d.replace(/-/g, \'\'));' +
                '            };' +
                '            aVal = parseDate(aVal);' +
                '            bVal = parseDate(bVal);' +
                '        } else {' +
                '            aVal = aVal.toLowerCase();' +
                '            bVal = bVal.toLowerCase();' +
                '        }' +
                '        ' +
                '        if (aVal < bVal) return newDir === \'asc\' ? -1 : 1;' +
                '        if (aVal > bVal) return newDir === \'asc\' ? 1 : -1;' +
                '        return 0;' +
                '    });' +
                '    ' +
                '    var summaryRow = tbody.querySelector(\'.summary-row\');' +
                '    rows.forEach(function(row) { tbody.appendChild(row); });' +
                '    if (summaryRow) tbody.appendChild(summaryRow);' +
                '    table.setAttribute(\'data-sort-col\', columnIndex);' +
                '    table.setAttribute(\'data-sort-dir\', newDir);' +
                '    ' +
                '    var allHeaders = table.querySelectorAll(\'th\');' +
                '    for (var i = 0; i < allHeaders.length; i++) {' +
                '        var header = allHeaders[i];' +
                '        if (i == columnIndex) {' +
                '            var text = header.textContent.replace(/ [▲▼]/g, \'\').trim();' +
                '            header.textContent = text + (newDir === \'asc\' ? \' ▲\' : \' ▼\');' +
                '        } else {' +
                '            var text = header.textContent.replace(/ [▲▼]/g, \'\').trim();' +
                '            header.textContent = text;' +
                '        }' +
                '    }' +
                '}' +
                '' +
                '/* Export table to Excel using SheetJS */' +
                'function exportToExcel(sectionId) {' +
                '    if (sectionId === \'summary\') {' +
                '        recalculatePercentages(sectionId);' +
                '    }' +
                '    var table = document.getElementById(\'table-\' + sectionId);' +
                '    if (!table) { alert(\'No data to export\'); return; }' +
                '    ' +
                '    var headers = [];' +
                '    var headerCells = table.querySelectorAll(\'thead th\');' +
                '    for (var i = 0; i < headerCells.length; i++) {' +
                '        headers.push(headerCells[i].textContent.replace(/ [▲▼]/g, \'\').trim());' +
                '    }' +
                '    ' +
                '    var data = [headers];' +
                '    var rows = table.querySelectorAll(\'tbody tr\');' +
                '    for (var i = 0; i < rows.length; i++) {' +
                '        var row = rows[i];' +
                '        if (row.style.display === \'none\') continue;' +
                '        var rowData = [];' +
                '        var cells = row.querySelectorAll(\'td\');' +
                '        for (var j = 0; j < cells.length; j++) {' +
                '            var cell = cells[j];' +
                '            var val = cell.textContent.trim();' +
                '            if (cell.classList.contains(\'amount\')) {' +
                '                val = parseFloat(val.replace(/[\\$,]/g, \'\')) || 0;' +
                '            }' +
                '            rowData.push(val);' +
                '        }' +
                '        data.push(rowData);' +
                '    }' +
                '    ' +
                '    var ws = XLSX.utils.aoa_to_sheet(data);' +
                '    var wb = XLSX.utils.book_new();' +
                '    var sheetName = sectionId === \'summary\' ? \'Summary\' : \'Details\';' +
                '    XLSX.utils.book_append_sheet(wb, ws, sheetName);' +
                '    ' +
                '    var today = new Date();' +
                '    var dateStr = (today.getMonth()+1) + \'-\' + today.getDate() + \'-\' + today.getFullYear();' +
                '    var fileName = \'Brand_Category_Sales_\' + sectionId + \'_\' + dateStr + \'.xlsx\';' +
                '    XLSX.writeFile(wb, fileName);' +
                '}' +
                '' +
                '/* Recalculate detail view totals based on visible rows */' +
                'function recalculateDetailTotals() {' +
                '    console.log(\'recalculateDetailTotals called\');' +
                '    var table = document.getElementById(\'table-detail\');' +
                '    if (!table) {' +
                '        console.log(\'No table found\');' +
                '        return;' +
                '    }' +
                '    var tbody = table.querySelector(\'tbody\');' +
                '    var rows = tbody.querySelectorAll(\'tr:not(.summary-row)\');' +
                '    console.log(\'Found \' + rows.length + \' data rows\');' +
                '    var summaryRow = tbody.querySelector(\'.summary-row\');' +
                '    if (!summaryRow) {' +
                '        console.log(\'No summary row found\');' +
                '        return;' +
                '    }' +
                '    ' +
                '    var totals = {' +
                '        quantity: 0,' +
                '        amount: 0' +
                '    };' +
                '    ' +
                '    for (var i = 0; i < rows.length; i++) {' +
                '        var row = rows[i];' +
                '        if (row.style.display === \'none\') continue;' +
                '        ' +
                '        var cells = row.cells;' +
                '        var qtyCell = cells[10];' +
                '        var amountCell = cells[12];' +
                '        ' +
                '        if (qtyCell) {' +
                '            var qty = parseFloat(qtyCell.textContent) || 0;' +
                '            totals.quantity += qty;' +
                '            console.log(\'Row \' + i + \' qty: \' + qty + \', running total: \' + totals.quantity);' +
                '        }' +
                '        ' +
                '        if (amountCell) {' +
                '            var amount = parseFloat(amountCell.getAttribute(\'data-value\')) || 0;' +
                '            totals.amount += amount;' +
                '            console.log(\'Row \' + i + \' amount: \' + amount + \', running total: \' + totals.amount);' +
                '        }' +
                '    }' +
                '    ' +
                '    console.log(\'Final totals - qty: \' + totals.quantity + \', amount: \' + totals.amount);' +
                '    var summaryCells = summaryRow.cells;' +
                '    console.log(\'Summary row has \' + summaryCells.length + \' cells\');' +
                '    if (summaryCells[1]) {' +
                '        summaryCells[1].textContent = totals.quantity.toFixed(2);' +
                '        console.log(\'Updated cell 1 (quantity) to: \' + totals.quantity.toFixed(2));' +
                '    }' +
                '    if (summaryCells[3]) {' +
                '        var formattedAmount = formatCurrency(totals.amount, true);' +
                '        console.log(\'Formatted amount: \' + formattedAmount);' +
                '        summaryCells[3].textContent = formattedAmount;' +
                '        summaryCells[3].setAttribute(\'data-value\', totals.amount);' +
                '        console.log(\'Updated cell 3 (amount) to: \' + formattedAmount);' +
                '    }' +
                '}' +
                '' +
                '/* Recalculate percentages and totals based on visible rows */' +
                'function recalculatePercentages(sectionId) {' +
                '    var table = document.getElementById(\'table-\' + sectionId);' +
                '    if (!table) return;' +
                '    var brandCount = parseInt(table.getAttribute(\'data-brand-count\')) || 4;' +
                '    var tbody = table.querySelector(\'tbody\');' +
                '    var rows = tbody.querySelectorAll(\'tr:not(.summary-row):not(.category-subtotal-row)\');' +
                '    var summaryRow = tbody.querySelector(\'.summary-row\');' +
                '    var categoryTotals = {};' +
                '    var grandTotals = {' +
                '        brandAmounts: [],' +
                '        brandQuantities: [],' +
                '        selectedBrandsTotal: 0,' +
                '        selectedBrandsQty: 0,' +
                '        otherBrandsAmount: 0,' +
                '        otherBrandsQty: 0,' +
                '        totalAmount: 0,' +
                '        lineCount: 0' +
                '    };' +
                '    for (var b = 0; b < brandCount; b++) {' +
                '        grandTotals.brandAmounts.push(0);' +
                '        grandTotals.brandQuantities.push(0);' +
                '    }' +
                '    for (var i = 0; i < rows.length; i++) {' +
                '        var row = rows[i];' +
                '        if (row.style.display === \'none\') continue;' +
                '        var cells = row.cells;' +
                '        var category = cells[0].textContent.trim();' +
                '        if (!categoryTotals[category]) {' +
                '            categoryTotals[category] = {brandAmounts: [], selectedBrandsTotal: 0, otherBrandsAmount: 0, allBrandsAmount: 0};' +
                '            for (var b = 0; b < brandCount; b++) {' +
                '                categoryTotals[category].brandAmounts.push(0);' +
                '            }' +
                '        }' +
                '        var cellIndex = 3;' +
                '        var rowSelectedBrandsTotal = 0;' +
                '        for (var b = 0; b < brandCount; b++) {' +
                '            var brandAmount = parseFloat(cells[cellIndex].textContent.replace(/[\\$,]/g, \'\')) || 0;' +
                '            categoryTotals[category].brandAmounts[b] += brandAmount;' +
                '            rowSelectedBrandsTotal += brandAmount;' +
                '            grandTotals.brandAmounts[b] += brandAmount;' +
                '            grandTotals.selectedBrandsTotal += brandAmount;' +
                '            var qtyText = (cells[cellIndex].getAttribute(\'title\') || \'\').replace(/[^0-9]/g, \'\');' +
                '            var qty = parseInt(qtyText) || 0;' +
                '            grandTotals.brandQuantities[b] += qty;' +
                '            grandTotals.selectedBrandsQty += qty;' +
                '            cellIndex += 2;' +
                '        }' +
                '        categoryTotals[category].selectedBrandsTotal += rowSelectedBrandsTotal;' +
                '        var otherBrandsIndex = 3 + (brandCount * 2) + 2;' +
                '        var allBrandsIndex = 3 + (brandCount * 2) + 4;' +
                '        var qtyIndex = allBrandsIndex + 2;' +
                '        var otherBrandsAmount = parseFloat(cells[otherBrandsIndex].textContent.replace(/[\\$,]/g, \'\')) || 0;' +
                '        var allBrandsAmount = parseFloat(cells[allBrandsIndex].textContent.replace(/[\\$,]/g, \'\')) || 0;' +
                '        var lineCount = parseInt(cells[qtyIndex].textContent.replace(/[^0-9]/g, \'\')) || 0;' +
                '        categoryTotals[category].otherBrandsAmount += otherBrandsAmount;' +
                '        categoryTotals[category].allBrandsAmount += allBrandsAmount;' +
                '        var otherQtyText = (cells[otherBrandsIndex].getAttribute(\'title\') || \'\').replace(/[^0-9]/g, \'\');' +
                '        if (!categoryTotals[category].brandQuantities) {' +
                '            categoryTotals[category].brandQuantities = [];' +
                '            for (var b = 0; b < brandCount; b++) {' +
                '                categoryTotals[category].brandQuantities.push(0);' +
                '            }' +
                '            categoryTotals[category].selectedBrandsQty = 0;' +
                '            categoryTotals[category].otherBrandsQty = 0;' +
                '            categoryTotals[category].lineCount = 0;' +
                '        }' +
                '        var qtyIndex = allBrandsIndex + 2;' +
                '        var lineCount = parseInt(cells[qtyIndex].textContent.replace(/[^0-9]/g, \'\')) || 0;' +
                '        categoryTotals[category].otherBrandsQty += parseInt(otherQtyText) || 0;' +
                '        categoryTotals[category].lineCount += lineCount;' +
                '        var cellIdx = 3;' +
                '        for (var b = 0; b < brandCount; b++) {' +
                '            var qtyText = (cells[cellIdx].getAttribute(\'title\') || \'\').replace(/[^0-9]/g, \'\');' +
                '            var qty = parseInt(qtyText) || 0;' +
                '            categoryTotals[category].brandQuantities[b] += qty;' +
                '            categoryTotals[category].selectedBrandsQty += qty;' +
                '            cellIdx += 2;' +
                '        }' +
                '        grandTotals.otherBrandsAmount += otherBrandsAmount;' +
                '        grandTotals.otherBrandsQty += parseInt(otherQtyText) || 0;' +
                '        grandTotals.totalAmount += allBrandsAmount;' +
                '        grandTotals.lineCount += lineCount;' +
                '    }' +
                '    var subtotalRows = tbody.querySelectorAll(\'tr.category-subtotal-row\');' +
                '    for (var i = 0; i < subtotalRows.length; i++) {' +
                '        var subtotalRow = subtotalRows[i];' +
                '        if (subtotalRow.style.display === \'none\') continue;' +
                '        var category = subtotalRow.getAttribute(\'data-category\');' +
                '        var catTotal = categoryTotals[category];' +
                '        if (!catTotal) continue;' +
                '        var cells = subtotalRow.cells;' +
                '        var cellIndex = 1;' +
                '        for (var b = 0; b < brandCount; b++) {' +
                '            if (cells[cellIndex]) {' +
                '                cells[cellIndex].textContent = formatCurrency(catTotal.brandAmounts[b]);' +
                '                cells[cellIndex].setAttribute(\'title\', \'Quantity: \' + (catTotal.brandQuantities[b] || 0));' +
                '            }' +
                '            cellIndex += 2;' +
                '        }' +
                '        if (cells[cellIndex]) {' +
                '            cells[cellIndex].textContent = formatCurrency(catTotal.selectedBrandsTotal);' +
                '            cells[cellIndex].setAttribute(\'title\', \'Quantity: \' + (catTotal.selectedBrandsQty || 0));' +
                '        }' +
                '        cellIndex += 2;' +
                '        if (cells[cellIndex]) {' +
                '            cells[cellIndex].textContent = formatCurrency(catTotal.otherBrandsAmount);' +
                '            cells[cellIndex].setAttribute(\'title\', \'Quantity: \' + (catTotal.otherBrandsQty || 0));' +
                '        }' +
                '        cellIndex += 2;' +
                '        if (cells[cellIndex]) {' +
                '            cells[cellIndex].textContent = formatCurrency(catTotal.allBrandsAmount);' +
                '        }' +
                '        cellIndex += 2;' +
                '        if (cells[cellIndex]) {' +
                '            cells[cellIndex].textContent = catTotal.lineCount || 0;' +
                '        }' +
                '    }' +
                '    for (var i = 0; i < rows.length; i++) {' +
                '        var row = rows[i];' +
                '        if (row.style.display === \'none\') continue;' +
                '        var cells = row.cells;' +
                '        var category = cells[0].textContent.trim();' +
                '        var catTotal = categoryTotals[category];' +
                '        if (!catTotal) continue;' +
                '        var cellIndex = 3;' +
                '        var selectedBrandsTotal = 0;' +
                '        for (var b = 0; b < brandCount; b++) {' +
                '            var brandAmount = parseFloat(cells[cellIndex].textContent.replace(/[\\$,]/g, \'\')) || 0;' +
                '            selectedBrandsTotal += brandAmount;' +
                '            var brandPct = catTotal.brandAmounts[b] > 0 ? (brandAmount / catTotal.brandAmounts[b] * 100).toFixed(2) : \'0.00\';' +
                '            cells[cellIndex + 1].textContent = brandPct + \'%\';' +
                '            cellIndex += 2;' +
                '        }' +
                '        var selectedBrandsTotalIndex = 3 + (brandCount * 2);' +
                '        var selectedBrandsPctIndex = selectedBrandsTotalIndex + 1;' +
                '        var otherBrandsIndex = selectedBrandsTotalIndex + 2;' +
                '        var otherBrandsPctIndex = otherBrandsIndex + 1;' +
                '        var allBrandsIndex = otherBrandsIndex + 2;' +
                '        var allBrandsPctIndex = allBrandsIndex + 1;' +
                '        var otherBrandsAmount = parseFloat(cells[otherBrandsIndex].textContent.replace(/[\\$,]/g, \'\')) || 0;' +
                '        var allBrandsAmount = parseFloat(cells[allBrandsIndex].textContent.replace(/[\\$,]/g, \'\')) || 0;' +
                '        var selectedBrandsPct = catTotal.selectedBrandsTotal > 0 ? (selectedBrandsTotal / catTotal.selectedBrandsTotal * 100).toFixed(2) : \'0.00\';' +
                '        var otherBrandsPct = catTotal.otherBrandsAmount > 0 ? (otherBrandsAmount / catTotal.otherBrandsAmount * 100).toFixed(2) : \'0.00\';' +
                '        var allBrandsPct = catTotal.allBrandsAmount > 0 ? (allBrandsAmount / catTotal.allBrandsAmount * 100).toFixed(2) : \'0.00\';' +
                '        cells[selectedBrandsPctIndex].textContent = selectedBrandsPct + \'%\';' +
                '        cells[otherBrandsPctIndex].textContent = otherBrandsPct + \'%\';' +
                '        cells[allBrandsPctIndex].textContent = allBrandsPct + \'%\';' +
                '    }' +
                '    if (summaryRow) {' +
                '        var summaryCells = summaryRow.cells;' +
                '        var cellIndex = 3;' +
                '        for (var b = 0; b < brandCount; b++) {' +
                '            if (summaryCells[cellIndex]) {' +
                '                summaryCells[cellIndex].textContent = formatCurrency(grandTotals.brandAmounts[b]);' +
                '                summaryCells[cellIndex].setAttribute(\'title\', \'Quantity: \' + grandTotals.brandQuantities[b]);' +
                '            }' +
                '            cellIndex += 2;' +
                '        }' +
                '        if (summaryCells[cellIndex]) {' +
                '            summaryCells[cellIndex].textContent = formatCurrency(grandTotals.selectedBrandsTotal);' +
                '            summaryCells[cellIndex].setAttribute(\'title\', \'Quantity: \' + grandTotals.selectedBrandsQty);' +
                '        }' +
                '        cellIndex += 2;' +
                '        if (summaryCells[cellIndex]) {' +
                '            summaryCells[cellIndex].textContent = formatCurrency(grandTotals.otherBrandsAmount);' +
                '            summaryCells[cellIndex].setAttribute(\'title\', \'Quantity: \' + grandTotals.otherBrandsQty);' +
                '        }' +
                '        cellIndex += 2;' +
                '        if (summaryCells[cellIndex]) {' +
                '            summaryCells[cellIndex].textContent = formatCurrency(grandTotals.totalAmount);' +
                '        }' +
                '        cellIndex += 2;' +
                '        if (summaryCells[cellIndex]) {' +
                '            summaryCells[cellIndex].textContent = grandTotals.lineCount;' +
                '        }' +
                '    }' +
                '}';
        }

        return {
            onRequest: onRequest
        };
    });
