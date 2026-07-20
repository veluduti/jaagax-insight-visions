import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Send, ArrowRight } from "lucide-react";
import { logLandingSignal } from "./useLandingData";

const PROMPTS = [
  "I want to buy farmland for weekends",
  "I want to move back to my village",
  "I want passive land investment",
  "I want to retire in nature",
];

export default function AICompanionSection() {
  const [text, setText] = useState("");

  return (
    <section
      className="py-20 md:py-28"
      style={{
        background: "hsl(var(--nl-ink))",
        color: "hsl(var(--nl-cream))",
      }}
      aria-labelledby="ai-h"
    >
      <div className="nl-container">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-5">
            <div className="nl-eyebrow mb-4" style={{ color: "hsl(var(--nl-cream)/0.7)" }}>
              Meet Your AI Companion
            </div>
            <h2 id="ai-h" className="nl-serif text-3xl md:text-5xl leading-[1.05] tracking-tight">
              Tell it what you want. It <em className="italic">finds you the path.</em>
            </h2>
            <p className="mt-5 text-[hsl(var(--nl-cream)/0.75)] text-base md:text-lg leading-relaxed">
              Our AI companion asks the right questions, learns your priorities, and connects you
              to the land, people and experiences that match your natural-living intent.
            </p>
            <Link
              to="/natural-living/start"
              onClick={() => logLandingSignal("cta_click", { section: "ai", metadata: { cta: "start_ai" } })}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--nl-cream))] text-[hsl(var(--nl-ink))] px-6 py-3 text-sm font-medium hover:scale-[1.02] transition-transform"
            >
              Start with the AI
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-[hsl(var(--nl-cream)/0.15)] bg-[hsl(var(--nl-cream)/0.04)] backdrop-blur p-5 md:p-7">
              <div className="flex items-center gap-2 pb-4 border-b border-[hsl(var(--nl-cream)/0.1)]">
                <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary)/0.2)] text-[hsl(var(--primary-glow,var(--primary)))] flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="text-sm font-medium">Natural Living Companion</div>
                <span className="ml-auto text-[10px] uppercase tracking-widest text-[hsl(var(--nl-cream)/0.5)]">
                  Preview
                </span>
              </div>

              <div className="py-5 space-y-4">
                <div className="max-w-md text-sm md:text-base bg-[hsl(var(--nl-cream)/0.08)] rounded-2xl rounded-tl-sm px-4 py-3">
                  Hi — I'm here to help you find your Natural Living path. What are you dreaming of?
                </div>
                <div className="flex flex-wrap gap-2">
                  {PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setText(p)}
                      className="text-xs md:text-sm rounded-full border border-[hsl(var(--nl-cream)/0.2)] px-3 py-1.5 hover:bg-[hsl(var(--nl-cream)/0.08)] transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  logLandingSignal("cta_click", { section: "ai", metadata: { cta: "submit_prompt" } });
                  window.location.href = "/natural-living/start";
                }}
                className="flex items-center gap-2 rounded-full border border-[hsl(var(--nl-cream)/0.2)] bg-[hsl(var(--nl-cream)/0.05)] px-4 py-2"
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type what you want from natural living…"
                  className="flex-1 bg-transparent outline-none text-sm md:text-base placeholder:text-[hsl(var(--nl-cream)/0.4)]"
                  aria-label="Ask the AI companion"
                />
                <button
                  type="submit"
                  className="w-9 h-9 rounded-full bg-[hsl(var(--nl-cream))] text-[hsl(var(--nl-ink))] flex items-center justify-center hover:scale-105 transition-transform"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
