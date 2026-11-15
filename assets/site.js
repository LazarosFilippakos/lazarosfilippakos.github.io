/* Portfolio v3: loader, smooth scroll, WebGL particle scene, scroll-driven morphs, reveals.
   Libraries (CDN, pinned): GSAP 3.13.0 + ScrollTrigger + SplitText, Lenis 1.3.4, Three.js 0.170.0 (in scene.js).
   Everything degrades: no JS / CDN failure / reduced motion / no WebGL all leave a readable static page. */
(function () {
  "use strict";
  var SCRIPT_URL = document.currentScript && document.currentScript.src;
  if (!window.gsap || !window.ScrollTrigger || !window.SplitText) return; // head failsafe reveals content
  window.__ok = true;
  gsap.registerPlugin(ScrollTrigger, SplitText);

  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return; // final state immediately: no loader, no scene, no motion

  var isMobile = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
  var canvas = document.getElementById("scene");
  var loaderEl = document.querySelector(".loader");
  var nEl = document.getElementById("loader-n");
  var barEl = document.querySelector(".loader-bar i");
  var scene = null, lenis = null, finished = false;

  /* ---------- Lenis smooth scroll ---------- */
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  } else {
    root.style.overflow = "hidden";
  }

  /* ---------- loader with % counter ---------- */
  var disp = { v: 0 };
  function paint() {
    var v = Math.round(disp.v);
    nEl.textContent = v;
    barEl.style.transform = "scaleX(" + (disp.v / 100) + ")";
  }
  var parts = { fonts: 0, lib: 0, scene: 0 };
  function setParts(k) {
    parts[k] = 1;
    var target = parts.fonts * 30 + parts.lib * 40 + parts.scene * 30;
    gsap.to(disp, { v: target, duration: 0.7, ease: "power2.out", overwrite: true, onUpdate: paint, onComplete: function () { if (target >= 100) done(); } });
  }
  // always creep a little so the counter never looks frozen
  gsap.to(disp, { v: 18, duration: 1.2, ease: "power1.out", onUpdate: paint });
  var hardStop = setTimeout(function () { if (!finished) { parts.fonts = parts.lib = parts.scene = 1; gsap.to(disp, { v: 100, duration: 0.4, onUpdate: paint, onComplete: done }); } }, 9000);

  var fontsP = Promise.race([
    (document.fonts && document.fonts.load ? Promise.all([document.fonts.load("900 100px Inter", "LFΛΦ"), document.fonts.load("700 20px 'JetBrains Mono'", "0")]) : Promise.resolve()),
    new Promise(function (r) { setTimeout(r, 2500); })
  ]).then(function () { setParts("fonts"); });

  var sceneP = (function () {
    var gl = false;
    try { var c = document.createElement("canvas"); gl = !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch (e) {}
    if (!gl || !canvas) { setParts("lib"); setParts("scene"); return Promise.resolve(); }
    var url = new URL("scene.js", SCRIPT_URL || location.href).href;
    return import(url).then(function (mod) {
      setParts("lib");
      return fontsP.then(function () {
        return new Promise(function (r) { setTimeout(r, 30); }); // let the counter paint before the heavy build
      }).then(function () {
        scene = mod.createScene(canvas, {
          count: isMobile ? 5000 : 20000, maxDpr: 1.5, isMobile: isMobile,
          fontFamily: "Inter, 'Segoe UI', sans-serif"
        });
        root.classList.add("has-scene");
        scene.resize();
        setParts("scene");
      });
    }).catch(function (err) {
      if (window.console) console.warn("3D scene unavailable, using static layout:", err && err.message);
      scene = null; root.classList.remove("has-scene");
      setParts("lib"); setParts("scene");
    });
  })();

  /* ---------- finish: reveal page, run intro, wire up scroll ---------- */
  function done() {
    if (finished) return; finished = true; clearTimeout(hardStop);
    gsap.timeline()
      .to(".loader-in", { yPercent: -30, opacity: 0, duration: 0.5, ease: "power2.in" })
      .to(loaderEl, { yPercent: -100, duration: 0.8, ease: "expo.inOut" }, "-=0.1")
      .add(function () { loaderEl.style.display = "none"; root.style.overflow = ""; if (lenis) lenis.start(); if (scene) scene.start(); init(); }, "-=0.55");
  }

  function init() {
    gsap.set(".intro-hide, [data-intro-header]", { visibility: "visible" });
    intro();
    sceneScroll();
    reveals();
    hud();
    pointer();
    magnets();
    anchors();
    ScrollTrigger.refresh();
  }

  /* ---------- hero intro ---------- */
  function intro() {
    var split = new SplitText(".hero .name", { type: "chars" });
    var tl = gsap.timeline({
      defaults: { ease: "expo.out" },
      onComplete: function () { split.revert(); ScrollTrigger.refresh(); } // plain text again for screen readers
    });
    tl.from("[data-intro-header]", { yPercent: -100, opacity: 0, duration: 0.8 })
      .from(".hero .eyebrow", { x: -30, opacity: 0, duration: 0.7 }, 0.1)
      .from(split.chars, { yPercent: 120, rotation: 18, opacity: 0, transformOrigin: "0% 100%", duration: 1.3, stagger: 0.045 }, 0.15)
      .from(".hero-meta", { y: 50, opacity: 0, duration: 1, ease: "power3.out" }, 0.9)
      .from(".hero-meta .actions .btn", { y: 24, opacity: 0, scale: 0.92, duration: 0.7, stagger: 0.1 }, 1.2);
  }

  /* ---------- scene morphs tied to scroll ---------- */
  function sceneScroll() {
    if (!scene) return;
    var S = scene.state, wide = window.innerWidth >= 768;
    var chips = document.querySelectorAll(".chips li");
    // target morph value = sum of four segment progresses (0..4); the scene eases toward it
    var seg = [0, 0, 0, 0];
    function set(i) { return function (self) { seg[i] = self.progress; S.pt = seg[0] + seg[1] + seg[2] + seg[3]; }; }
    // 0 hero "LF" -> 1 Greece
    ScrollTrigger.create({ trigger: "#about", start: "top 90%", end: "top 35%", onUpdate: set(0), onRefresh: set(0) });
    // heritage panel is pinned while Greece flows into the Netherlands (1 -> 2)
    ScrollTrigger.create({
      trigger: ".heritage", start: wide ? "top 30%" : "top 55%", end: "+=110%", pin: true,
      onUpdate: function (self) {
        set(1)(self);
        var nl = self.progress > 0.5;
        chips[0].classList.toggle("on", !nl); chips[1].classList.toggle("on", nl);
      },
      onRefresh: set(1)
    });
    // 2 -> 3 laptop + phone + grid behind the projects
    ScrollTrigger.create({ trigger: "#projects", start: "top 90%", end: "top 35%", onUpdate: set(2), onRefresh: set(2) });
    // 3 -> 4 disperse into a starfield for the contact section
    ScrollTrigger.create({ trigger: "#contact", start: "top 95%", end: "top 40%", onUpdate: set(3), onRefresh: set(3) });
    ScrollTrigger.create({ start: 0, end: "max", onUpdate: function (self) { S.scroll = self.progress; } });
  }

  /* ---------- section reveals ---------- */
  function reveals() {
    gsap.utils.toArray(".sh").forEach(function (h) {
      var num = h.querySelector(".num"), title = h.querySelector(".title");
      gsap.from(num, { x: -120, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: h, start: "top 88%" } });
      gsap.from(title, { yPercent: 115, rotation: 3, transformOrigin: "0 100%", duration: 1, ease: "expo.out", scrollTrigger: { trigger: h, start: "top 88%" } });
      gsap.to(num, { yPercent: -22, ease: "none", scrollTrigger: { trigger: h, start: "top bottom", end: "bottom top", scrub: true } });
    });
    gsap.from(".heritage > *", { y: 30, opacity: 0, duration: 0.9, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: ".heritage", start: "top 85%" } });
    gsap.from(".about-body", { y: 70, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: ".about-body", start: "top 90%" } });
    gsap.from(".tools li", {
      scale: 0.3, y: 40, opacity: 0, rotation: function () { return gsap.utils.random(-14, 14); },
      duration: 0.8, ease: "back.out(2)", stagger: { each: 0.06, from: "random" },
      scrollTrigger: { trigger: ".tools", start: "top 92%" }
    });

    var feat = document.querySelector(".project.featured");
    if (feat) {
      gsap.from(feat, { y: 90, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: feat, start: "top 90%" } });
      gsap.from(feat.querySelectorAll(".eyebrow, h3, p, .points li, .tags li"), { y: 28, opacity: 0, duration: 0.8, stagger: 0.05, ease: "power3.out", scrollTrigger: { trigger: feat, start: "top 80%" } });
      var st = { trigger: feat.querySelector(".stage"), start: "top 95%", end: "center 55%", scrub: 0.8 };
      gsap.fromTo(".device-desktop", { rotation: -9, scale: 0.9, y: 70 }, { rotation: 0, scale: 1, y: 0, ease: "none", scrollTrigger: st });
      gsap.fromTo(".device-phone", { rotation: 16, scale: 0.85, y: 140 }, { rotation: 0, scale: 1, y: 0, ease: "none", scrollTrigger: st });
      gsap.to(".device-phone", { yPercent: -12, ease: "none", scrollTrigger: { trigger: feat.querySelector(".stage"), start: "center 55%", end: "bottom top", scrub: true } });
    }
    var swim = document.querySelector(".project.single");
    if (swim) gsap.from(swim, { y: 80, opacity: 0, rotation: -1.5, duration: 1, ease: "expo.out", scrollTrigger: { trigger: swim, start: "top 90%" } });

    gsap.from(".grid .card", {
      y: 90, opacity: 0, rotation: function (i) { return i % 2 ? 4 : -4; }, duration: 1, stagger: 0.14, ease: "expo.out",
      scrollTrigger: { trigger: ".grid", start: "top 88%" },
      onComplete: function () { gsap.set(".grid .card", { clearProps: "transform" }); } // keep the CSS hover working
    });

    var ct = document.querySelector(".contact-title");
    if (ct) {
      gsap.from(".contact-panel", { y: 80, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: ".contact-panel", start: "top 92%" } });
      var cs = new SplitText(ct, { type: "chars" });
      gsap.from(cs.chars, {
        yPercent: 100, rotation: 10, opacity: 0, transformOrigin: "0% 100%", duration: 1.1, stagger: 0.04, ease: "expo.out",
        scrollTrigger: { trigger: ct, start: "top 92%" }, onComplete: function () { cs.revert(); }
      });
    }
  }

  /* ---------- HUD: scroll % and scrambled section label ---------- */
  function hud() {
    var pct = document.getElementById("hud-pct"), sec = document.getElementById("hud-sec");
    ScrollTrigger.create({
      start: 0, end: "max",
      onUpdate: function (self) { pct.textContent = String(Math.round(self.progress * 100)).padStart(3, "0"); }
    });
    var glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>_";
    var cur = sec.textContent;
    function scramble(to) {
      if (to === cur) return; cur = to;
      var o = { t: 0 };
      gsap.to(o, {
        t: 1, duration: 0.6, ease: "none", overwrite: true,
        onUpdate: function () {
          var keep = Math.floor(o.t * to.length), s = "";
          for (var i = 0; i < to.length; i++) s += i < keep || to[i] === " " || to[i] === "/" ? to[i] : glyphs[(Math.random() * glyphs.length) | 0];
          sec.textContent = s;
        },
        onComplete: function () { sec.textContent = to; }
      });
    }
    gsap.utils.toArray("[data-hud]").forEach(function (el) {
      ScrollTrigger.create({ trigger: el, start: "top 55%", end: "bottom 55%", onToggle: function (self) { if (self.isActive) scramble(el.getAttribute("data-hud")); } });
    });
  }

  /* ---------- pointer parallax + magnetic buttons (fine pointers only) ---------- */
  function pointer() {
    if (!scene || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    window.addEventListener("pointermove", function (e) {
      scene.state.mx = (e.clientX / window.innerWidth - 0.5) * 2;
      scene.state.my = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }
  function magnets() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    gsap.utils.toArray(".btn").forEach(function (b) {
      var qx = gsap.quickTo(b, "x", { duration: 0.5, ease: "power3" }), qy = gsap.quickTo(b, "y", { duration: 0.5, ease: "power3" });
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        qx((e.clientX - (r.left + r.width / 2)) * 0.3); qy((e.clientY - (r.top + r.height / 2)) * 0.3);
      });
      b.addEventListener("pointerleave", function () { qx(0); qy(0); });
    });
  }
  function anchors() {
    if (!lenis) return;
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var t = document.querySelector(a.getAttribute("href"));
        if (!t) return;
        e.preventDefault(); lenis.scrollTo(t, { offset: -10 });
        if (t.setAttribute) { if (!t.hasAttribute("tabindex")) t.setAttribute("tabindex", "-1"); t.focus({ preventScroll: true }); }
      });
    });
  }
})();
