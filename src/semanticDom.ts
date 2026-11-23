import { ComplicationDetails, PageSnapshot, SemanticElement } from './types'

// Attribute markers for VoxPilot elements
const VOX_ID_ATTR = 'data-vox-id'
const VOX_SPOTLIGHT_ID = 'voxpilot-spotlight-container'

/**
 * Checks if an element is visible in the viewport.
 */
function isElementVisible(el: HTMLElement): boolean {
  if (!el || el.offsetParent === null) return false
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false
  }
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

/**
 * Security & Privacy: checks if an input should be stripped of values.
 */
function isSensitiveInput(el: HTMLElement): boolean {
  if (!(el instanceof HTMLInputElement)) return false
  const type = (el.type || '').toLowerCase()
  const name = (el.name || '').toLowerCase()
  const id = (el.id || '').toLowerCase()
  const autocomplete = (el.autocomplete || '').toLowerCase()

  if (type === 'password') return true
  if (autocomplete.includes('cc-') || autocomplete.includes('credit-card') || autocomplete.includes('cvv')) return true
  if (name.includes('card') || name.includes('cvv') || name.includes('ssn') || name.includes('pass') || name.includes('token')) return true
  if (id.includes('card') || id.includes('cvv') || id.includes('ssn') || id.includes('pass') || id.includes('token')) return true

  return false
}

/**
 * Sanitizes text to remove potential tokens or credit card patterns.
 */
function redactSensitivePatterns(text: string): string {
  // Redact 16-digit credit card patterns
  let sanitized = text.replace(/\b(?:\d{4}[ -]?){3}\d{4}\b/g, '[REDACTED_CARD]')
  // Redact JWT or long base64 tokens
  sanitized = sanitized.replace(/\beyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b/g, '[REDACTED_TOKEN]')
  return sanitized
}

/**
 * Distills active document into a secure semantic snapshot.
 */
export function distillDocument(): PageSnapshot {
  const elements: SemanticElement[] = []
  const detectedComplications: ComplicationDetails[] = []
  let nextId = 100

  // Query relevant headings and interactive elements
  const candidates = document.querySelectorAll<HTMLElement>(
    'h1, h2, h3, button, a[href], input, textarea, select, [role="button"], [role="link"], [data-sitekey], .g-recaptcha, .cf-turnstile',
  )

  candidates.forEach((el) => {
    if (!isElementVisible(el)) return

    // Assign numeric ID for reference
    let voxId = el.getAttribute(VOX_ID_ATTR)
    if (!voxId) {
      voxId = String(nextId++)
      el.setAttribute(VOX_ID_ATTR, voxId)
    }

    const numericId = parseInt(voxId, 10)
    const tag = el.tagName.toLowerCase()
    const sensitive = isSensitiveInput(el)

    let rawText = ''
    if (sensitive) {
      rawText = '[REDACTED_CONFIDENTIAL]'
    } else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      rawText = redactSensitivePatterns(el.value || el.placeholder || '')
    } else {
      rawText = redactSensitivePatterns(el.innerText?.trim() || '')
    }

    // Limit text length to prevent giant payloads
    const cleanText = rawText.slice(0, 150)
    const ariaLabel = el.getAttribute('aria-label') || undefined
    const placeholder = (el as HTMLInputElement).placeholder || undefined

    // Check for complication indicators
    const lowerText = cleanText.toLowerCase()
    const lowerClass = (el.className || '').toString().toLowerCase()
    const isCaptcha =
      lowerText.includes('recaptcha') ||
      lowerText.includes('turnstile') ||
      lowerText.includes('i am not a robot') ||
      lowerClass.includes('recaptcha') ||
      lowerClass.includes('turnstile') ||
      el.hasAttribute('data-sitekey')

    const is2FA =
      lowerText.includes('verification code') ||
      lowerText.includes('2fa') ||
      placeholder?.toLowerCase().includes('verification code') ||
      placeholder?.toLowerCase().includes('6-digit')

    const isPayment =
      tag === 'button' &&
      (lowerText.includes('pay now') ||
        lowerText.includes('place order') ||
        lowerText.includes('confirm payment') ||
        lowerText.includes('complete purchase'))

    let complicationType: ComplicationDetails['type'] | undefined
    if (isCaptcha) complicationType = 'captcha'
    else if (is2FA) complicationType = 'two_factor'
    else if (isPayment) complicationType = 'payment_required'

    if (complicationType) {
      detectedComplications.push({
        type: complicationType,
        reason:
          complicationType === 'captcha'
            ? 'Human verification (CAPTCHA) encountered.'
            : complicationType === 'two_factor'
            ? 'Two-factor authentication code required.'
            : 'Payment authorization requires manual confirmation.',
        elementId: numericId,
        selector: `[${VOX_ID_ATTR}="${numericId}"]`,
      })
    }

    elements.push({
      id: numericId,
      tag,
      role: el.getAttribute('role') || undefined,
      type: (el as HTMLInputElement).type || undefined,
      text: cleanText,
      ariaLabel,
      placeholder,
      isInteractive: tag === 'button' || tag === 'a' || tag === 'input' || tag === 'select' || el.hasAttribute('role'),
      isPotentiallySensitive: sensitive,
      isComplicationCandidate: !!complicationType,
      complicationType,
    })
  })

  return {
    url: window.location.href,
    title: document.title,
    elements,
    detectedComplications,
  }
}

