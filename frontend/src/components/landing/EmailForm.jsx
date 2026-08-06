import React, { useState } from "react";
import { submitLead } from "../../lib/api";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { useT } from "../../i18n";

export function EmailForm({ source = "waitlist", plan = null, dark = false, testid = "email-form" }) {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) {
      toast.error(t.finalCta.error);
      return;
    }
    setLoading(true);
    try {
      await submitLead(email, source, plan);
      setDone(true);
      toast.success(t.finalCta.success);
      setEmail("");
    } catch (err) {
      toast.error(t.finalCta.error);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div data-testid={`${testid}-success`} className="text-[#C5A059] text-sm md:text-base font-medium">
        {t.finalCta.success}
      </div>
    );
  }

  return (
    <form data-testid={testid} onSubmit={submit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
      <input
        data-testid={`${testid}-input`}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t.finalCta.placeholder}
        className="flex-1 rounded-full bg-[#F5F1E8]/[0.04] border border-[#F5F1E8]/15 px-5 py-3.5 text-sm text-[#F5F1E8] placeholder:text-[#F5F1E8]/35 outline-none focus:border-[#C5A059]/70 transition-colors duration-300"
      />
      <button
        data-testid={`${testid}-submit`}
        type="submit"
        disabled={loading}
        className="btn-gold rounded-full px-6 py-3.5 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-70"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <>{t.finalCta.cta} <ArrowRight size={16} /></>}
      </button>
    </form>
  );
}
