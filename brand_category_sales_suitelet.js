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
                    
                    html += '<style>' + getStyles() + '</style>';
                    html += '<div class="portal-container">';
                    html += '<div style="text-align:center;padding:80px 20px;">';
                    html += '<h1 style="color:#1a237e;font-size:32px;margin-bottom:20px;">Brand Category Sales Report</h1>';
                    html += '<p style="color:#666;font-size:16px;margin-bottom:30px;">View invoice and credit memo sales data by brand and product classification</p>';
                    
                    // Date filter section on landing page
                    html += '<div style="max-width:500px;margin:0 auto 30px auto;background:#fff;border:1px solid #cbd5e1;border-radius:6px;padding:20px;">';
                    html += '<div style="margin-bottom:15px;font-weight:600;color:#333;">Select Date Range:</div>';
                    html += '<div style="display:flex;gap:15px;align-items:center;justify-content:center;flex-wrap:wrap;">';
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
                    html += '  var url = "' + scriptUrl + '" + "' + separator + 'loadData=T";';
                    html += '  if (startDate) url += "&startdate=" + encodeURIComponent(startDate);';
                    html += '  if (endDate) url += "&enddate=" + encodeURIComponent(endDate);';
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
                    html += buildDetailView(filterClass1, filterClass2, filterClass3, filterBrand, scriptUrl, startDate, endDate, department);
                } else {
                    // Show summary view
                    var department = params.department || '';
                    html += buildSummaryView(scriptUrl, startDate, endDate, department);
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
         * @returns {string} HTML content
         */
        function buildSummaryView(scriptUrl, startDate, endDate, department) {
            var html = '';
            
            html += '<div class="section-description">Invoice and Credit Memo Inventory Line Items, Split by Category, Sub-Category and Configuration. Click Any Row for Drill Down Transaction Details.</div>';

            // Date filter section
            html += '<div class="date-filter-section">';
            html += '<div class="date-filter-inputs">';
            html += '<label for="startdate">Start Date:</label>';
            html += '<input type="date" id="startdate" name="startdate" value="' + (startDate || '') + '">';
            html += '<label for="enddate">End Date:</label>';
            html += '<input type="date" id="enddate" name="enddate" value="' + (endDate || '') + '">';
            html += '<label for="department">Selling Location:</label>';
            html += '<input type="text" id="department" name="department" value="' + (department || '') + '" placeholder="Enter location..." style="padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 14px; width: 200px;">';
            html += '<button type="button" class="filter-btn" onclick="applyDateFilter()">Apply Filter</button>';
            html += '<button type="button" class="clear-btn" onclick="clearDateFilter()">Clear</button>';
            html += '</div>';
            html += '</div>';

            // Get summary data
            var summaryDataResult = getSummaryData(startDate, endDate, department);
            var summaryData = summaryDataResult.records;
            var categoryTotals = summaryDataResult.categoryTotals;

            html += '<div class="search-section">';
            html += '<div class="search-box-container">';
            html += '<input type="text" id="searchCategory-summary" class="search-box" placeholder="Search Category..." onkeyup="filterTable(\'summary\')" style="flex:1;">';
            html += '<input type="text" id="searchSubCategory-summary" class="search-box" placeholder="Search Sub-Category..." onkeyup="filterTable(\'summary\')" style="flex:1;">';
            html += '<input type="text" id="searchConfiguration-summary" class="search-box" placeholder="Search Configuration..." onkeyup="filterTable(\'summary\')" style="flex:1;">';
            html += '<button type="button" class="clear-btn" onclick="clearSearchAndRecalc(\'summary\')" title="Clear all filters and recalculate percentages">Clear</button>';
            html += '<button type="button" class="filter-btn" onclick="recalculatePercentages(\'summary\')" title="Recalculate percentages based on visible rows only">🔄 Recalc %</button>';
            html += '<button type="button" class="export-btn" onclick="exportToExcel(\'summary\')">📥 Export to Excel</button>';
            html += '</div>';
            html += '<span class="search-results-count" id="searchCount-summary"></span>';
            html += buildSummaryTable(summaryData, categoryTotals, scriptUrl, startDate, endDate, department);
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
         * @returns {string} HTML content
         */
        function buildDetailView(class1, class2, class3, brand, scriptUrl, startDate, endDate, department) {
            var html = '';
            
            // Back button with date params
            html += '<div class="back-button-container">';
            var backUrl = scriptUrl + '&loadData=T';
            if (startDate) backUrl += '&startdate=' + encodeURIComponent(startDate);
            if (endDate) backUrl += '&enddate=' + encodeURIComponent(endDate);
            if (department) backUrl += '&department=' + encodeURIComponent(department);
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
            var detailData = getDetailData(class1, class2, class3, brand, startDate, endDate, department);

            // Display record count
            html += '<div class="record-count">';
            html += '<strong>Records:</strong> Showing ' + detailData.displayedCount.toLocaleString() + ' of ' + detailData.totalCount.toLocaleString() + ' total';
            if (detailData.displayedCount < detailData.totalCount) {
                html += ' <span class="limit-warning">(⚠️ Results limited to ' + detailData.displayedCount.toLocaleString() + ' records)</span>';
            }
            html += '</div>';

            html += '<div class="search-section">';
            html += '<div class="search-box-container">';
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
        function getSummaryData(startDate, endDate, department) {
            var results = [];
            var categoryTotals = {};

            try {
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
                    '    SUM(CASE WHEN i.custitem_bas_item_brand = 48 THEN tl.netAmount * -1 ELSE 0 END) AS profile_amount, ' +
                    '    SUM(CASE WHEN i.custitem_bas_item_brand = 26 THEN tl.netAmount * -1 ELSE 0 END) AS ge_amount, ' +
                    '    SUM(CASE WHEN i.custitem_bas_item_brand = 15 THEN tl.netAmount * -1 ELSE 0 END) AS cafe_amount, ' +
                    '    SUM(CASE WHEN i.custitem_bas_item_brand = 43 THEN tl.netAmount * -1 ELSE 0 END) AS monogram_amount, ' +
                    '    SUM(CASE WHEN i.custitem_bas_item_brand NOT IN (48, 26, 15, 43) THEN tl.netAmount * -1 ELSE 0 END) AS other_brands_amount, ' +
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
                            profileAmount: 0,
                            geAmount: 0,
                            cafeAmount: 0,
                            monogramAmount: 0,
                            otherBrandsAmount: 0,
                            totalAmount: 0
                        };
                    }
                    
                    // Accumulate category totals
                    categoryTotals[category].profileAmount += parseFloat(row.profile_amount) || 0;
                    categoryTotals[category].geAmount += parseFloat(row.ge_amount) || 0;
                    categoryTotals[category].cafeAmount += parseFloat(row.cafe_amount) || 0;
                    categoryTotals[category].monogramAmount += parseFloat(row.monogram_amount) || 0;
                    categoryTotals[category].otherBrandsAmount += parseFloat(row.other_brands_amount) || 0;
                    categoryTotals[category].totalAmount += parseFloat(row.total_amount) || 0;
                    
                    results.push({
                        class1: category,
                        class2: row.class_2 || '-',
                        class3: row.class_3 || '-',
                        profileAmount: parseFloat(row.profile_amount) || 0,
                        geAmount: parseFloat(row.ge_amount) || 0,
                        cafeAmount: parseFloat(row.cafe_amount) || 0,
                        monogramAmount: parseFloat(row.monogram_amount) || 0,
                        otherBrandsAmount: parseFloat(row.other_brands_amount) || 0,
                        totalAmount: parseFloat(row.total_amount) || 0,
                        transactionCount: parseInt(row.transaction_count) || 0,
                        lineCount: parseInt(row.line_count) || 0
                    });
                }

            } catch (e) {
                log.error('Error in getSummaryData', {
                    error: e.message,
                    stack: e.stack
                });
            }

            return {
                records: results,
                categoryTotals: categoryTotals
            };
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
         * @returns {Object} Detail data with count info
         */
        function getDetailData(class1, class2, class3, brand, startDate, endDate, department) {
            var results = [];
            var totalCount = 0;

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
                        amount: parseFloat(row.amount) || 0
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
         * @param {string} scriptUrl - Suitelet URL
         * @param {string} startDate - Start date filter
         * @param {string} endDate - End date filter
         * @param {string} department - Department filter
         * @returns {string} HTML table
         */
        function buildSummaryTable(data, categoryTotals, scriptUrl, startDate, endDate, department) {
            var html = '';

            html += '<div class="table-container">';
            html += '<table class="data-table" id="table-summary">';
            html += '<thead>';
            html += '<tr>';
            html += '<th onclick="sortTable(\'summary\', 0)">Category</th>';
            html += '<th onclick="sortTable(\'summary\', 1)">Sub-Category</th>';
            html += '<th onclick="sortTable(\'summary\', 2)">Configuration</th>';
            html += '<th onclick="sortTable(\'summary\', 3)">Profile</th>';
            html += '<th onclick="sortTable(\'summary\', 4)">Profile %</th>';
            html += '<th onclick="sortTable(\'summary\', 5)">GE</th>';
            html += '<th onclick="sortTable(\'summary\', 6)">GE %</th>';
            html += '<th onclick="sortTable(\'summary\', 7)">Cafe</th>';
            html += '<th onclick="sortTable(\'summary\', 8)">Cafe %</th>';
            html += '<th onclick="sortTable(\'summary\', 9)">Monogram</th>';
            html += '<th onclick="sortTable(\'summary\', 10)">Monogram %</th>';
            html += '<th onclick="sortTable(\'summary\', 11)">Selected Brands Total</th>';
            html += '<th onclick="sortTable(\'summary\', 12)">Selected Brands %</th>';
            html += '<th onclick="sortTable(\'summary\', 13)">All Other Brands Total</th>';
            html += '<th onclick="sortTable(\'summary\', 14)">All Other Brands %</th>';
            html += '<th onclick="sortTable(\'summary\', 15)">All Brands Total</th>';
            html += '<th onclick="sortTable(\'summary\', 16)">All Brands %</th>';
            html += '<th onclick="sortTable(\'summary\', 17)">QTY</th>';
            html += '</tr>';
            html += '</thead>';
            html += '<tbody>';

            // Initialize totals
            var totals = {
                profileAmount: 0,
                geAmount: 0,
                cafeAmount: 0,
                monogramAmount: 0,
                selectedBrandsTotal: 0,
                otherBrandsAmount: 0,
                totalAmount: 0,
                transactionCount: 0,
                lineCount: 0
            };

            for (var i = 0; i < data.length; i++) {
                var row = data[i];
                var rowClass = (i % 2 === 0) ? 'even-row' : 'odd-row';

                // Calculate selected brands total for this row
                var selectedBrandsTotal = row.profileAmount + row.geAmount + row.cafeAmount + row.monogramAmount;
                
                // Accumulate totals
                totals.profileAmount += row.profileAmount;
                totals.geAmount += row.geAmount;
                totals.cafeAmount += row.cafeAmount;
                totals.monogramAmount += row.monogramAmount;
                totals.selectedBrandsTotal += selectedBrandsTotal;
                totals.otherBrandsAmount += row.otherBrandsAmount;
                totals.totalAmount += row.totalAmount;
                totals.transactionCount += row.transactionCount;
                totals.lineCount += row.lineCount;

                // Build drill-down URL
                var drillUrl = scriptUrl + '&loadData=T&view=detail';
                drillUrl += '&class1=' + encodeURIComponent(row.class1);
                drillUrl += '&class2=' + encodeURIComponent(row.class2);
                drillUrl += '&class3=' + encodeURIComponent(row.class3);
                if (startDate) drillUrl += '&startdate=' + encodeURIComponent(startDate);
                if (endDate) drillUrl += '&enddate=' + encodeURIComponent(endDate);
                if (department) drillUrl += '&department=' + encodeURIComponent(department);

                // Calculate percentages for this row
                var catTotal = categoryTotals[row.class1] || {profileAmount: 0, geAmount: 0, hotpointAmount: 0, cafeAmount: 0, monogramAmount: 0};
                var profilePct = catTotal.profileAmount > 0 ? (row.profileAmount / catTotal.profileAmount * 100).toFixed(2) : '0.00';
                var gePct = catTotal.geAmount > 0 ? (row.geAmount / catTotal.geAmount * 100).toFixed(2) : '0.00';
                var cafePct = catTotal.cafeAmount > 0 ? (row.cafeAmount / catTotal.cafeAmount * 100).toFixed(2) : '0.00';
                var monogramPct = catTotal.monogramAmount > 0 ? (row.monogramAmount / catTotal.monogramAmount * 100).toFixed(2) : '0.00';
                var selectedBrandsPct = catTotal.totalAmount > 0 ? (selectedBrandsTotal / catTotal.totalAmount * 100).toFixed(2) : '0.00';
                var otherBrandsPct = catTotal.otherBrandsAmount > 0 ? (row.otherBrandsAmount / catTotal.otherBrandsAmount * 100).toFixed(2) : '0.00';
                var allBrandsPct = catTotal.totalAmount > 0 ? (row.totalAmount / catTotal.totalAmount * 100).toFixed(2) : '0.00';

                html += '<tr class="' + rowClass + ' clickable-row" onclick="window.location.href=\'' + drillUrl + '\'">';
                html += '<td>' + escapeHtml(formatDisplayText(row.class1)) + '</td>';
                html += '<td>' + escapeHtml(formatDisplayText(row.class2)) + '</td>';
                html += '<td>' + escapeHtml(formatDisplayText(row.class3)) + '</td>';
                html += '<td class="amount" style="background-color: rgba(144, 238, 144, 0.15);">' + formatCurrency(row.profileAmount) + '</td>';
                html += '<td class="amount percent">' + profilePct + '%</td>';
                html += '<td class="amount" style="background-color: rgba(144, 238, 144, 0.15);">' + formatCurrency(row.geAmount) + '</td>';
                html += '<td class="amount percent">' + gePct + '%</td>';
                html += '<td class="amount" style="background-color: rgba(144, 238, 144, 0.15);">' + formatCurrency(row.cafeAmount) + '</td>';
                html += '<td class="amount percent">' + cafePct + '%</td>';
                html += '<td class="amount" style="background-color: rgba(144, 238, 144, 0.15);">' + formatCurrency(row.monogramAmount) + '</td>';
                html += '<td class="amount percent">' + monogramPct + '%</td>';
                html += '<td class="amount total-amount">' + formatCurrency(selectedBrandsTotal) + '</td>';
                html += '<td class="amount percent">' + selectedBrandsPct + '%</td>';
                html += '<td class="amount total-amount">' + formatCurrency(row.otherBrandsAmount) + '</td>';
                html += '<td class="amount percent">' + otherBrandsPct + '%</td>';
                html += '<td class="amount total-amount">' + formatCurrency(row.totalAmount) + '</td>';
                html += '<td class="amount percent">' + allBrandsPct + '%</td>';
                html += '<td class="center">' + row.lineCount + '</td>';
                html += '</tr>';
            }

            // Add summary row
            html += '<tr class="summary-row">';
            html += '<td></td>'; // Empty cell for Category column
            html += '<td></td>'; // Empty cell for Sub-Category column
            html += '<td style="text-align: right; font-weight: bold;">Total:</td>';
            html += '<td class="amount" style="background-color: rgba(144, 238, 144, 0.15);">' + formatCurrency(totals.profileAmount) + '</td>';
            html += '<td></td>'; // Empty cell for Profile %
            html += '<td class="amount" style="background-color: rgba(144, 238, 144, 0.15);">' + formatCurrency(totals.geAmount) + '</td>';
            html += '<td></td>'; // Empty cell for GE %
            html += '<td class="amount" style="background-color: rgba(144, 238, 144, 0.15);">' + formatCurrency(totals.cafeAmount) + '</td>';
            html += '<td></td>'; // Empty cell for Cafe %
            html += '<td class="amount" style="background-color: rgba(144, 238, 144, 0.15);">' + formatCurrency(totals.monogramAmount) + '</td>';
            html += '<td></td>'; // Empty cell for Monogram %
            html += '<td class="amount total-amount">' + formatCurrency(totals.selectedBrandsTotal) + '</td>';
            html += '<td></td>'; // Empty cell for Selected Brands %
            html += '<td class="amount total-amount">' + formatCurrency(totals.otherBrandsAmount) + '</td>';
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
            html += '<th onclick="sortTable(\'detail\', 3)">Brand</th>';
            html += '<th onclick="sortTable(\'detail\', 4)">Item #</th>';
            html += '<th onclick="sortTable(\'detail\', 5)">Department</th>';
            html += '<th onclick="sortTable(\'detail\', 6)">Transaction #</th>';
            html += '<th onclick="sortTable(\'detail\', 7)">Date</th>';
            html += '<th onclick="sortTable(\'detail\', 8)">Customer</th>';
            html += '<th onclick="sortTable(\'detail\', 9)">Qty</th>';
            html += '<th onclick="sortTable(\'detail\', 10)">Rate</th>';
            html += '<th onclick="sortTable(\'detail\', 11)">Amount</th>';
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

                html += '<tr class="' + rowClass + '">';
                html += '<td>' + escapeHtml(formatDisplayText(row.class1)) + '</td>';
                html += '<td>' + escapeHtml(formatDisplayText(row.class2)) + '</td>';
                html += '<td>' + escapeHtml(formatDisplayText(row.class3)) + '</td>';
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
            html += '<td colspan="9" style="text-align: right; font-weight: bold;">Total:</td>';
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
                '.portal-container { margin: 0; padding: 10px 0px; border: none; background: transparent; position: relative; }' +
                '' +
                '/* Section styles */' +
                '.section-title { font-size: 24px; font-weight: bold; margin: 0 0 10px 0; color: #333; }' +
                '.section-description { font-style: italic; color: #666; margin: 0 0 20px 0; font-size: 14px; }' +
                '' +
                '/* Date filter section */' +
                '.date-filter-section { background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 15px; margin-bottom: 20px; }' +
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
                '.filter-display { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 14px; color: #333; }' +
                '' +
                '/* Record count display */' +
                '.record-count { background: #e8f5e9; border: 1px solid #a5d6a7; border-radius: 6px; padding: 12px; margin-bottom: 15px; font-size: 14px; color: #2e7d32; }' +
                '.limit-warning { color: #ff6f00; font-weight: bold; }' +
                '' +
                '/* Search section */' +
                '.search-section { margin-bottom: 30px; }' +
                '' +
                '/* Search box container */' +
                '.search-box-container { margin: 0 0 15px 0; padding: 12px 10px; background: white; border-bottom: 3px solid #4CAF50; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); display: flex; gap: 10px; align-items: center; }' +
                '.search-box { flex: 1; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 14px; box-sizing: border-box; }' +
                '.search-box:focus { outline: none; border-color: #4CAF50; box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.15); }' +
                '.search-results-count { display: none; margin-left: 10px; color: #6c757d; font-size: 13px; font-style: italic; }' +
                '.export-btn { padding: 10px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: background 0.2s; }' +
                '.export-btn:hover { background: #45a049; }' +
                '.export-btn:active { background: #3d8b40; }' +
                '' +
                '/* Table container */' +
                '.table-container { overflow: visible; }' +
                '' +
                '/* Data table styles */' +
                'table.data-table { border-collapse: separate; border-spacing: 0; width: 100%; margin: 0; border-left: 1px solid #ddd; border-right: 1px solid #ddd; border-bottom: 1px solid #ddd; background: white; }' +
                'table.data-table thead th { position: -webkit-sticky; position: sticky; top: 0; z-index: 101; background-color: #f8f9fa; border: 1px solid #ddd; border-top: none; padding: 10px 8px; text-align: left; vertical-align: top; font-weight: bold; color: #333; font-size: 12px; cursor: pointer; user-select: none; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }' +
                'table.data-table thead th:hover { background-color: #e9ecef; }' +
                'table.data-table th, table.data-table td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; color: #000; }' +
                'table.data-table tbody tr:nth-child(even) td { background-color: #f9f9f9; }' +
                'table.data-table tbody tr:hover td { background-color: #e8f4f8; }' +
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
                '/* Summary row */' +
                '.summary-row { background-color: #f0f0f0 !important; border-top: 2px solid #333 !important; font-weight: bold; }' +
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
                '/* Apply date filter */' +
                'function applyDateFilter() {' +
                '    var startDate = document.getElementById("startdate").value;' +
                '    var endDate = document.getElementById("enddate").value;' +
                '    var department = document.getElementById("department").value;' +
                '    var overlay = document.getElementById("loadingOverlay");' +
                '    if (overlay) overlay.style.display = "flex";' +
                '    var url = "' + scriptUrl + '&loadData=T";' +
                '    if (startDate) url += "&startdate=" + encodeURIComponent(startDate);' +
                '    if (endDate) url += "&enddate=" + encodeURIComponent(endDate);' +
                '    if (department) url += "&department=" + encodeURIComponent(department);' +
                '    window.location.href = url;' +
                '}' +
                '' +
                '/* Clear date filter */' +
                'function clearDateFilter() {' +
                '    window.location.href = "' + scriptUrl + '";' +
                '}' +
                '' +
                '/* Filter table */' +
                'function filterTable(sectionId) {' +
                '    var categoryInput = document.getElementById(\'searchCategory-\' + sectionId);' +
                '    var subCategoryInput = document.getElementById(\'searchSubCategory-\' + sectionId);' +
                '    var configurationInput = document.getElementById(\'searchConfiguration-\' + sectionId);' +
                '    var generalSearchInput = document.getElementById(\'searchBox-\' + sectionId);' +
                '    ' +
                '    var categoryFilter = categoryInput ? categoryInput.value.toUpperCase() : \'\';' +
                '    var subCategoryFilter = subCategoryInput ? subCategoryInput.value.toUpperCase() : \'\';' +
                '    var configurationFilter = configurationInput ? configurationInput.value.toUpperCase() : \'\';' +
                '    var generalFilter = generalSearchInput ? generalSearchInput.value.toUpperCase() : \'\';' +
                '    ' +
                '    var tbody = document.querySelector(\'#table-\' + sectionId + \' tbody\');' +
                '    var rows = tbody.querySelectorAll(\'tr\');' +
                '    var visibleCount = 0;' +
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
                '        if (generalFilter) {' +
                '            var text = (row.textContent || row.innerText).toUpperCase();' +
                '            if (text.indexOf(generalFilter) > -1) {' +
                '                row.style.display = \'\';' +
                '                visibleCount++;' +
                '            } else {' +
                '                row.style.display = \'none\';' +
                '            }' +
                '        } else {' +
                '            var categoryText = (cells[0].textContent || cells[0].innerText).toUpperCase();' +
                '            var subCategoryText = (cells[1].textContent || cells[1].innerText).toUpperCase();' +
                '            var configurationText = (cells[2].textContent || cells[2].innerText).toUpperCase();' +
                '            ' +
                '            var categoryMatch = !categoryFilter || categoryText.indexOf(categoryFilter) > -1;' +
                '            var subCategoryMatch = !subCategoryFilter || subCategoryText.indexOf(subCategoryFilter) > -1;' +
                '            var configurationMatch = !configurationFilter || configurationText.indexOf(configurationFilter) > -1;' +
                '            ' +
                '            if (categoryMatch && subCategoryMatch && configurationMatch) {' +
                '                row.style.display = \'\';' +
                '                visibleCount++;' +
                '            } else {' +
                '                row.style.display = \'none\';' +
                '            }' +
                '        }' +
                '    }' +
                '    ' +
                '    var countSpan = document.getElementById(\'searchCount-\' + sectionId);' +
                '    if (categoryFilter || subCategoryFilter || configurationFilter || generalFilter) {' +
                '        countSpan.textContent = \'Showing \' + visibleCount + \' of \' + rows.length + \' results\';' +
                '        countSpan.style.display = \'inline\';' +
                '    } else {' +
                '        countSpan.style.display = \'none\';' +
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
                '/* Recalculate percentages based on visible rows */' +
                'function recalculatePercentages(sectionId) {' +
                '    var table = document.getElementById(\'table-\' + sectionId);' +
                '    if (!table) return;' +
                '    var tbody = table.querySelector(\'tbody\');' +
                '    var rows = tbody.querySelectorAll(\'tr:not(.summary-row)\');' +
                '    var categoryTotals = {};' +
                '    for (var i = 0; i < rows.length; i++) {' +
                '        var row = rows[i];' +
                '        if (row.style.display === \'none\') continue;' +
                '        var cells = row.cells;' +
                '        var category = cells[0].textContent.trim();' +
                '        var profileAmount = parseFloat(cells[3].textContent.replace(/[\\$,]/g, \'\')) || 0;' +
                '        var geAmount = parseFloat(cells[5].textContent.replace(/[\\$,]/g, \'\')) || 0;' +
                '        var cafeAmount = parseFloat(cells[7].textContent.replace(/[\\$,]/g, \'\')) || 0;' +
                '        var monogramAmount = parseFloat(cells[9].textContent.replace(/[\\$,]/g, \'\')) || 0;' +
                '        var otherBrandsAmount = parseFloat(cells[13].textContent.replace(/[\\$,]/g, \'\')) || 0;' +
                '        var allBrandsAmount = parseFloat(cells[15].textContent.replace(/[\\$,]/g, \'\')) || 0;' +
                '        if (!categoryTotals[category]) {' +
                '            categoryTotals[category] = {profileAmount: 0, geAmount: 0, cafeAmount: 0, monogramAmount: 0, otherBrandsAmount: 0, allBrandsAmount: 0};' +
                '        }' +
                '        categoryTotals[category].profileAmount += profileAmount;' +
                '        categoryTotals[category].geAmount += geAmount;' +
                '        categoryTotals[category].cafeAmount += cafeAmount;' +
                '        categoryTotals[category].monogramAmount += monogramAmount;' +
                '        categoryTotals[category].otherBrandsAmount += otherBrandsAmount;' +
                '        categoryTotals[category].allBrandsAmount += allBrandsAmount;' +
                '    }' +
                '    for (var i = 0; i < rows.length; i++) {' +
                '        var row = rows[i];' +
                '        if (row.style.display === \'none\') continue;' +
                '        var cells = row.cells;' +
                '        var category = cells[0].textContent.trim();' +
                '        var catTotal = categoryTotals[category];' +
                '        if (!catTotal) continue;' +
                '        var profileAmount = parseFloat(cells[3].textContent.replace(/[\\$,]/g, \'\')) || 0;' +
                '        var geAmount = parseFloat(cells[5].textContent.replace(/[\\$,]/g, \'\')) || 0;' +
                '        var cafeAmount = parseFloat(cells[7].textContent.replace(/[\\$,]/g, \'\')) || 0;' +
                '        var monogramAmount = parseFloat(cells[9].textContent.replace(/[\\$,]/g, \'\')) || 0;' +
                '        var selectedBrandsTotal = profileAmount + geAmount + cafeAmount + monogramAmount;' +
                '        var otherBrandsAmount = parseFloat(cells[13].textContent.replace(/[\\$,]/g, \'\')) || 0;' +
                '        var allBrandsAmount = parseFloat(cells[15].textContent.replace(/[\\$,]/g, \'\')) || 0;' +
                '        var profilePct = catTotal.profileAmount > 0 ? (profileAmount / catTotal.profileAmount * 100).toFixed(2) : \'0.00\';' +
                '        var gePct = catTotal.geAmount > 0 ? (geAmount / catTotal.geAmount * 100).toFixed(2) : \'0.00\';' +
                '        var cafePct = catTotal.cafeAmount > 0 ? (cafeAmount / catTotal.cafeAmount * 100).toFixed(2) : \'0.00\';' +
                '        var monogramPct = catTotal.monogramAmount > 0 ? (monogramAmount / catTotal.monogramAmount * 100).toFixed(2) : \'0.00\';' +
                '        var selectedBrandsPct = catTotal.allBrandsAmount > 0 ? (selectedBrandsTotal / catTotal.allBrandsAmount * 100).toFixed(2) : \'0.00\';' +
                '        var otherBrandsPct = catTotal.otherBrandsAmount > 0 ? (otherBrandsAmount / catTotal.otherBrandsAmount * 100).toFixed(2) : \'0.00\';' +
                '        var allBrandsPct = catTotal.allBrandsAmount > 0 ? (allBrandsAmount / catTotal.allBrandsAmount * 100).toFixed(2) : \'0.00\';' +
                '        cells[4].textContent = profilePct + \'%\';' +
                '        cells[6].textContent = gePct + \'%\';' +
                '        cells[8].textContent = cafePct + \'%\';' +
                '        cells[10].textContent = monogramPct + \'%\';' +
                '        cells[12].textContent = selectedBrandsPct + \'%\';' +
                '        cells[14].textContent = otherBrandsPct + \'%\';' +
                '        cells[16].textContent = allBrandsPct + \'%\';' +
                '    }' +
                '    alert(\'Percentages recalculated based on \' + Object.keys(categoryTotals).length + \' visible categor(ies)!\');' +
                '}';
        }

        return {
            onRequest: onRequest
        };
    });
