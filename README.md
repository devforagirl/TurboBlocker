# DNR Adblocker

DNR Adblocker is a lightweight, high-performance privacy protection extension built on the Chrome Manifest V3 architecture. It leverages the browser's native `declarativeNetRequest` API to filter network requests, ensuring a clean and fast browsing experience with minimal resource consumption.

## ✨ Key Features

- **Efficient Blocking**: Utilizes native browser APIs to intercept and block unwanted requests before they are even loaded.
- **Real-time Side Panel**: A dedicated side panel dashboard that displays live logs of blocked requests, including domains, URLs, and matched rules.
- **Custom Filtering Rules**: Empowers users to create and manage their own blocking or allow-list rules for granular control.
- **Privacy Centric**: All processing happens locally on your device. No browsing data is ever collected or uploaded.
- **Global Statistics**: Tracks the total number of blocked advertisements and trackers across all sessions.

## 🚀 Installation

1. Clone or download this repository to your local machine.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click "Load unpacked" and select the project directory.

## 🛠 Technical Implementation

- **Manifest V3**: Fully compliant with the latest Chrome extension standards.
- **declarativeNetRequest**: Used for high-performance, non-intrusive network request modification and filtering.
- **Side Panel API**: Provides a persistent interaction area that does not interfere with webpage content.
- **Storage API**: Persists user preferences, custom rules, and blocking statistics across sessions.

---

## 📝 Chrome Web Store Submission Guide (Privacy Practices)

When publishing to the Chrome Web Store, you can use the following justifications in the **Privacy practices** tab:

### Permission Justifications

| Permission | Justification |
| :--- | :--- |
| **declarativeNetRequest** | The extension's core functionality is to block advertisements and tracking scripts. This permission allows the extension to define and manage filtering rules that the browser executes efficiently to block unwanted network requests before they are loaded. |
| **declarativeNetRequestFeedback** | Used to provide real-time feedback to the user about which rules are being matched on the current page. This allows the extension to display a "blocked requests" counter and live logs in the side panel. |
| **Host Permission (`<all_urls>`)** | To provide comprehensive ad-blocking and privacy protection across the entire web, the extension needs host permissions to apply filtering rules and monitor blocked activity on all websites the user visits. |
| **sidePanel** | The side panel serves as the primary user interface. It provides a non-intrusive way for users to view blocking statistics, live logs, manage custom rules, and toggle the extension state without leaving the current tab. |
| **storage** | Required to persist user preferences (e.g., "paused" state), save custom filtering rules, and maintain cumulative statistics of blocked content across browser sessions. |

### Additional Information
- **Remote Code**: This project **does not** use any remote code. Select "No, I am not using remote code" in the developer dashboard.
- **Single Purpose Description**: A lightweight privacy protector that blocks ads and tracking scripts using native APIs with a real-time monitoring side panel.
- **Data Usage**: Certify that the extension does not collect, use, or share any user data.

---

## 📜 License

[MIT License](LICENSE)