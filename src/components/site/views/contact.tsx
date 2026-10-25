"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Clock,
  Instagram,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Youtube,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useSite, waLink } from "@/components/site/site-context";
import { EASE, Magnetic, PageHeader, Reveal, VoltButton } from "@/components/site/primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// CONTACT — the conversion page. Contact rail + 2-step enquiry form with
// client-side validation, honeypot protection and a server-confirmed success
// state (POST /api/enquiries — public endpoint, no admin header).
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_METHODS = ["WhatsApp", "Email", "Phone call"] as const;
const BUDGETS = ["Under ₹10,000", "₹10,000 – ₹25,000", "₹25,000 – ₹50,000", "₹50,000+", "Not sure yet"];
const TIMELINES = ["ASAP", "2–4 weeks", "1–2 months", "Flexible"];

type FormState = {
  name: string;
  business: string;
  email: string;
  phone: string;
  contactMethod: (typeof CONTACT_METHODS)[number];
  serviceType: string;
  budget: string;
  timeline: string;
  description: string;
};

type ErrorKey = "name" | "email" | "serviceType" | "description";
type Errors = Partial<Record<ErrorKey, string>>;

const INITIAL_FORM: FormState = {
  name: "",
  business: "",
  email: "",
  phone: "",
  contactMethod: "WhatsApp",
  serviceType: "",
  budget: "",
  timeline: "",
  description: "",
};

