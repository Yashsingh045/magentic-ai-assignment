/**
 * AI Support — embeddable widget loader.
 *
 * Usage on a customer site:
 *   <script src="https://<frontend>/widget.js" data-org-key="PUBLIC_API_KEY"></script>
 *
 * It injects an <iframe> that loads <frontend>/widget?embed=1&key=...  The
 * iframe is a separate document → full CSS + JS isolation from the host page
 * (the host's styles/scripts can't touch the widget and vice-versa). The widget
 * inside posts its open/closed state via postMessage so we resize the iframe:
 * tiny in the corner when collapsed (so it doesn't block the page), larger when
 * open.
 */
(function () {
  "use strict";

  // Locate this very <script> tag to read its data-* attributes + origin.
  var script =
    document.currentScript ||
    (function () {
      var all = document.getElementsByTagName("script");
      for (var i = all.length - 1; i >= 0; i--) {
        if ((all[i].src || "").indexOf("widget.js") !== -1) return all[i];
      }
      return all[all.length - 1];
    })();

  var orgKey = script && script.getAttribute("data-org-key");
  if (!orgKey) {
    console.error("[ai-support-widget] Missing data-org-key on the script tag.");
    return;
  }
  // Optional backend base override (defaults to the frontend's NEXT_PUBLIC_API_URL).
  var apiBase = script.getAttribute("data-api") || "";

  // The widget is served from wherever widget.js is served from.
  var widgetOrigin;
  try {
    widgetOrigin = new URL(script.src).origin;
  } catch (e) {
    widgetOrigin = window.location.origin;
  }

  // Guard against double-inclusion.
  if (window.__aiSupportWidgetLoaded) return;
  window.__aiSupportWidgetLoaded = true;

  var src =
    widgetOrigin +
    "/widget?embed=1&key=" +
    encodeURIComponent(orgKey) +
    (apiBase ? "&api=" + encodeURIComponent(apiBase) : "");

  var iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.title = "Customer support chat";
  iframe.setAttribute("allow", "clipboard-write");
  iframe.allowTransparency = true;
  iframe.style.cssText = [
    "position:fixed",
    "bottom:0",
    "right:0",
    "border:0",
    "margin:0",
    "padding:0",
    "width:100px",
    "height:100px",
    "max-width:100vw",
    "max-height:100vh",
    "background:transparent",
    "color-scheme:normal",
    "z-index:2147483647",
    "overflow:hidden",
    "transition:width .25s ease, height .25s ease",
  ].join(";");

  var isOpen = false;

  function applySize() {
    if (isOpen) {
      iframe.style.width = Math.min(window.innerWidth, 416) + "px";
      iframe.style.height = Math.min(window.innerHeight, 720) + "px";
    } else {
      iframe.style.width = "100px";
      iframe.style.height = "100px";
    }
  }

  // Only trust messages from our widget iframe.
  window.addEventListener("message", function (event) {
    if (event.origin !== widgetOrigin) return;
    var data = event.data;
    if (!data || data.source !== "ai-support-widget") return;
    if (data.type === "state") {
      isOpen = !!data.open;
      applySize();
    }
  });

  // Keep sizing correct on viewport changes while open.
  window.addEventListener("resize", applySize);

  function mount() {
    document.body.appendChild(iframe);
  }
  if (document.body) mount();
  else
    document.addEventListener("DOMContentLoaded", mount, { once: true });
})();
