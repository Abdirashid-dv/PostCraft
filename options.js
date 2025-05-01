document.addEventListener("DOMContentLoaded", () => {
    // Load saved api key from storage
    chrome.storage.sync.get(["apiKey"], (data) => {
        if (data.apiKey) {
            document.querySelector("#api-key").value = data.apiKey;
        }
    });

    // Save api key to storage when the save button is clicked
    document.getElementById("save-button").addEventListener("click", () => {
        const apiKey = document.querySelector("#api-key").value.trim();

        if (apiKey) {
            chrome.storage.sync.set({ apiKey }, () => {
                const successMessage =
                    document.getElementById("success-message");

                successMessage.style.display = "block";

                setTimeout(() => {
                    window.close();

                    chrome.tabs.getCurrent((tab) => {
                        if (tab) {
                            chrome.tabs.remove(tab.id);
                        }
                    });
                }, 1000);
            });
        }
    });
});