export default function ContactView() {
  const { settings, services } = useSite();

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [serverError, setServerError] = useState("");

  const serviceOptions = [...services.map((s) => s.title), "Something else"];
  const firstName = form.name.trim().split(/\s+/)[0] || "there";

  const socials = [
    { href: settings.social.instagram, label: "Instagram", Icon: Instagram },
    { href: settings.social.linkedin, label: "LinkedIn", Icon: Linkedin },
    { href: settings.social.youtube, label: "YouTube", Icon: Youtube },
  ].filter((s) => s.href);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key as ErrorKey]: undefined }));
  }

  /* --------------------------------------------------------- validation */

  const validatorFor = (key: ErrorKey): string | undefined => {
    switch (key) {
      case "name":
        return form.name.trim().length >= 2
          ? undefined
          : "Please enter your name (at least 2 characters).";
      case "email": {
        const value = form.email.trim();
        if (!value) return "Please enter your email.";
        return EMAIL_RE.test(value) ? undefined : "That email address doesn't look right.";
      }
      case "description":
        return form.description.trim().length >= 20
          ? undefined
          : `Tell us a little more — at least 20 characters (you're at ${form.description.trim().length}).`;
      case "serviceType":
        return form.serviceType ? undefined : "Please select a service type.";
    }
  };

  const touch = (key: ErrorKey) => setErrors((e) => ({ ...e, [key]: validatorFor(key) }));

  const goNext = () => {
    const next: Errors = { name: validatorFor("name"), email: validatorFor("email") };
    setErrors(next);
    if (!next.name && !next.email) setStep(2);
  };

  const backToStep1 = () => {
    setErrors({});
    setStep(1);
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Implicit Enter submission on step 1 (no submit button is rendered there)
    // must advance the step — never send a half-filled enquiry.
    if (step === 1) {
      goNext();
      return;
    }
    const all: Errors = {
      name: validatorFor("name"),
      email: validatorFor("email"),
      serviceType: validatorFor("serviceType"),
      description: validatorFor("description"),
    };
    if (all.name || all.email) {
      setStep(1);
      setErrors(all);
      return;
    }
    if (all.serviceType || all.description) {
      setErrors(all);
      return;
    }

    setStatus("sending");
    setServerError("");
    try {
      await api("/api/enquiries", {
        method: "POST",
        body: {
          name: form.name.trim(),
          business: form.business.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          serviceType: form.serviceType,
          description: form.description.trim(),
          budget: form.budget,
          timeline: form.timeline,
          contactMethod: form.contactMethod,
          website: honeypot, // honeypot — must be empty; bots get silently dropped
        },
      });
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setServerError(error instanceof Error ? error.message : "");
    }
  }

  const descriptionLength = form.description.trim().length;
  const canSubmit =
    form.name.trim().length >= 2 &&
    EMAIL_RE.test(form.email.trim()) &&
    !!form.serviceType &&
    descriptionLength >= 20;

  const whatsappHref = waLink(
    settings.contact.whatsapp,
    `Hi ${settings.brand.name} — I'd like to start a project.`
  );

  return (
    <>
      <PageHeader
        kicker="Contact"
        title="Let's build something worth noticing."
        sub={settings.contact.responseTime}
        meta={settings.contact.serviceArea}
      />

      {/* -------------------------------------------------------- main (ivory) */}
      <section className="bg-ivory py-20 text-ink sm:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-12 lg:gap-14">
          {/* ------------------------------------------------- contact rail */}
          <aside className="lg:col-span-5">
            <Reveal>
              <p className="kicker flex items-center gap-2.5 text-ink/60">
                <span className="inline-block h-px w-8 bg-ink/40" aria-hidden="true" />
                Direct lines
              </p>
            </Reveal>

            <div className="mt-8 space-y-6">
              {(
                [
                  {
                    Icon: Mail,
                    label: "Email",
                    value: settings.contact.email,
                    href: `mailto:${settings.contact.email}`,
                    external: false,
                  },
                  {
                    Icon: MessageCircle,
                    label: "WhatsApp",
                    value: settings.contact.phone,
                    href: waLink(settings.contact.whatsapp, `Hi ${settings.brand.name} — I have a question about a project.`),
                    external: true,
                  },
                  {
                    Icon: MapPin,
                    label: "Location",
                    value: settings.contact.location,
                    href: undefined,
                    external: false,
                  },
                  {
                    Icon: Clock,
                    label: "Hours",
                    value: `${settings.contact.hours} · ${settings.contact.responseTime}`,
                    href: undefined,
                    external: false,
                  },
                ] as const
              ).map((row, i) => (
                <Reveal key={row.label} delay={0.06 * i}>
                  <div className="flex items-start gap-4">
                    <span
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-volt text-ink"
                      aria-hidden="true"
                    >
                      <row.Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/45">
                        {row.label}
                      </p>
                      {row.href ? (
                        <a
                          href={row.href}
                          {...(row.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                          className="mt-1 block break-words text-[15px] font-medium leading-relaxed text-ink transition-colors hover:text-ink/60"
                        >
                          {row.value}
                        </a>
                      ) : (
                        <p className="mt-1 text-[15px] leading-relaxed text-ink">{row.value}</p>
                      )}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* socials — only non-empty */}
            {socials.length > 0 ? (
              <Reveal delay={0.2}>
                <div className="mt-10 flex items-center gap-3 border-t border-ink/10 pt-8">
                  {socials.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${s.label} (opens in a new tab)`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 text-ink/60 transition-colors duration-300 hover:border-ink hover:text-ink"
                    >
                      <s.Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </Reveal>
            ) : null}

            <Reveal delay={0.26}>
              <p className="mt-10 flex items-start gap-3 text-sm leading-relaxed text-graphite">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-volt-2" aria-hidden="true" />
                Enquiries go straight to the studio inbox — no bots, no call centre.
              </p>
            </Reveal>
          </aside>

          {/* --------------------------------------------------- enquiry card */}
          <div className="lg:col-span-7">
            <Reveal delay={0.1}>
              <div className="rounded-3xl border border-ink/10 bg-white/60 p-6 sm:p-10">
                {status === "success" ? (
                  /* -------------------------------------------- success state */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 14 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: EASE }}
                    role="status"
                    className="flex min-h-[440px] flex-col items-center justify-center text-center"
                  >
                    <span className="flex h-20 w-20 items-center justify-center rounded-full bg-volt">
                      <Check className="h-10 w-10 text-ink" strokeWidth={2.5} aria-hidden="true" />
                    </span>
                    <h2 className="display-3 mt-8 text-ink">Enquiry received.</h2>
                    <p className="mt-4 max-w-md text-base leading-relaxed text-graphite">
                      Thanks {firstName} — your brief is in. {settings.contact.responseTime}.
                    </p>
                    <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                      <Magnetic>
                        <VoltButton
                          external
                          href={waLink(
                            settings.contact.whatsapp,
                            `Hi, I just sent an enquiry through your website — my name is ${form.name.trim()}.`
                          )}
                        >
                          Continue on WhatsApp
                        </VoltButton>
                      </Magnetic>
                      <VoltButton href="/" variant="outline-dark">
                        Back to home
                      </VoltButton>
                    </div>
                  </motion.div>
                ) : (
                  /* -------------------------------------------------- the form */
                  <form onSubmit={handleSubmit} noValidate>
                    {/* step indicator */}
                    <div aria-live="polite">
                      <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-ink/50">
                        {step === 1 ? "Step 1 of 2 — About you" : "Step 2 of 2 — The project"}
                      </p>
                      <div
                        className="mt-3 h-1 overflow-hidden rounded-full bg-ink/10"
                        role="progressbar"
                        aria-valuemin={1}
                        aria-valuemax={2}
                        aria-valuenow={step}
                        aria-label="Enquiry form progress"
                      >
                        <div
                          className="h-full bg-ink transition-all duration-500"
                          style={{ width: step === 1 ? "50%" : "100%" }}
                        />
                      </div>
                    </div>

                    {/* honeypot — bots fill it, server silently drops. Never visible. */}
                    <div aria-hidden="true" className="hidden">
                      <label htmlFor="website">Website</label>
                      <input
                        id="website"
                        name="website"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                      />
                    </div>

                    {step === 1 ? (
                      <motion.fieldset
                        key="step-1"
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, ease: EASE }}
                        className="mt-9 space-y-6"
                      >
                        <legend className="sr-only">About you</legend>

                        <div className="grid gap-6 sm:grid-cols-2">
                          <Field label="Full name" htmlFor="name" required error={errors.name}>
                            <input
                              id="name"
                              name="name"
                              type="text"
                              autoComplete="name"
                              placeholder="Aarav Sharma"
                              value={form.name}
                              onChange={(e) => setField("name", e.target.value)}
                              onBlur={() => touch("name")}
                              aria-invalid={!!errors.name}
                              aria-describedby={errors.name ? "err-name" : undefined}
                              className={fieldClass(!!errors.name)}
                            />
                          </Field>

                          <Field label="Business / organization" htmlFor="business" optional>
                            <input
                              id="business"
                              name="business"
                              type="text"
                              autoComplete="organization"
                              placeholder="Aroma House Café"
                              value={form.business}
                              onChange={(e) => setField("business", e.target.value)}
                              className={fieldClass(false)}
                            />
                          </Field>

                          <Field label="Email" htmlFor="email" required error={errors.email}>
                            <input
                              id="email"
                              name="email"
                              type="email"
                              autoComplete="email"
                              placeholder="you@business.com"
                              value={form.email}
                              onChange={(e) => setField("email", e.target.value)}
                              onBlur={() => touch("email")}
                              aria-invalid={!!errors.email}
                              aria-describedby={errors.email ? "err-email" : undefined}
                              className={fieldClass(!!errors.email)}
                            />
                          </Field>

                          <Field label="WhatsApp / phone" htmlFor="phone" optional>
                            <input
                              id="phone"
                              name="phone"
                              type="tel"
                              autoComplete="tel"
                              placeholder="+91 98765 43210"
                              value={form.phone}
                              onChange={(e) => setField("phone", e.target.value)}
                              className={fieldClass(false)}
                            />
                          </Field>
                        </div>

                        <Field label="Preferred contact" htmlFor="contactMethod-WhatsApp">
                          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Preferred contact method">
                            {CONTACT_METHODS.map((method) => {
                              const active = form.contactMethod === method;
                              return (
                                <label
                                  key={method}
                                  htmlFor={`contactMethod-${method}`}
                                  className={cn(
                                    "relative flex min-h-[44px] cursor-pointer items-center justify-center rounded-full border px-2 text-center font-display text-[13px] font-semibold transition-colors duration-300 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                                    active
                                      ? "border-ink bg-volt text-ink"
                                      : "border-ink/15 text-ink/55 hover:border-ink/40 hover:text-ink"
                                  )}
                                >
                                  <input
                                    id={`contactMethod-${method}`}
                                    type="radio"
                                    name="contactMethod"
                                    value={method}
                                    checked={active}
                                    onChange={() => setField("contactMethod", method)}
                                    className="sr-only"
                                  />
                                  {method}
                                </label>
                              );
                            })}
                          </div>
                        </Field>

                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={goNext}
                            disabled={!form.name.trim() || !form.email.trim()}
                            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-ink px-8 py-3.5 font-display text-[15px] font-semibold text-ivory transition-colors duration-300 hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Next — the project
                          </button>
                        </div>
                      </motion.fieldset>
                    ) : (
                      <motion.fieldset
                        key="step-2"
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, ease: EASE }}
                        className="mt-9 space-y-6"
                        disabled={status === "sending"}
                      >
                        <legend className="sr-only">The project</legend>

                        <div className="grid gap-6 sm:grid-cols-2">
                          <Field label="Service type" htmlFor="serviceType" required error={errors.serviceType}>
                            <Select
                              value={form.serviceType}
                              onValueChange={(value) => setField("serviceType", value)}
                            >
                              <SelectTrigger
                                id="serviceType"
                                aria-invalid={!!errors.serviceType}
                                aria-describedby={errors.serviceType ? "err-serviceType" : undefined}
                                className={cn(
                                  "h-12 w-full rounded-xl bg-white/70 px-4 text-left text-[15px] data-[placeholder]:text-ink/40",
                                  errors.serviceType ? "border-red-600/70" : "border-ink/15"
                                )}
                              >
                                <SelectValue placeholder="Select a service" />
                              </SelectTrigger>
                              <SelectContent>
                                {serviceOptions.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>

                          <Field label="Budget" htmlFor="budget" optional>
                            <Select value={form.budget} onValueChange={(value) => setField("budget", value)}>
                              <SelectTrigger
                                id="budget"
                                className="h-12 w-full rounded-xl border-ink/15 bg-white/70 px-4 text-left text-[15px] data-[placeholder]:text-ink/40"
                              >
                                <SelectValue placeholder="Select a range" />
                              </SelectTrigger>
                              <SelectContent>
                                {BUDGETS.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>

                          <Field label="Timeline" htmlFor="timeline" optional>
                            <Select value={form.timeline} onValueChange={(value) => setField("timeline", value)}>
                              <SelectTrigger
                                id="timeline"
                                className="h-12 w-full rounded-xl border-ink/15 bg-white/70 px-4 text-left text-[15px] data-[placeholder]:text-ink/40"
                              >
                                <SelectValue placeholder="When do you need it?" />
                              </SelectTrigger>
                              <SelectContent>
                                {TIMELINES.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                        </div>

                        <Field
                          label="Project description"
                          htmlFor="description"
                          required
                          error={errors.description}
                          hint={
                            <span id="desc-hint" className={cn(descriptionLength >= 20 ? "text-ink/60" : "text-ink/40")}>
                              {descriptionLength >= 20
                                ? `${descriptionLength} characters — looks good.`
                                : `Minimum 20 characters — ${20 - descriptionLength} more to go.`}
                            </span>
                          }
                        >
                          <textarea
                            id="description"
                            name="description"
                            rows={5}
                            placeholder="What are you building, who is it for, and what does success look like?"
                            value={form.description}
                            onChange={(e) => setField("description", e.target.value)}
                            onBlur={() => touch("description")}
                            aria-invalid={!!errors.description}
                            aria-describedby={errors.description ? "err-description" : "desc-hint"}
                            className={cn(fieldClass(!!errors.description), "resize-y")}
                          />
                        </Field>

                        {status === "error" ? (
                          <div
                            role="alert"
                            className="rounded-xl border border-red-600/30 bg-red-600/5 px-4 py-3.5 text-sm leading-relaxed text-red-600"
                          >
                            Something went wrong{serverError ? ` — ${serverError}` : ""} — try again, or reach us
                            directly on{" "}
                            <a
                              href={whatsappHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold underline underline-offset-2"
                            >
                              WhatsApp
                            </a>
                            . Your answers are still here.
                          </div>
                        ) : null}

                        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                          <button
                            type="button"
                            onClick={backToStep1}
                            disabled={status === "sending"}
                            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-ink/25 px-7 py-3.5 font-display text-[15px] font-semibold text-ink transition-colors duration-300 hover:border-ink/60 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            disabled={!canSubmit || status === "sending"}
                            className={cn(
                              "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-volt px-8 py-3.5 font-display text-[15px] font-semibold text-ink transition-colors duration-300 hover:bg-volt-2",
                              (status === "sending" || !canSubmit) && "cursor-not-allowed opacity-40"
                            )}
                          >
                            {status === "sending" ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                Sending…
                              </>
                            ) : (
                              "Send enquiry"
                            )}
                          </button>
                        </div>
                      </motion.fieldset>
                    )}
                  </form>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ Field */

function Field({
  label,
  htmlFor,
  required,
  optional,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  const errorId = error ? `err-${htmlFor}` : undefined;
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55"
      >
        {label}
        {required ? <span className="ml-1 text-ink/40" aria-hidden="true">*</span> : null}
        {optional ? <span className="ml-1.5 normal-case tracking-normal text-ink/35">(optional)</span> : null}
      </label>
      {children}
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {hint && !error ? <p className="mt-2 text-sm">{hint}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------ field style */

function fieldClass(invalid: boolean) {
  return cn(
    "w-full rounded-xl border bg-white/70 px-4 py-3 text-[15px] text-ink shadow-none outline-none transition duration-300 placeholder:text-ink/35 focus:ring-4",
    invalid
      ? "border-red-600/70 focus:border-red-600 focus:ring-red-600/10"
      : "border-ink/15 focus:border-ink/50 focus:ring-ink/5"
  );
}
