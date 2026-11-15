// Particle scene: one Points object that morphs between five target shapes.
// 0 hero "LF"  ->  1 Greece  ->  2 Netherlands  ->  3 laptop + phone + grid  ->  4 starfield
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js";
import { OUTLINES } from "./outlines.js";

const rand = (a, b) => a + Math.random() * (b - a);

/* ---------- target generators (all return Float32Array(count * 3)) ---------- */

function textTargets(count, text, fontFamily) {
  const W = 900, H = 450;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.font = `900 400px ${fontFamily}`;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, W / 2, H / 2 + 20);
  const data = g.getImageData(0, 0, W, H).data;
  const px = [];
  for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) if (data[(y * W + x) * 4 + 3] > 128) px.push(x, y);
  const out = new Float32Array(count * 3);
  const s = 26 / 400; // world units per px
  for (let i = 0; i < count; i++) {
    const k = ((Math.random() * (px.length / 2)) | 0) * 2;
    out[i * 3] = (px[k] - W / 2) * s * 2.2 / 2.2 + rand(-0.12, 0.12);
    out[i * 3 + 1] = -(px[k + 1] - H / 2) * s + rand(-0.12, 0.12);
    out[i * 3 + 2] = rand(-1.5, 1.5);
  }
  return out;
}

function pointInRings(x, y, rings) {
  let inside = false;
  for (const r of rings) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

function countryTargets(count, rings, height) {
  // equirectangular with latitude correction
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (const r of rings) for (const [x, y] of r) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const lat0 = ((minY + maxY) / 2) * Math.PI / 180;
  const kx = Math.cos(lat0);
  const w = (maxX - minX) * kx, h = maxY - minY;
  const scale = height / h;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const toW = (x, y) => [(x - cx) * kx * scale, (y - cy) * scale];
  const out = new Float32Array(count * 3);
  // 35% along the outline (crisp edge), 65% filled
  const edges = [];
  for (const r of rings) for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length];
    edges.push([a, b, Math.hypot((b[0] - a[0]) * kx, b[1] - a[1])]);
  }
  const total = edges.reduce((s, e) => s + e[2], 0);
  for (let i = 0; i < count; i++) {
    let X, Y;
    if (i % 100 < 35) {
      let t = Math.random() * total, e = edges[0];
      for (const ed of edges) { if (t < ed[2]) { e = ed; break; } t -= ed[2]; }
      const f = Math.random();
      X = e[0][0] + (e[1][0] - e[0][0]) * f; Y = e[0][1] + (e[1][1] - e[0][1]) * f;
    } else {
      do { X = rand(minX, maxX); Y = rand(minY, maxY); } while (!pointInRings(X, Y, rings));
    }
    const [wx, wy] = toW(X, Y);
    out[i * 3] = wx + rand(-0.1, 0.1); out[i * 3 + 1] = wy + rand(-0.1, 0.1); out[i * 3 + 2] = rand(-1.2, 1.2);
  }
  return out;
}

function deviceTargets(count) {
  const out = new Float32Array(count * 3);
  const rr = (cx, cy, w, h, t, z) => { // point on a rectangle outline (t in 0..1)
    const per = 2 * (w + h); let d = t * per, x, y;
    if (d < w) { x = -w / 2 + d; y = h / 2; } else if ((d -= w) < h) { x = w / 2; y = h / 2 - d; }
    else if ((d -= h) < w) { x = w / 2 - d; y = -h / 2; } else { d -= w; x = -w / 2; y = -h / 2 + d; }
    return [cx + x, cy + y, z];
  };
  for (let i = 0; i < count; i++) {
    const k = i % 100; let p;
    if (k < 22) p = rr(-5, 2, 17, 10.5, Math.random(), 0);                    // laptop screen frame
    else if (k < 30) p = [rand(-13.5, 3.5), rand(-3.5, -4.5), rand(-0.3, 0.3)]; // laptop base
    else if (k < 38) p = rr(-5, 2, 15.5, 9, Math.random(), 0.5);              // inner bezel
    else if (k < 48) { const gy = Math.floor(rand(0, 6)); p = [rand(-12.5, 2.5), 6.2 - gy * 1.5, 0.2]; } // content lines
    else if (k < 62) p = rr(13, 0, 6, 12, Math.random(), 1);                  // phone frame
    else if (k < 68) p = [rand(10.4, 15.6), rand(-5, 5), 1];                  // phone screen fill
    else { p = [rand(-40, 40), rand(-24, 24), rand(-22, -12)]; // background grid lattice
      p[0] = Math.round(p[0] / 4) * 4 + rand(-0.1, 0.1); p[1] = Math.round(p[1] / 4) * 4 + rand(-0.1, 0.1); }
    out[i * 3] = p[0]; out[i * 3 + 1] = p[1]; out[i * 3 + 2] = p[2];
  }
  return out;
}

function starTargets(count) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = rand(18, 120), th = Math.random() * Math.PI * 2, ph = Math.acos(rand(-1, 1));
    out[i * 3] = r * Math.sin(ph) * Math.cos(th) * 1.4;
    out[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.8;
    out[i * 3 + 2] = r * Math.cos(ph) - 20;
  }
  return out;
}

/* ---------- shaders ---------- */

