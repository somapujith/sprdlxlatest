"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useContactOpen } from "@/components/ContactProvider";
import { DetailDialog } from "@/components/DetailDialog";
import { Icon } from "@/components/Icon";
import { SceneControls } from "@/components/SceneControls";
import { projects } from "@/data/projects";
import { site } from "@/data/site";
import { closeStrategy, resolveProject, sceneIndices } from "@/lib/gestures";

// Window events shared with the 3D scene.
//   studio:navigate – the ?project= URL changed through pushState/replaceState
//   studio:restore  – scroll position was restored; re-measure scroll-driven state
const NAVIGATE_EVENT = "studio:navigate";
const RESTORE_EVENT = "studio:restore";
// history.state key naming the shell instance that pushed a ?project= entry.
const OWNER_KEY = "__studioOwner";

const READY_TIMEOUT = 20000; // fall back to the static view if the scene never reports ready
const ENVIRONMENTS = ["lunar", "nebula", "sunrise"];
const NAV_ITEMS = [
  ["work", "Work", "#projects"],
  ["studio", "Studio", "#studio"],
  ["about", "Method", "#about"],
  ["contact", "Contact", "#contact"],
];
const LABEL_KEYS = {
  ArrowLeft: [0, -0.15],
  ArrowRight: [0, 0.15],
  ArrowUp: [-0.15, 0],
  ArrowDown: [0.15, 0],
};

const PROJECT_IDS = projects.map((project) => project.id);
const SLOTS = sceneIndices(projects.length);
const LAST_PROJECT = projects[projects.length - 1];

const pad = (value) => String(value).padStart(2, "0");

const OrbitCanvas = dynamic(() => import("@/components/scene/OrbitCanvas"), { ssr: false });

/**
 * Shared mutable state between the DOM shell and the 3D scene. It is created
 * once and mutated in place: the scene reads and writes it every frame, so it
 * deliberately lives outside React state.
 */
function createRuntime(count) {
  const { transformSlots } = sceneIndices(count);
  return {
    progress: 0, // scroll progress through the #top track, 0..1
    smoothProgress: 0,
    sceneFrames: 0, // incremented by the scene for every rendered frame
    focus: 0, // 0 = orbit, 1 = a project is focused (tweened)
    detailPanelHeight: 280,
    selected: -1,
    phase: "loading", // loading | browsing | fallback | dragging | focusing | reading | restoring
    pointer: { x: 0, y: 0 },
    backgroundPress: null,
    backgroundBurst: { x: 0, y: 0, sequence: 0 },
    finaleSpin: 0,
    earthRotation: { x: 0, y: 0 },
    earthPulse: 0,
    finaleMeteorButton: null,
    earthButton: null,
    hover: -1,
    hoverLabel: -1,
    gesture: null,
    orbitOffsets: Array.from({ length: transformSlots }, () => 0),
    rotations: Array.from({ length: transformSlots }, () => ({ x: 0, y: 0 })),
    cancelGesture: () => {},
    environments: [],
    journey: null,
    reduced: false,
    visible: true,
    paused: false,
    labels: [],
    intro: null,
    current: null,
    finale: null,
    stage: null,
    inFinale: false,
    activeIndex: 0,
    transitionId: 0,
    invalidate: () => {},
    restoreFocus: () => {},
  };
}

/* ------------------------------------------------------------------------ */
/* URL state                                                                 */
/* ------------------------------------------------------------------------ */

const notifyNavigation = () => window.dispatchEvent(new Event(NAVIGATE_EVENT));

function subscribeToLocation(callback) {
  window.addEventListener("popstate", callback);
  window.addEventListener(NAVIGATE_EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(NAVIGATE_EVENT, callback);
  };
}
const getSearch = () => window.location.search;
const getServerSearch = () => "";

/**
 * `?project=<id>` drives the detail dialog. Opening pushes a history entry
 * (owned by this page load) so Back closes it; closing goes back when we own
 * the entry and otherwise replaces the URL. On close the scroll position,
 * scroll progress and keyboard focus from before the dialog are restored.
 */
