import { create } from 'zustand'

export type Section =
  | 'dashboard'
  | 'upload'
  | 'documents'
  | 'approvals'
  | 'vendors'
  | 'analytics'
  | 'copilot'

interface AppState {
  section: Section
  setSection: (s: Section) => void

  // Document list filters
  search: string
  statusFilter: string | null
  typeFilter: string | null
  fraudFilter: string | null
  setSearch: (s: string) => void
  setStatusFilter: (s: string | null) => void
  setTypeFilter: (s: string | null) => void
  setFraudFilter: (s: string | null) => void
  resetFilters: () => void

  // Document detail modal
  detailDocId: string | null
  openDetail: (id: string) => void
  closeDetail: () => void
}

export const useAppStore = create<AppState>((set) => ({
  section: 'dashboard',
  setSection: (s) => set({ section: s }),

  search: '',
  statusFilter: null,
  typeFilter: null,
  fraudFilter: null,
  setSearch: (s) => set({ search: s }),
  setStatusFilter: (s) => set({ statusFilter: s }),
  setTypeFilter: (s) => set({ typeFilter: s }),
  setFraudFilter: (s) => set({ fraudFilter: s }),
  resetFilters: () =>
    set({ search: '', statusFilter: null, typeFilter: null, fraudFilter: null }),

  detailDocId: null,
  openDetail: (id) => set({ detailDocId: id }),
  closeDetail: () => set({ detailDocId: null }),
}))
