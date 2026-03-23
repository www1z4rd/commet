# Commet Extension

**Chrome Download:** https://chromewebstore.google.com/detail/ndefpfmjimgimojopdncpkpifnfjffoi

Commet is a browser extension that finds Reddit and Hacker News posts for the current URL and shows them in the extension popup. Useful for finding Reddit and Hacker News threads that link to the current URL without searching.

Commet is free, open source, and collects no user data.

## Permission Justification

**tabs:** Reads the active tab’s URL when the popup is opened to look up Reddit and Hacker News posts for that URL.

**storage:** Stores extension options and a short-lived cache of results to avoid re-fetching on every popup open.

**webNavigation:** Detects tab changes and navigation to refresh the toolbar icon (colored when there are discussions for the current URL, grey when there are none).

## Screenshot

<img src="https://raw.githubusercontent.com/www1z4rd/commet/refs/heads/main/promo/screenshot-2.png" alt="Screenshot" />

## Run Locally

1. Clone this repository to your local machine.
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable 'Developer mode' (toggle in the upper-right corner).
4. Click 'Load unpacked'.
5. Select the Commet folder.
