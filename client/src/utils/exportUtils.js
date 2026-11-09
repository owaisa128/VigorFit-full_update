/**
 * Export JSON array of objects to a CSV file download
 * @param {Array<Object>} data 
 * @param {string} filename 
 */
export const exportToCSV = (data, filename = 'vigorfit_export.csv') => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('No data available to export.');
  }

  // Extract CSV headers
  const keys = Object.keys(data[0]);
  const csvRows = [];

  // Header row
  csvRows.push(keys.map(key => `"${key}"`).join(','));

  // Data rows
  for (const row of data) {
    const values = keys.map(key => {
      const val = row[key] === null || row[key] === undefined ? '' : row[key];
      const escaped = ('' + val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Generate a printable HTML document window for PDF export
 * @param {string} reportTitle 
 * @param {string} subtitle 
 * @param {Array<string>} headers 
 * @param {Array<Array<string>>} rows 
 */
export const exportToPDFReport = (reportTitle, subtitle, headers, rows) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Please allow pop-ups to generate PDF reports.');
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${reportTitle} - VigorFit</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; margin: 40px; color: #111; }
          .header { border-bottom: 3px solid #FF009D; padding-bottom: 15px; margin-bottom: 25px; }
          .title { font-size: 24px; font-weight: 800; color: #050505; margin: 0; }
          .subtitle { font-size: 13px; color: #666; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th { background: #181824; color: #fff; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; }
          td { border-bottom: 1px solid #eee; padding: 10px; }
          tr:nth-child(even) { background: #f9f9f9; }
          .footer { margin-top: 40px; font-size: 10px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">VigorFit — ${reportTitle}</h1>
          <p class="subtitle">${subtitle} • Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${row.map(cell => `<td>${cell}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          VigorFit Fitness Application • Confidential User Report
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