function useProjectUrl(runtime) {
  const search = useSyncExternalStore(subscribeToLocation, getSearch, getServerSearch);
  const slug = resolveProject(new URLSearchParams(search).get("project"), PROJECT_IDS);

  const ownerRef = useRef("");
  const keyboardRef = useRef(false); // was the last input a key press?
  const snapshotRef = useRef(null); // page state captured before a project opened
  const closingRef = useRef(false);
  const previousSlugRef = useRef(null);

  useEffect(() => {
    ownerRef.current = crypto.randomUUID();
    const onPointerDown = () => {
      keyboardRef.current = false;
    };
    const onKeyDown = () => {
      keyboardRef.current = true;
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  const capture = useCallback(
    (id) => {
      const indexAnchor = id ? document.querySelector(`.project-row[data-project="${id}"]`) : null;
      snapshotRef.current = {
        scrollY: window.scrollY,
        keyboard: keyboardRef.current,
        progress: runtime.progress,
        focusElement: document.activeElement instanceof HTMLElement ? document.activeElement : null,
        viewportHeight: window.innerHeight,
        trackHeight: document.getElementById("top")?.offsetHeight ?? 0,
        indexAnchor,
        anchorTop: indexAnchor?.getBoundingClientRect().top ?? 0,
      };
    },
    [runtime],
  );

  const open = useCallback(
    (id) => {
      if (!projects.some((project) => project.id === id)) return;
      const url = new URL(window.location.href);
      const alreadyOpen = resolveProject(url.searchParams.get("project"), PROJECT_IDS);
      if (!alreadyOpen) capture(id);
      runtime.restoreFocus = () => {};
      url.searchParams.set("project", id);
      if (alreadyOpen) {
        // Switching projects inside the dialog does not add history entries.
        window.history.replaceState({ [OWNER_KEY]: window.history.state?.[OWNER_KEY] ?? null }, "", url);
      } else {
        window.history.pushState({ [OWNER_KEY]: ownerRef.current }, "", url);
      }
      notifyNavigation();
      closingRef.current = false;
    },
    [capture, runtime],
  );

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (closeStrategy(window.history.state?.[OWNER_KEY], ownerRef.current) === "back") {
      window.history.back();
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete("project");
      window.history.replaceState({ [OWNER_KEY]: null }, "", url);
      notifyNavigation();
    }
  }, []);

  useEffect(() => {
    // Opened from outside open() (direct link, Back/Forward): capture now.
    if (slug && !previousSlugRef.current && !snapshotRef.current) capture();

    if (!slug && previousSlugRef.current) {
      const snapshot = snapshotRef.current;
      if (snapshot) {
        const trackHeight = document.getElementById("top")?.offsetHeight ?? snapshot.trackHeight;
        const wasInTrack = snapshot.scrollY <= snapshot.trackHeight - snapshot.viewportHeight;
        let top =
          wasInTrack && (snapshot.viewportHeight !== innerHeight || trackHeight !== snapshot.trackHeight)
            ? snapshot.progress * Math.max(0, trackHeight - innerHeight) // layout changed: keep progress
            : snapshot.scrollY;
        if (!wasInTrack && trackHeight !== snapshot.trackHeight) {
          // Below the track: keep the index row (or the same offset) in place.
          top = snapshot.indexAnchor?.isConnected
            ? snapshot.indexAnchor.getBoundingClientRect().top + scrollY - snapshot.anchorTop
            : trackHeight + snapshot.scrollY - snapshot.trackHeight;
        }

        runtime.progress = snapshot.progress;
        runtime.smoothProgress = snapshot.progress;
        requestAnimationFrame(() => {
          window.scrollTo({ top, behavior: "instant" });
          window.dispatchEvent(new Event(RESTORE_EVENT));
          runtime.restoreFocus = () => {
            const element = snapshot.focusElement;
            if (!snapshot.keyboard) {
              if (element && document.activeElement === element) element.blur();
              return;
            }
            const target =
              element?.isConnected && element !== document.body && getComputedStyle(element).visibility !== "hidden"
                ? element
                : snapshot.indexAnchor;
            target?.focus({ preventScroll: true });
          };
          if (runtime.phase === "browsing" || runtime.phase === "fallback") runtime.restoreFocus();
        });
      }
      snapshotRef.current = null;
    }

    previousSlugRef.current = slug;
    closingRef.current = false;
  }, [slug, runtime, capture]);

  return { slug, open, close };
}

/* ------------------------------------------------------------------------ */
/* Header navigation state                                                   */
/* ------------------------------------------------------------------------ */

const TRACKED_SECTIONS = ["studio", "about", "contact"];

function sectionAt(scrollTop, viewportHeight, documentHeight, sections) {
  if (scrollTop + viewportHeight >= documentHeight - 2) return "contact";
  let active = "work";
  for (const section of sections) {
    if (section.top <= scrollTop + (section.activationOffset ?? 120)) active = section.id;
  }
  return active;
}

/** Which header link is current. Frozen while a project is open. */
function useActiveSection(disabled) {
  const [active, setActive] = useState("work");

  useEffect(() => {
    if (disabled) return;
    let frame = 0;
    let disposed = false;

    const measure = () => {
      frame = 0;
      const sections = TRACKED_SECTIONS.flatMap((id) => {
        const element = document.getElementById(id);
        if (!element) return [];
        const activationOffset = (parseFloat(getComputedStyle(element).scrollMarginTop) || 0) + 1;
        return [{ id, top: element.getBoundingClientRect().top + scrollY, activationOffset }];
      });
      setActive(sectionAt(scrollY, innerHeight, document.documentElement.scrollHeight, sections));
    };
    const schedule = () => {
      if (!disposed && !frame) frame = requestAnimationFrame(measure);
    };

    const events = ["scroll", "resize", "hashchange", "popstate", RESTORE_EVENT];
    events.forEach((name) => window.addEventListener(name, schedule, { passive: true }));
    const observer = new ResizeObserver(schedule);
    for (const selector of [".editorial-content", ".experience-track"]) {
      const element = document.querySelector(selector);
      if (element) observer.observe(element);
    }
    document.fonts.ready.then(schedule);
    schedule();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      events.forEach((name) => window.removeEventListener(name, schedule));
    };
  }, [disabled]);

  return active;
}

