// Whisper Flow - Open-Source Voice Dictation Engine
// Provides Web Audio stream processing, Voice Activity Detection (VAD), and Whisper transcription.

export interface WhisperFlowOptions {
  onTranscript: (text: string, isFinal: boolean) => void
  onError: (error: string) => void
  onAudioLevel: (level: number) => void
  whisperEndpoint?: string
}

export class WhisperFlowEngine {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private mediaStream: MediaStream | null = null
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private recognition: any = null
  private isRunning = false
  private animFrameId: number | null = null
  private options: WhisperFlowOptions

  constructor(options: WhisperFlowOptions) {
    this.options = options
  }

  public async start(): Promise<boolean> {
    if (this.isRunning) return true

    try {
      // 1. Acquire clean audio stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      // 2. Setup Web Audio API and real-time frequency analyser
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      this.audioContext = new AudioCtx()
      const source = this.audioContext.createMediaStreamSource(this.mediaStream)
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 64
      source.connect(this.analyser)

      // Start audio level visualizer loop
      this.startAudioMeter()

      // 3. Setup MediaRecorder for audio chunk capture
      this.audioChunks = []
      try {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
        this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType })
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data)
          }
        }
        this.mediaRecorder.start(250)
      } catch (recErr) {
        console.warn('[WhisperFlow] MediaRecorder error:', recErr)
      }

      // 4. Setup continuous speech dictation stream
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition()
        this.recognition.continuous = true
        this.recognition.interimResults = true
        this.recognition.lang = 'en-US'

        this.recognition.onresult = (event: any) => {
          let interim = ''
          let final = ''

          for (let i = 0; i < event.results.length; ++i) {
            const res = event.results[i]
            if (res.isFinal) {
              final += res[0].transcript
            } else {
              interim += res[0].transcript
            }
          }

          if (final) {
            this.options.onTranscript(final.trim(), true)
          } else if (interim) {
            this.options.onTranscript(interim.trim(), false)
          }
        }

        this.recognition.onerror = (err: any) => {
          console.warn('[WhisperFlow] Stream error:', err?.error)
          if (err?.error !== 'no-speech') {
            this.options.onError(err?.error || 'Recognition error')
          }
        }

        this.recognition.start()
      }

      this.isRunning = true
      return true
    } catch (err: any) {
      console.error('[WhisperFlow] Failed to start:', err)
      this.stop()
      this.options.onError(err?.message || 'Microphone access denied')
      return false
    }
  }

  public async stop(): Promise<Blob | null> {
    this.isRunning = false

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }

    if (this.recognition) {
      try {
        this.recognition.stop()
      } catch {}
      this.recognition = null
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop()
      } catch {}
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close()
      } catch {}
      this.audioContext = null
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop())
      this.mediaStream = null
    }

    this.options.onAudioLevel(0)

    if (this.audioChunks.length > 0) {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })
      return audioBlob
    }

    return null
  }

  public getRunning(): boolean {
    return this.isRunning
  }

  private startAudioMeter() {
    if (!this.analyser) return
    const bufferLength = this.analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const updateMeter = () => {
      if (!this.isRunning || !this.analyser) return

      this.analyser.getByteFrequencyData(dataArray)
      let sum = 0
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i]
      }
      const average = sum / bufferLength
      // Normalized between 0 and 100
      const level = Math.min(100, Math.round((average / 128) * 100))
      this.options.onAudioLevel(level)

      this.animFrameId = requestAnimationFrame(updateMeter)
    }

    updateMeter()
  }

  /**
   * Optional custom Whisper API transcription (e.g. OpenAI / Groq / Local Whisper endpoint).
   */
  public static async transcribeWithWhisperApi(
    audioBlob: Blob,
    endpointUrl: string,
    apiKey?: string,
  ): Promise<string | null> {
    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'audio.webm')
      formData.append('model', 'whisper-1')

      const headers: Record<string, string> = {}
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`
      }

      const res = await fetch(endpointUrl, {
        method: 'POST',
        headers,
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        return data.text || null
      }
    } catch (err) {
      console.warn('[WhisperFlow] Remote API transcription failed:', err)
    }
    return null
  }
}
