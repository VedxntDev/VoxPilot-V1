import { distillDocument, injectSpotlightOverlay, removeSpotlightOverlay } from './semanticDom'

// Content script entrypoint for VoxPilot
console.log('[VoxPilot] Content script initialized.')

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_PAGE_SNAPSHOT') {
    try {
      const snapshot = distillDocument()
      sendResponse({ success: true, snapshot })
    } catch (err) {
      console.error('[VoxPilot] Error distilling page:', err)
      sendResponse({ success: false, error: String(err) })
    }
    return true
  }

  if (message.type === 'VOX_INJECT_SPOTLIGHT') {
    const { targetElementId, complication } = message.payload || {}
    injectSpotlightOverlay(targetElementId, complication)
    sendResponse({ success: true })
    return true
  }

  if (message.type === 'VOX_REMOVE_SPOTLIGHT') {
    removeSpotlightOverlay()
    sendResponse({ success: true })
    return true
  }

  if (message.type === 'VOX_CLICK_ELEMENT') {
    const { elementId } = message.payload || {}
    const el = document.querySelector<HTMLElement>(`[data-vox-id="${elementId}"]`)
    if (el) {
      el.click()
      sendResponse({ success: true })
    } else {
      sendResponse({ success: false, error: 'Element not found' })
    }
    return true
  }

  return false
})
