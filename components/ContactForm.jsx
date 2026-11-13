"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { site } from "@/data/site";

// Character limits, mirrored by the /api/contact/ route.
const LIMITS = {
  name: 120,
  email: 254,
  company: 200,
  website: 2048,
  message: 5000,
};

const EMPTY = { name: "", email: "", company: "", website: "", message: "" };

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const EMAIL_PATTERN =
  /^[^\s@<>(),;:\\"\[\]]+@(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z\d](?:[a-z\d-]*[a-z\d])?$/i;

const INTERRUPTED =
  "The connection was interrupted. Your message is still here—please try again or email us directly.";
const REQUEST_TIMEOUT = 20000;

const TEXT_FIELDS = [
  // [name, label, placeholder, type, autoComplete]
  ["name", "Name", "Your name", "text", "name"],
  ["email", "Email", "you@company.com", "email", "email"],
  ["company", "Company", "Optional", "text", "organization"],
  ["website", "Website", "Optional", "text", "url"],
];

function isValidEmail(email) {
  if (!email || !EMAIL_PATTERN.test(email)) return false;
  const local = email.split("@")[0];
  return !local.startsWith(".") && !local.endsWith(".") && !local.includes("..");
}

/** Trims and checks the form values. Returns normalised values plus field errors. */
function validate(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const values = { ...EMPTY };
  const errors = {};

  for (const field of Object.keys(LIMITS)) {
    const raw = source[field];
    if (raw !== undefined && typeof raw !== "string") {
      errors[field] = "Please enter plain text.";
      continue;
    }
    values[field] = typeof raw === "string" ? raw.trim() : "";
    if (values[field].length > LIMITS[field]) {
      errors[field] = `Please use ${LIMITS[field]} characters or fewer.`;
    } else if (field !== "message" && CONTROL_CHARACTERS.test(values[field])) {
      errors[field] = "Please enter a single line of text.";
    }
  }

  if (!values.name) errors.name = "Please enter your name.";
  if (!isValidEmail(values.email)) errors.email = "Please enter a valid email address.";
  if (!values.message) errors.message = "Tell us a little about your idea.";

  if (values.website && !errors.website) {
    try {
      const url = new URL(/^https?:\/\//i.test(values.website) ? values.website : `https://${values.website}`);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        !url.hostname.includes(".") ||
        /\s/.test(values.website)
      ) {
        throw Error();
      }
      values.website = url.href;
    } catch {
      errors.website = "Please enter a website such as example.com.";
    }
  }

  return { values, errors };
}

export default function ContactForm({ email, preview, open, close }) {
  const [values, setValues] = useState({ ...EMPTY });
  const [errors, setErrors] = useState({});
  const [state, setState] = useState("idle"); // idle | sending | success | error
  const [formError, setFormError] = useState("");
  const formRef = useRef(null);
  const successRef = useRef(null);
  const sendingRef = useRef(false);
  // Reusing the id for an identical resend lets the server de-duplicate it.
  const submissionRef = useRef(null);

  // Reopening after a successful send shows a fresh form.
  useEffect(() => {
    if (!open && state === "success") setState("idle");
  }, [open, state]);

  const update = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError("");
    setState("idle");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (sendingRef.current) return;

    const result = validate(values);
    setErrors(result.errors);
    const firstInvalid = Object.keys(result.errors)[0];
    if (firstInvalid) {
      formRef.current?.elements.namedItem(firstInvalid)?.focus();
      return;
    }

    const payload = { ...result.values, source: window.location.pathname };
    const fingerprint = JSON.stringify(payload);
    if (submissionRef.current?.fingerprint !== fingerprint) {
      submissionRef.current = { fingerprint, id: crypto.randomUUID() };
    }

    sendingRef.current = true;
    setState("sending");
    setFormError("");

    const controller = new AbortController();
    let timer;
    try {
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(Error(INTERRUPTED));
        }, REQUEST_TIMEOUT);
      });
      const response = await Promise.race([
        fetch("/api/contact/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            submissionId: submissionRef.current.id,
            fax: new FormData(event.currentTarget).get("fax") ?? "",
          }),
          signal: controller.signal,
        }),
        timeout,
      ]);
      const body = await response.json().catch(() => ({}));

      if (!response.ok || body.success !== true) {
        if (body.errors) setErrors(body.errors);
        throw Error(
          response.status === 429
            ? "You’ve sent several requests. Please wait a few minutes or email us directly."
            : body.error || "We couldn’t send your message. Please try again or email us directly.",
        );
      }

      setState("success");
      setValues({ ...EMPTY });
      submissionRef.current = null;
      requestAnimationFrame(() => successRef.current?.focus());
    } catch (error) {
      setState("error");
      // Only our own messages are shown; network/abort errors get the generic one.
      setFormError(error instanceof Error && error.name === "Error" ? error.message : INTERRUPTED);
    } finally {
      clearTimeout(timer);
      sendingRef.current = false;
    }
  };

  if (state === "success") {
    return (
      <div className="contact-success" ref={successRef} tabIndex={-1} role="status">
        <span className="contact-success-mark">
          <Icon name="check" />
        </span>
        <h3>{preview ? "Test message accepted." : "Thank you for reaching out."}</h3>
        <p>
          {preview
            ? `This preview was delivered to a test inbox. The production form will reach the ${site.name} team.`
            : "Your message has been sent. We’ll read it personally and reply to the email you provided."}
        </p>
        <button
          type="button"
          className="button"
          onClick={() => {
            setState("idle");
            close();
          }}
        >
          Back to exploring <Icon name="arrow-right" />
        </button>
      </div>
    );
  }

  const sending = state === "sending";

  return (
    <form ref={formRef} className="contact-form" noValidate onSubmit={submit} aria-busy={sending}>
      {preview && <p className="contact-preview-note">Preview mode · Messages go to a test inbox.</p>}
      <fieldset disabled={sending} className="contact-fields">
        {TEXT_FIELDS.map(([field, label, placeholder, type, autoComplete]) => {
          const optional = field === "company" || field === "website";
          const unspelled = field === "email" || field === "website";
          return (
            <div className="contact-field" key={field}>
              <label htmlFor={`contact-${field}`}>
                {label}
                {optional ? <span className="contact-optional">Optional</span> : null}
              </label>
              <input
                id={`contact-${field}`}
                name={field}
                type={type}
                inputMode={field === "website" ? "url" : field === "email" ? "email" : "text"}
                autoComplete={autoComplete}
                autoCapitalize={unspelled ? "none" : undefined}
                spellCheck={unspelled ? false : undefined}
                value={values[field]}
                onChange={(event) => update(field, event.target.value)}
                placeholder={placeholder}
                required={field === "name" || field === "email"}
                maxLength={LIMITS[field]}
                aria-invalid={!!errors[field]}
                aria-describedby={errors[field] ? `contact-${field}-error` : undefined}
              />
              {errors[field] && (
                <span id={`contact-${field}-error`} className="contact-field-error">
                  {errors[field]}
                </span>
              )}
            </div>
          );
        })}
        <div className="contact-field contact-message">
          <label htmlFor="contact-message">What are you building?</label>
          <textarea
            id="contact-message"
            name="message"
            value={values.message}
            onChange={(event) => update("message", event.target.value)}
            rows={5}
            placeholder="A short paragraph is perfect."
            required
            maxLength={LIMITS.message}
            aria-invalid={!!errors.message}
            aria-describedby={errors.message ? "contact-message-error" : undefined}
          />
          {errors.message && (
            <span id="contact-message-error" className="contact-field-error">
              {errors.message}
            </span>
          )}
        </div>
        {/* Honeypot: people never see or fill this; bots often do. */}
        <div className="contact-honeypot" aria-hidden="true">
          <label htmlFor="contact-fax">Leave this field empty</label>
          <input id="contact-fax" name="fax" type="text" tabIndex={-1} autoComplete="off" />
        </div>
      </fieldset>

      {formError && (
        <p className="contact-form-error" role="alert">
          {formError}
        </p>
      )}

      <div className="contact-form-bottom">
        <p>
          We read every note personally.
          <br />
          <span>Your details are used to respond to this enquiry.</span>
        </p>
        <button type="submit" className="button contact-submit" disabled={sending}>
          {sending ? (
            <>
              <span className="contact-spinner" /> Sending…
            </>
          ) : (
            <>
              Send message <Icon name="arrow-right" />
            </>
          )}
        </button>
      </div>

      <p className="contact-direct">
        Prefer email?{" "}
        <a href={`mailto:${email}`}>
          {email} <Icon />
        </a>
      </p>
      <span className="sr-only" role="status">
        {sending ? "Sending your message." : ""}
      </span>
    </form>
  );
}
