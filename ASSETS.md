# AutoFinDocs — Asset Creation Guide

This guide explains how to create and source images, videos, and document samples
for the AutoFinDocs platform. The app uses three kinds of assets:

1. **Document samples** — receipts, invoices, government IDs, etc. (for OCR)
2. **UI imagery** — illustrations, icons, hero graphics
3. **Video / motion** — demo recordings, background animations

---

## 1. Document Samples (for OCR testing)

The core feature is OCR + field extraction. To test it, you need real-looking
document images.

### Option A — Generate synthetic documents (recommended for demos)

Use the **Image Generation** skill to create realistic document mockups:

```bash
# Generate a receipt mockup
z-ai image -p "A realistic paper receipt from a coffee shop, crumpled texture, printed text showing items and total, top-down photo, natural lighting" -o ./receipt.png -s 768x1344

# Generate an invoice mockup
z-ai image -p "Professional tax invoice document on white paper, company header, line items table, GST breakdown, clean business layout" -o ./invoice.png -s 864x1152
```

**Tip**: AI image generators produce *visual* mockups but the text is often
garbled. For OCR testing you want **crisp, readable text**. Use the methods below
instead.

### Option B — Hand-crafted SVG → PNG (best for readable OCR)

SVGs render perfectly crisp text. Build an SVG document, then convert to PNG:

```bash
# 1. Create invoice.svg (see /public/uploads/sample-invoice-1.svg for a template)
# 2. Convert at high resolution using sharp:
bun -e "import sharp from 'sharp'; await sharp('invoice.svg', {density:300}).resize(1200,null,{fit:'inside'}).png().toFile('invoice.png')"
```

**Or render via a browser** (best fidelity — browsers have full font support):

```bash
agent-browser open "http://localhost:3000/uploads/invoice.svg"
agent-browser screenshot invoice.png
```

### Option C — Scan real documents

Photograph or scan actual receipts, invoices, PAN cards, etc. Ensure:
- Good lighting, no shadows
- Document fills most of the frame
- Text is in focus
- Min 1000px on the long edge
- Save as JPEG (photos) or PDF (multi-page)

### Option D — Use the seeded sample SVGs

The app ships with 6 hand-crafted SVG document samples in `/public/uploads/`:

| File | Type |
|---|---|
| `sample-invoice-1.svg` | GST Invoice (TechNova) |
| `sample-invoice-2.svg` | GST Invoice (CloudVerse, fraud-flagged) |
| `sample-bill-1.svg` | Utility Bill (MSEDCL electricity) |
| `sample-receipt-1.svg` | Retail Receipt (BluePeak) |
| `sample-po-1.svg` | Purchase Order (Acme Logistics) |
| `sample-govtid-1.svg` | PAN Card (Government ID) |

Run `Load demo data` in the app header, or `POST /api/seed`, to populate them.

---

## 2. UI Imagery

### Icons
- The app uses **Lucide React** icons (`lucide-react` package). Browse at
  [lucide.dev](https://lucide.dev/icons). Import as:
  ```tsx
  import { FileText, Upload, ScanLine } from 'lucide-react'
  ```

### Illustrations & hero graphics
- Use the **Image Generation** skill:
  ```bash
  z-ai image -p "Minimal abstract illustration of documents being scanned by AI, emerald and teal gradient, clean modern style, white background" -o ./public/hero.png -s 1440x720
  ```

### Logos & brand
- Edit `/public/logo.svg` for the favicon and brand mark.

### Avatars (for vendors/users)
- Use [DiceBear](https://dicebear.com) (free, no key) — generates avatars from
  a seed string:
  ```
  https://api.dicebear.com/7.x/initials/svg?seed=TechNova
  ```

---

## 3. Video & Motion

### Demo recordings
Use **Agent Browser** to record a guided tour:

```bash
agent-browser open http://localhost:3000
agent-browser record start ./demo.webm
# Navigate: Dashboard → Upload a document → View detail → Approve
agent-browser record stop
```

This produces a `.webm` video of the actual app interaction.

### Background animations (Framer Motion)
Motion is handled in-code via Framer Motion (`framer-motion` package). See
`src/components/motion-primitives.tsx` for reusable building blocks:

| Component | Use |
|---|---|
| `AnimatedCounter` | Count-up numbers (KPI cards) |
| `SpotlightCard` | Mouse-follow glow on cards |
| `FadeInUp` | One-shot entrance animation |
| `StaggerContainer` + `StaggerItem` | Sequential list reveals |
| `TiltCard` | 3D hover tilt |
| `AuroraText` | Animated gradient text |
| `PageTransition` | Section switch transitions |
| `ScaleIn` | Modal / popup entrance |

Usage:
```tsx
import { SpotlightCard, AnimatedCounter } from '@/components/motion-primitives'

<SpotlightCard className="p-6">
  <AnimatedCounter value={1234} />
</SpotlightCard>
```

---

## 4. Asset placement

```
public/
├── uploads/          ← User-uploaded + sample documents (auto-created)
│   ├── sample-invoice-1.svg
│   └── ...
├── logo.svg          ← Brand logo
└── robots.txt
```

Uploaded documents are saved to `public/uploads/` with a timestamped UUID
filename and referenced via the `storagePath` field (e.g. `/uploads/abc.png`).

---

## 5. OCR engine selection

The app supports **two OCR engines**, switchable via environment variables:

| `OCR_PROVIDER` | `GEMINI_API_KEY` | Engine used |
|---|---|---|
| `gemini` | set | Google Gemini 2.5 Flash |
| `gemini` | not set | Z.ai GLM-4.6V (fallback) |
| `zai` | any | Z.ai GLM-4.6V |

The active engine shows in the sidebar **System** panel and the top header.
