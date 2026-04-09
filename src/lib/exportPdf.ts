export async function exportTableToPdf(title: string, headers: string[], rows: string[][], filename: string) {
  // Uses browser print as PDF - works everywhere
  const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700&display=swap');
*{font-family:'Rubik',sans-serif;margin:0;padding:0}
body{padding:32px;color:#1C1917}
h1{font-size:22px;margin-bottom:4px}
.date{font-size:12px;color:#78716C;margin-bottom:20px}
table{width:100%;border-collapse:collapse;font-size:12px}
th{background:#F5F0EB;padding:8px 12px;text-align:right;font-weight:600;border-bottom:2px solid #E7E2DD}
td{padding:8px 12px;border-bottom:1px solid #F0EDE8}
tr:nth-child(even){background:#FAFAF8}
.footer{margin-top:24px;font-size:10px;color:#A8A29E;text-align:center}
</style></head><body>
<h1>${title}</h1>
<div class="date">${new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
<table><thead><tr>${headers.map(h => '<th>' + h + '</th>').join('')}</tr></thead>
<tbody>${rows.map(r => '<tr>' + r.map(c => '<td>' + (c || '—') + '</td>').join('') + '</tr>').join('')}</tbody></table>
<div class="footer">Zikkit — AI Field Service Management</div>
</body></html>`;
  
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500); }
}

export async function exportToCsv(headers: string[], rows: string[][], filename: string) {
  const bom = '\uFEFF';
  const csv = bom + [headers.join(','), ...rows.map(r => r.map(c => '"' + (c || '').replace(/"/g, '""') + '"').join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename + '.csv'; a.click();
  URL.revokeObjectURL(url);
}
