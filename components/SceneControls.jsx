"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

/**
 * Bottom-right toolbar of the hero stage: rotate mode, jump to the project
 * list and a settings popover (ambient motion, reset, static view).
 *
 * The settings panel uses the native Popover API; browsers without it get a
 * state-driven fallback (`data-fallback-open`) positioned with the same
 * `--options-right` / `--options-bottom` custom properties.
 */
export function SceneControls({
  ready,
  staticView,
  failed,
  reduced,
  reading,
  exploring,
  paused,
  onExplore,
  onPause,
  onReset,
  onView,
}) {
  const optionsRef = useRef(null);
  const settingsButtonRef = useRef(null);
  const rotateButtonRef = useRef(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);

  const closeOptions = useCallback(() => {
    if (optionsRef.current?.hidePopover) {
      optionsRef.current.hidePopover();
      return;
    }
    setFallbackOpen(false);
    if (optionsRef.current?.contains(document.activeElement)) {
      settingsButtonRef.current?.focus({ preventScroll: true });
    }
  }, []);

  const positionOptions = () => {
    const anchor = settingsButtonRef.current?.getBoundingClientRect();
    if (!anchor || !optionsRef.current) return;
    optionsRef.current.style.setProperty("--options-right", `${Math.max(16, innerWidth - anchor.right)}px`);
    optionsRef.current.style.setProperty("--options-bottom", `${innerHeight - anchor.top + 12}px`);
  };

  // Scrolling or resizing closes the panel instead of leaving it misplaced.
  useEffect(() => {
    window.addEventListener("scroll", closeOptions, { passive: true });
    window.addEventListener("resize", closeOptions);
    return () => {
      window.removeEventListener("scroll", closeOptions);
      window.removeEventListener("resize", closeOptions);
    };
  }, [closeOptions]);

  useEffect(() => {
    if (reading || staticView) closeOptions();
  }, [reading, staticView, closeOptions]);

  // Light dismiss for the fallback panel (native popovers do this themselves).
  useEffect(() => {
    if (!fallbackOpen) return;
    const onPointerDown = (event) => {
      if (optionsRef.current?.contains(event.target) || settingsButtonRef.current?.contains(event.target)) return;
      closeOptions();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeOptions();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [fallbackOpen, closeOptions]);

  // Escape leaves rotate mode (unless it is closing the settings panel).
  useEffect(() => {
    if (!exploring) return;
    const onKeyDown = (event) => {
      if (event.key !== "Escape" || popoverOpen || fallbackOpen) return;
      onExplore(false);
      rotateButtonRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [exploring, onExplore, popoverOpen, fallbackOpen]);

  return (
    <div className="scene-toolbar" role="group" aria-label="Scene controls">
      {!staticView && (
        <button
          ref={rotateButtonRef}
          className="scene-tool rotate-tool"
          type="button"
          aria-label={exploring ? "Stop spinning and scroll again" : "Spin the meteors"}
          aria-pressed={exploring}
          aria-describedby="scene-guidance"
          disabled={!ready}
          onClick={() => onExplore(!exploring)}
        >
          <Icon name={exploring ? "check" : "rotate"} />
          <span>{exploring ? "Done" : "Spin"}</span>
        </button>
      )}

      <a
        className="scene-tool projects-tool"
        href="#projects"
        onClick={() => {
          closeOptions();
          onExplore(false);
        }}
      >
        <Icon name="list" />
        <span>Ventures</span>
      </a>

      {!failed && (
        <button
          ref={settingsButtonRef}
          className="scene-tool options-tool"
          type="button"
          popoverTarget="scene-options"
          aria-label="Display options"
          aria-expanded={popoverOpen || fallbackOpen}
          aria-controls="scene-options"
          title="Display options"
          onClick={() => {
            if (optionsRef.current?.showPopover) return; // handled by popoverTarget
            positionOptions();
            setFallbackOpen((open) => !open);
          }}
        >
          <Icon name="settings" />
          {paused && !staticView && <span className="settings-paused" aria-hidden="true" />}
        </button>
      )}

      <div
        ref={optionsRef}
        id="scene-options"
        className="scene-options"
        popover="auto"
        data-fallback-open={fallbackOpen || undefined}
        onBeforeToggle={(event) => {
          if (event.newState === "open") positionOptions();
        }}
        onToggle={(event) => setPopoverOpen(event.newState === "open")}
        role="group"
        aria-label="Display options"
      >
        <div className="scene-options-heading">
          <span>Display options</span>
          <button type="button" aria-label="Close options" onClick={closeOptions}>
            <Icon name="close" />
          </button>
        </div>

        {!staticView && (
          <>
            <button
              className="scene-option"
              type="button"
              role="switch"
              aria-checked={!paused && !reduced}
              disabled={!ready || reduced}
              onClick={onPause}
            >
              <Icon name={paused || reduced ? "play" : "pause"} />
              <span>
                Background drift
                {reduced && <small>Your device asks for less motion</small>}
              </span>
              <span className="option-switch" aria-hidden="true" />
            </button>
            <button
              className="scene-option"
              type="button"
              disabled={!ready}
              onClick={() => {
                onReset();
                closeOptions();
              }}
            >
              <Icon name="reset" />
              <span>Put meteors back</span>
            </button>
          </>
        )}

        <button
          className="scene-option"
          type="button"
          role="switch"
          aria-checked={staticView}
          onClick={() => {
            closeOptions();
            onExplore(false);
            onView();
          }}
        >
          <Icon name="view" />
          <span>
            Flat mode
            <small>Skip the 3D, keep the content</small>
          </span>
          <span className="option-switch" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
