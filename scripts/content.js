chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_POST_CONTENT") {
        const content = getSelectedContent();
        sendResponse({ content: content || "No content found" });
    }
    return true;
});

function getSelectedContent() {
    const selection = window.getSelection();
    const selectedText = selection.toString();

    if (selectedText) {
        return selectedText;
    }

    return "No text selected";
}
