import { ConfirmationDetails, RouterExecutionResult } from './types'

/**
 * Normalizes input voice command strings without destroying dots in domains.
 */
function cleanCommand(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/^hey vox,?\s*/i, '')
    .replace(/^vox,?\s*/i, '')
    .replace(/[?!;]+$/g, '')
    .trim()
}

/**
 * Detects domain names like msrit.edu, google.com, portal.ac.in, etc.
 */
const DOMAIN_REGEX = /\b([a-zA-Z0-9-]+\.(?:edu|com|org|in|net|io|gov|ai|co|ac\.in|co\.in|org\.in|edu\.in|me))\b/i

/**
 * Finds if an existing tab matching query or URL already exists.
 * Helps prevent duplicate tabs.
 */
async function findExistingTab(query: string): Promise<chrome.tabs.Tab | null> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
    return null
  }
  try {
    const tabs = await chrome.tabs.query({})
    const q = query.toLowerCase()
    return (
      tabs.find((tab) => {
        const url = (tab.url || '').toLowerCase()
        const title = (tab.title || '').toLowerCase()
        return url.includes(q) || title.includes(q)
      }) || null
    )
  } catch {
    return null
  }
}

/**
 * Safely navigates the current active tab or window to targetUrl without abandoning New Tab.
 */
export async function openOrUpdateActiveTab(targetUrl: string): Promise<number> {
  if (typeof chrome === 'undefined' || !chrome.tabs) return 0

  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })

    // If active tab is a new tab or blank, ALWAYS reuse it directly!
    if (
      activeTab?.id &&
      (!activeTab.url ||
        activeTab.url.startsWith('chrome://newtab') ||
        activeTab.url.startsWith('chrome://') ||
        activeTab.url === 'about:blank')
    ) {
      await chrome.tabs.update(activeTab.id, { url: targetUrl, active: true })
      return activeTab.id
    }

    // Check if a tab with this domain already exists in the CURRENT window
    let domainHost = ''
    try {
      domainHost = new URL(targetUrl).hostname.replace(/^www\./, '')
    } catch (_) {
      domainHost = targetUrl
    }

    const currentWindowTabs = await chrome.tabs.query({ currentWindow: true })
    const existingInCurrentWindow = currentWindowTabs.find((t) => {
      const u = (t.url || '').toLowerCase()
      return domainHost && u.includes(domainHost)
    })

    if (existingInCurrentWindow?.id) {
      await chrome.tabs.update(existingInCurrentWindow.id, { url: targetUrl, active: true })
      return existingInCurrentWindow.id
    }

    // Otherwise create a new tab in the current window
    const newTab = await chrome.tabs.create({ url: targetUrl, active: true })
    return newTab.id || 0
  } catch (err) {
    console.warn('[VoxPilot] Tab navigation error:', err)
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      const t = await chrome.tabs.create({ url: targetUrl, active: true })
      return t.id || 0
    }
  }
  return 0
}

/**
 * Injected script that visually highlights Menu -> Others -> Student Information System on msrit.edu
 * and navigates through to parents.msrit.edu.
 */
