
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if(request.action === 'openSettings') {
        let url = chrome.extension.getURL('html/app.html') + (request.hash || '');
        chrome.tabs.create({
            url: url
        })
    }
});