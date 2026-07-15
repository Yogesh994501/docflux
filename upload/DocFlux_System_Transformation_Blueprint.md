# DocFlux System Blueprint: Brand Transformation & UI/UX Reconstruction Spec
## Architecture and Technical System Guide for Autonomous Code-Generation Agents

---

## 1. Global System Configuration & Visual Identity Design Token Block

This section defines the Tailwind CSS configuration tokens and layout foundations required to transform the interface from a generic developer dashboard into a premium, human-centric enterprise product workspace.

### A. Core Tailwind Configuration Spec
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          navy: {
            950: '#0B0F17', // Sidebar background frame
            900: '#0F141F', // Dark primary headers & text fields
            800: '#1A2336', // Inactive sidebar tab focus states
            700: '#2C3A54', // Muted micro-labels & border treatments
          },
          terracotta: {
            DEFAULT: '#D76C4D', // Primary interactive buttons, focus states, success states
            hover: '#C25B3D',
            tint: '#FBF1EE',    // Low-opacity component highlights & toast boxes
          },
          amber: {
            DEFAULT: '#F59E0B', // Discrepancy flags, warnings, low-confidence scores
            tint: '#FEF3C7',    // Background alert box highlights
          },
          cream: {
            DEFAULT: '#FAF8F5', // Application main body workspace framework background
            card: '#FFFFFF',    // Pure floating structural components & panels
            border: '#EAE6DF',  // Thin warm grid-lines replacing cold grays
          }
        }
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],                 // Used for dynamic section titles & brand editorial content
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],  // Used for numerical matrix grids, text data, and interface controls
      },
      boxShadow: {
        editorial: '0 4px 20px -2px rgba(26, 35, 54, 0.04), 0 2px 8px -1px rgba(26, 35, 54, 0.02)',
        activeCard: '0 12px 32px -4px rgba(215, 108, 77, 0.06), 0 4px 12px -2px rgba(215, 108, 77, 0.02)',
      },
      borderRadius: {
        brand: '14px', // Standard for structural interface cards
        button: '8px', // Control buttons and active tags
      }
    }
  }
}
```

### B. Layout Principles & Micro-Interactions
1. **Background Layering:** Application frame main background must always use `bg-brand-cream` with sub-sections wrapped inside isolated cards using `bg-brand-cream-card` with an explicit border pattern `border border-brand-cream-border` and smooth rounded frame bounds `rounded-[14px]`.
2. **Elimination of Gradients:** Eradicate all high-contrast harsh gradients (such as the legacy magenta-to-teal elements). All UI features must focus strictly on solid, deliberate flat-vector fields utilizing clean tone changes.
3. **Bento Grid Layout System:** Structure dashboards into multi-axis layout modules featuring unequal widths and heights grouped by clean functional workflows, shifting completely away from generic, equal-width grids.

---

## 2. Global Asset Asset Integration Map

This matrix details the explicit file placements, formatting conditions, and visual layouts for each brand asset generated to replace the older placeholder elements.

| Image Asset Filename | Component Destination Location | Technical Presentation & Sizing Parameters |
| :--- | :--- | :--- |
| `DocFlux_logo_abstract_mark_202607151825.jpeg` | Left Sidebar Header (`Main Application Branding Zone`) | Render exactly at `h-8 w-auto aspect-square object-contain`. Remove old placeholder viewfinder framework. Embed the text wordmark `"DocFlux"` next to the icon using `font-serif font-semibold text-brand-navy-900 tracking-wide text-lg`. |
| `Hands_holding_smartphone_scannin…_202607151833.jpeg` | Dashboard Quick-Capture Frame & First-Run Welcome Module | Render as a floating feature graphic on the right side of the main welcome dashboard module. Apply `w-full max-w-md rounded-[14px] shadow-editorial object-cover aspect-video`. This serves to visually instruct the user on mobile capture positioning. |
| `Stack_of_documents_beside_laptop_202607151836.jpeg` | Document Upload Queue Drag-&-Drop Dynamic Target Overlay | Use as the central graphic backdrop for the "No Documents Found" dynamic file vault section. Scale component using `h-64 w-full max-w-xl object-cover rounded-[14px] opacity-85 contrast-[1.02]`. Add a clean, centered layout overlay featuring a blur panel (`backdrop-blur-md bg-white/70`) containing the text `"Drag new receipts or invoices here to invoke agentic parsing."` |
| `Team_collaborating_around_laptop_202607151831.jpeg` | Multi-User Workspace Control & Team Management Portal | Position at the top edge of the Shared Team Account settings area. Render using dimensions `h-48 w-full object-cover rounded-t-[14px] object-[center_30%]`. This visually anchors the section to clear communication and collaboration. |
| `Professional_scanning_receipt_wi…_202607151846.jpeg` | Expense Verification Stream & Corporate Reimbursement Deck | Apply within the Expense Reimbursement Module sub-tab. Size using a clean sidebar display component at `w-64 aspect-[3/4] object-cover rounded-[14px] shadow-editorial hidden lg:block`. |
| `Professional_reviewing_documents…_202607151852.jpeg` | Main Dashboard Active Analytics Top-Deck Frame Banner | Set as the primary visual hero component at the top edge of the main analytical dashboard page. Render via `w-full h-56 object-cover rounded-[14px] shadow-editorial balance-brightness`. Overlay a subtle layout text block reading: `"Workspace Active: Deep Data Extraction Systems Engaged."` |

---

## 3. Detailed Layout System Reconstruction Specifications

### A. Navigation Sidebar Structural Redesign
* **Removals:** Completely extract the debug-level `"SYSTEM Panel"` (`Database: sqlite`, `OCR Engine: GLM-4.6V`). This internal configuration data must be moved to an isolated settings panel accessible only via a developer flag route.
* **Text Density Optimization:** Strip away the text subcaptions under primary navigation entries (`"OCR new documents"`, `"Supplier CRM"`, `"Spend & trends"`). This text creates unnecessary density inside the nav panel. Move to simple, high-visibility single-line label layouts.
* **Active Status Redesign:** Replace the solid black selection blocks and layout indicator dots with a soft, clean focus layout. The active states must use `bg-brand-terracotta-tint` coupled with a thick, sharp left border accent block `border-l-4 border-brand-terracotta`. Update typography to `text-brand-navy-950 font-medium`.

```html
<!-- RECONSTRUCTED NAVIGATION SIDEBAR TAB COMPONENT EXAMPLE -->
<nav class="flex flex-col space-y-2 w-full px-3">
  <a href="/documents" class="flex items-center space-x-3 px-4 py-3 rounded-[8px] bg-brand-terracotta-tint border-l-4 border-brand-terracotta text-brand-navy-950 font-medium transition-all duration-150">
    <svg class="h-5 'w-5 text-brand-terracotta" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
    <span class="font-sans text-sm tracking-wide">Documents</span>
  </a>
