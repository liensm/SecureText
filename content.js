// Reads text currently highlighted
function getSelectionText() {
  const selection = window.getSelection();
  return selection ? selection.toString() : "";
}

// Retrieves selected text to the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "GET_SELECTION") {
    sendResponse({ text: getSelectionText() });
    return;
  }
});
