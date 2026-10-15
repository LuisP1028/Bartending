---
id: ticket-001
title: Remove CHK/ORD-..., DATE/TIME, and SRV Metadata Lines from Receipts
status: completed
depends_on: []
acceptance_criteria:
  - AC-01
---

# Ticket 001: Remove CHK/ORD-..., DATE/TIME, and SRV Metadata Lines from Receipts

## Scope
Remove all rendered `"CHK: ORD-..."`, date (`MM/DD/YYYY`), time (`HH:MM AM/PM`), and `"SRV: V_BARTENDER"` metadata from both the transient summary receipt (`1appear`) and the full patron-inspected receipt (`3be shown`), and strip `"ORD-"` from the barcode seed string so `"ORD-"` never appears anywhere on rendered receipts (`INV-RECEIPT-NO-META-01`).

## Files Modified
- `src/components/receipt/ReceiptPaper.tsx`
- `src/lib/receipt/mapTicketToReceipt.ts`
