# VoxPilot

> Local-first, voice-controlled browser co-pilot built with Manifest V3 and the ChaiUI design system for the **Beyond the Browser** hackathon track.

[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![ChaiUI Compliant](https://img.shields.io/badge/Design-ChaiUI%20Strict-orange.svg)](https://ui.chaicode.com)
[![Vite](https://img.shields.io/badge/Bundler-Vite%206-purple.svg)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/UI-React%2018%20%2B%20Tailwind-blue.svg)](https://react.dev/)
[![Download Extension](https://img.shields.io/badge/Direct%20Download-voxpilot--extension.zip-22c55e?style=flat-square&logo=googlechrome&logoColor=white)](https://github.com/VedxntDev/VoxPilot-V1/raw/main/voxpilot-extension.zip)

---

## ⚡ 1-Click Install for Google Chrome (No Terminal Required)

Want to try VoxPilot immediately? You do not need to install Node.js, clone git, or run terminal commands.

[![Download VoxPilot Extension](https://img.shields.io/badge/Download-VoxPilot%20Extension%20(.zip)-22c55e?style=for-the-badge&logo=googlechrome&logoColor=white)](https://github.com/VedxntDev/VoxPilot-V1/raw/main/voxpilot-extension.zip)

> **[👉 Click here to download voxpilot-extension.zip](https://github.com/VedxntDev/VoxPilot-V1/raw/main/voxpilot-extension.zip)** (the file will download automatically).

### How to Load in Chrome (Under 30 Seconds)

1. **Download:** Click the link above to download **`voxpilot-extension.zip`** directly to your computer.
2. **Unzip:** Double-click the downloaded zip file to extract the **`voxpilot-extension`** folder.
3. **Open Chrome Extension Settings:**
   - In Google Chrome, go to `chrome://extensions` in the address bar (or click Chrome menu > **Extensions** > **Manage extensions**).
   - Turn on the **Developer mode** toggle in the top-right corner.
4. **Load the Unpacked Folder:**
   - Click the **Load unpacked** button in the top-left corner.
   - Select the extracted **`voxpilot-extension`** folder.
5. **Open VoxPilot:**
   - Press **`Shift + ⌘ + V`** (macOS) or **`Shift + Ctrl + V`** (Windows/Linux) to open the Side Panel.
   - You can also pin VoxPilot from the puzzle icon in your Chrome toolbar.

---

## 1. Product Vision: Beyond the Browser

Traditional browser agents run inside heavy remote cloud virtual machines (VMs) or rely on slow multi-turn chat loops (*"Hey Siri... What do you want to do? ... Which tab?"*). These approaches suffer from high latency, privacy risks, and brittle navigation.

**VoxPilot** is engineered from the ground up as a native, local-first browser co-pilot that lives directly inside Google Chrome. It solves three fundamental problems:

1. **One-Shot, Interruptible Voice Experience:**
   - Users issue complete single-breath instructions (for example: *"Hey Vox, clear my shopping history from the last hour and open Wordle"*).
   - Fast push-to-talk shortcut (`Shift+Cmd+V` on macOS, `Shift+Ctrl+V` on Windows/Linux) designed for noisy hackathon venues.
   - Hardware-level barge-in: speaking while text-to-speech (TTS) is playing immediately cancels audio synthesis so the assistant never talks over you.
   - Routine actions execute silently; voice output is reserved strictly for emergency blockers or required user confirmations.
2. **Two-Speed Hybrid Router:**
   - **Local Fast-Path (<150 ms):** Deterministic parser inside the extension for immediate browser actions without waiting for an LLM network roundtrip.
   - **LLM Slow-Path (Structured Tool Calling):** Multi-step, selective, and cross-tab reasoning routed to Google Gemini with strict JSON tool schemas.
3. **Three-Tier Autonomy and Voice-to-Visual Complication Handoff:**
   - Reversible tasks execute instantly.
   - Destructive operations require scoped confirmation with exact item counts and type-to-confirm safety.
   - CAPTCHAs, 2FA prompts, login gates, and payments automatically pause execution, highlight the exact blocking DOM element with a visual spotlight on the webpage, and await human resolution before resuming.

---

## 2. How the Models and Routing Work

```
                              [ User Voice / Text Input ]
                                           │
                                           ▼
                            [ Whisper Flow Audio Engine ]
                       (VAD + Web Audio Analyser + Streaming)
                                           │
                                           ▼
                                [ Normalised Command ]
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                             │
         [ Local Fast-Path Router ]                      [ LLM Slow-Path Router ]
           Execution time: <150 ms                        Execution time: 800 - 1500 ms
                    │                                             │
     • Instant Domain Nav (msrit.edu)              • Semantic Intent Analysis
     • YouTube Creator (@MrBeast)                  • Scoped History Deletion
     • Tab Deduplication & Switching               • Multi-Tab Comparison
     • Media Controls (Mute/Unmute)                • DOM Summarization
     • Tab Lifecycle (Close Tab)                   • Visual Complication Trigger
                    │                                             │
                    └──────────────────────┬──────────────────────┘
                                           │
                                           ▼
                             [ Three-Tier Autonomy Engine ]
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              │                            │                            │
      [ Tier 1: Instant ]         [ Tier 2: Scoped ]          [ Tier 3: Handoff ]
     • Non-destructive actions   • History deletion          • CAPTCHA challenge
     • Tab switching & opening   • Mass tab closing          • 2FA verification
     • Direct audio feedback     • Item impact count         • Payment authorization
                                 • Safe cancel focus         • DOM spotlight overlay
                                 • Type-to-confirm           • "Resume agent" CTA
```

### 2.1 The Two-Speed Hybrid Routing Strategy

Running an LLM for simple actions like "open history", "switch tab", or "mute youtube" introduces 1.5 to 3 seconds of cloud latency for deterministic operations. VoxPilot implements a two-speed architecture:

#### Speed 1: Local Fast-Path Router (`src/fastPathRouter.ts`)
- **Latency:** Less than 150 milliseconds.
- **Execution:** Runs entirely within the browser sandbox using JavaScript string evaluation and regular expressions. Zero cloud API calls and zero token consumption.
- **Direct Domain Navigation:** Detects top-level domains (`.edu`, `.com`, `.org`, `.in`, `.net`, `.io`) via `DOMAIN_REGEX`. Saying *"open msrit.edu"* or *"msrit.edu"* navigates directly to `https://www.msrit.edu` instead of polluting search engines.
- **Smart App and Channel Resolvers:** Knows creator handles (e.g. `mrbeast` maps to `https://www.youtube.com/@MrBeast`) and standard apps (GitHub, Google, Spotify, Netflix).
- **Tab Deduplication:** Scans open tabs across all Chrome windows with `chrome.tabs.query`. If Wordle or YouTube is already open, it switches focus to the existing tab instead of creating clutter.

#### Speed 2: LLM Slow-Path Router (`src/llmOrchestrator.ts`)
- **Model:** Google Gemini (`gemini-2.0-flash` or `gemini-1.5-flash`), with user-configured API keys stored locally in `chrome.storage.local`.
- **Purpose:** Complex reasoning, selective filters, cross-tab comparisons, and multi-step workflows.
- **Structured Tool Calling:** Uses defined JSON schemas for tool invocation:
  - `delete_scoped_history`: Scans browsing history records with start time filters and keyword sets (e.g. amazon, ebay, shopping, checkout), counts matching items, and prepares Tier 2 scoped deletion payloads.
  - `compare_tabs`: Inspects the last N active tabs, extracts key titles, prices, and specifications, and generates a structured side-by-side comparison.
  - `summarize_page`: Receives distilled semantic accessibility nodes from the active tab and generates concise takeaways.

---

## 3. Voice Engine: Whisper Flow Architecture

VoxPilot features **Whisper Flow** (`src/whisperFlow.ts`), an open-source voice dictation and audio capture architecture designed for Chrome extensions:

```
[ Microphone Stream ]
         │
         ├──> [ Web Audio AnalyserNode ] ──> [ Live Audio Visualizer Bars ]
         │      (Real-time FFT Energy)
         │
         ├──> [ Voice Activity Detection ] ──> [ Auto-Endpoint Detection ]
         │      (VAD Silence Filter)
         │
         └──> [ Streaming Dictation Engine ] ──> [ Interim & Final Transcript ]
```

### Voice Components:
1. **Real-Time Soundwave Visualizer:** Connects the microphone input to a Web Audio `AudioContext` and `AnalyserNode` (`fftSize = 64`), calculating real-time frequency distribution to drive the pulsating ChaiUI audio bars.
2. **Voice Activity Detection (VAD):** Monitors audio energy levels to detect speech start and automatically finalize dictation when the user stops speaking.
3. **One-Time Microphone Permission Handler (`permission.html`):** In Chrome MV3, Side Panels cannot always show browser permission bubbles directly. VoxPilot provides an automated helper tab that requests microphone access and automatically closes once granted, giving the extension origin permanent access.
4. **Custom Whisper API Integration:** Settings include a `Whisper Endpoint URL` field allowing users to connect local Whisper servers (such as Whisper.cpp, faster-whisper, Ollama) or cloud Whisper APIs.
5. **Hardware Barge-In:** While TTS feedback is speaking, detecting user speech immediately triggers `window.speechSynthesis.cancel()`, allowing immediate interruption.

---

## 4. Security and Privacy Boundaries

1. **PII and Sensitive Data Stripping (`src/semanticDom.ts`):**
   - The DOM distiller removes all `<input type="password">`, credit card numbers, CVVs, expiration dates, and social security numbers before generating any accessibility snapshot.
   - Text patterns matching 16-digit credit cards or JSON Web Tokens (JWT) are redacted with `[REDACTED_CONFIDENTIAL]`.
2. **Indirect Prompt Injection Defense:**
   - Webpage DOM content is treated as strictly untrusted external data.
   - DOM text is never concatenated directly into tool execution commands, preventing malicious webpage text from triggering unauthorized destructive operations.
3. **Least Privilege MV3 Permissions:**
   - Uses only necessary Chrome permissions: `tabs`, `activeTab`, `history`, `browsingData`, `sidePanel`, `offscreen`, `storage`, `scripting`.

---

## 5. Three-Tier Autonomy and Complication Handoff

VoxPilot introduces a structured three-tier execution hierarchy to ensure user safety and control:

| Tier | Level | Examples | Behavior |
| :--- | :--- | :--- | :--- |
| **Tier 1** | **Instant** | Switch tab, open Wordle, mute YouTube, summarize page | Executes immediately and silently without interruption. |
| **Tier 2** | **Scoped Confirm** | Delete shopping history, close background tabs | Inspects exact count of affected items first. Displays modal with safe Cancel button focused first. Audio alerts user to confirm. Full history wipes require typing `DELETE`. |
| **Tier 3** | **Visual Handoff** | CAPTCHAs, 2FA verification, login walls, payments | Pauses agent execution, injects a red spotlight overlay onto the blocking DOM element, announces the blocker aloud, and provides a "Resume agent" button. |

### Visual Complication Handoff in Action
When automation hits a CAPTCHA challenge (Cloudflare Turnstile, reCAPTCHA) or an authentication gate:
1. The agent halts and announces aloud why human input is required.
2. An overlay is injected into the active webpage with a red spotlight outline around the target element (`data-vox-id`).
3. Once the user completes the manual step, clicking **Resume agent** in the Side Panel signals the orchestrator to continue remaining tasks.

---

## 6. Strict ChaiUI Design System Compliance

VoxPilot strictly adheres to the **ChaiUI** design specification:

- **Registry Configuration:** Configured in `components.json` with `"registries": { "@chaiui": "https://ui.chaicode.com/r/{name}.json" }`.
- **Dark Mode Default:** Surfaces use `oklch(0.145 0 0)` (`#0a0a0a`), near-white text, and neutral grey borders.
- **Highlight Cream Accent:** Highlight cream (`orange-100` in dark mode, `yellow-800` in light mode) is applied exclusively to text highlights.
- **Zero Orange Fills:** Absolutely no orange fills (`bg-orange-*` or `#FF7D0C`) on buttons, cards, progress bars, or badges. Orange is restricted to the wordmark dot.
- **Zero Box-Shadows:** All cards and panels use `box-shadow: none !important` with faint glass fills (`card-fill`) and hairline borders (`card-edge`).
- **Asymmetric Corners:**
  - Primary solid button: Asymmetric diagonal corners (`rounded-none rounded-tr-lg rounded-bl-lg`) with `ArrowUpRight` icon.
  - Secondary outline button: Mirrored asymmetric corners (`rounded-none rounded-tl-lg rounded-br-lg`).
  - Danger button: Red fill permitted only inside destructive confirm dialogs.
- **Typography:** `Manrope` for UI, `Montserrat` for card titles and highlights, and `Onest` for the wordmark.
- **Copy Standards:** Zero em dashes anywhere in UI text and labels.

---

## 7. Developer Build Guide (Optional)

If you wish to modify the code or compile from source:

### Prerequisites
- Node.js 18+ (tested on Node v24)
- Google Chrome (version 116+ supporting `chrome.sidePanel`)

### Setup and Build

```bash
# Clone the repository
git clone https://github.com/VedxntDev/VoxPilot-V1.git
cd VoxPilot-V1

# Install dependencies
npm install

# Build production extension
npm run build
```

The compiled extension is output to the `dist/` directory, ready to be loaded via **Load unpacked** in `chrome://extensions`.

---

## 8. Example Voice Commands

### Instant Fast-Path (Completely Silent)
- *"Open Wordle"* (switches if already open, else launches)
- *"Open MrBeast YouTube channel"* (navigates directly to `https://www.youtube.com/@MrBeast`)
- *"Open msrit.edu"* (direct domain resolution to Ramaiah Institute of Technology)
- *"Open history"*
- *"Mute YouTube"* / *"Mute current tab"*
- *"Close current tab"*

### Scoped Tier 2 Operations (Audio Alert & Confirmation)
- *"Delete my shopping history from the last hour"*
- *"Close all other tabs"*
- *"Clear all history"* (requires typing `DELETE` to confirm)

### Complex Tier 3 Workflows (DOM Spotlight Handoff)
- *"Open msrit.edu and login in student information system"* (opens portal and triggers login handoff)
- *"Demo complication at checkout"* (simulates CAPTCHA blocker and injects DOM spotlight)

---

## 9. License

MIT License. Built for the Google Chrome Extensions Hackathon.