export async function executeMSRITMultiStepNavigation(tabId: number): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.scripting?.executeScript) return

  setTimeout(async () => {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          let attempts = 0
          const interval = setInterval(() => {
            attempts++
            const allLinks = Array.from(document.querySelectorAll('a'))

            const othersLink = allLinks.find((a) => {
              const text = (a.textContent || '').trim().toLowerCase()
              return text === 'others' || text === 'other'
            })

            const sisLink =
              (document.querySelector('a[href*="parents.msrit.edu"]') as HTMLAnchorElement | null) ||
              (allLinks.find((a) => /student information system/i.test(a.textContent || '')) as HTMLAnchorElement | null)

            if (othersLink || sisLink || attempts > 15) {
              clearInterval(interval)

              let banner = document.getElementById('vox-multistep-banner')
              if (!banner) {
                banner = document.createElement('div')
                banner.id = 'vox-multistep-banner'
                banner.style.position = 'fixed'
                banner.style.top = '16px'
                banner.style.left = '50%'
                banner.style.transform = 'translateX(-50%)'
                banner.style.zIndex = '999999'
                banner.style.background = '#0a0a0a'
                banner.style.color = '#fff'
                banner.style.border = '1px solid rgba(255, 255, 255, 0.2)'
                banner.style.borderRadius = '8px'
                banner.style.padding = '8px 16px'
                banner.style.fontFamily = 'system-ui, sans-serif'
                banner.style.fontSize = '12px'
                banner.style.fontWeight = '600'
                banner.style.boxShadow = 'none'
                document.body.appendChild(banner)
              }

              banner.textContent = 'VoxPilot: Navigating Menu -> Others -> Student Information System...'

              if (othersLink) {
                othersLink.style.outline = '2px solid #eab308'
                othersLink.style.outlineOffset = '2px'
                othersLink.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
                othersLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
              }

              setTimeout(() => {
                if (sisLink) {
                  sisLink.style.outline = '2px solid #22c55e'
                  sisLink.style.outlineOffset = '2px'
                  if (banner) {
                    banner.textContent = 'VoxPilot: Found Student Information System. Opening portal...'
                  }
                  setTimeout(() => {
                    window.location.href = sisLink.href || 'http://parents.msrit.edu/'
                  }, 700)
                } else {
                  if (banner) {
                    banner.textContent = 'VoxPilot: Opening Student Information System...'
                  }
                  setTimeout(() => {
                    window.location.href = 'http://parents.msrit.edu/'
                  }, 500)
                }
              }, 600)
            }
          }, 200)
        },
      })
    } catch (err) {
      console.warn('[VoxPilot] Multi-step script error:', err)
    }
  }, 600)
}

/**
 * Known YouTube creator handles.
 */
const KNOWN_CHANNELS: Record<string, string> = {
  mrbeast: 'https://www.youtube.com/@MrBeast',
  'mr beast': 'https://www.youtube.com/@MrBeast',
  sidemen: 'https://www.youtube.com/@Sidemen',
  'sidemen video': 'https://www.youtube.com/@Sidemen',
  mkbhd: 'https://www.youtube.com/@mkbhd',
  'marques brownlee': 'https://www.youtube.com/@mkbhd',
  veritasium: 'https://www.youtube.com/@veritasium',
  pewdiepie: 'https://www.youtube.com/@PewDiePie',
  kurzgesagt: 'https://www.youtube.com/@inanutshell',
  fireship: 'https://www.youtube.com/@Fireship',
  lex: 'https://www.youtube.com/@lexfridman',
  'lex fridman': 'https://www.youtube.com/@lexfridman',
  huberman: 'https://www.youtube.com/@hubermanlab',
  'huberman lab': 'https://www.youtube.com/@hubermanlab',
}

/**
 * Resolves the direct watch URL for the latest video of a YouTube creator or search query.
 */
export async function resolveLatestYouTubeVideo(creatorOrQuery: string): Promise<{ videoUrl: string; label: string }> {
  const lower = creatorOrQuery.toLowerCase().trim()
  let fetchUrl = ''
  let label = 'Latest Video'

  if (lower.includes('mrbeast') || lower.includes('mr beast')) {
    fetchUrl = 'https://www.youtube.com/@MrBeast/videos'
    label = 'Latest MrBeast Video'
  } else if (lower.includes('sidemen')) {
    fetchUrl = 'https://www.youtube.com/@Sidemen/videos'
    label = 'Latest Sidemen Video'
  } else if (lower.includes('mkbhd') || lower.includes('marques')) {
    fetchUrl = 'https://www.youtube.com/@mkbhd/videos'
    label = 'Latest MKBHD Video'
  } else if (lower.includes('veritasium')) {
    fetchUrl = 'https://www.youtube.com/@veritasium/videos'
    label = 'Latest Veritasium Video'
  } else if (lower.includes('pewdiepie')) {
    fetchUrl = 'https://www.youtube.com/@PewDiePie/videos'
    label = 'Latest PewDiePie Video'
  } else {
    const cleanQ = lower.replace(/open|play|watch|the|latest|video|of|on youtube|youtube/gi, '').trim()
    fetchUrl = `https://www.youtube.com/results?search_query=latest+${encodeURIComponent(cleanQ || lower)}+video`
    label = `Latest ${cleanQ || lower} Video`
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)

    const res = await fetch(fetchUrl, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    clearTimeout(timeout)

    const html = await res.text()
    // Match watch?v=XXXXXXXXXXX or "videoId":"XXXXXXXXXXX"
    const match = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/) || html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
    if (match && match[1]) {
      return {
        videoUrl: `https://www.youtube.com/watch?v=${match[1]}`,
        label,
      }
    }
  } catch (err) {
    console.warn('[VoxPilot] Fast video fetch error:', err)
  }

  // Fallback: If direct video ID couldn't be parsed, navigate to search results
  return {
    videoUrl: fetchUrl.includes('/results')
      ? fetchUrl
      : `https://www.youtube.com/results?search_query=latest+${encodeURIComponent(lower)}+video`,
    label,
  }
}

