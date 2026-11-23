// VoxPilot MV3 Background Service Worker

// 1. Configure Side Panel to open on action click
if (chrome.sidePanel?.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
    console.error('[VoxPilot] Failed to set side panel behavior:', err)
  })
}

// 2. Manage Offscreen Document for background voice listening
let creatingOffscreen: Promise<void> | null = null

async function ensureOffscreenDocument(): Promise<void> {
  const offscreenUrl = chrome.runtime.getURL('offscreen.html')
  if (chrome.offscreen?.hasDocument) {
    const hasDoc = await chrome.offscreen.hasDocument()
    if (hasDoc) return
  }

  if (creatingOffscreen) {
    await creatingOffscreen
    return
  }

  if (chrome.offscreen?.createDocument) {
    creatingOffscreen = chrome.offscreen.createDocument({
      url: offscreenUrl,
      reasons: [chrome.offscreen.Reason.USER_MEDIA, chrome.offscreen.Reason.AUDIO_PLAYBACK],
      justification: 'VoxPilot continuous local wake-word listening and barge-in audio playback.',
    })
    await creatingOffscreen
    creatingOffscreen = null
  }
}

// 3. Handle Keyboard Shortcut commands (Alt+Shift+V)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-listening' || command === '_execute_action') {
    console.log('[VoxPilot] Command triggered:', command)

    // Open side panel in current window
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (currentTab?.windowId && chrome.sidePanel?.open) {
      try {
        await chrome.sidePanel.open({ windowId: currentTab.windowId })
      } catch (err) {
        console.warn('[VoxPilot] Could not open side panel via command API:', err)
      }
    }

    // Broadcast toggle message to Side Panel
    chrome.runtime.sendMessage({ type: 'COMMAND_TOGGLE_LISTENING' }).catch(() => {
      // Side panel may be opening up
    })
  }
})

// 4. Message Broker between Side Panel, Content Scripts, and Offscreen
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ENSURE_OFFSCREEN') {
    ensureOffscreenDocument()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: String(err) }))
    return true
  }

  if (message.type === 'EXECUTE_HISTORY_DELETE') {
    const { urls } = message.payload || {}
    if (chrome.history?.deleteUrl && Array.isArray(urls)) {
      Promise.all(urls.map((u) => chrome.history.deleteUrl({ url: u })))
        .then(() => sendResponse({ success: true, count: urls.length }))
        .catch((err) => sendResponse({ success: false, error: String(err) }))
      return true
    }
  }

  if (message.type === 'EXECUTE_CLOSE_TABS') {
    const { mode } = message.payload || {}
    if (mode === 'other_tabs' && chrome.tabs?.query && chrome.tabs?.remove) {
      chrome.tabs.query({ currentWindow: true }).then((tabs) => {
        const toClose = tabs.filter((t) => !t.active && t.id !== undefined).map((t) => t.id!)
        chrome.tabs.remove(toClose).then(() => {
          sendResponse({ success: true, count: toClose.length })
        })
      })
      return true
    }
  }

  return false
})
