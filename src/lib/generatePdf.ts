import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Quote, Invoice } from '@/types/phase5';
import logoUrl from '@/assets/webforge-logo.png';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

let cachedLogoBase64: string | null = null;

async function loadLogoBase64(): Promise<string | null> {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogoBase64 = reader.result as string;
        resolve(cachedLogoBase64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function addHeader(doc: jsPDF, title: string, number: string, logoBase64: string | null) {
  // Logo + Company name
  let textStartX = 20;
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 20, 12, 16, 16);
    textStartX = 39;
  }

  doc.setFontSize(20);
  doc.setTextColor(30, 64, 175);
  doc.text('WebForge', textStartX, 24);

  // Document title
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text(title, 200, 20, { align: 'right' });

  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  doc.text(number, 200, 28, { align: 'right' });

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(20, 34, 200, 34);
}

function addInfoBlock(doc: jsPDF, labels: [string, string][], startY: number): number {
  doc.setFontSize(10);
  let y = startY;
  for (const [label, value] of labels) {
    if (!value) continue;
    doc.setTextColor(100, 100, 100);
    doc.text(label + ':', 20, y);
    doc.setTextColor(30, 30, 30);
    doc.text(value, 65, y);
    y += 6;
  }
  return y + 4;
}

export async function generateQuotePdf(quote: Quote) {
  const logoBase64 = await loadLogoBase64();
  const doc = new jsPDF();
  addHeader(doc, 'QUOTE', quote.quoteNumber, logoBase64);

  const infoY = addInfoBlock(doc, [
    ['Deal', quote.dealName || '—'],
    ['Account', quote.accountName || '—'],
    ['Contact', quote.contactName || '—'],
    ['Status', quote.status.toUpperCase()],
    ['Valid Until', quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : '—'],
  ], 42);

  // Line items table
  autoTable(doc, {
    startY: infoY,
    head: [['Product', 'Description', 'Qty', 'Unit Price', 'Discount', 'Tax', 'Total']],
    body: quote.lineItems.map(li => [
      li.productName,
      li.description || '—',
      li.quantity.toString(),
      formatCurrency(li.unitPrice),
      formatCurrency(li.discount),
      formatCurrency(li.tax),
      formatCurrency(li.total),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    margin: { left: 20, right: 10 },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable?.finalY || infoY + 20;
  let tY = finalY + 10;

  doc.setFontSize(10);
  const totals: [string, string][] = [
    ['Subtotal', formatCurrency(quote.subtotal)],
    ['Discount', formatCurrency(quote.totalDiscount)],
    ['Tax', formatCurrency(quote.totalTax)],
  ];

  for (const [label, value] of totals) {
    doc.setTextColor(100, 100, 100);
    doc.text(label + ':', 140, tY, { align: 'right' });
    doc.setTextColor(30, 30, 30);
    doc.text(value, 195, tY, { align: 'right' });
    tY += 6;
  }

  doc.setLineWidth(0.3);
  doc.line(120, tY - 2, 200, tY - 2);
  tY += 4;

  doc.setFontSize(12);
  doc.setFont(undefined!, 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Grand Total:', 140, tY, { align: 'right' });
  doc.text(formatCurrency(quote.grandTotal), 195, tY, { align: 'right' });

  // Notes
  if (quote.notes) {
    tY += 14;
    doc.setFontSize(10);
    doc.setFont(undefined!, 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Notes:', 20, tY);
    doc.setFont(undefined!, 'normal');
    doc.setTextColor(80, 80, 80);
    const lines = doc.splitTextToSize(quote.notes, 170);
    doc.text(lines, 20, tY + 6);
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 105, pageHeight - 10, { align: 'center' });

  doc.save(`${quote.quoteNumber}.pdf`);
}

export async function generateInvoicePdf(invoice: Invoice) {
  const logoBase64 = await loadLogoBase64();
  const doc = new jsPDF();
  addHeader(doc, 'INVOICE', invoice.invoiceNumber, logoBase64);

  const infoY = addInfoBlock(doc, [
    ['Deal', invoice.dealName || '—'],
    ['Account', invoice.accountName || '—'],
    ['Contact', invoice.contactName || '—'],
    ['Status', invoice.status.toUpperCase()],
    ['Issue Date', new Date(invoice.issueDate).toLocaleDateString()],
    ['Due Date', new Date(invoice.dueDate).toLocaleDateString()],
  ], 42);

  autoTable(doc, {
    startY: infoY,
    head: [['Product', 'Description', 'Qty', 'Unit Price', 'Discount', 'Tax', 'Total']],
    body: invoice.lineItems.map(li => [
      li.productName,
      li.description || '—',
      li.quantity.toString(),
      formatCurrency(li.unitPrice),
      formatCurrency(li.discount),
      formatCurrency(li.tax),
      formatCurrency(li.total),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    margin: { left: 20, right: 10 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || infoY + 20;
  let tY = finalY + 10;

  doc.setFontSize(10);
  const totals: [string, string][] = [
    ['Subtotal', formatCurrency(invoice.subtotal)],
    ['Tax', formatCurrency(invoice.totalTax)],
  ];

  for (const [label, value] of totals) {
    doc.setTextColor(100, 100, 100);
    doc.text(label + ':', 140, tY, { align: 'right' });
    doc.setTextColor(30, 30, 30);
    doc.text(value, 195, tY, { align: 'right' });
    tY += 6;
  }

  doc.setLineWidth(0.3);
  doc.line(120, tY - 2, 200, tY - 2);
  tY += 4;

  doc.setFontSize(12);
  doc.setFont(undefined!, 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Grand Total:', 140, tY, { align: 'right' });
  doc.text(formatCurrency(invoice.grandTotal), 195, tY, { align: 'right' });

  tY += 8;
  doc.setFontSize(10);
  doc.setFont(undefined!, 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Paid Amount:', 140, tY, { align: 'right' });
  doc.setTextColor(34, 139, 34);
  doc.text(formatCurrency(invoice.paidAmount), 195, tY, { align: 'right' });

  tY += 6;
  doc.setTextColor(100, 100, 100);
  doc.text('Balance Due:', 140, tY, { align: 'right' });
  const balance = invoice.grandTotal - invoice.paidAmount;
  doc.setTextColor(balance > 0 ? 220 : 34, balance > 0 ? 38 : 139, balance > 0 ? 38 : 34);
  doc.setFont(undefined!, 'bold');
  doc.text(formatCurrency(balance), 195, tY, { align: 'right' });

  if (invoice.notes) {
    tY += 14;
    doc.setFontSize(10);
    doc.setFont(undefined!, 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Notes:', 20, tY);
    doc.setFont(undefined!, 'normal');
    doc.setTextColor(80, 80, 80);
    const lines = doc.splitTextToSize(invoice.notes, 170);
    doc.text(lines, 20, tY + 6);
  }

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 105, pageHeight - 10, { align: 'center' });

  doc.save(`${invoice.invoiceNumber}.pdf`);
}
