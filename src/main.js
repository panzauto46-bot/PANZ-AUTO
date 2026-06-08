import "./styles/main.css";

import Lenis from "lenis";
import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

const tests = [];
function test(name, fn) {
  try {
    fn();
    tests.push({ name, pass: true });
    console.info(`PASS ${name}`);
  } catch (error) {
    tests.push({ name, pass: false, error });
    console.error(`FAIL ${name}`, error);
  }
}

test("Three.js available", () => {
  if (!THREE || !THREE.WebGLRenderer) throw new Error("THREE.WebGLRenderer is unavailable.");
});

test("Three addons available", () => {
  if (!OrbitControls || !STLLoader || !RoomEnvironment) throw new Error("Three addons failed to load.");
});

test("Required canvases exist", () => {
  ["hero-canvas", "showcase-canvas", "particles-canvas"].forEach((id) => {
    if (!document.getElementById(id)) throw new Error(`#${id} not found.`);
  });
});

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 768px)").matches;
const modelCandidates = [
  "/models/BASE%20PZ.STL",
  "/models/velocity_stack.stl",
  "/assets/models/velocity_stack.stl",
  "velocity_stack.stl"
];
const loaderOverlay = document.getElementById("loader");
const webglWarning = document.getElementById("webgl-warning");
const moduleWarning = document.getElementById("module-warning");
document.getElementById("year").textContent = new Date().getFullYear();

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
  } catch (_) {
    return false;
  }
}

function hideLoader() {
  gsap.to(loaderOverlay, {
    autoAlpha: 0,
    duration: 0.8,
    ease: "expo.out",
    onComplete: () => {
      loaderOverlay.style.display = "none";
    }
  });
}

function splitWords(selector) {
  document.querySelectorAll(selector).forEach((el) => {
    if (el.dataset.split === "true") return;
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((word) => `<span class="word"><span>${word}</span></span>`).join(" ");
    el.dataset.split = "true";
  });
}

function initSmoothScroll() {
  if (prefersReducedMotion) return null;
  const lenis = new Lenis({
    duration: 1.14,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    smoothTouch: false
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

const lenis = initSmoothScroll();

function initCursor() {
  if (isMobile) return;
  const cursor = document.getElementById("cursor");
  const follower = document.getElementById("cursor-follower");
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let followerX = mouseX;
  let followerY = mouseY;
  gsap.set([cursor, follower], { x: mouseX, y: mouseY });
  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    gsap.to(cursor, { x: mouseX, y: mouseY, duration: 0.08, ease: "power3.out" });
  });
  gsap.ticker.add(() => {
    followerX += (mouseX - followerX) * 0.1;
    followerY += (mouseY - followerY) * 0.1;
    gsap.set(follower, { x: followerX, y: followerY });
  });
  document.querySelectorAll("a, button, .hoverable, .gallery-item").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      gsap.to(cursor, { scale: 1.8, duration: 0.25, ease: "power3.out" });
      gsap.to(follower, { width: 68, height: 68, borderColor: "rgba(255,77,0,.75)", duration: 0.35, ease: "power3.out" });
    });
    el.addEventListener("mouseleave", () => {
      gsap.to(cursor, { scale: 1, duration: 0.25, ease: "power3.out" });
      gsap.to(follower, { width: 38, height: 38, borderColor: "rgba(255,255,255,.26)", duration: 0.35, ease: "power3.out" });
    });
  });
}

