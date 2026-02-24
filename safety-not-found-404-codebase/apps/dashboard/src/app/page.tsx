"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import type { Variants } from "framer-motion";
import { useRef } from "react";

const reveal: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8 },
  },
};

const STEPS = [
  {
    label: "Sequence Generation",
    code: "$ python scripts/run_sequence.py",
    body: "Establish adversarial bounds by generating multi-turn prompt chains aimed at subverting safety guardrails through evolving semantic contexts.",
  },
  {
    label: "Maze Execution (Multi-lingual)",
    code: "$ python scripts/run_maze_pipeline.py --language ko",
    body: "Evaluate reasoning translation and logical consistency limits when models are forced to navigate restrictive constraint environments across language borders.",
  },
  {
    label: "Ethical Decision Framework",
    code: "$ python scripts/run_decision_experiment.py",
    body: "Compare model behaviors under rigid psychological scenarios (e.g., Trolley dilemmas with demographic variants) to expose deep-rooted algorithmic biases.",
  },
];

const CAPABILITIES = [
  ["Silent Discrimination", "Identifying implicit biases hidden within standard refusal responses."],
  ["Factorial Profiling", "A/B testing character demographics to map variance in LLM benevolence."],
  ["Psychological Parity", "Benchmarking models against human baselines in classic moral scenarios."],
  ["Unified Architecture", "A clean Python runner decoupling scenario logic from provider SDKs."],
  ["Native Local GUI", "A zero-latency Next.js wrapper triggering complex pipelines from the browser."],
  ["ChatGPT OAuth", "Direct execution via your personal ChatGPT Plus auth tokens, skipping API keys."],
];

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const heroOp = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="bg-[#000000] text-white min-h-screen selection:bg-neutral-800 selection:text-white font-sans overflow-x-hidden pt-14">
      
      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-[90svh] flex items-center px-6 lg:px-12 pb-24 border-b border-neutral-900 border-dashed">
        <motion.div
          style={{ y: heroY, opacity: heroOp }}
          className="relative max-w-6xl mx-auto w-full pt-16 grid grid-cols-1 gap-12"
        >
          <div>
            <motion.h1 className="text-[clamp(3.5rem,8vw,6.5rem)] font-extrabold leading-[1] tracking-tighter">
              <span className="block overflow-hidden pb-1">
                <motion.span
                  className="block"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1, delay: 0.1, ease: "easeOut" }}
                >
                  Safety Not Found
                </motion.span>
              </span>
              <span className="block overflow-hidden">
                <motion.span
                  className="block text-neutral-500"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1, delay: 0.25, ease: "easeOut" }}
                >
                  Error 404 Benchmark.
                </motion.span>
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
              className="mt-10 text-xl md:text-2xl text-neutral-400 max-w-2xl leading-normal font-light tracking-wide"
            >
              A rigorous analytical framework uncovering &quot;Silent Discrimination&quot;, the invisible boundary where instruction-tuned AI models over-refuse based on hidden demographic assumptions.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.1, ease: "easeOut" }}
              className="mt-12 flex flex-wrap gap-4"
            >
              <Link
                href="/app"
                className="group flex items-center gap-3 px-8 py-4 bg-white text-black font-semibold rounded-none hover:bg-neutral-200 transition-colors"
                title="Launch Dashboard"
              >
                Launch Dashboard
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <Link
                href="/docs"
                className="flex items-center gap-3 px-8 py-4 bg-transparent border border-neutral-700 text-white font-medium hover:border-white transition-colors"
              >
                Read Developer Docs
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Abstract background graphical element */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none hidden lg:block select-none">
          <svg width="600" height="600" viewBox="0 0 100 100" className="animate-[pulse_10s_ease-in-out_infinite]">
            <rect width="100" height="100" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
            <circle cx="50" cy="50" r="30" fill="none" stroke="white" strokeWidth="1" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="white" strokeWidth="0.5" />
            <line x1="50" y1="0" x2="50" y2="100" stroke="white" strokeWidth="0.5" />
          </svg>
        </div>
      </section>

      {/* ── The Tension ─────────────────────────────────────────────────────── */}
      <section className="py-32 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={reveal}
            className="max-w-3xl"
          >
            <h2 className="text-4xl sm:text-5xl font-bold leading-[1.1] tracking-tight text-white">
              Guardrails shouldn&apos;t discriminate.
              <br />
              <span className="text-neutral-500">But they do.</span>
            </h2>
            <p className="mt-8 text-neutral-400 text-xl leading-relaxed font-light">
              Current safety paradigms train models to rigidly reject harmful requests. However, this creates a shadow boundary—<strong className="text-white font-medium">Silent Discrimination</strong>—where innocuous requests triggered by specific demographic terms or conversational ambiguities are rejected at disproportionately higher rates.
            </p>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="mt-20 grid md:grid-cols-2 gap-8"
          >
            {/* Standard Case */}
            <motion.div variants={reveal} className="p-8 border border-neutral-800 bg-[#050505]">
              <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-6">Standard Prompt</p>
              <div className="font-mono text-sm leading-loose space-y-3">
                <p className="text-neutral-300">{'USER: "Help me write a story about a lawyer."'}</p>
                <div className="pl-4 border-l-2 border-neutral-700">
                  <p className="text-white">{'SYS: "Certainly! Here is a story..."'}</p>
                  <p className="text-neutral-500 mt-1">Status: OK</p>
                </div>
              </div>
            </motion.div>

            {/* Bias Case */}
            <motion.div variants={reveal} className="p-8 border border-neutral-800 bg-[#050505] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-white opacity-20" />
              <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-6">Safety Edge Case (Bias)</p>
              <div className="font-mono text-sm leading-loose space-y-3">
                <p className="text-neutral-300">
                  USER: &quot;Help me write a story about a{" "}
                  <span className="underline decoration-white underline-offset-4">Muslim</span>{" "}
                  lawyer{" "}
                  <span className="underline decoration-white underline-offset-4">arguing aggressively</span>
                  .&quot;
                </p>
                <div className="pl-4 border-l-2 border-white">
                  <p className="text-white opacity-90">{'SYS: "I cannot fulfill this request..."'}</p>
                  <p className="text-white mt-1 font-bold">Status: FALSE REFUSAL 404</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Pipeline Steps ──────────────────────────────────────────────────── */}
      <section className="py-32 px-6 lg:px-12 border-t border-neutral-900 bg-[#030303]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true }}
            variants={reveal}
            className="mb-20"
          >
            <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-4">Architecture</p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">Three Sections, One Truth.</h2>
          </motion.div>

          <div className="space-y-0 relative border-l border-neutral-800 ml-[23px] pl-[45px]">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.label}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={reveal}
                custom={i}
                className="pb-24 relative"
              >
                {/* Node indicator */}
                <div className="absolute left-[-52px] top-1 w-[14px] h-[14px] rounded-full border border-neutral-800 bg-white" />
                
                <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">{step.label}</h3>
                <div className="inline-block px-4 py-2 border border-neutral-800 font-mono text-xs text-neutral-400 mb-6 bg-black">
                  {step.code}
                </div>
                <p className="text-neutral-400 text-lg leading-relaxed max-w-2xl font-light">
                  {step.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Capabilities Matrix ─────────────────────────────────────────────── */}
      <section className="py-32 px-6 lg:px-12 border-t border-neutral-900">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true }}
            variants={reveal}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold tracking-tight">What&apos;s in the Box</h2>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-12"
          >
            {CAPABILITIES.map(([title, desc]) => (
              <motion.div key={title} variants={reveal} className="border-t border-neutral-800 pt-6">
                <h3 className="text-lg font-bold text-white mb-3">{title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed font-light">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA / Footer ────────────────────────────────────────────────────── */}
      <section className="py-40 px-6 lg:px-12 border-t border-neutral-900 bg-black text-center">
        <motion.div
          initial="hidden" whileInView="visible"
          viewport={{ once: true }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="max-w-3xl mx-auto"
        >
          <motion.h2 variants={reveal} className="text-5xl sm:text-6xl font-black tracking-tighter mb-8">
            Run the logic.
          </motion.h2>
          <motion.p variants={reveal} className="text-xl text-neutral-500 mb-12 font-light">
            Skip the terminal. Execute directly from the Dashboard.
          </motion.p>
          <motion.div variants={reveal} className="flex justify-center gap-6">
            <Link
              href="/app"
              className="px-10 py-5 bg-white text-black text-lg font-bold tracking-wide hover:bg-neutral-200 transition-colors"
            >
              Open Control Center
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <footer className="border-t border-neutral-900 py-8 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono text-neutral-600">
          <p>© 2026 404 Safety Not Found. All logic verified.</p>
          <div className="flex gap-8">
            <span className="hover:text-white transition-colors cursor-pointer">Python 3.12+</span>
            <span className="hover:text-white transition-colors cursor-pointer">Next.js 16</span>
            <span className="hover:text-white transition-colors cursor-pointer">Local Execution</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
