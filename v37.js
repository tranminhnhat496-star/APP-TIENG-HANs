/* V37 — V18.2 SCOPE BANNER FIX (18.2.0). Additive layer, loads LAST.
   The "✕ Bỏ chọn" buttons on the two scope banners looked dead: the
   scope itself was cleared, but the banner never re-rendered.
     - English Hub banner (__v17.scopeBannerHTML, rendered by renderHub
       into the hub shell, OUTSIDE #v15body): __v17.clearScope() only
       called renderTab(), which re-renders #v15body — the banner stayed.
     - Smart Learning banner (__v27.scopeBanner27): its button called
       __v15.clearScope() with NO re-render at all.
   The fixes are guarded build replacements applied by build_v37.py
   (they live in closure-local code a runtime layer cannot reach):
     R-V37-V15-RENDERHUB — window.__v15 gains renderHub:renderHub.
     R-V37-V17-CLEARSCOPE — clearScope() calls v.renderHub() (fallback
       renderTab()), so the hub shell — banner included — is rebuilt.
       renderHub() ends in renderTab(), so an active mode re-renders
       from its own state; the mode timer is a JS interval, untouched.
     R-V37-V27-RENDER — window.__v27 gains render:render.
     R-V37-V27-BANNER — the Smart banner button also calls
       window.__v27.render() after clearing (render() early-returns
       when the overlay is hidden, so it is safe).
   __v15.clearScope itself is NOT changed (shared; the fix stays local
   to each banner's handler). No new save key, no schema change, no new
   data, no logic/reward/pool/SRS change. */
(function(){
  "use strict";
  var VERSION='18.2.0';
  window.__v37={version:VERSION};
})();
