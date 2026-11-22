(function () {
  var V = ["KICK", "TOM", "CHORD", "SNARE", "RIDE", "CL HH", "OP HH", "CLAP"];
  var P = [[0, 4, 8, 12], [6], [3, 11], [12], [2, 6, 10, 14], [2, 5, 6, 9, 10, 13, 14, 15], [2, 6, 10, 14], [4]];
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var stage = document.getElementById("stage"), step = 0, t0 = performance.now();
  var STEP_MS = 125;                                    /* 16ths at 120 BPM */

  /* the flat grid: no WebGL, or the fallback */
  function flat() {
    stage.classList.add("flat");
    var rows = document.getElementById("rows"), cells = [];
    V.forEach(function (name, v) {
      var r = document.createElement("div"); r.className = "row" + (v === 0 ? " sel" : "");
      var n = document.createElement("div"); n.className = "nm"; n.textContent = name; r.appendChild(n);
      cells[v] = [];
      for (var s = 0; s < 16; s++) {
        var c = document.createElement("div"); c.className = "cell" + (P[v].indexOf(s) >= 0 ? " on" : "");
        r.appendChild(c); cells[v].push(c);
      }
      rows.appendChild(r);
    });
    function show(s) {
      for (var v = 0; v < 8; v++) for (var i = 0; i < 16; i++)
        cells[v][i].className = cells[v][i].className.replace(/ hit| ph/g, "") + (i === s ? (P[v].indexOf(i) >= 0 ? " hit" : " ph") : "");
    }
    show(0);
    if (!still) setInterval(function () { step = (step + 1) % 16; show(step); }, STEP_MS);
  }

  var ok = false;
  try { ok = !!window.THREE && !!document.createElement("canvas").getContext("webgl"); } catch (e) {}
  if (!ok) { flat(); return; }

  var canvas = document.getElementById("gl");
  var R = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x070505, 14, 30);
  var cam = new THREE.PerspectiveCamera(38, 2, 0.1, 100);
  scene.add(new THREE.AmbientLight(0x401015, 1.0));
  var key = new THREE.PointLight(0xff2038, 2.2, 30); key.position.set(0, 7, 4); scene.add(key);
  var rim = new THREE.DirectionalLight(0x552020, 0.6); rim.position.set(-6, 4, -6); scene.add(rim);

  /* the deck: 16 x 8 pads, a playhead bar, a floor that catches the glow */
  var group = new THREE.Group(); scene.add(group);
  var geo = new THREE.BoxGeometry(0.62, 0.22, 0.62);
  var pads = [], halos = [];
  var haloTex = (function () {
    var c = document.createElement("canvas"); c.width = c.height = 64;
    var g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,40,60,1)"); gr.addColorStop(0.4, "rgba(224,16,42,0.35)"); gr.addColorStop(1, "rgba(224,16,42,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  for (var v = 0; v < 8; v++) {
    pads[v] = []; halos[v] = [];
    for (var s = 0; s < 16; s++) {
      var on = P[v].indexOf(s) >= 0;
      var m = new THREE.MeshStandardMaterial({ color: on ? 0x3a0a10 : 0x140c0c, emissive: 0xe0102a,
        emissiveIntensity: on ? 0.25 : 0.0, roughness: 0.45, metalness: 0.3 });
      var b = new THREE.Mesh(geo, m);
      b.position.set((s - 7.5) * 0.78, 0, (v - 3.5) * 0.82);
      b.userData = { on: on, lift: 0 };
      group.add(b); pads[v][s] = b;
      if (on) {
        var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, blending: THREE.AdditiveBlending,
          transparent: true, depthWrite: false, opacity: 0 }));
        sp.scale.set(2.2, 2.2, 1); sp.position.copy(b.position); sp.position.y = 0.3;
        group.add(sp); halos[v][s] = sp;
      }
    }
  }
  var head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 8 * 0.82 + 0.4),
    new THREE.MeshBasicMaterial({ color: 0xe0102a, transparent: true, opacity: 0.35 }));
  head.position.y = -0.1; group.add(head);
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x0a0606, roughness: 0.9, metalness: 0.1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.12; scene.add(floor);
  /* dust drifting through the delay's haze */
  var dg = new THREE.BufferGeometry(), dn = 260, dp = new Float32Array(dn * 3);
  for (var i = 0; i < dn; i++) { dp[i * 3] = (Math.random() - 0.5) * 22; dp[i * 3 + 1] = Math.random() * 6; dp[i * 3 + 2] = (Math.random() - 0.5) * 14; }
  dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
  var dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xff3048, size: 0.04, transparent: true, opacity: 0.5 }));
  scene.add(dust);

  /* turn: drag, or the pointer's position */
  var yaw = -0.35, pitch = 0.62, tyaw = yaw, tpitch = pitch, drag = null;
  stage.addEventListener("pointerdown", function (e) { drag = { x: e.clientX, y: e.clientY, yaw: tyaw, pitch: tpitch }; stage.style.cursor = "grabbing"; });
  window.addEventListener("pointerup", function () { drag = null; stage.style.cursor = ""; });
  window.addEventListener("pointermove", function (e) {
    if (drag) {
      tyaw = drag.yaw + (e.clientX - drag.x) * 0.006;
      tpitch = Math.max(0.25, Math.min(1.15, drag.pitch + (e.clientY - drag.y) * 0.004));
    }
  });

  function size() {
    var w = stage.clientWidth, h = stage.clientHeight;
    R.setSize(w, h, false); cam.aspect = w / h;
    cam.fov = w < 520 ? 52 : 38; cam.updateProjectionMatrix();
  }
  window.addEventListener("resize", size); size();

  var last = -1;
  function frame(now) {
    var t = (now - t0) / 1000;
    if (!still) { step = Math.floor((now - t0) / STEP_MS) % 16; if (!drag) tyaw += 0.0009; }
    yaw += (tyaw - yaw) * 0.08; pitch += (tpitch - pitch) * 0.08;
    var d = 11.5;
    cam.position.set(Math.sin(yaw) * Math.cos(pitch) * d, Math.sin(pitch) * d, Math.cos(yaw) * Math.cos(pitch) * d);
    cam.lookAt(0, 0, 0);
    if (step !== last) {
      for (var v = 0; v < 8; v++) if (pads[v][step].userData.on) pads[v][step].userData.lift = 1;
      last = step;
    }
    head.position.x += (((step - 7.5) * 0.78) - head.position.x) * 0.5;
    for (var v = 0; v < 8; v++) for (var s = 0; s < 16; s++) {
      var b = pads[v][s], u = b.userData;
      if (!u.on) continue;
      u.lift *= still ? 1 : 0.9;
      b.position.y = u.lift * 0.45;
      b.material.emissiveIntensity = 0.25 + u.lift * 2.2;
      halos[v][s].material.opacity = u.lift * 0.9;
      halos[v][s].position.y = 0.3 + u.lift * 0.45;
    }
    dust.rotation.y = t * 0.02;
    dust.position.y = Math.sin(t * 0.3) * 0.2;
    R.render(scene, cam);
    if (!still) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

/* cards and buttons tilt toward the pointer */
(function () {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.querySelectorAll(".tilt").forEach(function (el) {
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = "perspective(700px) rotateY(" + (x * 10) + "deg) rotateX(" + (-y * 10) + "deg) translateZ(6px)";
    });
    el.addEventListener("pointerleave", function () { el.style.transform = ""; });
  });
})();
