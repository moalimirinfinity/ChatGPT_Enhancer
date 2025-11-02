# GPT Enhancer

A browser extension that polishes the ChatGPT interface. It fixes mixed RTL/LTR layout issues, adds curated font control, includes custom themes, improves KaTeX handling, and lets you export conversations in multiple formats—all from a friendly popup.

## Features

- **Directional fixes** – stabilises KaTeX blocks, code snippets, and tables so mixed-language chats stay readable.
- **Fonts panel** – toggle custom English and Persian font stacks; the extension auto-detects Persian messages and applies the right typeface.
- **Themes** – apply handcrafted themes (Midnight, Aurora, Paper); the extension only enables themes that match ChatGPT’s current light/dark mode.
- **One-tap KaTeX copy** – click any KaTeX formula to copy its LaTeX.
- **Conversation export** – save the current ChatGPT conversation as PDF or DOCX via the popup.
- **In-app help** – slide-in guide (English/Farsi) that explains every toggle.

## Installation (developer mode)

1. Clone or download this repository.
2. Open Chrome (or any Chromium-based browser) and navigate to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the project folder.

The GPT Enhancer icon will appear in your toolbar. Pin it for quicker access.

## Usage

1. Open a ChatGPT conversation at [chat.openai.com](https://chat.openai.com) or [chatgpt.com](https://chatgpt.com).
2. Click the GPT Enhancer icon to open the popup.
3. Use the master toggle to enable the extension, then customise fonts, layout fixes, themes, and export options as needed.
4. For a walkthrough of every feature, tap the `?` icon in the popup to open the bilingual help panel.

> **Note:** Custom themes (Midnight/Aurora/Paper) only activate when they match ChatGPT’s current light/dark mode. The popup disables incompatible options automatically.

## Development

- The popup UI lives in `popup.html`, `popup.css`, and `popup.js`.
- Core page logic runs via `contentScript.js`.
- Export helpers are bundled in the `libs/` directory and used by `exporter.js`.

For changes:

```bash
# Install dependencies for linting/build tools if needed (not required for basic edits)
# npm install

# Reload the extension in chrome://extensions after editing files
```


## License

This project is licensed under the [CC BY-NC 4.0 License](https://creativecommons.org/licenses/by-nc/4.0/).  
You may copy and adapt it for non-commercial use with attribution.
