import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  Volume2,
  VolumeX,
  Settings,
  ShieldAlert,
  Send,
  AlertCircle,
  ExternalLink,
  AudioWaveform,
} from 'lucide-react'

import { Card, CardBody, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogActions } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { routeFastPath } from '@/fastPathRouter'
import { routeLLMSlowPath, getSettings, saveSettings } from '@/llmOrchestrator'
import { WhisperFlowEngine } from '@/whisperFlow'
import {
  ConfirmationDetails,
  ComplicationDetails,
  ExecutionLogEntry,
  PageSnapshot,
  RouterExecutionResult,
} from '@/types'

export function SidePanelApp() {
  // Theme state (Dark is default)
  const [isDark, setIsDark] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') || true
  })

  // Voice & Listening state (Whisper Flow Powered)
  const [isListening, setIsListening] = useState<boolean>(false)
  const [transcript, setTranscript] = useState<string>('')
  const [interimTranscript, setInterimTranscript] = useState<string>('')
  const [audioLevel, setAudioLevel] = useState<number>(0)
  const [micError, setMicError] = useState<string | null>(null)
  const [needsMicPermission, setNeedsMicPermission] = useState<boolean>(false)
  const [isSpeakingTTS, setIsSpeakingTTS] = useState<boolean>(false)
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true)
  const [textCommand, setTextCommand] = useState<string>('')

  // Autonomy state
  const [activeConfirmation, setActiveConfirmation] = useState<ConfirmationDetails | null>(null)
  const [confirmInput, setConfirmInput] = useState<string>('')
  const [activeComplication, setActiveComplication] = useState<ComplicationDetails | null>(null)
  const [currentStepInfo, setCurrentStepInfo] = useState<{ step: number; total: number; title: string } | null>(null)

  // Execution Log
  const [logs, setLogs] = useState<ExecutionLogEntry[]>([
    {
      id: 'init-1',
      timestamp: Date.now() - 5000,
      command: 'System ready: Whisper Flow audio dictation engine loaded',
      tier: 'tier1',
      status: 'completed',
      detail: 'Local fast-path and Whisper audio pipeline initialized',
      timeMs: 4,
    },
  ])

  // Settings state
  const [showSettings, setShowSettings] = useState<boolean>(false)
  const [apiKey, setApiKey] = useState<string>('')
  const [model, setModel] = useState<string>('gemini-2.0-flash')
  const [whisperEndpoint, setWhisperEndpoint] = useState<string>('')

  // Refs
  const safeCancelRef = useRef<HTMLButtonElement | null>(null)
  const whisperEngineRef = useRef<WhisperFlowEngine | null>(null)

  // Platform detection for Mac shortcut display
  const isMac =
    typeof navigator !== 'undefined' &&
    (/Mac/i.test(navigator.userAgent) || /Mac/i.test(navigator.platform || ''))

  // Initialize theme
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  // Load stored settings on mount
  useEffect(() => {
    getSettings().then((s) => {
      setApiKey(s.apiKey)
      setModel(s.model)
      setWhisperEndpoint(s.whisperEndpoint || '')
    })
  }, [])

  // Natural TTS speech synthesizer (Replaces robotic generic messages)
  const speakFeedback = (text: string) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.05
    utterance.pitch = 1.0

    utterance.onstart = () => setIsSpeakingTTS(true)
    utterance.onend = () => setIsSpeakingTTS(false)
    utterance.onerror = () => setIsSpeakingTTS(false)

    window.speechSynthesis.speak(utterance)
  }

  // Cancel TTS immediately (Barge-in)
  const interruptTTS = () => {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel()
      setIsSpeakingTTS(false)
    }
  }

  // Open helper tab to grant microphone permission in Chrome
  const openMicPermissionTab = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL('permission.html') })
    }
  }

  // Fetch active page snapshot from content script
  const getActiveTabSnapshot = async (): Promise<PageSnapshot | null> => {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      return {
        url: 'https://example.com/checkout',
        title: 'Checkout and Verification',
        elements: [
          {
            id: 104,
            tag: 'div',
            text: 'Verify you are human (Cloudflare Turnstile)',
            isInteractive: true,
            isPotentiallySensitive: false,
            isComplicationCandidate: true,
            complicationType: 'captcha',
          },
        ],
        detectedComplications: [
          {
            type: 'captcha',
            reason: 'Cloudflare Turnstile human verification challenge detected.',
            elementId: 104,
          },
        ],
      }
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) return null

      const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_SNAPSHOT' })
      return res?.snapshot || null
    } catch {
      return null
    }
  }

  // Send message to active tab content script
  const sendToActiveTab = async (messageType: string, payload?: any) => {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) return
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, { type: messageType, payload })
      }
    } catch (err) {
      console.warn('[VoxPilot] Active tab message failed:', err)
    }
  }

  // Handles router response, confirmations, and complication handoffs
  const handleExecutionResult = (
    logId: string,
    command: string,
    result: RouterExecutionResult,
  ) => {
    if (result.spokenFeedback) {
      speakFeedback(result.spokenFeedback)
    }

    // Tier 2: Scoped Confirmation Dialog
    if (result.tier === 'tier2' && result.confirmation) {
      setActiveConfirmation(result.confirmation)
      setConfirmInput('')
      setLogs((prev) =>
        prev.map((l) =>
          l.id === logId
            ? {
                ...l,
                tier: 'tier2',
                status: 'awaiting_confirm',
                detail: result.statusMessage,
                timeMs: result.timeMs,
              }
            : l,
        ),
      )
      return
    }

    // Tier 3: Visual Complication Handoff
    if (result.tier === 'tier3' && result.complication) {
      setActiveComplication(result.complication)
      setCurrentStepInfo({
        step: result.complication.stepIndex || 3,
        total: result.complication.totalSteps || 5,
        title: result.complication.reason,
      })

      sendToActiveTab('VOX_INJECT_SPOTLIGHT', {
        targetElementId: result.complication.elementId || 104,
        complication: result.complication,
      })

      setLogs((prev) =>
        prev.map((l) =>
          l.id === logId
            ? {
                ...l,
                tier: 'tier3',
                status: 'paused_complication',
                detail: result.statusMessage,
                timeMs: result.timeMs,
                complicationType: result.complication?.type,
              }
            : l,
        ),
      )
      return
    }

    // Tier 1: Instant execution
    setLogs((prev) =>
      prev.map((l) =>
        l.id === logId
          ? {
              ...l,
              tier: 'tier1',
              status: 'completed',
              detail: result.statusMessage,
              timeMs: result.timeMs,
            }
          : l,
      ),
    )
  }

  // Main Command Dispatcher
  const executeCommand = async (rawCmd: string) => {
    const trimmed = rawCmd.trim()
    if (!trimmed) return

    interruptTTS()
    setTranscript(trimmed)
    setInterimTranscript('')
    setTextCommand('')
    setMicError(null)

    const logId = String(Date.now())
    const initialLog: ExecutionLogEntry = {
      id: logId,
      timestamp: Date.now(),
      command: trimmed,
      tier: 'tier1',
      status: 'executing',
      detail: 'Routing action...',
    }
    setLogs((prev) => [initialLog, ...prev.slice(0, 19)])

    try {
      // Step 1: Fast-Path Router (<150 ms)
      const fastResult = await routeFastPath(trimmed)

      if (fastResult.handled) {
        handleExecutionResult(logId, trimmed, fastResult)
        return
      }

      // Step 2: LLM Slow-Path Router
      const snapshot = await getActiveTabSnapshot()
      const llmResult = await routeLLMSlowPath(trimmed, snapshot)
      handleExecutionResult(logId, trimmed, llmResult)
    } catch (err: any) {
      console.error('[VoxPilot] Command error:', err)
      setLogs((prev) =>
        prev.map((l) =>
          l.id === logId
            ? {
                ...l,
                status: 'error',
                detail: `Error: ${err?.message || 'Execution error'}`,
              }
            : l,
        ),
      )
    }
  }

  // Confirm Tier 2 Action
  const handleConfirmAction = async () => {
    if (!activeConfirmation) return

    const { actionType, payload, requiresTypeToConfirm, phraseToType } = activeConfirmation
    if (requiresTypeToConfirm && phraseToType && confirmInput.trim() !== phraseToType) {
      return
    }

    if (actionType === 'delete_history') {
      if (typeof chrome !== 'undefined' && chrome.history?.deleteUrl) {
        const urls: string[] = payload?.urls || []
        for (const u of urls) {
          await chrome.history.deleteUrl({ url: u }).catch(() => {})
        }
      }
      speakFeedback('Selected history items removed.')
    } else if (actionType === 'close_tabs') {
      if (typeof chrome !== 'undefined' && chrome.tabs?.query && chrome.tabs?.remove) {
        const tabs = await chrome.tabs.query({ currentWindow: true })
        const toClose = tabs.filter((t) => !t.active && t.id !== undefined).map((t) => t.id!)
        await chrome.tabs.remove(toClose)
      }
      speakFeedback('Closed background tabs.')
    }

    setLogs((prev) => [
      {
        id: String(Date.now()),
        timestamp: Date.now(),
        command: `Confirmed: ${activeConfirmation.title}`,
        tier: 'tier2',
        status: 'completed',
        detail: `Action performed on ${activeConfirmation.itemCount} items`,
        timeMs: 18,
      },
      ...prev,
    ])

    setActiveConfirmation(null)
    setConfirmInput('')
  }

  // Cancel Tier 2 Action
  const handleCancelConfirmation = () => {
    setActiveConfirmation(null)
    setConfirmInput('')
    setLogs((prev) => [
      {
        id: String(Date.now()),
        timestamp: Date.now(),
        command: 'Cancelled scoped action',
        tier: 'tier2',
        status: 'completed',
        detail: 'Aborted safely without changes',
        timeMs: 2,
      },
      ...prev,
    ])
    speakFeedback('Action cancelled.')
  }

  // Resume Tier 3 Agent execution after user resolves complication
  const handleResumeComplication = () => {
    sendToActiveTab('VOX_REMOVE_SPOTLIGHT')

    const comp = activeComplication
    setActiveComplication(null)
    setCurrentStepInfo(null)

    const resumeLog: ExecutionLogEntry = {
      id: String(Date.now()),
      timestamp: Date.now(),
      command: 'Resumed agent flow after manual resolution',
      tier: 'tier1',
      status: 'completed',
      detail: `Blocker resolved (${comp?.type || 'complication'}). Steps finalized.`,
      timeMs: 42,
    }
    setLogs((prev) => [resumeLog, ...prev])
    speakFeedback('Resuming agent flow.')
  }

  // Whisper Flow Voice Dictation Toggle
  const toggleListening = async () => {
    interruptTTS()

    if (isListening) {
      if (whisperEngineRef.current) {
        await whisperEngineRef.current.stop()
      }
      setIsListening(false)
      setAudioLevel(0)
      setInterimTranscript('')
      return
    }

    setMicError(null)
    setNeedsMicPermission(false)
    setInterimTranscript('Whisper Flow listening... Speak now')

    const engine = new WhisperFlowEngine({
      onTranscript: (text: string, isFinal: boolean) => {
        interruptTTS()
        if (isFinal) {
          setTranscript(text)
          setInterimTranscript('')
          setIsListening(false)
          setAudioLevel(0)
          if (whisperEngineRef.current) {
            whisperEngineRef.current.stop()
          }
          executeCommand(text)
        } else {
          setInterimTranscript(text)
        }
      },
      onError: (errMsg: string) => {
        console.warn('[WhisperFlow] Error received:', errMsg)
        setIsListening(false)
        setAudioLevel(0)
        if (errMsg.includes('denied') || errMsg.includes('not-allowed')) {
          setNeedsMicPermission(true)
          setMicError('Microphone permission blocked. Click "Allow Access" below.')
        } else {
          setMicError(`Voice notice: ${errMsg}.`)
        }
      },
      onAudioLevel: (level: number) => {
        setAudioLevel(level)
      },
      whisperEndpoint: whisperEndpoint || undefined,
    })

    whisperEngineRef.current = engine
    const started = await engine.start()

    if (started) {
      setIsListening(true)
      setMicError(null)
    } else {
      setIsListening(false)
      setNeedsMicPermission(true)
      setMicError('Microphone permission needed. Click below to allow.')
    }
  }

  // Listen for keyboard command toggle (Shift+Cmd+V or Shift+Ctrl+V) and permission broadcasts
  useEffect(() => {
    const messageListener = (msg: any) => {
      if (msg.type === 'COMMAND_TOGGLE_LISTENING') {
        toggleListening()
      }
      if (msg.type === 'MIC_PERMISSION_GRANTED') {
        setNeedsMicPermission(false)
        setMicError(null)
        setTimeout(() => {
          toggleListening()
        }, 300)
      }
    }

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(messageListener)
    }

    // Direct keydown listener inside sidepanel window
    const handleKeyDown = (e: KeyboardEvent) => {
      const modifier = isMac ? e.metaKey : e.ctrlKey
      if (modifier && e.shiftKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault()
        toggleListening()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(messageListener)
      }
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isListening, isMac])

  return (
    <div className="relative flex min-h-screen flex-col bg-background font-manrope text-foreground">
      {/* 1. Sticky Transparent Header with Blur */}
      <header className="sticky top-0 z-30 flex h-13 w-full items-center justify-between border-b border-card-edge bg-background/80 px-4 py-2.5 backdrop-blur-md">
        {/* Left: Onest Wordmark */}
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-800">
            <span className="size-2 rounded-full bg-brand" />
          </span>
          <h1 className="font-onest text-sm font-bold tracking-tight text-foreground">VoxPilot</h1>
          <span className="text-[10px] text-muted-foreground font-mono">Whisper</span>
        </div>

        {/* Right Controls: Settings and Half-Circle Theme Switcher */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title={ttsEnabled ? 'Mute spoken audio' : 'Enable spoken audio'}
            aria-label="Toggle spoken audio"
          >
            {ttsEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5 text-neutral-500" />}
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Configure settings and API keys"
            aria-label="Settings"
          >
            <Settings className="size-3.5" />
          </button>

          {/* Half-Circle Theme Switcher (Single label for both themes) */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="group flex size-7 items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-800 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            <div className="relative size-3.5 overflow-hidden rounded-full border border-neutral-500">
              <div className="h-full w-1/2 bg-neutral-900 dark:bg-neutral-100" />
            </div>
          </button>
        </div>
      </header>

      {/* Main Content Container (Optimized for 360px to 420px narrow sidepanel) */}
      <main className="flex-1 space-y-3.5 p-3.5">
        {/* Intro Paragraph with Pale Cream Highlight Phrase */}
        <p className="text-xs leading-relaxed text-muted-foreground">
          Voice copilot executing browser tasks with{' '}
          <span className="font-montserrat font-medium tracking-tight capitalize text-yellow-800 dark:text-orange-100">
            zero latency local autonomy
          </span>
          , structured tool calling, and human complication handoffs.
        </p>

        {/* 2. Central Whisper Flow Voice Listening Card */}
        <Card className="border-card-edge bg-card-fill">
          <CardBody className="gap-3 p-4">
            <div className="flex items-center justify-between">
              <span className="font-montserrat text-xs font-semibold text-foreground flex items-center gap-1.5">
                <AudioWaveform className="size-3.5 text-muted-foreground" />
                Whisper Flow Dictation
              </span>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <kbd className="rounded border border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 px-1.5 py-0.5 text-[10px] font-mono">
                  {isMac ? 'Shift+Cmd+V' : 'Shift+Ctrl+V'}
                </kbd>
                <span>Push to talk</span>
              </div>
            </div>

            {/* Central Mic Element with Whisper Flow Audio Visualizer */}
            <div className="flex flex-col items-center justify-center py-2">
              <button
                onClick={toggleListening}
                className={`relative flex size-14 items-center justify-center rounded-full border transition-all duration-300 ${
                  isListening
                    ? 'border-yellow-600/60 bg-neutral-900 text-yellow-500 dark:border-orange-200/50 dark:text-orange-100 scale-105'
                    : 'border-neutral-300 dark:border-neutral-800 text-foreground hover:border-neutral-400 dark:hover:border-neutral-700'
                }`}
                aria-label={isListening ? 'Stop listening' : 'Start listening'}
              >
                {isListening ? (
                  <>
                    <Mic className="size-6 animate-pulse" />
                    <span className="absolute inset-0 rounded-full border border-yellow-500/30 animate-ping" />
                  </>
                ) : (
                  <Mic className="size-6" />
                )}
              </button>

              {/* Reactive Whisper Flow Soundwave Bars */}
              {isListening && (
                <div className="mt-3 flex items-center gap-1 h-5">
                  {[20, 45, 75, 95, 60, 30, 80, 50, 25].map((baseHeight, idx) => {
                    const scaled = Math.max(4, Math.min(20, Math.round((baseHeight * (audioLevel + 15)) / 100)))
                    return (
                      <span
                        key={idx}
                        className="w-1 rounded-full bg-yellow-600 dark:bg-orange-200 transition-all duration-75"
                        style={{ height: `${scaled}px` }}
                      />
                    )
                  })}
                </div>
              )}

              <div className="mt-2 text-center">
                <span className="text-xs font-medium text-foreground">
                  {isListening ? 'Whisper Flow listening... Speak now' : 'Tap or press shortcut to speak'}
                </span>
                {isSpeakingTTS && (
                  <div className="mt-1 flex items-center justify-center gap-1 text-[11px] text-green-700 dark:text-green-300">
                    <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span>Speaking (tap mic to barge in)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Microphone Permission Action Notice (When needed) */}
            {needsMicPermission && (
              <div className="rounded-lg border border-yellow-600/30 bg-yellow-500/10 p-2.5 text-xs text-yellow-800 dark:text-yellow-200 flex items-center justify-between gap-2">
                <span className="text-[11px] leading-tight">One-time microphone permission needed</span>
                <button
                  onClick={openMicPermissionTab}
                  className="shrink-0 rounded border border-yellow-600/40 bg-neutral-900 text-white dark:bg-white dark:text-black px-2.5 py-1 text-[10px] font-semibold flex items-center gap-1"
                >
                  Allow access <ExternalLink className="size-2.5" />
                </button>
              </div>
            )}

            {/* Error notice if voice fails */}
            {micError && !needsMicPermission && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-[11px] text-red-600 dark:text-red-300 flex items-center gap-1.5">
                <AlertCircle className="size-3 shrink-0" />
                <span>{micError}</span>
              </div>
            )}

            {/* Live Transcript Box */}
            <div className="min-h-12 rounded-lg border border-neutral-200 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-black/30 p-2.5 text-xs">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                Transcript
              </div>
              {transcript || interimTranscript ? (
                <div className="text-foreground leading-snug">
                  <span>{transcript}</span>
                  {interimTranscript && (
                    <span className="text-muted-foreground italic ml-1">{interimTranscript}</span>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground italic">"Open MrBeast YouTube channel"</div>
              )}
            </div>

            {/* Direct Command Text Bar (Immediate Typing Fallback) */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (textCommand.trim()) {
                  executeCommand(textCommand)
                }
              }}
              className="flex items-center gap-1.5"
            >
              <Input
                value={textCommand}
                onChange={(e) => setTextCommand(e.target.value)}
                placeholder="Type a command or speak above..."
                className="h-8 text-xs"
              />
              <Button
                type="submit"
                variant="solid"
                size="sm"
                className="h-8 px-3"
                disabled={!textCommand.trim()}
                iconRight={<Send className="size-3" />}
              >
                Run
              </Button>
            </form>

            {/* Quick Voice & Action Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => executeCommand('open mrbeast youtube channel')}
                className="rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                MrBeast YouTube
              </button>
              <button
                type="button"
                onClick={() => executeCommand('open wordle')}
                className="rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Open Wordle
              </button>
              <button
                type="button"
                onClick={() => executeCommand('open history')}
                className="rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Open history
              </button>
              <button
                type="button"
                onClick={() => executeCommand('mute youtube')}
                className="rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Mute YouTube
              </button>
              <button
                type="button"
                onClick={() => executeCommand('delete my shopping history from the last hour')}
                className="rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear shopping history
              </button>
              <button
                type="button"
                onClick={() => executeCommand('compare products in last 3 tabs')}
                className="rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Compare 3 tabs
              </button>
              <button
                type="button"
                onClick={() => executeCommand('demo complication at checkout')}
                className="rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Demo CAPTCHA blocker
              </button>
            </div>
          </CardBody>
        </Card>

        {/* 3. Tier 3 Visual Complication Handoff Card (When active) */}
        <AnimatePresence>
          {activeComplication && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="border-red-600/30 dark:border-red-400/30 bg-card-fill">
                <CardBody className="p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-montserrat text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <ShieldAlert className="size-3.5" />
                      Tier 3: Visual Complication Handoff
                    </span>
                    {currentStepInfo && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Step {currentStepInfo.step} of {currentStepInfo.total}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-foreground mt-1.5 leading-relaxed">
                    {activeComplication.reason}
                  </p>

                  <div className="mt-2 rounded border border-neutral-300 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 p-2 text-[11px] text-muted-foreground">
                    Spotlight outline injected onto the active webpage. Please complete the prompt on the screen.
                  </div>

                  <CardFooter className="mt-3 flex items-center justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        sendToActiveTab('VOX_REMOVE_SPOTLIGHT')
                        setActiveComplication(null)
                        setCurrentStepInfo(null)
                      }}
                    >
                      Cancel flow
                    </Button>

                    <Button
                      variant="solid"
                      size="sm"
                      onClick={handleResumeComplication}
                    >
                      Resume agent
                    </Button>
                  </CardFooter>
                </CardBody>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4. Execution Log showing Tier 1, Tier 2, Tier 3 states with text colour only */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="font-montserrat text-xs font-semibold text-foreground">Action Timeline</span>
            <span className="text-[11px] text-muted-foreground">
              {logs.length} event{logs.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="space-y-2">
            {logs.map((log) => {
              const tierColor =
                log.tier === 'tier1'
                  ? 'text-green-700 dark:text-green-400'
                  : log.tier === 'tier2'
                  ? 'text-yellow-700 dark:text-yellow-400'
                  : 'text-red-700 dark:text-red-400'

              const tierLabel =
                log.tier === 'tier1' ? 'Tier 1: Instant' : log.tier === 'tier2' ? 'Tier 2: Scoped' : 'Tier 3: Handoff'

              return (
                <div
                  key={log.id}
                  className="rounded-lg border border-neutral-200 dark:border-neutral-800/80 bg-neutral-50/40 dark:bg-black/20 p-2.5 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={`font-montserrat font-semibold ${tierColor}`}>
                      {tierLabel}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {log.timeMs !== undefined ? `${log.timeMs} ms` : 'Active'}
                    </span>
                  </div>

                  <div className="mt-1 font-medium text-foreground text-xs leading-snug">
                    {log.command}
                  </div>

                  <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {log.detail}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      {/* 5. Tier 2 Scoped Confirmation Dialog (Safe-first focus + optional type-to-confirm) */}
      <Dialog
        open={!!activeConfirmation}
        onClose={handleCancelConfirmation}
        title={activeConfirmation?.title || 'Confirm Destructive Action'}
        description={activeConfirmation?.description}
        initialFocus={safeCancelRef}
      >
        <div className="mt-3 space-y-3">
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50 p-2.5 text-xs text-muted-foreground">
            <div>
              <span className="font-semibold text-foreground">Target: </span>
              {activeConfirmation?.target}
            </div>
            <div>
              <span className="font-semibold text-foreground">Items affected: </span>
              <span className="font-mono text-yellow-700 dark:text-yellow-400">
                {activeConfirmation?.itemCount}
              </span>
            </div>
          </div>

          {activeConfirmation?.requiresTypeToConfirm && (
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground">
                Type <span className="font-mono font-bold text-red-500">DELETE</span> to confirm:
              </label>
              <Input
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="DELETE"
              />
            </div>
          )}

          <DialogActions>
            <Button
              ref={safeCancelRef}
              variant="outline"
              size="sm"
              onClick={handleCancelConfirmation}
            >
              Cancel
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmAction}
              disabled={
                activeConfirmation?.requiresTypeToConfirm &&
                confirmInput.trim() !== activeConfirmation?.phraseToType
              }
            >
              Confirm deletion
            </Button>
          </DialogActions>
        </div>
      </Dialog>

      {/* 6. Settings Dialog */}
      <Dialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        title="VoxPilot Settings"
        description="Configure Gemini API key, model, and Whisper Flow endpoints."
      >
        <div className="mt-3 space-y-3 text-xs">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-foreground">Gemini API Key</label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
            />
            <p className="text-[10px] text-muted-foreground">
              Stored locally in Chrome extension storage.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-foreground">LLM Model</label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gemini-2.0-flash"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-foreground">Whisper Endpoint URL (Optional)</label>
            <Input
              value={whisperEndpoint}
              onChange={(e) => setWhisperEndpoint(e.target.value)}
              placeholder="http://localhost:8000/v1/audio/transcriptions"
            />
            <p className="text-[10px] text-muted-foreground">
              Connect to local Whisper.cpp, Ollama, or OpenAI-compatible Whisper endpoint.
            </p>
          </div>

          <DialogActions>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(false)}
            >
              Close
            </Button>
            <Button
              variant="solid"
              size="sm"
              onClick={async () => {
                await saveSettings(apiKey, model, whisperEndpoint)
                setShowSettings(false)
              }}
            >
              Save settings
            </Button>
          </DialogActions>
        </div>
      </Dialog>
    </div>
  )
}
export default SidePanelApp
