// VoxPilot Offscreen Audio Host
// Keeps audio capture active without being throttled by Service Worker lifecycle.

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string
      }
      isFinal: boolean
    }
    length: number
  }
}

let recognition: any = null
let isListening = false

function initSpeechRecognition() {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognition) {
    console.warn('[VoxPilot Offscreen] Web Speech API not supported in this browser.')
    return
  }

  recognition = new SpeechRecognition()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'en-US'

  recognition.onstart = () => {
    isListening = true
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_LISTENING_STATE', listening: true }).catch(() => {})
  }

  recognition.onend = () => {
    isListening = false
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_LISTENING_STATE', listening: false }).catch(() => {})
  }

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let interimTranscript = ''
    let finalTranscript = ''

    for (let i = 0; i < event.results.length; ++i) {
      const res = event.results[i]
      if (res.isFinal) {
        finalTranscript += res[0].transcript
      } else {
        interimTranscript += res[0].transcript
      }
    }

    // Interrupt active TTS if user is speaking (Barge-in detection)
    if (interimTranscript.length > 0 || finalTranscript.length > 0) {
      if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel()
      }
    }

    // Broadcast recognized transcript to Side Panel
    chrome.runtime.sendMessage({
      type: 'OFFSCREEN_SPEECH_RESULT',
      interim: interimTranscript,
      final: finalTranscript,
    }).catch(() => {})
  }

  recognition.onerror = (err: any) => {
    console.error('[VoxPilot Offscreen] Recognition error:', err)
  }
}

// Listen for audio control messages
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'START_BACKGROUND_LISTENING') {
    if (!recognition) initSpeechRecognition()
    if (recognition && !isListening) {
      try {
        recognition.start()
        sendResponse({ success: true })
      } catch (err) {
        sendResponse({ success: false, error: String(err) })
      }
    } else {
      sendResponse({ success: true, alreadyListening: true })
    }
    return true
  }

  if (message.type === 'STOP_BACKGROUND_LISTENING') {
    if (recognition && isListening) {
      recognition.stop()
      sendResponse({ success: true })
    } else {
      sendResponse({ success: true })
    }
    return true
  }

  if (message.type === 'CANCEL_TTS_BARGE_IN') {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    sendResponse({ success: true })
    return true
  }

  return false
})

console.log('[VoxPilot Offscreen] Audio host initialized.')