/**
 * Injects a visual spotlight overlay onto the target element ID.
 * Pauses execution visually while maintaining zero box-shadow and ChaiUI styling.
 */
export function injectSpotlightOverlay(targetId: number, complication: ComplicationDetails): void {
  // Remove existing spotlight if present
  removeSpotlightOverlay()

  const targetEl = document.querySelector<HTMLElement>(`[${VOX_ID_ATTR}="${targetId}"]`)
  if (!targetEl) {
    console.warn(`[VoxPilot] Target element ${targetId} not found for spotlight.`)
    return
  }

  // Smooth scroll into view
  targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })

  const rect = targetEl.getBoundingClientRect()
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const scrollLeft = window.scrollX || document.documentElement.scrollLeft

  const container = document.createElement('div')
  container.id = VOX_SPOTLIGHT_ID
  container.style.position = 'absolute'
  container.style.top = '0'
  container.style.left = '0'
  container.style.width = '100%'
  container.style.height = `${Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)}px`
  container.style.pointerEvents = 'none'
  container.style.zIndex = '2147483640'

  // Outer backdrop
  const backdrop = document.createElement('div')
  backdrop.style.position = 'fixed'
  backdrop.style.inset = '0'
  backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.45)'
  backdrop.style.backdropFilter = 'blur(2px)'
  backdrop.style.transition = 'opacity 0.25s ease'
  backdrop.style.pointerEvents = 'auto'

  // Spotlight ring around element
  const ring = document.createElement('div')
  ring.style.position = 'absolute'
  ring.style.top = `${rect.top + scrollTop - 6}px`
  ring.style.left = `${rect.left + scrollLeft - 6}px`
  ring.style.width = `${rect.width + 12}px`
  ring.style.height = `${rect.height + 12}px`
  ring.style.borderRadius = '10px'
  ring.style.border = '2px solid #ef4444' // Semantic red outline for Tier 3
  ring.style.outline = '4px solid rgba(239, 68, 68, 0.2)'
  ring.style.pointerEvents = 'none'
  ring.style.boxShadow = 'none'

  // ChaiUI Card Tooltip
  const tooltip = document.createElement('div')
  tooltip.style.position = 'absolute'
  tooltip.style.top = `${rect.bottom + scrollTop + 12}px`
  tooltip.style.left = `${Math.max(16, Math.min(rect.left + scrollLeft, window.innerWidth - 340))}px`
  tooltip.style.width = '320px'
  tooltip.style.padding = '14px 16px'
  tooltip.style.borderRadius = '12px'
  tooltip.style.backgroundColor = '#141414'
  tooltip.style.border = '1px solid rgba(255, 247, 237, 0.2)'
  tooltip.style.color = '#fafafa'
  tooltip.style.fontFamily = "'Manrope Variable', 'Manrope', sans-serif"
  tooltip.style.fontSize = '12px'
  tooltip.style.lineHeight = '1.5'
  tooltip.style.pointerEvents = 'auto'
  tooltip.style.boxShadow = 'none'

  const title = document.createElement('div')
  title.style.fontFamily = "'Montserrat Variable', 'Montserrat', sans-serif"
  title.style.fontWeight = '600'
  title.style.fontSize = '13px'
  title.style.color = '#ef4444' // Semantic red text
  title.style.marginBottom = '4px'
  title.textContent = 'Manual Input Required'

  const reason = document.createElement('div')
  reason.style.color = '#d4d4d4'
  reason.style.marginBottom = '8px'
  reason.textContent = complication.reason

  const instruction = document.createElement('div')
  instruction.style.color = '#ffedd5' // Cream highlight
  instruction.style.fontSize = '11px'
  instruction.textContent = 'Please complete the action on this element, then click "Resume agent" in the side panel.'

  tooltip.appendChild(title)
  tooltip.appendChild(reason)
  tooltip.appendChild(instruction)

  container.appendChild(backdrop)
  container.appendChild(ring)
  container.appendChild(tooltip)

  // Clicking backdrop dismisses spotlight
  backdrop.addEventListener('click', () => {
    removeSpotlightOverlay()
  })

  document.body.appendChild(container)
}

/**
 * Removes the spotlight overlay cleanly.
 */
export function removeSpotlightOverlay(): void {
  const existing = document.getElementById(VOX_SPOTLIGHT_ID)
  if (existing) {
    existing.remove()
  }
}
