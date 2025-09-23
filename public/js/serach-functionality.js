
        let typingTimer;
        let debounceTime = 500;
        $(document).ready(function () {

            $('#overall-search').on('input', function () {
                clearTimeout(typingTimer); // reset timer
                let query = $(this).val().trim();

                typingTimer = setTimeout(function () {
                    if (query.length > 0) {
                        // Show loading state
                        showLoadingState();
                        $('#results').show();

                        // Make AJAX request
                        $.ajax({
                            url: '/search', // your backend route
                            method: 'GET',
                            data: { q: query },
                            success: function (response) {
                                const data = response.data;
                                renderSearchResults(data);
                            },
                            error: function (xhr, status, error) {
                                console.error('Search error:', error);
                                showErrorState();
                            }
                        });
                    } else {
                        $('#results').hide();
                        clearSearchResults();
                    }
                }, debounceTime);
            })

            // Close search results
            $(document).on('click', '#close-search-results', function () {
                $('#results').hide();
                $('#overall-search').val('');
                clearSearchResults();
            });

            function showLoadingState() {
                $('#issues-results-from-search').html(`
                    <div class="search-loading">
                        <i class="fas fa-spinner fa-spin fa-2x mb-2"></i>
                        <p>Searching...</p>
                    </div>
                `);
                $('#invoices-results-from-search').html(`
                    <div class="search-loading">
                        <i class="fas fa-spinner fa-spin fa-2x mb-2"></i>
                        <p>Searching...</p>
                    </div>
                `);
                $('#issues-count').text('...');
                $('#invoices-count').text('...');
            }

            function showErrorState() {
                $('#issues-results-from-search').html(`
                    <div class="search-empty-state">
                        <i class="fas fa-exclamation-triangle fa-2x mb-2 text-warning"></i>
                        <p>Error occurred while searching</p>
                    </div>
                `);
                $('#invoices-results-from-search').html(`
                    <div class="search-empty-state">
                        <i class="fas fa-exclamation-triangle fa-2x mb-2 text-warning"></i>
                        <p>Error occurred while searching</p>
                    </div>
                `);
            }

            function clearSearchResults() {
                $('#issues-results-from-search').html(`
                    <div class="search-empty-state">
                        <i class="fas fa-search fa-2x mb-2"></i>
                        <p>No issues found</p>
                    </div>
                `);
                $('#invoices-results-from-search').html(`
                    <div class="search-empty-state">
                        <i class="fas fa-search fa-2x mb-2"></i>
                        <p>No invoices found</p>
                    </div>
                `);
                $('#issues-count').text('0');
                $('#invoices-count').text('0');
            }

            function renderSearchResults(data) {
                // Render Issues
                if (data?.issues?.length > 0) {
                    let issuesHtml = '';
                    data.issues.forEach(issue => {
                        const statusClass = `status-${issue.status.replace(/_/g, '-')}`;
                        const createdDate = new Date(issue.createdAt).toLocaleDateString();

                        issuesHtml += `
                            <a href="/issue/${issue.human_readable_id}" class="search-result-item">
                                <div class="search-result-title">
                                    <i class="fas fa-ticket-alt mr-2"></i>
                                    ${issue.human_readable_id}
                                </div>
                                <div class="search-result-meta">
                                    <strong>Customer:</strong> ${issue.contact?.name || 'N/A'}
                                </div>
                                <div class="search-result-meta">
                                    <strong>Problem:</strong> ${issue.problemDescription?.substring(0, 60)}${issue.problemDescription?.length > 60 ? '...' : ''}
                                </div>
                                <div class="search-result-meta">
                                    <strong>Created:</strong> ${createdDate}
                                    <span class="search-result-status ${statusClass} ml-2">${issue.status}</span>
                                </div>
                            </a>
                        `;
                    });
                    $('#issues-results-from-search').html(issuesHtml);
                    $('#issues-count').text(data.issues.length);
                } else {
                    $('#issues-results-from-search').html(`
                        <div class="search-empty-state">
                            <i class="fas fa-search fa-2x mb-2"></i>
                            <p>No issues found</p>
                        </div>
                    `);
                    $('#issues-count').text('0');
                }

                // Render Invoices
                if (data?.invoices?.length > 0) {
                    let invoicesHtml = '';
                    data.invoices.forEach(invoice => {
                        const statusClass = `invoice-status-${invoice.status}`;
                        const invoiceDate = new Date(invoice.invoiceDate).toLocaleDateString();
                        const amount = invoice.finalAmount || 0;

                        invoicesHtml += `
                            <a href="/invoice/${invoice.human_readable_invoice_id}" class="search-result-item">
                                <div class="search-result-title">
                                    <i class="fas fa-file-invoice mr-2"></i>
                                    ${invoice.human_readable_invoice_id || invoice.human_readable_issue_id}
                                </div>
                                <div class="search-result-meta">
                                    <strong>Customer:</strong> ${invoice.customerName || 'N/A'}
                                </div>
                                <div class="search-result-meta">
                                    <strong>Amount:</strong> ₹${amount.toLocaleString()}
                                </div>
                                <div class="search-result-meta">
                                    <strong>Date:</strong> ${invoiceDate}
                                    <span class="search-result-status ${statusClass} ml-2">${invoice.status}</span>
                                </div>
                            </a>
                        `;
                    });
                    $('#invoices-results-from-search').html(invoicesHtml);
                    $('#invoices-count').text(data.invoices.length);
                } else {
                    $('#invoices-results-from-search').html(`
                        <div class="search-empty-state">
                            <i class="fas fa-search fa-2x mb-2"></i>
                            <p>No invoices found</p>
                        </div>
                    `);
                    $('#invoices-count').text('0');
                }
            }


        })