</nav>
```

### B. Core Analytics Dashboard Restructuring
* **Layout Matrix:** Convert the flat card arrangement into a beautifully balanced 4-column Bento layout. Remove standard dark card text treatments and use high-contrast formatting styles.
* **Component Styling:** Card components must rely entirely on pure white backgrounds (`bg-white`) bordered by `border-brand-cream-border`. Add a clean vertical layout indicator bar (`w-1 rounded-full`) along the inside margins to visually distinguish different document categories (e.g., `bg-brand-terracotta` for processed invoices, `bg-brand-amber` for items pending manual review).
* **Typography:** Style the main workspace analytics header using `font-serif text-3xl font-normal text-brand-navy-900`.

```html
<!-- COMPONENT SPECIFICATION: RECONSTRUCTED METRIC CARD -->
<div class="bg-white p-6 rounded-[14px] border border-brand-cream-border shadow-editorial flex items-start space-x-4 hover:shadow-activeCard transition-shadow duration-200">
  <div class="p-3 bg-brand-terracotta-tint rounded-[8px]">
    <svg class="h-6 w-6 text-brand-terracotta" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  </div>
  <div class="flex-1">
    <p class="font-sans text-xs font-semibold text-brand-navy-700 uppercase tracking-wider">Processed Vault</p>
    <h3 class="font-sans text-2xl font-bold text-brand-navy-900 mt-1">14,282</h3>
    <p class="font-sans text-xs text-green-600 font-medium mt-1">↑ 12.4% vs previous month</p>
  </div>
