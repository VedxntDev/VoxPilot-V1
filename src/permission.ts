// Handles one-time microphone permission grant in dedicated tab

const btn = document.getElementById('request-btn') as HTMLButtonElement | null
const statusEl = document.getElementById('status') as HTMLDivElement | null

async function requestAccess() {
  if (statusEl) statusEl.textContent = 'Requesting browser microphone access...'

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    // Stop tracks immediately after permission is confirmed
    stream.getTracks().forEach((t) => t.stop())

    if (chrome.storage?.local) {
      await chrome.storage.local.set({ micPermissionGranted: true })
    }

    if (statusEl) {
      statusEl.textContent = 'Microphone access granted. Returning to side panel...'
      statusEl.style.color = '#4ade80'
    }

    // Broadcast permission event
    if (chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'MIC_PERMISSION_GRANTED' }).catch(() => {})
    }

    // Auto close tab after short delay
    setTimeout(() => {
      window.close()
    }, 900)
  } catch (err: any) {
    console.error('[VoxPilot] Microphone permission denied:', err)
    if (statusEl) {
      statusEl.textContent = 'Permission was denied. Please allow microphone in the browser address bar.'
      statusEl.style.color = '#ef4444'
    }
  }
}

if (btn) {
  btn.addEventListener('click', requestAccess)
}

// Automatically trigger on page load
requestAccess()
export {}