/* ------------------------------------------------------------------------ */
/* Small pieces                                                              */
/* ------------------------------------------------------------------------ */

/** Maps scroll through the #top track to runtime.progress (0..1). */
function ScrollProgress({ runtime, track }) {
  useEffect(() => {
    if (!track.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const setProgress = (value) => {
      runtime.progress = value;
      if (runtime.visible) runtime.invalidate();
    };
    const trigger = ScrollTrigger.create({
      trigger: track.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        if (runtime.phase !== "dragging" && runtime.selected === -1) setProgress(self.progress);
      },
    });
    setProgress(trigger.progress);

    const onRestore = () => {
      trigger.refresh();
      if (runtime.selected < 0) setProgress(trigger.progress);
      runtime.invalidate();
    };
    window.addEventListener(RESTORE_EVENT, onRestore);
    return () => {
      trigger.kill();
      window.removeEventListener(RESTORE_EVENT, onRestore);
    };
  }, [runtime, track]);

  return null;
}

/** Frame-time readout, only with `?perf=1` in the URL. */
function PerfOverlay({ runtime }) {
  const [text, setText] = useState(null);

  useEffect(() => {
    if (new URLSearchParams(location.search).get("perf") !== "1") return;

    let frameTimes = [];
    let lastFrame = performance.now();
    let sceneFrames = runtime.sceneFrames;
    let sampleStart = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      frameTimes = [...frameTimes, now - lastFrame];
      lastFrame = now;
      raf = requestAnimationFrame(tick);
    });

    const interval = window.setInterval(() => {
      const sorted = [...frameTimes].sort((a, b) => a - b);
      const now = performance.now();
      const sceneFps = Math.round(((runtime.sceneFrames - sceneFrames) * 1000) / (now - sampleStart));
      frameTimes = [];
      sceneFrames = runtime.sceneFrames;
      sampleStart = now;
      if (!sorted.length) return;

      const average = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
      const canvas = document.querySelector("canvas");
      const dpr = canvas?.clientWidth ? (canvas.width / canvas.clientWidth).toFixed(2) : "–";
      const p95 = Math.round(sorted[Math.floor(0.95 * sorted.length)]);
      setText(
        `3D ${sceneFps} fps · page ${Math.round(1000 / average)} fps · p95 ${p95} ms · worst ${Math.round(
          sorted[sorted.length - 1],
        )} ms · dpr ${dpr}`,
      );
    }, 1000);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(interval);
    };
  }, [runtime]);

  return text ? (
    <output className="perf-overlay" aria-hidden="true">
      {text}
    </output>
  ) : null;
}