</div>
```

### C. AI Copilot Operational Workspace Re-engineering
* **Chat Column & Spacing Optimization:** Constrain the conversational interface container layout to a clean, user-focused central column `max-w-3xl mx-auto`. Add generous margins and cell padding to give structural space to layout components.
* **Suggestion Grid Fix:** Restructure the irregular, wrapping chip array into a highly organized, balanced layout container grid using `grid grid-cols-1 md:grid-cols-2 gap-3 mt-4`. 
* **Styling Parameters:** Render suggestion items as clean clickable cards using code block `bg-white hover:bg-brand-terracotta-tint border border-brand-cream-border hover:border-brand-terracotta/30 p-4 rounded-[8px] text-left text-sm text-brand-navy-900 transition-all duration-150 cursor-pointer`.

---

## 4. Advanced Data Extraction UI Workflow Spec: Agentic Validation & Government Templates

This functional workflow guides code generation for the data verification step, integrating both structured compliance verification and layout-agnostic agentic text parsing rules.

```
+------------------------------------------------------------------------------------------+
|  DOCFLUX DUAL-STAGE DATA CAPTURE WORKBENCH VIEWPORT                                      |
+-------------------------------------------------------------+----------------------------+
|  STAGE A: MULTI-MODAL EXTRACTION & DOCUMENT MAPPING CANVAS  |  STAGE B: COMPLIANCE MAPPING|
|                                                             |  & AUDIT CONTROL LOGIC    |
|  [ Original Uploaded Document Viewer Panel ]                |                            |
|  +-------------------------------------------------------+  |  [ Invoice Schema Mode ]   |
|  |                                                       |  |  ( ) India GST Regulation  |
|  |   ACME SUPPLIES INC.                                  |  |  ( ) US Corporate Receipt  |
|  |   -------------------------------------------------   |  |                            |
|  |   GSTIN: 27AAAAA1111A1Z1  <======= [Matched Core ID]  |  |  [ Extracted Data Registry]|
|  |                                                       |  |  • Vendor Name:            |
|  |   Line 01: Structural Hardware     INR 10,000.00      |  |    [ Acme Supplies Inc.  ] |
|  |   Line 02: Dynamic Precision Tool   INR  5,000.00      |  |                            |
|  |   -------------------------------------------------   |  |  • GSTIN Verified ID:      |
|  |   Subtotal Calculated               INR 15,000.00      |  |    [ 27AAAAA1111A1Z1     ] |
|  |   CGST Tax (9%)                     INR  1,350.00      |  |                            |
|  |   SGST Tax (9%)                     INR  1,350.00      |  |  • Core Financial Fields:  |
|  |   -------------------------------------------------   |  |    Subtotal: INR 15,000.00 |
|  |   Invoice Total Listed              INR 18,200.00      |  |    CGST (9%): INR  1,350.00 |
|  |                                        ^^^^^^^^^      |  |    SGST (9%): INR  1,350.00 |
|  |                                     [ALERT: MATH BE]  |  |                            |
|  |                                     [MISMATCH DETECTED|  |  [ ! DISCREPANCY DETECTED ]|
|  |                                                       |  |  Expected Total: 17,700.00 |
|  |                                                       |  |  Listed Total:   18,200.00 |
|  |                                                       |  |  Variance Flag: +INR 500.00|
|  +-------------------------------------------------------+  |  [Agent Note: Unlisted Fee]|
+-------------------------------------------------------------+----------------------------+
```

### A. Dual-Stage Extraction Strategy System Definition
1. **Government Template Engine (Deterministic Compliance Processing):**
   * **Target Execution:** Used for highly standardized documents such as India Goods and Services Tax (GST) forms, Tax Invoices, W-2 forms, and Delivery Challans.
   * **Extraction Method:** Leverages zero-shot function calling to match fixed, predictable regulatory text patterns (e.g., matching the exact text variations of `GSTIN`, `HSN Code`, `CGST`, `SGST`, `IGST`).
   * **UI Presentation:** Matched fields are immediately highlighted using soft green check marks directly next to data inputs, validating that tax categories are fully compliant.
2. **Dynamic Agentic Extraction Engine (Layout-Agnostic Parsing Logic):**
   * **Target Execution:** Deployed for highly variable formats like retail receipts, unstructured merchant invoices, and complex shipping documents.
   * **Extraction Method:** Employs multi-agent verification workflows. The system maps the extraction coordinate space to check mathematical invariants (e.g., validating that the calculated formula $	ext{Subtotal} + \sum(	ext{Taxes}) = 	ext{Total}$ matches the printed amount).
   * **Discrepancy Resolution Loop:** If a validation rule fails, the system instantiates a sub-agent to search for missing variables (e.g., hidden service fees, delivery additions, or obscured line text). If unresolved, the validation flag state changes to an alert status.

### B. Functional Form Component Definition for Component Generators
The code engine must build a two-column interactive comparison split-view when displaying an parsed document record:

```html
<!-- DUAL INTERACTIVE EXTRACTION SCREEN ARCHITECTURE -->
<div class="w-full min-h-screen bg-brand-cream p-6 flex flex-col lg:flex-row gap-6">
  
  <!-- WORKSPACE COLUMN LEFT: ORIGINAL UPLOAD IMAGE VIEWPORT CANVAS -->
  <div class="w-full lg:w-1/2 bg-white rounded-[14px] border border-brand-cream-border p-4 shadow-editorial">
    <div class="flex items-center justify-between border-b border-brand-cream-border pb-3 mb-4">
      <h3 class="font-serif text-lg text-brand-navy-900 font-medium">Original Document Source View</h3>
      <span class="px-3 py-1 text-xs bg-brand-terracotta-tint text-brand-terracotta font-medium rounded-full">Compliance Mode: Active</span>
    </div>
    <div class="relative w-full overflow-auto bg-brand-cream rounded-[8px] border border-brand-cream-border p-2">
      <!-- Image component placeholder where user document will display -->
      <img src="path/to/Stack_of_documents_beside_laptop_202607151836.jpeg" class="w-full object-contain max-h-[70vh]" alt="Target Extraction Source">
      <!-- Target Highlight Box Indicator Overlay Layer -->
      <div class="absolute top-[42%] left-[18%] w-[40%] h-[6%] border-2 border-brand-amber bg-brand-amber/10 rounded-[4px] animate-pulse"></div>
    </div>
  </div>

  <!-- WORKSPACE COLUMN RIGHT: INTERACTIVE VALUE REGISTRY CONTROL FORM -->
  <div class="w-full lg:w-1/2 bg-white rounded-[14px] border border-brand-cream-border p-6 shadow-editorial flex flex-col justify-between">
    <div>
      <div class="border-b border-brand-cream-border pb-3 mb-6">
        <h3 class="font-serif text-lg text-brand-navy-900 font-medium">Agentic Parsing Field Verification</h3>
        <p class="font-sans text-xs text-brand-navy-700 mt-1">Review validation alerts generated by the cross-calculation layout agents.</p>
      </div>

      <form class="space-y-4">
        <!-- Field Component Form Module: Clear Match -->
        <div>
          <label class="block font-sans text-xs font-semibold text-brand-navy-700 uppercase tracking-wide mb-1">Tax Registration Identifier (GSTIN)</label>
          <div class="relative flex items-center">
            <input type="text" value="27AAAAA1111A1Z1" class="w-full font-sans text-sm bg-brand-cream border border-brand-cream-border rounded-[8px] px-3 py-2 text-brand-navy-900 focus:outline-none focus:border-brand-terracotta transition-colors">
            <span class="absolute right-3 text-green-600 text-xs font-semibold">✓ Verified</span>
          </div>
        </div>

        <!-- Field Component Form Module: Flagged Discrepancy Alert -->
        <div>
          <label class="block font-sans text-xs font-semibold text-brand-navy-700 uppercase tracking-wide mb-1">Extracted Document Grand Total</label>
          <div class="relative flex items-center">
            <input type="text" value="₹18,200.00" class="w-full font-sans text-sm bg-brand-amber-tint/40 border border-brand-amber rounded-[8px] px-3 py-2 text-brand-navy-900 font-semibold focus:outline-none">
            <span class="absolute right-3 text-brand-amber text-xs font-bold font-sans">! Extraction Mismatch</span>
          </div>
          <!-- Sub-agent explanation box layer -->
          <div class="mt-2 p-3 bg-brand-amber-tint rounded-[8px] border border-brand-amber/30">
            <p class="font-sans text-xs text-brand-navy-900 leading-relaxed">
              <strong>Agent Validation Log:</strong> Document line items total <span class="font-semibold">₹17,700.00</span> (Subtotal: ₹15,000 + CGST: ₹1,350 + SGST: ₹1,350). The printed total shows an unexplained variance of <span class="font-bold text-red-700">+₹500.00</span>. Please manually verify for hidden delivery surcharges or unlisted service costs.
            </p>
          </div>
        </div>
      </form>
    </div>

    <!-- ACTION HUB FOOTER PANEL CONTROLS -->
    <div class="border-t border-brand-cream-border pt-4 mt-6 flex justify-end space-x-3">
      <button type="button" class="px-4 py-2 rounded-[8px] font-sans text-sm text-brand-navy-700 border border-brand-cream-border bg-white hover:bg-brand-cream transition-colors duration-150">Re-run Agent Pipeline</button>
      <button type="button" class="px-5 py-2 rounded-[8px] font-sans text-sm text-white bg-brand-terracotta hover:bg-brand-terracotta-hover transition-colors duration-150 shadow-sm">Commit Record to Ledger</button>
    </div>
  </div>

</div>
```

---

## 5. Implementation Execution Priority Roadmap

To systemically update the platform code structure, configuration agents should execute updates in the following exact technical sequence:

1. **Step 1: Design Tokens Integration:** Inject the `tailwind.config.js` extension rules block into the build engine.
2. **Step 2: Clean System Variables:** Scrub the navigation interface files to remove the internal database and engine text blocks. Clean up text sub-labels inside the nav panel.
3. **Step 3: Layout & Theme Shift:** Modify component styles from cold grays and magenta gradients to the new warm cream backgrounds, rich ink navy fonts, and clean terracotta actions.
4. **Step 4: Image Placements:** Replace placeholder layout graphics with the new photography assets across the Document Vault, Team Management, and Dashboard modules.
5. **Step 5: Agentic Screen Deployment:** Implement the dual-pane workflow module to handle structural government templates and dynamic layout validation logs.
