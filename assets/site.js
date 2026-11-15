/* Portfolio animations (GSAP 3.13 core + ScrollTrigger + SplitText, loaded from a CDN).
   Content is fully visible if this file or the CDN fails: the page head only hides
   intro elements while JS is expected, and removes that class after 3 s if we never run. */
(function () {
  "use strict";
  if (!window.gsap || !window.ScrollTrigger || !window.SplitText) return; // failsafe in <head> reveals content
  window.__ok = true;
  gsap.registerPlugin(ScrollTrigger, SplitText);

  var mm = gsap.matchMedia();

  // Reduced motion: final state immediately, nothing hidden, nothing moves.
  mm.add("(prefers-reduced-motion: reduce)", function () {
    gsap.set(".intro-hide, [data-intro-header]", { visibility: "visible", clearProps: "all" });
  });

  mm.add("(prefers-reduced-motion: no-preference)", function () {
    var fontsReady = Promise.race([
      document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
      new Promise(function (r) { setTimeout(r, 1500); })
    ]);
    fontsReady.then(init);
  });

  function init() {
    gsap.set(".intro-hide, [data-intro-header]", { visibility: "visible" });

    /* ---------- load intro ---------- */
    var split = new SplitText(".hero .name", { type: "chars" }); // short heading only
    var tl = gsap.timeline({
      defaults: { ease: "expo.out" },
      onComplete: function () {
        split.revert(); // restore plain text so screen readers read whole words
        ScrollTrigger.refresh();
      }
    });
    tl.from("[data-intro-header]", { yPercent: -100, opacity: 0, duration: 0.8 })
      .from(".hero .eyebrow", { x: -30, opacity: 0, duration: 0.7 }, 0.1)
      .from(split.chars, {
        yPercent: 120, rotation: 18, opacity: 0, transformOrigin: "0% 100%",
        duration: 1.3, stagger: 0.045
      }, 0.15)
      .from(".badge", { scale: 0, rotation: -120, duration: 1.1, ease: "back.out(1.6)" }, 0.9)
      .from([".hero .role", ".hero .avail"], { y: 40, opacity: 0, duration: 0.9, stagger: 0.12 }, 0.9)
      .from(".hero .actions .btn", { y: 30, opacity: 0, scale: 0.9, duration: 0.8, stagger: 0.1 }, 1.15);

    /* ---------- hero + band, on scroll ---------- */
    gsap.to(".hero h1", {
      yPercent: -12, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });
    gsap.to(".badge", {
      rotation: "+=140", ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });
    gsap.fromTo(".band-track", { xPercent: 0 }, {
      xPercent: -33.3, ease: "none",
      scrollTrigger: { trigger: ".band", start: "top bottom", end: "bottom top", scrub: 0.5 }
    });

    /* ---------- section headings ---------- */
    gsap.utils.toArray(".sh").forEach(function (h) {
      var num = h.querySelector(".num"), title = h.querySelector(".title");
      gsap.from(num, {
        x: -120, opacity: 0, duration: 1.2, ease: "expo.out",
        scrollTrigger: { trigger: h, start: "top 85%" }
      });
      gsap.from(title, {
        yPercent: 115, rotation: 3, transformOrigin: "0 100%", duration: 1, ease: "expo.out",
        scrollTrigger: { trigger: h, start: "top 85%" }
      });
      gsap.to(num, {
        yPercent: -25, ease: "none",
        scrollTrigger: { trigger: h, start: "top bottom", end: "bottom top", scrub: true }
      });
    });

    /* ---------- projects ---------- */
    var feat = document.querySelector(".project.featured");
    if (feat) {
      gsap.from(feat, {
        y: 90, opacity: 0, duration: 1, ease: "expo.out",
        scrollTrigger: { trigger: feat, start: "top 88%" }
      });
      gsap.from(feat.querySelectorAll(".eyebrow, h3, p, .points li, .tags li"), {
        y: 28, opacity: 0, duration: 0.8, stagger: 0.05, ease: "power3.out",
        scrollTrigger: { trigger: feat, start: "top 78%" }
      });
      // device frames start tilted and straighten while scrolling in
      var st = { trigger: feat.querySelector(".stage"), start: "top 95%", end: "center 55%", scrub: 0.8 };
      gsap.fromTo(".device-desktop", { rotation: -9, scale: 0.9, y: 70 }, { rotation: 0, scale: 1, y: 0, ease: "none", scrollTrigger: st });
      gsap.fromTo(".device-phone", { rotation: 16, scale: 0.85, y: 140 }, { rotation: 0, scale: 1, y: 0, ease: "none", scrollTrigger: st });
      gsap.to(".device-phone", {
        yPercent: -12, ease: "none",
        scrollTrigger: { trigger: feat.querySelector(".stage"), start: "center 55%", end: "bottom top", scrub: true }
      });
    }
    var swim = document.querySelector(".project.single");
    if (swim) {
      gsap.from(swim, { y: 80, opacity: 0, rotation: -1.5, duration: 1, ease: "expo.out", scrollTrigger: { trigger: swim, start: "top 88%" } });
    }

    /* ---------- MSc cards ---------- */
    gsap.from(".grid .card", {
      y: 90, opacity: 0, rotation: function (i) { return i % 2 ? 4 : -4; },
      duration: 1, stagger: 0.14, ease: "expo.out",
      scrollTrigger: { trigger: ".grid", start: "top 85%" },
      onComplete: function () { gsap.set(".grid .card", { clearProps: "transform" }); } // keep CSS hover working
    });

    /* ---------- about + tools ---------- */
    gsap.from(".about-text", {
      y: 40, opacity: 0, duration: 0.9, stagger: 0.15, ease: "power3.out",
      scrollTrigger: { trigger: ".about-text", start: "top 88%" }
    });
    gsap.from(".tools li", {
      scale: 0.3, y: 40, opacity: 0, rotation: function () { return gsap.utils.random(-14, 14); },
      duration: 0.8, ease: "back.out(2)", stagger: { each: 0.06, from: "random" },
      scrollTrigger: { trigger: ".tools", start: "top 90%" }
    });

    /* ---------- contact ---------- */
    var ct = document.querySelector(".contact-title");
    if (ct) {
      var csplit = new SplitText(ct, { type: "chars" });
      gsap.from(csplit.chars, {
        yPercent: 100, rotation: 10, opacity: 0, transformOrigin: "0% 100%",
        duration: 1.1, stagger: 0.04, ease: "expo.out",
        scrollTrigger: { trigger: ct, start: "top 90%" },
        onComplete: function () { csplit.revert(); }
      });
    }
    gsap.from(".site-footer .avail, .site-footer .actions .btn", {
      y: 30, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out",
      scrollTrigger: { trigger: ".site-footer .actions", start: "top 95%" }
    });

    /* ---------- magnetic buttons, fine pointers only ---------- */
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      gsap.utils.toArray(".btn").forEach(function (b) {
        var qx = gsap.quickTo(b, "x", { duration: 0.5, ease: "power3" });
        var qy = gsap.quickTo(b, "y", { duration: 0.5, ease: "power3" });
        b.addEventListener("pointermove", function (e) {
          var r = b.getBoundingClientRect();
          qx((e.clientX - (r.left + r.width / 2)) * 0.3);
          qy((e.clientY - (r.top + r.height / 2)) * 0.3);
        });
        b.addEventListener("pointerleave", function () { qx(0); qy(0); });
      });
    }
  }
})();