function initParticles() {
  const canvas = document.getElementById("particles-canvas");
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const particles = Array.from({ length: 200 }, () => ({
    x: Math.random(),
    y: Math.random(),
    z: Math.random() * 0.85 + 0.15,
    vx: (Math.random() - 0.5) * 0.00032,
    vy: (Math.random() - 0.5) * 0.00032,
    r: Math.random() * 1.4 + 0.3
  }));
  function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function tick() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = 1;
      if (p.x > 1) p.x = 0;
      if (p.y < 0) p.y = 1;
      if (p.y > 1) p.y = 0;
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${0.08 + p.z * 0.42})`;
      ctx.arc(p.x * window.innerWidth, p.y * window.innerHeight, p.r * p.z, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(tick);
  }
  resize();
  tick();
  window.addEventListener("resize", resize);
}

const threeState = { geometry: null, material: null, hero: null, showcase: null, modelLoaded: false };

function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  return renderer;
}

function fitCameraToObject(camera, object, controls, offset = 2.25) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const fov = camera.fov * (Math.PI / 180);
  const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * offset;
  camera.position.set(center.x + cameraZ * 0.2, center.y + cameraZ * 0.12, center.z + cameraZ);
  camera.near = cameraZ / 100;
  camera.far = cameraZ * 100;
  camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.update();
}

function centerAndNormalizeGeometry(geometry) {
  geometry.computeBoundingBox();
  const center = new THREE.Vector3();
  geometry.boundingBox.getCenter(center);
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.computeBoundingSphere();
  const scale = 2.4 / (geometry.boundingSphere.radius || 1);
  geometry.scale(scale, scale, scale);
  geometry.computeVertexNormals();
  return geometry;
}

function addLighting(scene) {
  const key = new THREE.DirectionalLight(0xfff3df, 3.2);
  key.position.set(5, 6, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xcfe7ff, 1.4);
  fill.position.set(-6, 2, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xff7a2c, 1.8);
  rim.position.set(0, 2.5, -7);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.32));
}

function makeScene(canvas, mode = "hero") {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
  const renderer = createRenderer(canvas);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  addLighting(scene);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.autoRotate = mode === "hero";
  controls.autoRotateSpeed = 1.2;
  controls.minDistance = 1.4;
  controls.maxDistance = 8;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  let resumeTimer;
  controls.addEventListener("start", () => {
    controls.autoRotate = false;
    clearTimeout(resumeTimer);
  });
  controls.addEventListener("end", () => {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      if (mode === "hero") controls.autoRotate = true;
    }, 3000);
  });
  const group = new THREE.Group();
  scene.add(group);
  const mesh = new THREE.Mesh(threeState.geometry.clone(), threeState.material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.castShadow = true;
  group.add(mesh);
  fitCameraToObject(camera, group, controls, mode === "hero" ? 2.55 : 2.7);
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  function animate() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  resize();
  animate();
  window.addEventListener("resize", resize);
  return { scene, camera, renderer, controls, group, resize };
}

function createFallbackVelocityStackGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0.42, -1.15);
  shape.bezierCurveTo(0.46, -0.65, 0.5, -0.2, 0.58, 0.1);
  shape.bezierCurveTo(0.78, 0.52, 1.12, 0.8, 1.38, 0.95);
  shape.lineTo(1.38, 1.16);
  shape.bezierCurveTo(1, 1.08, 0.58, 0.92, 0.3, 0.62);
  shape.bezierCurveTo(0.14, 0.18, 0.12, -0.6, 0.2, -1.15);
  shape.closePath();
  const geometry = new THREE.LatheGeometry(shape.getPoints(80), 160);
  geometry.rotateX(Math.PI / 2);
  geometry.computeVertexNormals();
  return centerAndNormalizeGeometry(geometry);
}

function loadVelocityStackModel() {
  threeState.material = new THREE.MeshStandardMaterial({ metalness: 0.9, roughness: 0.2, color: 0x888888, envMapIntensity: 1.45 });
  const loader = new STLLoader();
  return new Promise((resolve) => {
    function tryLoadModel(index = 0) {
      const modelUrl = modelCandidates[index];
      if (!modelUrl) {
        threeState.geometry = createFallbackVelocityStackGeometry();
        threeState.modelLoaded = false;
        resolve(false);
        return;
      }
      loader.load(
        modelUrl,
        (geometry) => {
          threeState.geometry = centerAndNormalizeGeometry(geometry);
          threeState.modelLoaded = true;
          resolve(true);
        },
        undefined,
        () => {
          tryLoadModel(index + 1);
        }
      );
    }
    tryLoadModel();
  });
}

function initThree() {
  if (!supportsWebGL()) {
    webglWarning.style.display = "block";
    hideLoader();
    return;
  }
  loadVelocityStackModel().then(() => {
    test("Velocity stack geometry is available", () => {
      if (!threeState.geometry) throw new Error("No STL or fallback geometry available.");
    });
    threeState.hero = makeScene(document.getElementById("hero-canvas"), "hero");
    threeState.showcase = makeScene(document.getElementById("showcase-canvas"), "showcase");
    test("Hero and showcase Three scenes are initialized", () => {
      if (!threeState.hero || !threeState.showcase) throw new Error("Three scenes failed to initialize.");
    });
    gsap.fromTo(threeState.hero.group.scale, { x: 0.8, y: 0.8, z: 0.8 }, { x: 1, y: 1, z: 1, duration: 1.2, ease: "elastic.out(1, .58)" });
    gsap.fromTo("#hero-canvas", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2, ease: "expo.out" });
    initScrollAnimations();
    hideLoader();
  }).catch(() => {
    moduleWarning.style.display = "block";
    hideLoader();
  });
}

function initIntroAnimations() {
  splitWords(".split-heading, .reveal-word");
  gsap.from(".hero-title .word span", { yPercent: 110, rotate: 2, duration: 1.18, stagger: 0.05, ease: "expo.out", delay: 0.28 });
  gsap.from(".hero-kicker .word span", { yPercent: 110, duration: 0.9, stagger: 0.04, ease: "expo.out", delay: 0.18 });
  gsap.from(".hero .reveal-up", { y: 34, autoAlpha: 0, duration: 1, stagger: 0.12, ease: "power3.out", delay: 0.45 });
  gsap.from(".topbar", { y: -24, autoAlpha: 0, duration: 0.9, ease: "power3.out", delay: 0.2 });
}

function initScrollAnimations() {
  if (prefersReducedMotion) return;
  document.querySelectorAll(".section-title, .flow-copy h2, .showcase-heading h2, .footer-cta h2").forEach((heading) => {
    const words = heading.querySelectorAll(".word span");
    if (!words.length) return;
    gsap.from(words, { yPercent: 110, duration: 1, stagger: 0.04, ease: "expo.out", scrollTrigger: { trigger: heading, start: "top 82%" } });
  });
  gsap.utils.toArray(".line-separator").forEach((line) => {
    gsap.from(line, { scaleX: 0, duration: 1.15, ease: "power3.out", scrollTrigger: { trigger: line, start: "top 82%" } });
  });
  gsap.to(".spec-card", { y: 0, autoAlpha: 1, duration: 0.95, stagger: 0.08, ease: "power3.out", scrollTrigger: { trigger: ".spec-grid", start: "top 78%" } });
  gsap.utils.toArray(".reveal-up").forEach((el) => {
    if (!el.closest(".hero")) {
      gsap.from(el, { y: 26, autoAlpha: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 84%" } });
    }
  });

  if (threeState.showcase) {
    const showcaseTl = gsap.timeline({ scrollTrigger: { trigger: ".showcase", start: "top top", end: "bottom bottom", scrub: 1 } });
    showcaseTl.to(threeState.showcase.group.rotation, { y: Math.PI * 2.2, x: Math.PI * 0.18, ease: "power3.out" }, 0);
    document.querySelectorAll(".annotation").forEach((ann, index) => {
      const start = 0.12 + index * 0.18;
      const end = start + 0.14;
      const path = ann.querySelector("path");
      showcaseTl.to(ann, { autoAlpha: 1, y: 0, duration: 0.08, ease: "power3.out" }, start);
      showcaseTl.to(path, { strokeDashoffset: 0, duration: 0.1, ease: "power3.out" }, start + 0.02);
      showcaseTl.to(ann, { autoAlpha: index === 3 ? 1 : 0.18, duration: 0.08, ease: "power3.out" }, end);
    });
  }

  gsap.utils.toArray(".flow-line").forEach((line) => {
    gsap.to(line, { strokeDashoffset: -48, duration: 1.25, repeat: -1, ease: "power3.out", scrollTrigger: { trigger: line.closest(".flow-diagram"), start: "top 85%", toggleActions: "play pause resume pause" } });
  });
  gsap.from(".gallery-item", { y: 34, autoAlpha: 0, duration: 0.8, stagger: 0.06, ease: "power3.out", scrollTrigger: { trigger: ".gallery-grid", start: "top 82%" } });
  gsap.from(".contact-card", { y: 28, autoAlpha: 0, duration: 0.8, stagger: 0.08, ease: "power3.out", scrollTrigger: { trigger: ".contact-strip", start: "top 82%" } });
}

function initAirflowAnimation() {
  const paths = gsap.utils.toArray(".airflow-path");
  const particles = gsap.utils.toArray(".airflow-particle");
  if (!paths.length || !particles.length || prefersReducedMotion) return;

  gsap.to(paths, {
    strokeDashoffset: -44,
    duration: 1.8,
    repeat: -1,
    ease: "none"
  });

  particles.forEach((particle, index) => {
    const selector = particle.dataset.path;
    if (!selector) return;
    gsap.set(particle, { transformOrigin: "center center" });
    gsap.to(particle, {
      duration: 2.2 + index * 0.08,
      repeat: -1,
      ease: "none",
      delay: index * 0.22,
      motionPath: {
        path: selector,
        align: selector,
        alignOrigin: [0.5, 0.5],
        autoRotate: false,
        start: 0,
        end: 1
      }
    });
    gsap.to(particle, {
      opacity: 0.3,
      scale: 0.7,
      duration: 1.1,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: index * 0.18
    });
  });
}

function initHoverAnimations() {
  document.querySelectorAll(".gallery-item").forEach((item) => {
    item.addEventListener("mouseenter", () => gsap.to(item, { scale: 1.05, filter: "brightness(1.18)", duration: 0.38, ease: "power3.out" }));
    item.addEventListener("mouseleave", () => gsap.to(item, { scale: 1, filter: "brightness(1)", duration: 0.38, ease: "power3.out" }));
  });
  document.querySelectorAll(".spec-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rotateY = gsap.utils.mapRange(0, rect.width, -4, 4, x);
      const rotateX = gsap.utils.mapRange(0, rect.height, 4, -4, y);
      gsap.to(card, { rotateX, rotateY, transformPerspective: 900, duration: 0.35, ease: "power3.out" });
    });
    card.addEventListener("mouseleave", () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.55, ease: "elastic.out(1, .55)" }));
  });
}

function initLightbox() {
  const lightbox = document.getElementById("lightbox");
  const card = lightbox.querySelector(".lightbox-card");
  const preview = document.getElementById("lightbox-preview");
  const close = document.getElementById("lightbox-close");
  function openLightbox(label) {
    preview.textContent = label;
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    gsap.fromTo(lightbox, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: "power3.out" });
    gsap.fromTo(card, { scale: 0.92, y: 24 }, { scale: 1, y: 0, duration: 0.55, ease: "expo.out" });
  }
  function closeLightbox() {
    gsap.to(card, { scale: 0.94, y: 18, duration: 0.28, ease: "power3.out" });
    gsap.to(lightbox, {
      autoAlpha: 0,
      duration: 0.28,
      ease: "power3.out",
      onComplete: () => {
        lightbox.classList.remove("is-open");
        lightbox.setAttribute("aria-hidden", "true");
      }
    });
  }
  document.querySelectorAll(".gallery-item").forEach((item, index) => {
    item.addEventListener("click", () => {
      const label = item.dataset.title || `Gallery Item ${String(index + 1).padStart(2, "0")}`;
      openLightbox(label);
    });
  });
  close.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("is-open")) closeLightbox();
  });
}

function initMagneticButton() {
  const wrap = document.getElementById("magnetic-wrap");
  const btn = document.getElementById("buy-btn");
  if (!wrap || !btn || isMobile) return;
  wrap.addEventListener("mousemove", (e) => {
    const rect = wrap.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    gsap.to(btn, { x: x * 0.34, y: y * 0.42, duration: 0.42, ease: "power3.out" });
  });
  wrap.addEventListener("mouseleave", () => gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, .45)" }));
}

function initSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.15 });
      else target.scrollIntoView({ behavior: "smooth" });
    });
  });
}

function initBuyButton() {
  const button = document.getElementById("buy-btn");
  if (!button) return;
  button.addEventListener("click", (e) => {
    e.preventDefault();
    gsap.fromTo(e.currentTarget, { scale: 0.94 }, { scale: 1, duration: 0.55, ease: "elastic.out(1, .45)" });
    const target = document.querySelector(".contact-strip");
    if (lenis && target) lenis.scrollTo(target, { offset: -40, duration: 1 });
    else if (target) target.scrollIntoView({ behavior: "smooth" });
  });
}

window.__velocityStackTests = tests;
initParticles();
initCursor();
initIntroAnimations();
initHoverAnimations();
initLightbox();
initMagneticButton();
initSmoothAnchors();
initBuyButton();
initAirflowAnimation();
initThree();
