export type ActionTier = 'tier1' | 'tier2' | 'tier3'

export interface ConfirmationDetails {
  title: string
  description: string
  itemCount: number
  target: string
  requiresTypeToConfirm?: boolean
  phraseToType?: string
  actionType: 'delete_history' | 'close_tabs' | 'clear_browsing_data'
  payload?: any
}

export interface ComplicationDetails {
  type: 'captcha' | 'two_factor' | 'login_wall' | 'payment_required'
  reason: string
  selector?: string
  elementId?: number
  stepIndex?: number
  totalSteps?: number
  resumePayload?: any
}

export interface RouterExecutionResult {
  handled: boolean
  isFastPath: boolean
  tier: ActionTier
  actionName: string
  statusMessage: string
  spokenFeedback: string
  timeMs: number
  requiresConfirmation?: boolean
  confirmation?: ConfirmationDetails
  complication?: ComplicationDetails
  data?: any
}

export interface ExecutionLogEntry {
  id: string
  timestamp: number
  command: string
  tier: ActionTier
  status: 'executing' | 'completed' | 'awaiting_confirm' | 'paused_complication' | 'error'
  detail: string
  timeMs?: number
  complicationType?: ComplicationDetails['type']
}

export interface SemanticElement {
  id: number
  tag: string
  role?: string
  type?: string
  text: string
  ariaLabel?: string
  placeholder?: string
  isInteractive: boolean
  isPotentiallySensitive: boolean
  isComplicationCandidate?: boolean
  complicationType?: 'captcha' | 'two_factor' | 'login_wall' | 'payment_required'
}

export interface PageSnapshot {
  url: string
  title: string
  elements: SemanticElement[]
  activeElementId?: number
  detectedComplications: ComplicationDetails[]
}

export interface ExtensionSettings {
  geminiApiKey: string
  geminiModel: string
  ttsVoiceEnabled: boolean
  bargeInEnabled: boolean
  wakeWordEnabled: boolean
}
