"use client";

import { useCallback, useEffect, useRef } from "react";
import { Icon } from "@/components/Icon";
import { ProjectMark, ProjectStatus } from "@/components/ProjectBits";
import { hostnameOf, projects } from "@/data/projects";

const DRAG_THRESHOLD = 7;
const KEY_ROTATION = {
  ArrowLeft: [0, -0.15],
  ArrowRight: [0, 0.15],
  ArrowUp: [-0.15, 0],
  ArrowDown: [0.15, 0],
};

const pad = (value) => String(value).padStart(2, "0");

/**
 * Modal project preview shown over the focused meteor. The 3D scene keeps
 * rendering behind it; `onPanelResize` reports the panel height so the scene
 * can frame the meteor above it, and `rotate(dx, dy)` spins the meteor.
 */
export function DetailDialog({ project, index, close, next, rotate, interactive, onPanelResize }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  const draggedRef = useRef(false); // suppresses the click that ends a drag
  const isOpen = !!project;

  const endDrag = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    draggedRef.current = true;
    if (drag.element.hasPointerCapture(drag.id)) drag.element.releasePointerCapture(drag.id);
  }, []);

  useEffect(() => {
    window.addEventListener("blur", endDrag);
    return () => {
      window.removeEventListener("blur", endDrag);
      endDrag();
    };
  }, [endDrag]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;
    dialog.showModal();
    closeButtonRef.current?.focus({ preventScroll: true });
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [isOpen]);

  // A new project starts at the top of the panel with no drag in progress.
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0;
    endDrag();
    return endDrag;
  }, [project?.id, endDrag]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !isOpen) return;
    const report = () => onPanelResize(panel.getBoundingClientRect().height);
    const observer = new ResizeObserver(report);
    observer.observe(panel);
    report();
    return () => observer.disconnect();
  }, [isOpen, onPanelResize]);

  return (
    <dialog
      ref={dialogRef}
      className="detail-dialog"
      style={project ? { "--project-accent": project.accent ?? "#c9d5dc" } : undefined}
      aria-labelledby="project-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      {interactive && (
        <button
          className="detail-art-interaction"
          aria-label={`Spin the ${project?.title ?? "venture"} meteor by dragging or with the arrow keys.`}
          onPointerDown={(event) => {
            if (event.button !== 0 || dragRef.current) return;
            dragRef.current = {
              id: event.pointerId,
              element: event.currentTarget,
              x: event.clientX,
              y: event.clientY,
              moved: false,
              distance: 0,
            };
            draggedRef.current = false;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.id !== event.pointerId) return;
            const dx = event.clientX - drag.x;
            const dy = event.clientY - drag.y;
            drag.distance += Math.hypot(dx, dy);
            drag.moved ||= drag.distance >= DRAG_THRESHOLD;
            rotate((dy / innerHeight) * 6, (dx / innerHeight) * 6);
            drag.x = event.clientX;
            drag.y = event.clientY;
          }}
          onPointerUp={(event) => {
            if (dragRef.current?.id !== event.pointerId) return;
            draggedRef.current = dragRef.current.moved;
            dragRef.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerCancel={(event) => {
            if (event.pointerId === dragRef.current?.id) endDrag();
          }}
          onLostPointerCapture={(event) => {
            if (event.pointerId === dragRef.current?.id) endDrag();
          }}
          onClick={(event) => {
            // Keyboard activation (detail 0) or a plain click gives a small nudge.
            if (event.detail === 0 || !draggedRef.current) rotate(0, 0.18);
            draggedRef.current = false;
          }}
          onKeyDown={(event) => {
            const step = KEY_ROTATION[event.key];
            if (!step) return;
            event.preventDefault();
            rotate(...step);
          }}
        />
      )}

      <div className="detail-art-caption" aria-hidden="true">
        {pad(index + 1)} / {project?.title}
        <span>
          {interactive ? "DRAG TO SPIN · " : ""}SPRDLX PORTFOLIO
        </span>
      </div>

      <div className="detail-panel" ref={panelRef}>
        <div className="detail-toolbar">
          <a href={project ? `/work/${project.id}/` : "#"}>
            Full story <Icon />
          </a>
          <button ref={closeButtonRef} className="close-button" onClick={close} aria-label="Close venture preview">
            Close <Icon name="close" />
          </button>
        </div>

        {project && (
          <article className="project-preview">
            <div className="preview-heading">
              <ProjectMark project={project} />
              <div>
                <h2 id="project-title">{project.title}</h2>
                <p>{project.category}</p>
              </div>
              <span className="preview-number">
                {pad(index + 1)} / {pad(projects.length)}
              </span>
            </div>
            <p className="preview-summary">{project.summary}</p>
            <div className="preview-status">
              <ProjectStatus status={project.status} />
              {project.status === "In development" ? " · Pre-launch" : ""}
            </div>
            <a
              className="button preview-visit"
              href={project.url ?? `/work/${project.id}/`}
              target={project.url ? "_blank" : undefined}
              rel={project.url ? "noopener noreferrer" : undefined}
            >
              {project.url ? `Visit ${hostnameOf(project.url)}` : "View venture"}
              <Icon />
            </a>
          </article>
        )}

        <div className="detail-bottom">
          <button className="text-link" onClick={close}>
            <Icon name="arrow-left" /> All ventures
          </button>
          <button className="text-link" onClick={next}>
            Next venture <Icon name="arrow-right" />
          </button>
        </div>
      </div>
    </dialog>
  );
}