/** Renders nothing once the scene throws; `onError` switches to the static view. */
class SceneBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Logo shown in place of the 3D scene in the static view. */
function StaticBrand() {
  return (
    <img
      className="static-brand"
      src={site.logo}
      width={873}
      height={774}
      alt=""
      aria-hidden="true"
      loading="eager"
      decoding="async"
    />
  );
}

/* ------------------------------------------------------------------------ */
/* Shell                                                                     */
/* ------------------------------------------------------------------------ */

/**
 * Page chrome around the home page: header, the scroll-driven 3D hero stage,
 * the project detail dialog and all the glue between them. `children` (the
 * editorial sections, including `#projects`, `#studio`, `#about`, `#contact`)
 * render inside <main> after the hero track.
 */
export function ExperienceShell({ children, contactEmail }) {
  const contactOpen = useContactOpen();
  const [runtime] = useState(() => createRuntime(projects.length));
  const trackRef = useRef(null);

  const onPanelResize = useCallback(
    (height) => {
      runtime.detailPanelHeight = height;
      runtime.invalidate();
    },
    [runtime],
  );

  const { slug, open: openProject, close: closeProject } = useProjectUrl(runtime);
  const activeSection = useActiveSection(!!slug);

  const [ready, setReady] = useState(false); // scene rendered its first frame
  const [mounted, setMounted] = useState(false);
  const [staticChoice, setStaticChoice] = useState(false); // user picked the static view
  const [failed, setFailed] = useState(false); // scene errored or timed out
  const [reduced, setReduced] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [inFinale, setInFinale] = useState(false);
  const [exploring, setExploringState] = useState(false); // touch rotate mode
  const [paused, setPaused] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const selectedIndex = projects.findIndex((project) => project.id === slug);
  const selectedProject = projects[selectedIndex];
  const chapterProject = projects[chapter] ?? projects[0];
  const staticView = staticChoice || failed;

  const fail = useCallback(() => {
    setFailed(true);
    runtime.phase = "fallback";
  }, [runtime]);

  const onReady = useCallback(() => {
    setReady(true);
    if (runtime.selected === -1) runtime.phase = "browsing";
  }, [runtime]);

  const setExploring = useCallback(
    (value) => {
      runtime.cancelGesture();
      setExploringState(value);
    },
    [runtime],
  );

  const selectIndex = useCallback((index) => openProject(projects[index].id), [openProject]);

  // Scroll to a #hash on load / hashchange, then drop the hash from the URL.
  useEffect(() => {
    const scrollToHash = () => {
      if (!location.hash) return;
      let id;
      try {
        id = decodeURIComponent(location.hash.slice(1));
      } catch {
        return;
      }
      const target = document.getElementById(id);
      if (!target) return;
      target.scrollIntoView({ behavior: "instant", block: "start" });
      const url = new URL(location.href);
      url.hash = "";
      history.replaceState(history.state, "", url);
    };
    const frame = requestAnimationFrame(scrollToHash);
    window.addEventListener("hashchange", scrollToHash);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", scrollToHash);
    };
  }, []);

  // Reduced motion, tab visibility and whether the hero track is on screen.
  useEffect(() => {
    const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      runtime.reduced = motionQuery.matches;
      setReduced(motionQuery.matches);
    };
    updateMotion();
    motionQuery.addEventListener("change", updateMotion);
    setMounted(true);

    const updateVisibility = () => {
      const rect = trackRef.current?.getBoundingClientRect();
      runtime.visible =
        !document.hidden && (runtime.selected >= 0 || (!!rect && rect.bottom > 0 && rect.top < innerHeight));
      runtime.invalidate();
    };
    document.addEventListener("visibilitychange", updateVisibility);

    const observer = new IntersectionObserver(
      ([entry]) => {
        runtime.visible = (runtime.selected >= 0 || entry.isIntersecting) && !document.hidden;
        if (!entry.isIntersecting && runtime.selected < 0) {
          runtime.cancelGesture();
          setExploringState(false);
        }
        runtime.invalidate();
      },
      { threshold: 0 },
    );
    if (trackRef.current) observer.observe(trackRef.current);

    return () => {
      observer.disconnect();
      motionQuery.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, [runtime]);

  // Focus tween towards / away from the selected project.
  useEffect(() => {
    runtime.selected = selectedIndex;
    setExploringState(false);
    if (selectedIndex >= 0) {
      runtime.visible = true;
    } else {
      const rect = trackRef.current?.getBoundingClientRect();
      runtime.visible = !!rect && rect.bottom > 0 && rect.top < innerHeight;
    }
    runtime.cancelGesture();

    const transition = ++runtime.transitionId;
    runtime.phase = selectedIndex < 0 ? "restoring" : "focusing";
    const tween = gsap.to(runtime, {
      focus: selectedIndex < 0 ? 0 : 1,
      duration: runtime.reduced ? 0 : 0.85,
      ease: "power3.inOut",
      overwrite: true,
      onUpdate: () => runtime.invalidate(),
      onComplete: () => {
        if (runtime.transitionId !== transition) return;
        if (selectedIndex < 0) {
          runtime.phase = failed ? "fallback" : "browsing";
          requestAnimationFrame(() => runtime.restoreFocus());
        } else {
          runtime.phase = "reading";
        }
      },
    });
    return () => {
      tween.kill();
    };
  }, [selectedIndex, runtime, failed]);

  // Ambient motion stops when paused or while the contact dialog is open.
  useEffect(() => {
    runtime.paused = paused || contactOpen;
    if (contactOpen) {
      runtime.cancelGesture();
      setExploringState(false);
    }
    runtime.invalidate();
  }, [paused, contactOpen, runtime]);

  // If the scene has not reported ready after 20s of visible time, give up.
  useEffect(() => {
    if (!mounted || ready || staticView) return;
    let timer;
    const arm = () => {
      window.clearTimeout(timer);
      if (!document.hidden) timer = window.setTimeout(fail, READY_TIMEOUT);
    };
    arm();
    document.addEventListener("visibilitychange", arm);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", arm);
    };
  }, [mounted, ready, staticView, fail]);

  // Layout changes with the static view / reduced motion: re-measure scroll.
  useEffect(() => {
    runtime.hover = runtime.hoverLabel = -1;
    requestAnimationFrame(() => window.dispatchEvent(new Event(RESTORE_EVENT)));
  }, [staticView, reduced, runtime]);

  // In-page anchors scroll smoothly (and move focus for keyboard users);
  // any a[data-project] opens the detail dialog instead of navigating.
  const handleClick = (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    const anchor = event.target.closest('a[href^="#"], a.header-logo[href="/"], a.studio-logo[href="/"]');
    if (anchor && !anchor.hasAttribute("download") && !anchor.target) {
      const href = anchor.getAttribute("href");
      const destination = document.getElementById(href === "/" ? "top" : decodeURIComponent(href.slice(1)));
      if (destination) {
        event.preventDefault();
        setExploring(false);
        const url = new URL(window.location.href);
        url.hash = "";
        window.history.replaceState(window.history.state, "", url);
        destination.scrollIntoView({ behavior: runtime.reduced ? "instant" : "smooth", block: "start" });

        if (event.detail === 0) {
          // Keyboard activation: move focus to the section heading.
          const heading = destination.querySelector("h1, h2, h3") ?? destination;
          const previousTabIndex = heading.getAttribute("tabindex");
          heading.setAttribute("tabindex", "-1");
          heading.focus({ preventScroll: true });
          if (previousTabIndex === null) {
            heading.addEventListener("blur", () => heading.removeAttribute("tabindex"), { once: true });
          }
        }
        return;
      }
    }

    const projectLink = event.target.closest("a[data-project]");
    if (projectLink?.dataset.project) {
      event.preventDefault();
      openProject(projectLink.dataset.project);
    }
  };

  const resetPositions = () => {
    runtime.cancelGesture();
    runtime.orbitOffsets.fill(0);
    runtime.rotations.forEach((rotation) => {
      rotation.x = 0;
      rotation.y = 0;
    });
    runtime.finaleSpin = 0;
    runtime.earthRotation.x = runtime.earthRotation.y = 0;
    setAnnouncement("Every meteor is back where it started.");
    runtime.invalidate();
  };

  const journeyLabel = inFinale
    ? "04 / HOME PLANET"
    : chapter < 2
      ? "01 / MOONDUST"
      : chapter < 5
        ? "02 / NEBULA"
        : "03 / DAYBREAK";

  return (
    <div
      className={`experience-shell ${slug ? "is-reading" : ""} ${staticView ? "is-static" : ""} ${
        reduced ? "reduced-motion" : ""
      }`}
      onClick={handleClick}
    >
      <a className="skip-link" href="#projects">
        Skip to the ventures
      </a>
      <PerfOverlay runtime={runtime} />

      <header className={`site-header${activeSection === "studio" ? " on-studio" : ""}`}>
        <div className="header-brand">
          <a className="header-logo" href="/" aria-label={`${site.name}, home`}>
            <img src={site.logo} alt="" width={873} height={774} loading="eager" decoding="async" />
          </a>
        </div>
        <nav aria-label="Main navigation">
          {NAV_ITEMS.map(([id, label, href]) => (
            <a key={id} href={href} aria-current={activeSection === id ? "location" : undefined}>
              {label}
            </a>
          ))}
        </nav>
        <a className="button contact-button" data-contact href={`mailto:${contactEmail}`} aria-haspopup="dialog">
          Pitch us <Icon />
        </a>
      </header>

      <main>
        <section id="top" className="experience-track" ref={trackRef} aria-label="3D venture map">
          <div
            className={`experience-stage${inFinale ? " is-earth" : ""}`}
            ref={(element) => {
              runtime.stage = element;
            }}
          >
            <div className="space-environments" aria-hidden="true">
              {ENVIRONMENTS.map((name, index) => (
                <div
                  key={name}
                  className={`space-environment environment-${name}`}
                  ref={(element) => {
                    runtime.environments[index] = element;
                  }}
                >
                  {/* Only the first backdrop loads up front; the rest once the scene is ready. */}
                  <img
                    src={index === 0 || ready ? `/media/environments/${name}.webp` : undefined}
                    alt=""
                    width="1672"
                    height="941"
                    loading={index === 0 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "low"}
                    decoding="async"
                  />
                </div>
              ))}
            </div>

            <div
              className={`scene-surface ${ready && !staticView ? "scene-ready" : ""}`}
              aria-hidden="true"
              onPointerMove={(event) => {
                runtime.pointer.x = (event.clientX / innerWidth) * 2 - 1;
                runtime.pointer.y = -((event.clientY / innerHeight) * 2 - 1);
                runtime.invalidate();
              }}
              onPointerDown={(event) => {
                runtime.backgroundPress =
                  runtime.gesture || event.button !== 0
                    ? null
                    : { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now() };
              }}
              onPointerUp={(event) => {
                // A quick, still tap on empty space sends a light burst.
                const press = runtime.backgroundPress;
                runtime.backgroundPress = null;
                if (!press || press.id !== event.pointerId || runtime.gesture) return;
                if (Math.hypot(event.clientX - press.x, event.clientY - press.y) >= 7) return;
                if (performance.now() - press.time >= 350) return;
                runtime.backgroundBurst.x = (event.clientX / innerWidth) * 2 - 1;
                runtime.backgroundBurst.y = 1 - (event.clientY / innerHeight) * 2;
                runtime.backgroundBurst.sequence++;
                runtime.invalidate();
              }}
              onPointerCancel={() => {
                runtime.backgroundPress = null;
              }}
              onPointerLeave={() => {
                runtime.pointer.x = 0;
                runtime.pointer.y = 0;
                runtime.hover = -1;
                runtime.backgroundPress = null;
                runtime.invalidate();
              }}
            >
              {staticView && <StaticBrand />}
              {mounted && !staticView && (
                <SceneBoundary onError={fail}>
                  <OrbitCanvas
                    runtime={runtime}
                    onReady={onReady}
                    onError={fail}
                    onSelect={selectIndex}
                    onChapter={setChapter}
                    exploreTouch={exploring}
                    onFinale={setInFinale}
                  />
                </SceneBoundary>
              )}
            </div>

            {!staticView && (
              <div
                className={`scene-loader ${ready ? "is-ready" : ""}`}
                role="status"
                aria-live="polite"
                aria-hidden={ready}
              >
                <span className="scene-loader-ring" aria-hidden="true" />
                <span>{ready ? "" : "Lighting up the sky"}</span>
              </div>
            )}

            <div className="scene-vignette" />

            <div className="journey-indicator" aria-hidden="true">
              <span>THE SPRDLX SKY</span>
              <div className="journey-rail">
                <div
                  ref={(element) => {
                    runtime.journey = element;
                  }}
                />
              </div>
              <span>{journeyLabel}</span>
            </div>

            <div
              className="hero-copy"
              ref={(element) => {
                runtime.intro = element;
              }}
            >
              <p className="eyebrow">AI VENTURE STUDIO</p>
              <h1>
                From spark
                <br />
                to company,
                <br />
                <span>on repeat.</span>
              </h1>
              <p className="hero-description">
                An AI venture studio in India. We give early ideas a product, a brand and capital — then push them
                into the market.
              </p>
              <a className="text-link hero-link" href="#projects">
                See the ventures <Icon />
              </a>
            </div>

            <div className="object-labels" aria-label="Open a venture">
              {projects.map((project, index) => (
                <a
                  key={project.id}
                  ref={(element) => {
                    runtime.labels[index] = element;
                  }}
                  className="object-label"
                  href={`/work/${project.id}/`}
                  data-project={project.id}
                  aria-description="Drag to swing this meteor around its path and spin it. Arrow keys turn and shift it. Enter opens the venture."
                  onKeyDown={(event) => {
                    const step = LABEL_KEYS[event.key];
                    if (!step) return;
                    event.preventDefault();
                    runtime.rotations[index].x += step[0];
                    // Same split as a drag: part slides along the orbit, the rest spins.
                    const slide = (step[1] + 0.35 * step[0]) * 0.55;
                    runtime.orbitOffsets[index] += slide;
                    runtime.rotations[index].y += step[1] - slide;
                    runtime.invalidate();
                  }}
                  onFocus={() => {
                    runtime.hoverLabel = index;
                    runtime.invalidate();
                  }}
                  onBlur={() => {
                    if (runtime.hoverLabel === index) runtime.hoverLabel = -1;
                    runtime.invalidate();
                  }}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "touch" || event.buttons !== 0) return;
                    runtime.hoverLabel = index;
                    runtime.invalidate();
                  }}
                  onPointerLeave={() => {
                    if (runtime.hoverLabel === index) runtime.hoverLabel = -1;
                    runtime.invalidate();
                  }}
                >
                  <span className="label-number">{pad(index + 1)}</span>
                  <span>
                    {project.title}
                    <small>
                      {project.category}
                      {project.status === "In development" ? " · In the works" : ""}
                    </small>
                  </span>
                  <span className="label-arrow" aria-hidden="true">
                    <Icon />
                  </span>
                </a>
              ))}
            </div>

            <button
              className="scene-keyboard-target orbit-keyboard-target"
              aria-label="Spin every meteor at once with the arrow keys."
              onKeyDown={(event) => {
                if (!event.key.startsWith("Arrow")) return;
                event.preventDefault();
                runtime.rotations[SLOTS.rig].y += event.key === "ArrowLeft" || event.key === "ArrowUp" ? -0.16 : 0.16;
                runtime.invalidate();
              }}
              onClick={() => {
                runtime.rotations[SLOTS.rig].y += 0.2;
                runtime.invalidate();
              }}
              hidden={staticView || !ready || inFinale}
            >
              Spin orbit
            </button>
            <button
              className="scene-keyboard-target finale-meteor-target"
              ref={(element) => {
                runtime.finaleMeteorButton = element;
              }}
              aria-label={`Open ${LAST_PROJECT.title}. Arrow keys spin the incoming meteor.`}
              onKeyDown={(event) => {
                if (!event.key.startsWith("Arrow")) return;
                event.preventDefault();
                runtime.finaleSpin += event.key === "ArrowLeft" || event.key === "ArrowUp" ? -0.16 : 0.16;
                runtime.invalidate();
              }}
              onClick={() => openProject(LAST_PROJECT.id)}
              hidden={!inFinale || staticView}
            >
              {`Open ${LAST_PROJECT.title}`}
            </button>
            <button
              className="scene-keyboard-target earth-keyboard-target"
              ref={(element) => {
                runtime.earthButton = element;
              }}
              aria-label="Spin the globe by dragging or with the arrow keys. Enter sends out a pulse of light."
              onKeyDown={(event) => {
                if (!event.key.startsWith("Arrow")) return;
                event.preventDefault();
                if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                  runtime.earthRotation.y += event.key === "ArrowLeft" ? -0.16 : 0.16;
                } else {
                  runtime.earthRotation.x += event.key === "ArrowUp" ? -0.12 : 0.12;
                }
                runtime.invalidate();
              }}
              onClick={() => {
                runtime.earthPulse++;
                runtime.invalidate();
              }}
              hidden={!inFinale || staticView}
            >
              Spin Earth
            </button>

            <div
              className="chapter-copy"
              ref={(element) => {
                runtime.current = element;
              }}
            >
              <p className="eyebrow">VENTURE / {pad(chapter + 1)}</p>
              <a href={`/work/${chapterProject.id}/`} data-project={chapterProject.id}>
                {chapterProject.title}
                <Icon />
              </a>
              <p>
                {chapterProject.category}
                {chapterProject.status === "In development" ? " · In the works" : ""}
              </p>
            </div>

            <div
              className="finale-copy"
              ref={(element) => {
                runtime.finale = element;
              }}
            >
              <p className="eyebrow">ONE STUDIO, MANY LAUNCHES</p>
              <h2>
                Sparks land.
                <br />
                Companies grow.
              </h2>
              <p className="finale-caption">Every venture finds its own ground.</p>
              <a className="finale-continue inline-icon-link" href="#projects">
                On to the ventures <Icon name="swipe" />
              </a>
              <p className="earth-credit">Earth imagery courtesy of NASA / GSFC</p>
            </div>

            <div className="stage-bottom">
              <div className={`motion-hint${exploring ? " is-interacting" : ""}`} id="scene-guidance" role="status">
                <Icon name={exploring ? "rotate" : "swipe"} />
                <span>
                  {staticView ? (
                    "Every venture is listed just below"
                  ) : (
                    <>
                      <span className="pointer-hint">
                        {inFinale
                          ? "Drag to spin Earth · Keep scrolling"
                          : "Scroll to fly · Drag to spin · Click a meteor"}
                      </span>
                      <span className="touch-hint">
                        {exploring
                          ? "Drag to spin · Tap Done to scroll on"
                          : inFinale
                            ? "Swipe on · Use Spin to turn Earth"
                            : "Swipe to fly · Tap any meteor"}
                      </span>
                    </>
                  )}
                </span>
              </div>

              <SceneControls
                ready={ready}
                staticView={staticView}
                failed={failed}
                reduced={reduced}
                reading={!!slug}
                exploring={exploring}
                paused={paused}
                onExplore={setExploring}
                onPause={() => setPaused(!paused)}
                onReset={resetPositions}
                onView={() => {
                  // Leaving the static view remounts the scene, which must report ready again.
                  if (staticChoice) setReady(false);
                  setStaticChoice(!staticChoice);
                }}
              />

              <span className="chapter-count">
                {inFinale ? (
                  "LANDED / EARTH"
                ) : (
                  <>
                    <span>{pad(chapter + 1)}</span> / {pad(projects.length)}
                  </>
                )}
              </span>
            </div>

            <span className="sr-only" role="status">
              {announcement}
              {failed ? "The 3D view couldn’t load. Every venture is listed below." : ""}
            </span>
          </div>
        </section>
        {children}
      </main>

      <DetailDialog
        onPanelResize={onPanelResize}
        interactive={!staticView && ready}
        project={selectedProject}
        index={selectedIndex}
        close={closeProject}
        next={() => selectIndex((selectedIndex + 1) % projects.length)}
        rotate={(dx, dy) => {
          if (selectedIndex < 0) return;
          runtime.rotations[selectedIndex].x += dx;
          runtime.rotations[selectedIndex].y += dy;
          runtime.invalidate();
        }}
      />
      <ScrollProgress runtime={runtime} track={trackRef} />
    </div>
  );
}
