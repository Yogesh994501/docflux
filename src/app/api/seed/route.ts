import { NextRequest, NextResponse } from 'next/server'
import { repo } from '@/lib/repository'
import { ok, err } from '@/lib/constants'

// Seed sample vendors + demo documents with pre-extracted data so the dashboard
// is populated immediately. Real OCR runs when the user uploads their own files.
export async function POST(_req: NextRequest) {
  try {
    await repo.clearAll()

    const now = new Date()
    const iso = (offsetDays: number) => new Date(now.getTime() - offsetDays * 24 * 60 * 60 * 1000).toISOString()

    // ─── Vendors ──────────────────────────────────────────────────────────────
    const technova = await repo.createVendor({ name: 'TechNova Solutions Pvt Ltd', gstin: '27AABCT1332L1ZJ', pan: 'AABCT1332L', email: 'accounts@technova.in', phone: '+91 22 4567 8901', address: '14, IT Park, Hinjewadi Phase 2, Pune, Maharashtra 411057', category: 'supplier' })
    const bluepeak = await repo.createVendor({ name: 'BluePeak Office Supplies', gstin: '29AAFCB7894K1ZP', pan: 'AAFCB7894K', email: 'billing@bluepeak.co.in', phone: '+91 80 2345 6789', address: 'MG Road, Bengaluru, Karnataka 560001', category: 'supplier' })
    const msedcl = await repo.createVendor({ name: 'Mumbai Electricity Board (MSEDCL)', gstin: '27AAACM7891L1Z5', pan: 'AAACM7891L', email: 'care@msedcl.in', phone: '19120', address: '4th Floor, Prakashgad, Bandra East, Mumbai 400051', category: 'supplier' })
    const cloudverse = await repo.createVendor({ name: 'CloudVerse Hosting', gstin: '07AANCC9821P1ZK', pan: 'AANCC9821P', email: 'finance@cloudverse.com', phone: '+91 11 4567 1234', address: 'Cyber City, DLF Phase 3, Gurugram, Haryana 122002', category: 'supplier' })
    const acme = await repo.createVendor({ name: 'Acme Logistics Pvt Ltd', gstin: '33AAGCA1234M1Z9', pan: 'AAGCA1234M', email: 'ops@acmelogistics.in', phone: '+91 44 9876 5432', address: 'Port Trust Road, Chennai, Tamil Nadu 600001', category: 'supplier' })

    const samples = [
      {
        fileName: 'GST-Invoice-TN-2024-0451.pdf', fileType: 'application/pdf', fileSize: 248320,
        storagePath: '/uploads/sample-invoice-1.svg', documentType: 'GST_INVOICE',
        status: 'APPROVED', fraudRisk: 'LOW', ocrConfidence: 0.96, vendorId: technova.id,
        uploadedAt: iso(2), approvalComments: 'Verified against PO, 3-way match OK.',
        ocrText: 'TAX INVOICE\nTechNova Solutions Pvt Ltd\n27AABCT1332L1ZJ\n14, IT Park, Hinjewadi Phase 2, Pune 411057\n\nBill To: AutoFinDocs India Pvt Ltd\nInvoice No: TN-2024-0451\nDate: 12-Nov-2024  Due: 26-Nov-2024\n\n# Description          HSN     Qty  Rate     Amount\n1 React Dev License   998314   5   12,000   60,000\n2 Premium Support     998314   1   18,000   18,000\n                       Subtotal         78,000\n  CGST 9%                                7,020\n  SGST 9%                                7,020\n  Grand Total          ₹92,040',
        extracted: { documentType: 'GST_INVOICE', vendorName: 'TechNova Solutions Pvt Ltd', vendorGstin: '27AABCT1332L1ZJ', vendorAddress: '14, IT Park, Hinjewadi Phase 2, Pune 411057', vendorEmail: 'accounts@technova.in', customerName: 'AutoFinDocs India Pvt Ltd', invoiceNumber: 'TN-2024-0451', invoiceDate: '12-Nov-2024', dueDate: '26-Nov-2024', currency: 'INR', subtotal: '78,000', cgst: '7,020', sgst: '7,020', taxAmount: '14,040', totalAmount: '92,040', lineItems: [{ description: 'React Dev License', hsn: '998314', quantity: 5, rate: '12,000', amount: '60,000' }, { description: 'Premium Support', hsn: '998314', quantity: 1, rate: '18,000', amount: '18,000' }], fraudIndicators: [], fraudRisk: 'LOW' },
      },
      {
        fileName: 'Electricity-Bill-Nov2024.pdf', fileType: 'application/pdf', fileSize: 184220,
        storagePath: '/uploads/sample-bill-1.svg', documentType: 'E_BILL',
        status: 'APPROVED', fraudRisk: 'LOW', ocrConfidence: 0.93, vendorId: msedcl.id,
        uploadedAt: iso(5), approvalComments: 'Recurring bill, auto-approved.',
        ocrText: 'MAHARASHTRA STATE ELECTRICITY DISTRIBUTION CO. LTD.\nConsumer No: 170145678901\nBill No: BQ-8821447\nBill Period: Oct 12 - Nov 11, 2024\n\nConsumer Name: AutoFinDocs India Pvt Ltd\nAddress: 5th Floor, Trade Tower, BKC, Mumbai 400051\n\nUnits Consumed: 1,240 kWh\nFixed Charges:     ₹1,200.00\nEnergy Charges:    ₹9,920.00\nTax on Sale:       ₹1,725.60\n\nTotal Payable:     ₹12,845.60\nDue Date: 30-Nov-2024',
        extracted: { documentType: 'E_BILL', vendorName: 'Mumbai Electricity Board (MSEDCL)', vendorGstin: '27AAACM7891L1Z5', vendorAddress: '4th Floor, Prakashgad, Bandra East, Mumbai 400051', customerName: 'AutoFinDocs India Pvt Ltd', invoiceNumber: 'BQ-8821447', invoiceDate: '11-Nov-2024', dueDate: '30-Nov-2024', currency: 'INR', subtotal: '11,120.00', taxAmount: '1,725.60', totalAmount: '12,845.60', paymentMethod: 'Bank Transfer', fraudIndicators: [], fraudRisk: 'LOW' },
      },
      {
        fileName: 'Receipt-BluePeak-Stationery.jpg', fileType: 'image/jpeg', fileSize: 92160,
        storagePath: '/uploads/sample-receipt-1.svg', documentType: 'RECEIPT',
        status: 'EXTRACTED', fraudRisk: 'LOW', ocrConfidence: 0.91, vendorId: bluepeak.id,
        uploadedAt: iso(1),
        ocrText: 'BLUEPEAK OFFICE SUPPLIES\nMG Road, Bengaluru 560001\nPh: 080-2345-6789\n\nReceipt #R-99213\nDate: 18-Nov-2024\n\n1 Parker Pen (Blue)     ₹  450.00\n2 A4 Notebook (200pg)   ₹  320.00\n1 Stapler (Medium)      ₹  280.00\n4 Highlighter Set        ₹  640.00\n\nTotal: ₹1,690.00\nPaid: Cash',
        extracted: { documentType: 'RECEIPT', vendorName: 'BluePeak Office Supplies', vendorAddress: 'MG Road, Bengaluru 560001', vendorPhone: '080-2345-6789', invoiceNumber: 'R-99213', invoiceDate: '18-Nov-2024', currency: 'INR', totalAmount: '1,690.00', paymentMethod: 'Cash', lineItems: [{ description: 'Parker Pen (Blue)', quantity: 1, rate: '450.00', amount: '450.00' }, { description: 'A4 Notebook (200pg)', quantity: 2, rate: '160.00', amount: '320.00' }, { description: 'Stapler (Medium)', quantity: 1, rate: '280.00', amount: '280.00' }, { description: 'Highlighter Set', quantity: 4, rate: '160.00', amount: '640.00' }], fraudIndicators: [], fraudRisk: 'LOW' },
      },
      {
        fileName: 'CloudVerse-Hosting-Oct2024.pdf', fileType: 'application/pdf', fileSize: 142336,
        storagePath: '/uploads/sample-invoice-2.svg', documentType: 'GST_INVOICE',
        status: 'EXTRACTED', fraudRisk: 'MEDIUM', ocrConfidence: 0.88, vendorId: cloudverse.id,
        uploadedAt: iso(3),
        ocrText: 'CloudVerse Hosting\ntax invoice\nGSTIN: 07AANCC9821P1ZK\nCyber City, DLF Phase 3, Gurugram 122002\n\nInvoice #CV-2024-1098   Date: 01-Nov-2024\nBill To: AutoFinDocs India Pvt Ltd (27AAACA9999L1Z3)\n\n1 EC2 xLarge (750 hrs)   ₹45,000\n2 S3 Storage 2TB          ₹6,400\n1 CDN 500GB               ₹4,200\nSubtotal                  ₹55,600\nIGST 18%                  ₹10,008\nGrand Total               ₹65,608',
        extracted: { documentType: 'GST_INVOICE', vendorName: 'CloudVerse Hosting', vendorGstin: '07AANCC9821P1ZK', vendorAddress: 'Cyber City, DLF Phase 3, Gurugram 122002', customerName: 'AutoFinDocs India Pvt Ltd', customerGstin: '27AAACA9999L1Z3', invoiceNumber: 'CV-2024-1098', invoiceDate: '01-Nov-2024', currency: 'INR', subtotal: '55,600', igst: '10,008', taxAmount: '10,008', totalAmount: '65,608', lineItems: [{ description: 'EC2 xLarge (750 hrs)', quantity: 1, rate: '45,000', amount: '45,000' }, { description: 'S3 Storage 2TB', quantity: 2, rate: '3,200', amount: '6,400' }, { description: 'CDN 500GB', quantity: 1, rate: '4,200', amount: '4,200' }], fraudIndicators: ['IGST applied on inter-state sale — verify supplier state code (07) matches registered address'], fraudRisk: 'MEDIUM' },
      },
      {
        fileName: 'PO-2024-0218-Acme.pdf', fileType: 'application/pdf', fileSize: 165012,
        storagePath: '/uploads/sample-po-1.svg', documentType: 'PURCHASE_ORDER',
        status: 'APPROVED', fraudRisk: 'LOW', ocrConfidence: 0.95, vendorId: acme.id,
        uploadedAt: iso(8), approvalComments: 'PO issued for Q4 logistics.',
        ocrText: 'PURCHASE ORDER\nAutoFinDocs India Pvt Ltd\nPO No: PO-2024-0218   Date: 01-Nov-2024\n\nVendor: Acme Logistics Pvt Ltd\n33AAGCA1234M1Z9\nPort Trust Road, Chennai 600001\n\n1 Warehousing - Nov     1 mo   ₹85,000\n2 Last-mile delivery  500 pcs  ₹40,000\n3 Reverse logistics   100 pcs  ₹8,500\nSubtotal               ₹133,500\nCGST 9%                ₹12,015\nSGST 9%                ₹12,015\nTotal                  ₹157,530',
        extracted: { documentType: 'PURCHASE_ORDER', vendorName: 'Acme Logistics Pvt Ltd', vendorGstin: '33AAGCA1234M1Z9', vendorAddress: 'Port Trust Road, Chennai 600001', customerName: 'AutoFinDocs India Pvt Ltd', poNumber: 'PO-2024-0218', invoiceDate: '01-Nov-2024', currency: 'INR', subtotal: '133,500', cgst: '12,015', sgst: '12,015', taxAmount: '24,030', totalAmount: '157,530', lineItems: [{ description: 'Warehousing - Nov', quantity: '1 mo', rate: '85,000', amount: '85,000' }, { description: 'Last-mile delivery', quantity: 500, rate: '80', amount: '40,000' }, { description: 'Reverse logistics', quantity: 100, rate: '85', amount: '8,500' }], fraudIndicators: [], fraudRisk: 'LOW' },
      },
      {
        fileName: 'PAN-Card-Scan.jpg', fileType: 'image/jpeg', fileSize: 67584,
        storagePath: '/uploads/sample-govtid-1.svg', documentType: 'GOVT_ID',
        status: 'EXTRACTED', fraudRisk: 'LOW', ocrConfidence: 0.97, vendorId: null,
        uploadedAt: iso(6),
        ocrText: 'GOVERNMENT OF INDIA\nINCOME TAX DEPARTMENT\n\nPermanent Account Number\nCard\n\nName: RAHUL SHARMA\nFather\'s Name: SURESH SHARMA\nDate of Birth: 14/08/1991\nPAN: ABOPS1234K\nSignature',
        extracted: { documentType: 'GOVT_ID', idType: 'PAN', idNumber: 'ABOPS1234K', idHolderName: 'RAHUL SHARMA', idDateOfBirth: '14/08/1991', fraudIndicators: [], fraudRisk: 'LOW' },
      },
    ]

    for (const s of samples) {
      const created = await repo.createDocument({
        fileName: s.fileName,
        fileType: s.fileType,
        fileSize: s.fileSize,
        storagePath: s.storagePath,
        thumbnailPath: s.storagePath,
        documentType: s.documentType,
        source: 'seed',
        status: s.status,
      })

      // Update with OCR + extraction + vendor + timestamps
      await repo.updateDocument(created.id, {
        ocrText: s.ocrText,
        ocrConfidence: s.ocrConfidence,
        ocrLanguage: 'en',
        extractedData: JSON.stringify(s.extracted),
        documentType: s.documentType,
        fraudRisk: s.fraudRisk,
        status: s.status,
        approvalComments: s.approvalComments ?? null,
        approvedBy: s.status === 'APPROVED' ? 'admin' : null,
        approvedAt: s.status === 'APPROVED' ? s.uploadedAt : null,
        vendorId: s.vendorId,
        processedAt: s.uploadedAt,
        uploadedAt: s.uploadedAt,
      })

      await repo.createAuditLog({ documentId: created.id, action: 'UPLOADED', details: JSON.stringify({ source: 'seed' }) })
      await repo.createAuditLog({ documentId: created.id, action: 'EXTRACTED', details: JSON.stringify({ type: s.documentType, confidence: s.ocrConfidence }) })
      if (s.status === 'APPROVED') {
        await repo.createAuditLog({ documentId: created.id, action: 'APPROVED', details: JSON.stringify({ comments: s.approvalComments }), actor: 'admin' })
      }
    }

    return NextResponse.json(ok({ vendors: 5, documents: samples.length }))
  } catch (e) {
    console.error('[POST /api/seed]', e)
    return NextResponse.json(err('Seed failed: ' + (e as Error).message), { status: 500 })
  }
}
