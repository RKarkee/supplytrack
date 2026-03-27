import { formatCurrency } from './currency';
import dayjs from 'dayjs';

interface ReceiptData {
  invoiceNumber: string;
  createdAt: string;
  subtotal: string | number;
  discountAmount: string | number;
  vatAmount: string | number;
  totalAmount: string | number;
  paidAmount: string | number;
  creditAmount: string | number;
  changeAmount: string | number;
  items: Array<{
    productName: string;
    quantity: string | number;
    unitPrice: string | number;
    total: string | number;
  }>;
  customer?: { name: string } | null;
  shopSettings?: {
    shopName: string;
    address?: string | null;
    phone?: string | null;
    panNumber?: string | null;
    receiptHeader?: string | null;
    receiptFooter?: string | null;
  };
}

export async function generateReceipt(data: ReceiptData) {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  // 80mm thermal paper width approx 226 points. 80mm = 80 units in mm format.
  // Dynamic height based on items. Base height 120mm + 5mm per item.
  const height = Math.max(120, 100 + (data.items.length * 8));
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, height],
  });

  const pageWidth = 80;
  let y = 10;

  // Shop Info
  const shopName = data.shopSettings?.shopName || 'SUPPLYTRACK STORE';
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(shopName, pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (data.shopSettings?.address) {
    doc.text(data.shopSettings.address, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }
  if (data.shopSettings?.phone) {
    doc.text(`Ph: ${data.shopSettings.phone}`, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }
  if (data.shopSettings?.panNumber) {
    doc.text(`PAN/VAT: ${data.shopSettings.panNumber}`, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }
  
  if (data.shopSettings?.receiptHeader) {
    y += 2;
    doc.text(data.shopSettings.receiptHeader, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }

  y += 2;
  doc.line(5, y, pageWidth - 5, y);
  y += 4;

  // Invoice Details
  doc.setFontSize(9);
  doc.text(`Inv: ${data.invoiceNumber}`, 5, y);
  doc.text(`Date: ${dayjs(data.createdAt).format('DD/MM/YYYY HH:mm')}`, pageWidth - 5, y, { align: 'right' });
  y += 4;

  if (data.customer?.name) {
    doc.text(`Customer: ${data.customer.name}`, 5, y);
    y += 4;
  }

  y += 2;
  
  // Items Table
  const tableData = data.items.map(item => [
    item.productName.substring(0, 15), 
    `${parseFloat(item.quantity as string)}`, 
    formatCurrency(item.unitPrice).replace(/[^0-9.]/g, ''), 
    formatCurrency(item.total).replace(/[^0-9.]/g, '')
  ]);

  (doc as any).autoTable({
    startY: y,
    head: [['Item', 'Qty', 'Rate', 'Total']],
    body: tableData,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1 },
    headStyles: { fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 8, halign: 'center' },
      2: { cellWidth: 15, halign: 'right' },
      3: { cellWidth: 15, halign: 'right' },
    },
    margin: { left: 5, right: 5 },
  });

  y = (doc as any).lastAutoTable.finalY + 5;
  doc.line(5, y, pageWidth - 5, y);
  y += 5;

  // Summary
  doc.setFontSize(9);
  const addSummaryRow = (label: string, value: string | number, isBold: boolean = false) => {
    if (isBold) doc.setFont('helvetica', 'bold');
    else doc.setFont('helvetica', 'normal');
    doc.text(label, 30, y);
    doc.text(formatCurrency(value).replace(/[^0-9.]/g, ''), pageWidth - 5, y, { align: 'right' });
    y += 4;
  };

  addSummaryRow('Subtotal:', data.subtotal);
  if (Number(data.discountAmount) > 0) addSummaryRow('Discount:', data.discountAmount);
  if (Number(data.vatAmount) > 0) addSummaryRow('VAT (13%):', data.vatAmount);
  
  doc.setFontSize(10);
  addSummaryRow('TOTAL:', data.totalAmount, true);
  
  y += 2;
  doc.setFontSize(9);
  addSummaryRow('Paid:', data.paidAmount);
  if (Number(data.creditAmount) > 0) addSummaryRow('Credit:', data.creditAmount);
  if (Number(data.changeAmount) > 0) addSummaryRow('Change:', data.changeAmount);

  y += 4;
  doc.line(5, y, pageWidth - 5, y);
  y += 6;

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const footerText = data.shopSettings?.receiptFooter || 'Thank you for your business!';
  doc.text(footerText, pageWidth / 2, y, { align: 'center' });
  
  // Output
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, '_blank');
}
