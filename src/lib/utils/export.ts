import dayjs from 'dayjs';

interface ExportColumn {
  title: string;
  dataKey: string;
  format?: (val: any) => string;
}

export async function exportToPDF(title: string, columns: ExportColumn[], data: any[]) {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated on: ${dayjs().format('YYYY-MM-DD HH:mm')}`, 14, 28);

  const head = [columns.map(c => c.title)];
  const body = data.map(row => columns.map(c => {
    let val = c.dataKey.includes('.') 
      ? c.dataKey.split('.').reduce((o, k) => (o || {})[k], row)
      : row[c.dataKey];
    
    if (c.format) val = c.format(val);
    return val !== undefined && val !== null ? String(val) : '';
  }));

  (doc as any).autoTable({
    startY: 35,
    head,
    body,
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [102, 126, 234] }
  });

  doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}_${dayjs().format('YYYYMMDD')}.pdf`);
}

export async function exportToExcel(title: string, columns: ExportColumn[], data: any[]) {
  const XLSX = await import('xlsx');

  const wsData = [columns.map(c => c.title)];
  
  data.forEach(row => {
    wsData.push(columns.map(c => {
      let val = c.dataKey.includes('.') 
        ? c.dataKey.split('.').reduce((o, k) => (o || {})[k], row)
        : row[c.dataKey];
        
      if (c.format) val = c.format(val);
      return val !== undefined && val !== null ? val : '';
    }));
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report Data');
  
  XLSX.writeFile(wb, `${title.replace(/\s+/g, '_').toLowerCase()}_${dayjs().format('YYYYMMDD')}.xlsx`);
}
