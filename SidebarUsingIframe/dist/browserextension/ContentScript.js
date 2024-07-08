(async function () {
  // @ts-ignore JS is not a module
  await (globalThis.importProxy ?? (m => import(m)))("./content/Blazor.BrowserExtension/lib/browser-polyfill.min.js");

  // Define a unique ID to know you are interacting with your own extension
  const extensionAppId = "abc";

  // Inject iframe into the current tab
  const url = browser.runtime.getURL("contentscript.html");
  const appDiv = document.createElement("div");
  appDiv.dataset.extensionAppId = extensionAppId;
  appDiv.classList.add("hidden");
  document.body.appendChild(appDiv);
  const iframe = document.createElement("iframe");
  iframe.src = url;
  appDiv.appendChild(iframe);

  // Communicate with the iframe to know what is the current state
  const messagingEvent = {
    post: (data) => {
      data.extensionAppId = extensionAppId;
      iframe.contentWindow.postMessage(data, "*");
    },
    listen: (handler) => {
      const extensionOrigin = url.replace("/contentscript.html", "");
      window.addEventListener("message", (event) => {
        if (event.origin == extensionOrigin && event.data && event.data.extensionAppId == extensionAppId) {
          handler(event.data);
        }
      });
    }
  };

  let isLoaded = false;
  const messageHandler = (data) => {
    if (!isLoaded) {
      isLoaded = true;
      appDiv.classList.remove("hidden");
    }

    if (data.isCollapsed === true) {
      appDiv.classList.add("sidebar-collapsed");
    } else if (data.isCollapsed === false) {
      appDiv.classList.remove("sidebar-collapsed");
    }

    if (data.requestForData === true) {
      const dataToSend = [...document.querySelectorAll("main h1, main h2, main h3")].map(header => {
        return {
          tag: header.tagName,
          text: header.textContent
        }
      });

      messagingEvent.post({
        headersData: dataToSend
      });
    }
  };
  messagingEvent.listen(messageHandler);
})();