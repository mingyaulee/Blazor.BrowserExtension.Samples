if (globalThis.BlazorBrowserExtension.BrowserExtension.Mode === globalThis.BlazorBrowserExtension.Modes.ContentScript) {
  const appDiv = document.createElement("div");
  appDiv.id = "SidebarUsingContentScriptsSampleApp";
  document.body.appendChild(appDiv);
}