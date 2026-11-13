"use client";

import dynamic from "next/dynamic";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

// The form is only downloaded the first time someone opens the dialog.
const ContactForm = dynamic(() => import("@/components/ContactForm"), {
  ssr: false,
  loading: () => (
    <p className="contact-loading" role="status">
      Loading the form…
    </p>
  ),
});

const ContactOpenContext = createContext(false);

/** True while the contact dialog is open (the 3D scene pauses meanwhile). */
export function useContactOpen() {
  return useContext(ContactOpenContext);
}

/**
 * Wraps the page and turns every click on a `[data-contact]` element (usually
 * a `mailto:` link, so it still works without JS) into the contact dialog.
 */
export function ContactProvider({ children, email, preview = false }) {
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState(false); // form mounted at least once
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const closeButtonRef = useRef(null);

  const close = () => setOpen(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    dialog.showModal();
    closeButtonRef.current?.focus({ preventScroll: true });

    return () => {
      dialog.close();
      root.style.overflow = previousOverflow;
      triggerRef.current?.focus({ preventScroll: true });
    };
  }, [open]);

  const handleClickCapture = (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const trigger = event.target.closest("[data-contact]");
    if (!trigger) return;
    event.preventDefault();
    triggerRef.current = trigger;
    setRequested(true);
    setOpen(true);
  };

  return (
    <ContactOpenContext.Provider value={open}>
      <div onClickCapture={handleClickCapture}>{children}</div>
      <dialog
        ref={dialogRef}
        className="contact-dialog"
        aria-labelledby="contact-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          // A click on the backdrop lands on the dialog element itself.
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="contact-card">
          <button
            ref={closeButtonRef}
            className="contact-close"
            type="button"
            onClick={close}
            aria-label="Close the form"
          >
            <Icon name="close" />
          </button>
          <p className="eyebrow">PITCH SPRDLX</p>
          <h2 id="contact-dialog-title">
            What’s the
            <br className="contact-title-break" /> big idea?
          </h2>
          {requested && <ContactForm email={email} preview={preview} open={open} close={close} />}
        </div>
      </dialog>
    </ContactOpenContext.Provider>
  );
}
