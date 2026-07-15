'use client'

import { useState } from 'react'
import { useDocumentsQuery, parseExtractedData } from '@/lib/queries'
import { FileText, Loader2 } from 'lucide-react'

export function ExtractionWorkbenchSection() {
  const { data, isLoading } = useDocumentsQuery({ page: 1, pageSize: 20 })
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-brand-terracotta" />
      </div>
    )
  }

  const items = data?.items ?? []
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center rounded-[14px] border border-brand-cream-border shadow-editorial bg-white">
        <div className="text-lg font-serif text-brand-navy-900 mb-1">No documents to extract</div>
        <div className="text-sm text-brand-navy-700">Upload documents first to use the workbench.</div>
      </div>
    )
  }

  const activeDoc = items.find((d) => d.id === selectedDocId) || items[0]
  const ext = parseExtractedData(activeDoc.extractedData)

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-4">
      {/* Left Pane - Document Viewer */}
      <div className="w-full lg:w-1/2 flex flex-col rounded-[14px] border border-brand-cream-border bg-brand-cream/50 shadow-editorial overflow-hidden">
        <div className="border-b border-brand-cream-border bg-white px-5 py-4 flex items-center justify-between">
          <div className="text-sm font-serif font-semibold text-brand-navy-900">Document Source</div>
          <select 
            value={activeDoc.id} 
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="text-xs bg-white border border-brand-cream-border rounded-[4px] px-2 py-1 outline-none focus:border-brand-terracotta text-brand-navy-900 max-w-[200px]"
          >
            {items.map((doc) => (
              <option key={doc.id} value={doc.id}>{doc.fileName}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
          {activeDoc.fileType.startsWith('image/') ? (
            <img src={activeDoc.storagePath} alt={activeDoc.fileName} className="max-h-full max-w-full object-contain rounded-[8px] shadow-sm border border-brand-cream-border" />
          ) : (
            <div className="flex flex-col items-center gap-3 text-brand-navy-500">
              <FileText className="h-16 w-16" />
              <span className="text-sm font-medium">PDF Document</span>
              <a href={activeDoc.storagePath} target="_blank" rel="noreferrer" className="text-xs text-brand-terracotta hover:underline">
                Open PDF
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Right Pane - Extracted Data */}
      <div className="w-full lg:w-1/2 flex flex-col rounded-[14px] border border-brand-cream-border bg-white shadow-editorial overflow-hidden">
        <div className="border-b border-brand-cream-border px-5 py-4">
          <div className="text-sm font-serif font-semibold text-brand-navy-900">Agentic Extraction Results</div>
        </div>
        <div className="flex-1 overflow-auto p-5 custom-scroll">
           {ext ? (
             <div className="space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-brand-navy-700">Structured JSON Output</div>
                <pre className="text-[11px] font-mono text-brand-navy-900 bg-brand-cream/30 p-4 rounded-[8px] border border-brand-cream-border overflow-auto shadow-inner">
                  {JSON.stringify(ext, null, 2)}
                </pre>
             </div>
           ) : (
             <div className="text-sm text-brand-navy-500 text-center py-10">No extracted data available for this document.</div>
           )}
        </div>
      </div>
    </div>
  )
}