const VERT = /* glsl */ `
attribute vec3 aT1; attribute vec3 aT2; attribute vec3 aT3; attribute vec3 aT4; attribute float aRand;
uniform float uP; uniform float uTime; uniform float uSize; uniform float uPix;
varying float vA; varying float vHot; varying float vRand;
vec3 stage(float i) {
  if (i < 0.5) return position;
  if (i < 1.5) return aT1;
  if (i < 2.5) return aT2;
  if (i < 3.5) return aT3;
  return aT4;
}
void main() {
  float p = clamp(uP, 0.0, 3.9999);
  float i = floor(p); float f = p - i;
  float t = clamp(f * 1.7 - aRand * 0.7, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  vec3 pos = mix(stage(i), stage(i + 1.0), t);
  float turb = sin(t * 3.14159);
  pos += turb * 4.0 * vec3(sin(uTime * 0.7 + aRand * 40.0), cos(uTime * 0.6 + aRand * 31.0), sin(uTime * 0.5 + aRand * 23.0));
  pos += 0.12 * vec3(sin(uTime * 0.8 + aRand * 90.0), cos(uTime * 0.7 + aRand * 70.0), sin(uTime * 0.6 + aRand * 50.0));
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;
  gl_PointSize = clamp(uSize * uPix * (0.55 + aRand * 0.9) * (60.0 / depth), 1.0, 14.0 * uPix);
  vA = smoothstep(190.0, 25.0, depth);        // depth fog
  vHot = step(0.9, aRand) + turb * 0.4;        // a few accent particles, more while moving
  vRand = aRand;
}`;

const FRAG = /* glsl */ `
precision mediump float;
uniform vec3 uCool; uniform vec3 uHot; uniform float uAlpha;
varying float vA; varying float vHot; varying float vRand;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, d);
  vec3 col = mix(uCool, uHot, clamp(vHot, 0.0, 1.0));
  gl_FragColor = vec4(col, a * vA * uAlpha * (0.55 + vRand * 0.45));
}`;

/* ---------- scene ---------- */

export function createScene(canvas, opts) {
  const { count, maxDpr, isMobile, fontFamily } = opts;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
  camera.position.set(0, 0, 62);

  const geo = new THREE.BufferGeometry();
  const t0 = textTargets(count, "LF", fontFamily);
  geo.setAttribute("position", new THREE.BufferAttribute(t0, 3));
  geo.setAttribute("aT1", new THREE.BufferAttribute(countryTargets(count, OUTLINES.Greece, 26), 3));
  geo.setAttribute("aT2", new THREE.BufferAttribute(countryTargets(count, OUTLINES.Netherlands, 26), 3));
  geo.setAttribute("aT3", new THREE.BufferAttribute(deviceTargets(count), 3));
  geo.setAttribute("aT4", new THREE.BufferAttribute(starTargets(count), 3));
  const rnd = new Float32Array(count);
  for (let i = 0; i < count; i++) rnd[i] = Math.random();
  geo.setAttribute("aRand", new THREE.BufferAttribute(rnd, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 400); // positions are shader-driven

  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: {
      uP: { value: 0 }, uTime: { value: 0 }, uSize: { value: isMobile ? 1.5 : 1.35 }, uPix: { value: dpr },
      uCool: { value: new THREE.Color(0x8fb8ff) }, uHot: { value: new THREE.Color(0xffc857) },
      uAlpha: { value: 1 },
    },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  // state driven from outside
  const state = { p: 0, pt: 0, scroll: 0, mx: 0, my: 0, shiftX: 0, shiftY: 0 };
  let running = false, raf = 0, last = performance.now(), time = 0;
  let frames = 0, acc = 0, adapted = false;

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();

  // desired layout per stage: shapes sit on the right on wide screens, high on phones
  function layout(p) {
    const wide = camera.aspect > 1.1;
    const shifts = wide ? [[11, 0], [11, 0], [11, 0], [3, 0], [0, 0]] : [[0, 10], [0, 12], [0, 12], [0, 10], [0, 0]];
    const i = Math.min(Math.floor(p), 3), f = p - i;
    const a = shifts[i], b = shifts[i + 1];
    state.shiftX = a[0] + (b[0] - a[0]) * f; state.shiftY = a[1] + (b[1] - a[1]) * f;
    const sc = wide ? 1 : 0.72;
    points.scale.setScalar(sc);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1); last = now; time += dt;
    // adaptive quality: sample the first 90 frames, drop to 60% particles if under ~40 fps
    if (!adapted) {
      frames++; acc += dt;
      if (frames === 90) {
        adapted = true;
        if (frames / acc < 40) { geo.setDrawRange(0, Math.floor(count * 0.6)); renderer.setPixelRatio(1); mat.uniforms.uPix.value = 1; renderer.setSize(window.innerWidth, window.innerHeight, false); }
      }
    }
    state.p += (state.pt - state.p) * Math.min(1, dt * 4.5); // ease toward the scroll target
    mat.uniforms.uTime.value = time;
    mat.uniforms.uP.value = state.p;
    layout(state.p);
    // scroll-driven camera + pointer parallax
    const sway = (state.scroll - 0.5) * 0.35;
    const starMix = Math.max(0, state.p - 3); // slow spin in the starfield
    points.position.x += (state.shiftX - points.position.x) * 0.1;
    points.position.y += (state.shiftY - points.position.y) * 0.1;
    points.rotation.y += ((sway + state.mx * 0.12) - points.rotation.y) * 0.05 + starMix * dt * 0.06;
    points.rotation.x += ((state.my * -0.08) - points.rotation.x) * 0.05;
    camera.position.z = 62 - 5 * Math.sin(Math.min(state.p, 4) * Math.PI / 2) * 0.6 - starMix * 14;
    mat.uniforms.uAlpha.value = isMobile && state.p < 0.6 ? 0.45 : 1;
    renderer.render(scene, camera);
  }

  function start() { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  window.addEventListener("resize", resize);

  return {
    state, start, stop, resize,
    dispose() { stop(); geo.dispose(); mat.dispose(); renderer.dispose(); },
  };
}

export function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch (e) { return false; }
}
