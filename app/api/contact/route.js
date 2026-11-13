import { site } from "@/data/site";

// Contact-form endpoint. Validation mirrors components/ContactForm.jsx so the
// server never trusts the browser. Messages are delivered with Resend's REST
// API; see .env.example for the variables it needs.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMITS = {
  name: 120,
  email: 254,
  company: 200,
  website: 2048,
  message: 5000,
};
const EMPTY = { name: "", email: "", company: "", website: "", message: "" };
const MAX_BODY_BYTES = 32 * 1024;
const MAX_SOURCE_LENGTH = 512;

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const EMAIL_PATTERN =
  /^[^\s@<>(),;:\\"\[\]]+@(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z\d](?:[a-z\d-]*[a-z\d])?$/i;
const SUBMISSION_ID_PATTERN = /^[A-Za-z0-9-]{8,128}$/;

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_TRACKED_KEYS = 5000;

const NOT_CONFIGURED = "The contact form isn't configured yet. Please email us directly.";
const SEND_FAILED = "We couldn’t send your message. Please try again or email us directly.";

// In-memory state. It is per server instance and resets on restart, which is
// enough to slow down casual abuse; put a shared store in front for more.
const hits = new Map(); // ip -> number[] (timestamps)
const submissions = new Map(); // submissionId -> { expires, promise }

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function isValidEmail(email) {
  if (!email || !EMAIL_PATTERN.test(email)) return false;
  const local = email.split("@")[0];
  return !local.startsWith(".") && !local.endsWith(".") && !local.includes("..");
}

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
        throw new Error("Invalid website");
      }
      values.website = url.href;
    } catch {
      errors.website = "Please enter a website such as example.com.";
    }
  }

  return { values, errors };
}

function clientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function prune(now) {
  for (const [key, stamps] of hits) {
    const recent = stamps.filter((stamp) => now - stamp < RATE_WINDOW_MS);
    if (recent.length) hits.set(key, recent);
    else hits.delete(key);
  }
  for (const [key, entry] of submissions) {
    if (entry.expires <= now) submissions.delete(key);
  }
}

/** Records a hit for `ip` and reports whether it is still within the limit. */
function allow(ip, now) {
  if (hits.size > MAX_TRACKED_KEYS) prune(now);
  const recent = (hits.get(ip) ?? []).filter((stamp) => now - stamp < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanSource(raw) {
  if (typeof raw !== "string") return "";
  const value = raw.trim().slice(0, MAX_SOURCE_LENGTH);
  return CONTROL_CHARACTERS.test(value) ? "" : value;
}

async function deliver(values, source, submissionId) {
  const rows = [
    ["Name", values.name],
    ["Email", values.email],
    ["Company", values.company || "—"],
    ["Website", values.website || "—"],
    ["Sent from", source ? `${site.url}${source.startsWith("/") ? source : `/${source}`}` : "—"],
  ];

  const text = [...rows.map(([label, value]) => `${label}: ${value}`), "", values.message].join("\n");
  const html = `<table cellpadding="4" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${rows
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding-right:16px;color:#555">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
    )
    .join("")}</table><p style="font-family:sans-serif;font-size:14px;white-space:pre-wrap">${escapeHtml(
    values.message,
  )}</p>`;

  const headers = {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    "Content-Type": "application/json",
  };
  if (submissionId) headers["Idempotency-Key"] = `contact-${submissionId}`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers,
    body: JSON.stringify({
      from: process.env.CONTACT_FROM_EMAIL,
      to: [process.env.CONTACT_TO_EMAIL || site.contactEmail],
      reply_to: values.email,
      subject: `New enquiry from ${values.name}${values.company ? ` (${values.company})` : ""}`,
      text,
      html,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`[contact] Resend responded ${response.status}: ${detail.slice(0, 500)}`);
    return false;
  }
  return true;
}

export async function POST(request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) {
    return json({ success: false, error: "Your message is too long. Please shorten it and try again." }, 413);
  }

  let body;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return json({ success: false, error: "Your message is too long. Please shorten it and try again." }, 413);
    }
    body = JSON.parse(raw);
  } catch {
    return json({ success: false, error: "We couldn’t read your message. Please try again." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ success: false, error: "We couldn’t read your message. Please try again." }, 400);
  }

  // Honeypot: people never see the `fax` field. Bots get a quiet success.
  if (body.fax != null && String(body.fax).trim() !== "") {
    return json({ success: true });
  }

  const { values, errors } = validate(body);
  if (Object.keys(errors).length) {
    return json({ success: false, error: "Please check the highlighted fields.", errors }, 400);
  }

  const submissionId =
    typeof body.submissionId === "string" && SUBMISSION_ID_PATTERN.test(body.submissionId) ? body.submissionId : null;
  const now = Date.now();

  // A retried submission (same id) gets the original outcome instead of a second email.
  if (submissionId) {
    const previous = submissions.get(submissionId);
    if (previous && previous.expires > now) {
      const outcome = await previous.promise;
      if (outcome) return json({ success: true });
      submissions.delete(submissionId);
    }
  }

  if (!allow(clientIp(request), now)) {
    return json(
      { success: false, error: "You’ve sent several requests. Please wait a few minutes or email us directly." },
      429,
    );
  }

  if (!process.env.RESEND_API_KEY || !process.env.CONTACT_FROM_EMAIL) {
    return json({ success: false, error: NOT_CONFIGURED }, 503);
  }

  const promise = deliver(values, cleanSource(body.source), submissionId).catch((error) => {
    console.error("[contact] Delivery failed:", error);
    return false;
  });
  if (submissionId) submissions.set(submissionId, { expires: now + IDEMPOTENCY_TTL_MS, promise });

  const delivered = await promise;
  if (!delivered) {
    if (submissionId) submissions.delete(submissionId);
    return json({ success: false, error: SEND_FAILED }, 502);
  }
  return json({ success: true });
}
