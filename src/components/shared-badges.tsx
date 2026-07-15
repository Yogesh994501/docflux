'use client'

import { Badge } from '@/components/ui/badge'
import {
  DOCUMENT_TYPES,
  DOCUMENT_STATUSES,
  FRAUD_RISKS,
  COLOR_CLASSES,
  getDocTypeMeta,
  getStatusMeta,
  getFraudRiskMeta,
} from '@/lib/constants'

export function DocTypeBadge({ type }: { type: string | null | undefined }) {
  const meta = getDocTypeMeta(type)
  const colors = COLOR_CLASSES[meta.color]
  return (
    <Badge variant="outline" className={`${colors.badge} border-transparent font-medium`}>
      {meta.label}
    </Badge>
  )
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const meta = getStatusMeta(status)
  const colors = COLOR_CLASSES[meta.color]
  return (
    <Badge variant="outline" className={`${colors.badge} border-transparent font-medium`}>
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${colors.dot}`} />
      {meta.label}
    </Badge>
  )
}

export function FraudRiskBadge({ risk }: { risk: string | null | undefined }) {
  const meta = getFraudRiskMeta(risk)
  const colors = COLOR_CLASSES[meta.color]
  return (
    <Badge variant="outline" className={`${colors.badge} border-transparent font-medium`}>
      {meta.label} Risk
    </Badge>
  )
}

export { DOCUMENT_TYPES, DOCUMENT_STATUSES, FRAUD_RISKS }
