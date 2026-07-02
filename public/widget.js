/* JAAGA X — Direct Booking Widget
 * Usage:
 *   <script async src="https://<host>/widget.js" data-jaagax-hotel="<HOTEL_ID>"></script>
 *   <div data-jaagax-book></div>
 */
(function () {
  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf("widget.js") !== -1) return scripts[i];
    }
    return null;
  })();
  if (!script) return;
  var hotelId = script.getAttribute("data-jaagax-hotel");
  var origin = new URL(script.src).origin;
  if (!hotelId) return;

  function mount() {
    var mounts = document.querySelectorAll("[data-jaagax-book]");
    mounts.forEach(function (el) {
      if (el.__jxMounted) return;
      el.__jxMounted = true;
      var btn = document.createElement("button");
      btn.textContent = "Book Direct";
      btn.style.cssText = "background:#10b981;color:#fff;border:0;padding:12px 20px;border-radius:8px;font:600 14px system-ui,sans-serif;cursor:pointer;";
      btn.onclick = openModal;
      el.appendChild(btn);
    });
  }

  function openModal() {
    var overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:999999;display:flex;align-items:stretch;justify-content:center;padding:0;";
    var iframe = document.createElement("iframe");
    iframe.src = origin + "/book/" + hotelId;
    iframe.style.cssText = "width:100%;max-width:960px;height:100%;border:0;background:#0f172a;";
    var close = document.createElement("button");
    close.textContent = "✕";
    close.style.cssText = "position:absolute;top:12px;right:16px;background:#000;color:#fff;border:0;border-radius:999px;width:36px;height:36px;font:18px system-ui;cursor:pointer;";
    close.onclick = function () { document.body.removeChild(overlay); };
    overlay.appendChild(iframe); overlay.appendChild(close);
    document.body.appendChild(overlay);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else { mount(); }
})();
