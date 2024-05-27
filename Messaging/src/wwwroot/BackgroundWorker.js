// Import for the side effect of defining a global 'browser' variable
import * as _ from "/content/Blazor.BrowserExtension/lib/browser-polyfill.min.js";

browser.runtime.onInstalled.addListener(() => {
  const indexPageUrl = browser.runtime.getURL("index.html");
  browser.tabs.create({
    url: indexPageUrl
  });
});

browser.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message.target !== "Background") {
    return false;
  }

  if (message.content === 'OPEN_OPTIONS_PAGE') {
    browser.runtime.openOptionsPage();
    sendResponse("Options page opened");

    setTimeout(() => {
      browser.runtime.sendMessage({
        target: "All",
        content: "Hello from background"
      });
    }, 3000);
  }

  return true;
})