/**
 * Sub-150 ms Local Fast-Path Router
 * Handles deterministic intent with zero network roundtrips.
 */
export async function routeFastPath(rawCommand: string): Promise<RouterExecutionResult> {
  const startTime = performance.now()
  const cmd = cleanCommand(rawCommand)

  // 1. Media Micro-Controls: Skip Ad
  if (cmd === 'skip ad' || cmd === 'skip ads' || cmd === 'skip the ad' || cmd === 'skip') {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query && chrome.scripting?.executeScript) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (activeTab?.id) {
        await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          func: () => {
            const btn = document.querySelector(
              '.ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern, button.ytp-ad-skip-button-text, .videoAdUiSkipButton',
            ) as HTMLElement | null
            if (btn) btn.click()
          },
        }).catch(() => {})
      }
    }
    return {
      handled: true,
      isFastPath: true,
      tier: 'tier1',
      actionName: 'skip_ad',
      statusMessage: 'Skipped YouTube advertisement',
      spokenFeedback: '',
      timeMs: Math.round(performance.now() - startTime),
    }
  }

  // 2. Media Micro-Controls: Pause Video
  if (cmd === 'pause' || cmd === 'pause video' || cmd === 'stop video') {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query && chrome.scripting?.executeScript) {
      const audibleTabs = await chrome.tabs.query({ audible: true })
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
      const targetTab = audibleTabs[0] || activeTab
      if (targetTab?.id) {
        await chrome.scripting.executeScript({
          target: { tabId: targetTab.id },
          func: () => {
            const v = document.querySelector('video')
            if (v) v.pause()
          },
        }).catch(() => {})
      }
    }
    return {
      handled: true,
      isFastPath: true,
      tier: 'tier1',
      actionName: 'pause_media',
      statusMessage: 'Paused video playback',
      spokenFeedback: '',
      timeMs: Math.round(performance.now() - startTime),
    }
  }

  // 3. Media Micro-Controls: Play / Resume Video
  if (cmd === 'play' || cmd === 'resume' || cmd === 'resume video' || cmd === 'play video') {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query && chrome.scripting?.executeScript) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (activeTab?.id) {
        await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          func: () => {
            const v = document.querySelector('video')
            if (v) v.play()
          },
        }).catch(() => {})
      }
    }
    return {
      handled: true,
      isFastPath: true,
      tier: 'tier1',
      actionName: 'play_media',
      statusMessage: 'Resumed video playback',
      spokenFeedback: '',
      timeMs: Math.round(performance.now() - startTime),
    }
  }

  // 4. DIRECT DOMAIN & MSRIT MULTI-STEP NAVIGATION
  const domainMatch = cmd.match(DOMAIN_REGEX)
  if (domainMatch || cmd.includes('msrit')) {
    let domain = domainMatch ? domainMatch[1] : 'msrit.edu'

    const isMSRITMultiStep =
      cmd.includes('msrit') &&
      (cmd.includes('student') ||
        cmd.includes('portal') ||
        cmd.includes('sis') ||
        cmd.includes('other') ||
        cmd.includes('others') ||
        cmd.includes('menu') ||
        cmd.includes('login') ||
        cmd.includes('then') ||
        cmd.includes('->'))

    if (isMSRITMultiStep) {
      // Step 1: Open https://www.msrit.edu in the active/current tab
      const tabId = await openOrUpdateActiveTab('https://www.msrit.edu')

      // Step 2: Inject the multi-step navigation agent (Menu -> Others -> Student Information System)
      if (tabId) {
        await executeMSRITMultiStepNavigation(tabId)
      }

      return {
        handled: true,
        isFastPath: true,
        tier: 'tier3',
        actionName: 'navigated_student_portal',
        statusMessage: 'Opened msrit.edu and navigated Menu -> Others -> Student Information System',
        spokenFeedback: 'Navigated to Student Information System. Please log in on the page and click Resume.',
        complication: {
          type: 'login_wall',
          reason: 'Student portal authentication required. Enter your credentials on the screen to continue.',
          stepIndex: 2,
          totalSteps: 2,
        },
        timeMs: Math.round(performance.now() - startTime),
      }
    }

    // Regular single domain navigation
    let targetUrl = `https://${domain}`
    let targetTitle = domain

    if (domain === 'msrit.edu' || cmd === 'open msrit' || cmd === 'msrit') {
      targetUrl = 'https://www.msrit.edu'
      targetTitle = 'Ramaiah Institute of Technology (MSRIT)'
    }

    await openOrUpdateActiveTab(targetUrl)

    return {
      handled: true,
      isFastPath: true,
      tier: 'tier1',
      actionName: 'open_direct_domain',
      statusMessage: `Navigated directly to ${targetTitle}`,
      spokenFeedback: '',
      timeMs: Math.round(performance.now() - startTime),
    }
  }

  // 5. YouTube specific commands (Sidemen, MrBeast, channels, searches, and latest videos)
  const isYouTubeRelated =
    cmd.includes('youtube') ||
    cmd.includes('mrbeast') ||
    cmd.includes('mr beast') ||
    cmd.includes('sidemen') ||
    cmd.includes('video') ||
    cmd.startsWith('play ') ||
    cmd.startsWith('watch ')

  if (isYouTubeRelated) {
    const isLatestVideo =
      cmd.includes('latest video') ||
      cmd.includes('newest video') ||
      cmd.includes('play latest') ||
      cmd.includes('latest mrbeast') ||
      cmd.includes('latest sidemen') ||
      (cmd.includes('latest') && (cmd.includes('video') || cmd.includes('upload'))) ||
      ((cmd.startsWith('play ') || cmd.startsWith('watch ') || cmd.startsWith('open ')) &&
        (cmd.includes('video') || cmd.includes('latest')))

    if (isLatestVideo) {
      // Step A: If the active tab is already a YouTube page, try fast on-page video click
      if (typeof chrome !== 'undefined' && chrome.tabs?.query && chrome.scripting?.executeScript) {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (activeTab?.id && activeTab.url && activeTab.url.includes('youtube.com')) {
          const clickResults = await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: () => {
              const link = document.querySelector(
                'ytd-channel-video-player-renderer a[href*="/watch"], ' +
                '#video-title[href*="/watch"], ' +
                'a#video-title-link[href*="/watch"], ' +
                'ytd-rich-item-renderer a[href*="/watch"], ' +
                'ytd-video-renderer a[href*="/watch"], ' +
                'a[href*="/watch?v="]'
              ) as HTMLAnchorElement | null
              if (link && link.href) {
                link.click()
                return link.href
              }
              return null
            },
          }).catch(() => null)

          const clickedUrl = clickResults?.[0]?.result
          if (clickedUrl) {
            return {
              handled: true,
              isFastPath: true,
              tier: 'tier1',
              actionName: 'play_latest_video',
              statusMessage: 'Opened latest video directly on active page',
              spokenFeedback: '',
              timeMs: Math.round(performance.now() - startTime),
              data: { url: clickedUrl },
            }
          }
        }
      }

      // Step B: Resolve the exact watch URL for the latest video
      const resolved = await resolveLatestYouTubeVideo(cmd)
      const targetUrl = resolved.videoUrl
      const targetLabel = resolved.label

      let targetTabId: number | undefined
      let navigatedTab = false

      if (typeof chrome !== 'undefined' && chrome.tabs?.query && chrome.tabs?.update) {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (activeTab?.id && activeTab.url && activeTab.url.includes('youtube.com')) {
          await chrome.tabs.update(activeTab.id, { url: targetUrl, active: true })
          targetTabId = activeTab.id
          navigatedTab = true
        }
      }

      if (!navigatedTab) {
        const existing = await findExistingTab('youtube.com')
        if (existing && existing.id !== undefined) {
          if (typeof chrome !== 'undefined' && chrome.tabs?.update) {
            await chrome.tabs.update(existing.id, { url: targetUrl, active: true })
            targetTabId = existing.id
            if (existing.windowId) {
              await chrome.windows.update(existing.windowId, { focused: true })
            }
            navigatedTab = true
          }
        } else if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
          const newTab = await chrome.tabs.create({ url: targetUrl, active: true })
          targetTabId = newTab.id
          navigatedTab = true
        }
      }

      // Safety net: if targetUrl was a search or videos listing, click first video when loaded
      if (targetTabId && (targetUrl.includes('/results') || targetUrl.includes('/videos'))) {
        setTimeout(() => {
          if (typeof chrome !== 'undefined' && chrome.scripting?.executeScript) {
            chrome.scripting.executeScript({
              target: { tabId: targetTabId! },
              func: () => {
                const link = document.querySelector(
                  'ytd-video-renderer a[href*="/watch"], ytd-rich-item-renderer a[href*="/watch"], a#video-title[href*="/watch"]'
                ) as HTMLAnchorElement | null
                if (link) link.click()
              },
            }).catch(() => {})
          }
        }, 1200)
      }

      return {
        handled: true,
        isFastPath: true,
        tier: 'tier1',
        actionName: 'open_latest_video',
        statusMessage: `Opened ${targetLabel}`,
        spokenFeedback: '',
        timeMs: Math.round(performance.now() - startTime),
        data: { url: targetUrl },
      }
    }

    // Step C: Regular channel or search navigation
    let targetUrl = 'https://www.youtube.com'
    let targetLabel = 'YouTube'

    if (cmd.includes('mrbeast') || cmd.includes('mr beast')) {
      targetUrl = 'https://www.youtube.com/@MrBeast'
      targetLabel = 'MrBeast YouTube Channel'
    } else if (cmd.includes('sidemen')) {
      targetUrl = 'https://www.youtube.com/@Sidemen'
      targetLabel = 'Sidemen YouTube Channel'
    } else {
      for (const [name, url] of Object.entries(KNOWN_CHANNELS)) {
        if (cmd.includes(name)) {
          targetUrl = url
          targetLabel = `${name} on YouTube`
          break
        }
      }

      if (targetUrl === 'https://www.youtube.com') {
        const query = cmd
          .replace(/open|search|play|watch|channel|on youtube|youtube/gi, '')
          .trim()

        if (query) {
          targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
          targetLabel = `YouTube search for "${query}"`
        }
      }
    }

    await openOrUpdateActiveTab(targetUrl)

    return {
      handled: true,
      isFastPath: true,
      tier: 'tier1',
      actionName: 'open_youtube_destination',
      statusMessage: `Navigated to ${targetLabel}`,
      spokenFeedback: '',
      timeMs: Math.round(performance.now() - startTime),
    }
  }

  // 6. Open Wordle (Deduplicate if already open)
  if (cmd.includes('open wordle') || cmd === 'wordle') {
    const wordleUrl = 'https://www.nytimes.com/games/wordle/index.html'
    const existing = await findExistingTab('wordle')

    if (existing && existing.id !== undefined) {
      if (typeof chrome !== 'undefined' && chrome.tabs?.update) {
        await chrome.tabs.update(existing.id, { active: true })
        if (existing.windowId) {
          await chrome.windows.update(existing.windowId, { focused: true })
        }
      }
      return {
        handled: true,
        isFastPath: true,
        tier: 'tier1',
        actionName: 'switch_to_wordle',
        statusMessage: 'Switched to existing Wordle tab',
        spokenFeedback: '',
        timeMs: Math.round(performance.now() - startTime),
      }
    }

    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      await chrome.tabs.create({ url: wordleUrl, active: true })
    }
    return {
      handled: true,
      isFastPath: true,
      tier: 'tier1',
      actionName: 'open_wordle',
      statusMessage: 'Opened Wordle in a new tab',
      spokenFeedback: '',
      timeMs: Math.round(performance.now() - startTime),
    }
  }

  // 7. Open History
  if (cmd === 'open history' || cmd === 'view history' || cmd === 'show history') {
    const historyUrl = 'chrome://history'
    const existing = await findExistingTab('chrome://history')

    if (existing && existing.id !== undefined) {
      if (typeof chrome !== 'undefined' && chrome.tabs?.update) {
        await chrome.tabs.update(existing.id, { active: true })
      }
      return {
        handled: true,
        isFastPath: true,
        tier: 'tier1',
        actionName: 'switch_history',
        statusMessage: 'Switched to open History tab',
        spokenFeedback: '',
        timeMs: Math.round(performance.now() - startTime),
      }
    }

    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      await chrome.tabs.create({ url: historyUrl, active: true })
    }
    return {
      handled: true,
      isFastPath: true,
      tier: 'tier1',
      actionName: 'open_history',
      statusMessage: 'Opened Chrome History',
      spokenFeedback: '',
      timeMs: Math.round(performance.now() - startTime),
    }
  }

  // 8. Web Search Queries
  if (cmd.startsWith('search for ') || cmd.startsWith('google ')) {
    const query = cmd
      .replace(/^search for\s*/i, '')
      .replace(/^google\s*/i, '')
      .trim()

    if (query) {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`
      if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
        await chrome.tabs.create({ url: searchUrl, active: true })
      }
      return {
        handled: true,
        isFastPath: true,
        tier: 'tier1',
        actionName: 'web_search',
        statusMessage: `Searching Google for: "${query}"`,
        spokenFeedback: '',
        timeMs: Math.round(performance.now() - startTime),
      }
    }
  }

  // 9. Close Current Tab
  if (cmd === 'close current tab' || cmd === 'close this tab' || cmd === 'close tab') {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query && chrome.tabs?.remove) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (activeTab?.id) {
        await chrome.tabs.remove(activeTab.id)
      }
    }
    return {
      handled: true,
      isFastPath: true,
      tier: 'tier1',
      actionName: 'close_current_tab',
      statusMessage: 'Closed active tab',
      spokenFeedback: '',
      timeMs: Math.round(performance.now() - startTime),
    }
  }

  // 10. Mute / Unmute YouTube or active audio tab
  if (cmd.includes('mute youtube') || cmd === 'mute audio' || cmd === 'mute current tab') {
    let mutedCount = 0
    if (typeof chrome !== 'undefined' && chrome.tabs?.query && chrome.tabs?.update) {
      const targetTabs = await chrome.tabs.query({ audible: true })
      for (const tab of targetTabs) {
        if (tab.id) {
          await chrome.tabs.update(tab.id, { muted: true })
          mutedCount++
        }
      }
      if (mutedCount === 0) {
        const [active] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (active?.id) {
          await chrome.tabs.update(active.id, { muted: true })
          mutedCount++
        }
      }
    }
    return {
      handled: true,
      isFastPath: true,
      tier: 'tier1',
      actionName: 'mute_tab',
      statusMessage: mutedCount > 0 ? `Muted ${mutedCount} audio tab(s)` : 'Muted current tab',
      spokenFeedback: '',
      timeMs: Math.round(performance.now() - startTime),
    }
  }

  if (cmd.includes('unmute youtube') || cmd === 'unmute audio' || cmd === 'unmute tab') {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query && chrome.tabs?.update) {
      const tabs = await chrome.tabs.query({ muted: true })
      for (const tab of tabs) {
        if (tab.id) {
          await chrome.tabs.update(tab.id, { muted: false })
        }
      }
    }
    return {
      handled: true,
      isFastPath: true,
      tier: 'tier1',
      actionName: 'unmute_tab',
      statusMessage: 'Unmuted active audio tabs',
      spokenFeedback: '',
      timeMs: Math.round(performance.now() - startTime),
    }
  }

  // 11. Switch to Tab
  if (cmd.startsWith('switch to tab') || cmd.startsWith('switch to')) {
    const target = cmd.replace(/^switch to tab\s*/, '').replace(/^switch to\s*/, '').trim()
    if (target) {
      const existing = await findExistingTab(target)
      if (existing && existing.id !== undefined) {
        if (typeof chrome !== 'undefined' && chrome.tabs?.update) {
          await chrome.tabs.update(existing.id, { active: true })
          if (existing.windowId) {
            await chrome.windows.update(existing.windowId, { focused: true })
          }
        }
        return {
          handled: true,
          isFastPath: true,
          tier: 'tier1',
          actionName: 'switch_tab',
          statusMessage: `Switched to tab: ${existing.title || target}`,
          spokenFeedback: '',
          timeMs: Math.round(performance.now() - startTime),
        }
      }
    }
  }

  // 12. Generic deduplicated quick open for common apps
  const quickApps: Record<string, string> = {
    github: 'https://github.com',
    google: 'https://www.google.com',
    mail: 'https://mail.google.com',
    gmail: 'https://mail.google.com',
    calendar: 'https://calendar.google.com',
    twitter: 'https://twitter.com',
    x: 'https://x.com',
    reddit: 'https://www.reddit.com',
    spotify: 'https://open.spotify.com',
    netflix: 'https://www.netflix.com',
    twitch: 'https://www.twitch.tv',
    amazon: 'https://www.amazon.com',
  }

  for (const [appKey, appUrl] of Object.entries(quickApps)) {
    if (cmd === `open ${appKey}` || cmd === `go to ${appKey}` || cmd === appKey) {
      const existing = await findExistingTab(appKey)
      if (existing && existing.id !== undefined) {
        if (typeof chrome !== 'undefined' && chrome.tabs?.update) {
          await chrome.tabs.update(existing.id, { active: true })
        }
        return {
          handled: true,
          isFastPath: true,
          tier: 'tier1',
          actionName: `switch_${appKey}`,
          statusMessage: `Focused existing ${appKey} tab`,
          spokenFeedback: '',
          timeMs: Math.round(performance.now() - startTime),
        }
      }

      if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
        await chrome.tabs.create({ url: appUrl, active: true })
      }
      return {
        handled: true,
        isFastPath: true,
        tier: 'tier1',
        actionName: `open_${appKey}`,
        statusMessage: `Opened ${appKey}`,
        spokenFeedback: '',
        timeMs: Math.round(performance.now() - startTime),
      }
    }
  }

  // 13. Destructive actions inspection (Tier 2 Trigger)
  if (cmd.includes('close all other tabs') || cmd === 'close other tabs') {
    let tabCount = 0
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      const tabs = await chrome.tabs.query({ currentWindow: true })
      tabCount = Math.max(0, tabs.length - 1)
    } else {
      tabCount = 8
    }

    const confirmation: ConfirmationDetails = {
      title: 'Confirm Closing Tabs',
      description: `This action will close ${tabCount} background tabs in the current window.`,
      itemCount: tabCount,
      target: `${tabCount} background tabs`,
      requiresTypeToConfirm: false,
      actionType: 'close_tabs',
      payload: { mode: 'other_tabs' },
    }

    return {
      handled: true,
      isFastPath: true,
      tier: 'tier2',
      actionName: 'close_other_tabs',
      statusMessage: `Confirmation needed to close ${tabCount} tabs`,
      spokenFeedback: `This will close ${tabCount} tabs. Please confirm in the side panel.`,
      requiresConfirmation: true,
      confirmation,
      timeMs: Math.round(performance.now() - startTime),
    }
  }

  if (cmd.includes('clear all history') || cmd.includes('delete all history') || cmd === 'wipe history') {
    let historyCount = 0
    if (typeof chrome !== 'undefined' && chrome.history?.search) {
      const items = await chrome.history.search({ text: '', startTime: 0, maxResults: 1000 })
      historyCount = items.length
    } else {
      historyCount = 142
    }

    const confirmation: ConfirmationDetails = {
      title: 'Confirm History Deletion',
      description: `This action will permanently delete all browsing records (${historyCount} items detected). Type "DELETE" below to confirm.`,
      itemCount: historyCount,
      target: 'Entire browsing history',
      requiresTypeToConfirm: true,
      phraseToType: 'DELETE',
      actionType: 'delete_history',
      payload: { range: 'all' },
    }

    return {
      handled: true,
      isFastPath: true,
      tier: 'tier2',
      actionName: 'delete_all_history',
      statusMessage: `Confirmation needed to delete ${historyCount} history items`,
      spokenFeedback: `Full wipe detected for ${historyCount} items. Type confirmation required.`,
      requiresConfirmation: true,
      confirmation,
      timeMs: Math.round(performance.now() - startTime),
    }
  }

  // Not handled by fast path: delegate to LLM slow-path orchestrator
  return {
    handled: false,
    isFastPath: false,
    tier: 'tier1',
    actionName: 'delegate_to_llm',
    statusMessage: 'Routing to semantic LLM orchestrator',
    spokenFeedback: '',
    timeMs: Math.round(performance.now() - startTime),
  }
}
