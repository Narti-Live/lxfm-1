// SPDX-License-Identifier: GPL-3.0-only
// LXFM-1's web flasher: Hortator's installer page logic (web/index_pkg.html, Leo Kuroshita / Hügelton Instruments,
// DeadActive) on fm1ota.js / fm1pkg.js, without the install counter.
import { Updater } from "./fm1ota.js";
import { productOf, logicalImage } from "./fm1pkg.js";

const meta = { pkg: "downloads/LXFM-1-1.4.fwsc", version: "1.4", product: "FM-1_900" };
const $ = (id) => document.getElementById(id);
const T = {
  nomidi: "This browser cannot install firmware. Open the page in Chrome or Edge on a computer.",
  loadfail: "Could not load the firmware: ", badpkg: "The firmware file is damaged. Reload the page.",
  start: "Starting", verify: "Verifying", loader: "Switching to update mode", write: "Writing",
  reboot: "Restarting", done: "Done. The FM-1 restarts with LXFM-1.",
  stopped: "Stopped. Replug the USB cable and press Install again.", error: "Error: ",
  denied: "MIDI (SysEx) access was not allowed. Allow MIDI in the site settings (address bar) and press Install again.",
  notfound: "FM-1 not found. Check the USB cable (a data cable), close other apps that use MIDI, and press Install again.",
  model: "The connected device is not an FM-1.",
  lost: "The USB connection was lost. Replug it and press Install again.",
  noloader: "The FM-1 in update mode was not found. Replug the USB cable and press Install again (it stays in update mode until it is finished).",
  noreturn: "The FM-1 did not come back. Power-cycle it.",
  mismatch: "Written, but the FM-1 reports another version: ",
  leave: "Writing. Do not close the page.",
};
const sayK = (k, arg = "") => { $("status").textContent = T[k] + arg; };
const say = (txt) => { $("status").textContent = txt; };
const log = (t) => { $("log").textContent += t + "\n"; };
let image = null, writing = false;

window.addEventListener("beforeunload", (e) => { if (writing) { e.preventDefault(); e.returnValue = T.leave; } });

(async () => {
  if (!navigator.requestMIDIAccess) { sayK("nomidi"); return; }
  try {
    const r = await fetch(meta.pkg);
    if (!r.ok) throw new Error(`${meta.pkg}: HTTP ${r.status}`);
    const pkg = new Uint8Array(await r.arrayBuffer());
    if (productOf(pkg) !== meta.product) { sayK("badpkg"); return; }
    image = logicalImage(pkg);
    say(`LXFM-1 ${meta.version} ready`);
    $("go").disabled = false;
  } catch (e) { sayK("loadfail", e.message); }
})();

$("go").addEventListener("click", async () => {
  $("go").disabled = true;
  let midi;
  try { midi = await navigator.requestMIDIAccess({ sysex: true }); }
  catch (e) { sayK("denied"); $("go").disabled = false; return; }
  writing = true;
  try {
    const up = new Updater(midi, log);
    const total = 74 + 1167;
    const step = (k, a) => {
      log(`${k} ${a ?? ""}`);
      if (k === "start") sayK("start");
      if (k === "verify") { sayK("verify"); $("bar").value = (a / total) * 100; }
      if (k === "loader") sayK("loader");
      if (k === "write") { sayK("write"); $("bar").value = ((74 + a) / total) * 100; }
      if (k === "reboot") sayK("reboot");
      if (k === "done") { $("bar").value = 100; sayK("done"); }
    };
    const ota = await up.find((id) => /^ota-/i.test(id.model));
    if (ota) {
      ota.link.close();
      sayK((await up.resume(image, step, meta.product)) ? "done" : "stopped");
    } else {
      await up.install(image, meta.product, step);
    }
  } catch (e) {
    if (e && e.code && T[e.code]) sayK(e.code, e.detail || "");
    else sayK("error", e && e.message);
    log(String(e && e.stack || e));
  }
  writing = false;
  $("go").disabled = false;
});
