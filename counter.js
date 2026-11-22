// Visit counter (Abacus, https://abacus.jasoncameron.dev). No cookies, no personal data.
// "visits": once per browser session. "visitors": once per browser, ever.
(function () {
  var NS = "narti-live-lxfm1";
  var API = "https://abacus.jasoncameron.dev/hit/" + NS + "/";
  function hit(key) { try { fetch(API + key, { mode: "cors" }).catch(function () {}); } catch (e) {} }
  var page = location.pathname.indexOf("flash") >= 0 ? "flash" : "home";
  try {
    if (!sessionStorage.getItem("lx_v_" + page)) { sessionStorage.setItem("lx_v_" + page, "1"); hit(page + "-visits"); }
    if (!localStorage.getItem("lx_u")) { localStorage.setItem("lx_u", "1"); hit("visitors"); }
  } catch (e) { hit(page + "-visits"); }
})();
