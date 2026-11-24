# VoxPilot

> Wake-word, voice-first Chrome extension that automates everyday browsing, media, messaging, and cross-tab comparisons natively inside your browser. Built with Manifest V3 and the ChaiUI design system.

[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![ChaiUI Compliant](https://img.shields.io/badge/Design-ChaiUI%20Strict-orange.svg)](https://ui.chaicode.com)
[![wHACKiest 2026](https://img.shields.io/badge/Hackathon-wHACKiest%202026%20Ideathon-red.svg)](https://msrit.edu)
[![Track](https://img.shields.io/badge/Track-Track%202%20(Beyond%20the%20Browser)-orange.svg)](https://msrit.edu)
[![Team](https://img.shields.io/badge/Team-Jupiter2011-yellow.svg)](https://github.com/VedxntDev/VoxPilot-V1)
[![Download Extension](https://img.shields.io/badge/Direct%20Download-voxpilot--extension.zip-22c55e?style=flat-square&logo=googlechrome&logoColor=white)](https://github.com/VedxntDev/VoxPilot-V1/raw/main/voxpilot-extension.zip)

---

## 🏆 Hackathon Submission Profile

- **Event:** wHACKiest 2026 Online Ideathon (26–27 Nov 2026)
- **Organizer:** Department of Computer Science and Engineering & CodeRIT, Ramaiah Institute of Technology
- **Track:** Track 2: Beyond the Browser
- **Team Name:** Jupiter2011
- **Institution:** Ramaiah Institute of Technology (MSRIT), Bengaluru
- **Team Members:**
  - **Vasu Arora** (Lead) | USN: `1MS25CY069`
  - **Vedant Singh Baghel** | USN: `1MS25CY070`
  - **Dhaval Singh** | USN: `1MS25CY068`

---

## ⚡ 1-Click Install for Google Chrome (No Terminal Required)

Want to try VoxPilot immediately? You do not need to install Node.js, clone git, or run terminal commands.

[![Download VoxPilot Extension](https://img.shields.io/badge/Download-VoxPilot%20Extension%20(.zip)-22c55e?style=for-the-badge&logo=googlechrome&logoColor=white)](https://github.com/VedxntDev/VoxPilot-V1/raw/main/voxpilot-extension.zip)

> **[👉 Click here to download voxpilot-extension.zip](https://github.com/VedxntDev/VoxPilot-V1/raw/main/voxpilot-extension.zip)** (the file downloads automatically).

### How to Load in Chrome (Under 30 Seconds)

1. **Download:** Click the badge above to download **`voxpilot-extension.zip`** directly to your computer.
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

## 1. Problem Statement

Everyday web browsing still forces users into slow, manual, mouse-and-keyboard micro-tasks: making simple multi-step actions, tab comparisons, and hands-free control tedious and inaccessible.

### Who It Affects and How Many
- **3.8 billion Google Chrome users** (68% of the global browser market).
- Multitaskers, students, developers, online shoppers, and users with motor impairments or Repetitive Strain Injury (RSI) who struggle with continuous clicking and typing.

### Why It Matters
- **1,200 App Switches per Day:** According to research published in the *Harvard Business Review*, the average digital worker switches between applications and websites approximately 1,200 times daily.
- **40% Lost Productivity:** Frequent context-switching and micro-navigation can drain up to 40% of productive working hours.

### Existing Solutions and Their Gaps
- **Remote Cloud Agents (Grok Bot, ChatGPT Agent Mode):** Slow (2 to 5 second network latency), paid, text-only, and host browser sessions inside remote virtual machines (VMs) that compromise privacy and break local session cookies.
- **Standalone AI Browsers (Perplexity Comet):** Force users to abandon Google Chrome, lose their extensions, and still rely primarily on typing.
- **Voice Assistants (Siri, Alexa):** Lack accessibility hooks into Chrome tabs, DOM elements, or web media players.

---

## 2. Proposed Solution: VoxPilot

**VoxPilot** is a wake-word, voice-first Chrome extension that automates everyday browsing, media playback, messaging, and cross-tab comparisons natively inside your browser.

```
Say "Hey Vox" / Hotkey (Shift+Cmd+V)
               │
               ▼
       Speak Browser Task
               │
               ▼
┌───────────────────────────────┐
│     Two-Speed Hybrid Router   │
├───────────────┬───────────────┤
│   Fast-Path   │ AWS Bedrock   │
│   (<150 ms)   │ (Nova 2 Lite) │
└───────┬───────┴───────┬───────┘
        │               │
        ▼               ▼
┌───────────────────────────────┐
│       Chrome Native Action    │
│  (tabs, media, DOM, history)  │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│  Side Panel Results Table &   │
│  ElevenLabs Spoken Alerts     │
│  (Muted for routine actions)  │
└───────────────────────────────┘
```

### 4 Core Hackathon Workflows

1. **Hands-Free Micro-Controls:**
   - Instant voice actions for tab switching, history lookups, Wordle, and YouTube media playback.
   - Example commands: *"play latest Sidemen video"*, *"skip ad"*, *"pause video"*, *"mute YouTube"*.
2. **Cross-Tab Comparison:**
   - Reads open product tabs in parallel using Amazon Nova 2 Lite.
   - Evaluates key features, pricing, and specs, speaking a quick verdict and rendering an interactive side-by-side table in the Side Panel.
3. **Universal Web Navigation:**
   - Multi-step DOM agent navigating complex interfaces (WhatsApp Web, Instagram chats, MSRIT Student Academic Portal `parents.msrit.edu`) without per-site hardcoded selectors.
4. **Smart Safety Guardrails & Complication Handoff:**
   - Verbal confirmation gates before executing destructive operations (clearing history, mass closing tabs).
   - Visual spotlight overlay handoff for CAPTCHAs, two-factor authentication, and payment gates.

---

## 3. System Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                   LOCAL CLIENT (Google Chrome MV3)                     │
│                                                                        │
│  ┌───────────────────────┐              ┌───────────────────────────┐  │
│  │   Chrome Side Panel   │              │   Whisper Flow Audio /    │  │
│  │  (ChaiUI Design Sys)  │◄────────────►│      Web Speech API       │  │
│  └───────────┬───────────┘              └─────────────┬─────────────┘  │
│              │                                        │                │
│              ▼                                        ▼                │
│  ┌───────────────────────┐              ┌───────────────────────────┐  │
│  │   Fast-Path Router    │              │    Semantic DOM Agent     │  │
│  │  (<150ms Local Logic) │              │ (content.js + PII Redact) │  │
│  └───────────┬───────────┘              └─────────────┬─────────────┘  │
│              │                                        │                │
│              ▼                                        │                │
│  ┌───────────────────────┐                            │                │
│  │  chrome.storage.local │                            │                │
│  │  (100% Private State) │                            │                │
│  └───────────────────────┘                            │                │
└──────────────────┬────────────────────────────────────┼────────────────┘
                   │ (Complex Tasks Only)               │
                   ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               STATELESS CLOUD PROXY (AWS Serverless)                   │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │             AWS Lambda Function (Node.js + Function URL)          │  │
│  │        Stateless proxy: Secures keys; stores 0 cookies/logins    │  │
│  └──────────────────┬─────────────────────────────┬─────────────────┘  │
│                     │                             │                    │
│                     ▼                             ▼                    │
│  ┌──────────────────────────────────┐ ┌─────────────────────────────┐  │
│  │  Amazon Bedrock (Nova 2 Lite)    │ │   ElevenLabs Streaming API  │  │
│  │  Fast reasoning and tool-calling │ │   (Flash v2.5 / v4 Turbo)   │  │
│  └──────────────────────────────────┘ └─────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Layer | Technology | Role in VoxPilot |
| :--- | :--- | :--- |
| **Frontend UI** | Chrome MV3 Side Panel API, React 18, Tailwind CSS | Stays alive across tabs; provides persistent mic host and ChaiUI cards. |
| **Styling & Theme** | Strict ChaiUI (`@chaiui`) | Dark mode default (`#0a0a0a`), cream highlight, zero orange fills, zero box-shadows. |
| **Local Router** | TypeScript (`src/fastPathRouter.ts`) | Sub-150ms execution for tabs, media micro-controls, and direct domains. |
| **Cloud Proxy** | AWS Lambda (Node.js + Function URL) | Stateless proxy securing API credentials with zero cloud storage of user cookies. |
| **AI Reasoning** | Amazon Bedrock (`amazon.nova-lite-v1:0`) & Google Gemini | Multi-step DOM planning, structured tool calling, and cross-tab analysis. |
| **Voice Dictation** | Whisper Flow & Web Speech API | Dual-mode STT with Web Audio FFT real-time soundwave visualizer and VAD. |
| **Voice Synthesis** | ElevenLabs Flash v2.5 / Web Speech TTS | Natural audio alerts restricted strictly to Tier 2 and Tier 3 safety events. |
| **Local Storage** | `chrome.storage.local` | 100% on-device preferences, custom routines, and API credentials. |

---

## 4. Competitive Matrix

| Feature / Capability | VoxPilot (Team Jupiter2011) | Grok Bot / Cloud Agents | Perplexity Comet | Siri / Apple Intelligence |
| :--- | :--- | :--- | :--- | :--- |
| **Lives Natively in Chrome** | Yes (Side Panel MV3) | No (Remote VM) | No (Separate Browser) | No (OS-level widget) |
| **Fast-Path Latency** | **< 150 ms** (Local) | 2000 - 5000 ms | 1500 - 3000 ms | N/A |
| **Cross-Tab Product Comparison** | **Yes** (Side-by-side table) | Limited | No | No |
| **Media Micro-Controls (Skip Ad, Pause)** | **Yes** (Native YouTube DOM) | No | No | Play/Pause only |
| **Interruptible Voice (Barge-In)** | **Yes** (Instant cancel) | No | No | Basic |
| **Privacy / Cookie Security** | **100% On-Device** | Remote Cloud VM | Cloud Browser | Cloud Aggregation |
| **Complication Handoff (CAPTCHA/2FA)** | **Yes** (Visual spotlight) | Fails / Aborts | Manual Switch | No |
| **Cost to User** | **Free / Open Source** | $20 - $30/month | Subscription | Device Gated |

---

## 5. Three-Tier Autonomy & Safety Architecture

VoxPilot categorizes every browser action into a three-tier safety model:

```
                            [ User Instruction ]
                                      │
               ┌──────────────────────┼──────────────────────┐
               │                      │                      │
               ▼                      ▼                      ▼
      [ Tier 1: Instant ]     [ Tier 2: Scoped ]     [ Tier 3: Handoff ]
      • Tab switching         • Clear history        • Cloudflare Turnstile
      • Play / pause video    • Mass tab closing     • Bank 2FA prompt
      • Skip YouTube ad       • Send message         • Portal login gate
      • Navigate domain       • Item impact count    • Payment checkout
      • Compare open tabs     • Safe cancel focus    • DOM spotlight injected
      • Completely silent     • Type "DELETE"        • Verbal complication alert
      • Zero latency          • Audio confirmation   • "Resume agent" button
```

### Tier Details

1. **Tier 1: Instant Local Autonomy (Silent Execution)**
   - Used for read-only, non-destructive, or easily reversible actions.
   - Media controls, tab switching, direct domain navigation (`msrit.edu`), and cross-tab analysis execute instantly without robotic voice chattiness.
2. **Tier 2: Scoped Confirmation (Verbal Alert + Safe Focus)**
   - Used for destructive operations (e.g. clearing shopping history from the past hour).
   - Inspects affected records first and opens a confirmation modal displaying the exact item count.
   - The safe "Cancel" button is focused by default to prevent accidental trigger on Enter. Full history purges require typing `DELETE`. Spoken feedback alerts the user.
3. **Tier 3: Visual Complication Handoff (DOM Spotlight)**
   - When automation encounters a CAPTCHA, two-factor authentication prompt, login screen, or payment authorization:
     - The agent halts execution.
     - Spoken feedback alerts the user why intervention is needed.
     - A clean red spotlight overlay is injected onto the webpage around the blocking DOM node (`data-vox-id`).
     - Once the user completes the action, clicking **Resume agent** in the Side Panel allows the co-pilot to finish remaining steps.

---

## 6. Business Model & Market Impact

### Market Opportunity
- **Target Audience:** 3.8 billion Chrome users worldwide, focusing initially on students, online shoppers, developers, multitaskers, and accessibility users.
- **Problem Size:** Context-switching costs knowledge workers up to 40% of their daily productive capacity (Harvard Business Review).

### Revenue Model (Freemium + B2B)
- **Free Tier:** Unlimited local Fast-Path commands (zero server cost) + 50 daily cloud AI/voice tasks.
- **Pro Tier ($4.99/mo):** Unlimited Amazon Bedrock reasoning, custom ElevenLabs streaming voices, and multi-step routines.
- **B2B Enterprise:** Custom voice automation plugins for enterprise CRM, customer support desks, and university academic portals.
- **Unit Economics:** 80%+ gross margins on Pro subscriptions due to sub-150ms local execution handling the vast majority of daily commands.

### Go-To-Market Strategy
- Distribution via the **Chrome Web Store** and Product Hunt.
- Viral short-form video campaigns showcasing "Eating Mode" (browsing, eating, and shopping without touching the keyboard).
- Campus launch at **Ramaiah Institute of Technology (MSRIT)** developer and student communities.

---

## 7. Strict ChaiUI Compliance Audit

VoxPilot strictly implements the **ChaiUI** (`@chaiui`) design rules:

- **Component Registry:** Configured in `components.json` with `"@chaiui": "https://ui.chaicode.com/r/{name}.json"`.
- **Theme Palette:** Dark mode default using `oklch(0.145 0 0)` (`#0a0a0a`), near-white typography, and neutral grey borders (chroma 0).
- **Cream Highlights:** Highlight cream (`orange-100` in dark mode, `yellow-800` in light mode) applied strictly to highlight phrases and active badges.
- **Zero Orange Fills:** Strictly zero `bg-orange-*` or `#FF7D0C` fills on buttons, cards, progress bars, or status pills.
- **Zero Box-Shadows:** All cards and dialogs utilize hairline neutral borders (`border-card-edge`) with `box-shadow: none !important`.
- **Asymmetric Buttons:**
  - Primary solid button: Diagonal asymmetric corners (`rounded-none rounded-tr-lg rounded-bl-lg`) with `ArrowUpRight` icon.
  - Secondary outline button: Mirrored asymmetric corners (`rounded-none rounded-tl-lg rounded-br-lg`).
  - Danger button: Red fill allowed strictly within Tier 2 destructive confirmation dialogs.
- **Typography:** `Manrope` for interface text, `Montserrat` for card titles, and `Onest` for the VoxPilot wordmark.
- **Copy Restrictions:** Strictly zero em dashes in all UI strings, labels, and documentation.

---

## 8. Development & Build Commands

If you want to build VoxPilot from source:

```bash
# Clone the repository
git clone https://github.com/VedxntDev/VoxPilot-V1.git
cd VoxPilot-V1

# Install dependencies
npm install

# Run TypeScript type check
npx tsc --noEmit

# Compile production bundle for Chrome MV3
npm run build
```

The compiled extension files are output to `dist/`, ready to be loaded via **Load unpacked** in `chrome://extensions`.

---

## 9. Example Spoken Voice Commands

| Category | Example Voice Command | Action Taken |
| :--- | :--- | :--- |
| **Media Micro-Control** | *"Play latest Sidemen video"* | Launches YouTube search for latest Sidemen video. |
| **Media Micro-Control** | *"Skip ad"* | Executes script on active YouTube tab clicking the skip button. |
| **Media Micro-Control** | *"Pause video"* | Sends pause event to HTML5 video element on audible tab. |
| **Direct Navigation** | *"Open msrit.edu"* | Directly loads `https://www.msrit.edu` (no search redirect). |
| **Student Portal** | *"Open parents.msrit.edu"* | Navigates to MSRIT SIS and triggers Tier 3 login handoff. |
| **Tab Comparison** | *"Compare products in last 3 tabs"* | Extracts specs from open product tabs and renders side-by-side table. |
| **Tab Deduplication** | *"Open Wordle"* | Focuses existing Wordle tab if open; opens new tab if not. |
| **Scoped History** | *"Delete shopping history from last hour"* | Queries history for store items, shows item count, awaits confirmation. |
| **Complication Demo** | *"Demo complication at checkout"* | Simulates CAPTCHA blocker and injects red DOM spotlight. |

---

## 10. Team & Contact

**Team Jupiter2011**  
Department of Computer Science and Engineering  
Ramaiah Institute of Technology, Bengaluru  

- **Vasu Arora** (`1MS25CY069`) - Lead Architecture & Voice Engine  
- **Vedant Singh Baghel** (`1MS25CY070`) - Chrome MV3 Core & ChaiUI Systems  
- **Dhaval Singh** (`1MS25CY068`) - Bedrock LLM Orchestration & Evaluation  

GitHub Repository: [https://github.com/VedxntDev/VoxPilot-V1](https://github.com/VedxntDev/VoxPilot-V1)  
License: MIT License. Developed for wHACKiest 2026 Online Ideathon.
