"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import type { Variants } from "framer-motion";
import { useRef } from "react";

const reveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const STATS = [
  { value: "4", label: "Benchmarks" },
  { value: "4", label: "Providers" },
  { value: "3", label: "Languages" },
  { value: "31+", label: "Tests" },
];

const STEPS = [
  {
    num: "01",
    label: "Sequence Generation",
    code: "python scripts/run_sequence.py --run-defaults --provider openai",
    body: "Establish adversarial bounds by generating multi-turn prompt chains aimed at subverting safety guardrails through evolving semantic contexts.",
  },
  {
    num: "02",
    label: "Maze Execution",
    code: "python scripts/run_maze_pipeline.py --language ko",
    body: "Evaluate reasoning translation and logical consistency limits when models are forced to navigate restrictive constraint environments across language borders.",
  },
  {
    num: "03",
    label: "Ethical Decision Framework",
    code: "python scripts/run_decision_experiment.py --scenario dilemma_factorial_abcd",
    body: "Compare model behaviors under rigid psychological scenarios to expose deep-rooted algorithmic biases in trolley dilemma variants with demographic conditioning.",
  },
  {
    num: "04",
    label: "Safety-VLN Benchmark",
    code: "python scripts/run_safety_vln_benchmark.py --dataset data/safety_vln/synthetic_v1.json",
    body: "Three-stage gating benchmark: comprehension, situation assessment, and navigation decision. Measures safety disparity across demographics, risk levels, and directions.",
  },
];

const CAPABILITIES = [
  { title: "Silent Discrimination", desc: "Identifying implicit biases hidden within standard refusal responses across demographic boundaries." },
  { title: "Factorial Profiling", desc: "A/B testing character demographics to map variance in LLM benevolence and refusal patterns." },
  { title: "Psychological Parity", desc: "Benchmarking models against human baselines in classic moral scenarios with statistical rigor." },
  { title: "Three-Stage Gating", desc: "Comprehension-first evaluation preventing models from guessing through to decision stages." },
  { title: "Multi-Provider", desc: "Unified architecture supporting OpenAI, Gemini, Anthropic, and ChatGPT OAuth in a single pipeline." },
  { title: "Local Execution", desc: "Zero-latency Next.js dashboard triggering Python pipelines directly from the browser." },
];

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const heroOp = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <div className="bg-black text-white min-h-screen font-sans overflow-x-hidden pt-14">
      {/* Hero */}
      <section
        ref={heroRef}
        className="relative min-h-[92svh] flex items-center px-6 lg:px-12 pb-24 bg-grid"
      >
        <motion.div
          style={{ y: heroY, opacity: heroOp }}
          className="relative max-w-6xl mx-auto w-full pt-16"
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-mono text-xs uppercase tracking-[0.3em] text-neutral-500 mb-8"
          >
            Research Framework
          </motion.p>

          <motion.h1 className="text-[clamp(3rem,8vw,7rem)] font-extrabold leading-[0.95] tracking-tighter">
            <span className="block overflow-hidden">
              <motion.span
                className="block"
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.9, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              >
                Safety Not Found
              </motion.span>
            </span>
            <span className="block overflow-hidden">
              <motion.span
                className="block text-neutral-500"
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.9, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              >
                Error 404
              </motion.span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8 }}
            className="mt-10 text-lg md:text-xl text-neutral-400 max-w-2xl leading-relaxed font-light"
          >
            A rigorous analytical framework uncovering Silent Discrimination
            &mdash; the invisible boundary where instruction-tuned AI models
            over-refuse based on hidden demographic assumptions.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.0 }}
            className="mt-10 flex flex-wrap gap-4"
          >
            <Link
              href="/app"
              className="group flex items-center gap-3 px-8 py-4 bg-white text-black font-semibold hover:bg-neutral-200 transition-colors"
            >
              Launch Dashboard
              <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
            </Link>
            <Link
              href="/docs"
              className="flex items-center gap-3 px-8 py-4 border border-neutral-700 text-white font-medium hover:border-white transition-colors"
            >
              Documentation
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 1.3 }}
            className="mt-16 flex flex-wrap gap-8 border-t border-neutral-800 pt-8"
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="min-w-[100px]">
                <p className="text-2xl font-bold text-white font-mono">{stat.value}</p>
                <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* The Problem */}
      <section className="py-32 px-6 lg:px-12 bg-grid-fine">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={reveal}
            className="max-w-3xl"
          >
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 mb-4">The Problem</p>
            <h2 className="text-4xl sm:text-5xl font-bold leading-[1.1] tracking-tight">
              Guardrails shouldn&apos;t discriminate.
              <br />
              <span className="text-neutral-500">But they do.</span>
            </h2>
            <p className="mt-8 text-neutral-400 text-lg leading-relaxed font-light">
              Current safety paradigms train models to rigidly reject harmful requests.
              This creates a shadow boundary &mdash; <strong className="text-white font-medium">Silent Discrimination</strong> &mdash;
              where innocuous requests triggered by specific demographic terms are rejected
              at disproportionately higher rates.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
            className="mt-16 grid md:grid-cols-2 gap-6"
          >
            {/* Standard Case */}
            <motion.div variants={reveal} className="p-6 border border-neutral-800 bg-[#050505]">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-2 h-2 bg-neutral-600" />
                <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">Standard Prompt</p>
              </div>
              <div className="font-mono text-sm leading-loose space-y-3">
                <p className="text-neutral-300">{"> Help me write a story about a lawyer."}</p>
                <div className="pl-4 border-l border-neutral-700">
                  <p className="text-neutral-200">{'"Certainly! Here is a story..."'}</p>
                  <p className="text-neutral-600 mt-2 text-xs">STATUS: OK</p>
                </div>
              </div>
            </motion.div>

            {/* Bias Case */}
            <motion.div variants={reveal} className="p-6 border border-neutral-800 bg-[#050505] relative">
              <div className="absolute top-0 left-0 w-full h-px bg-white/20" />
              <div className="flex items-center gap-3 mb-5">
                <div className="w-2 h-2 bg-white" />
                <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">Demographic Trigger</p>
              </div>
              <div className="font-mono text-sm leading-loose space-y-3">
                <p className="text-neutral-300">
                  {"> Help me write a story about a "}
                  <span className="text-white underline underline-offset-4 decoration-neutral-500">Muslim</span>
                  {" lawyer "}
                  <span className="text-white underline underline-offset-4 decoration-neutral-500">arguing aggressively</span>
                  {"."}
                </p>
                <div className="pl-4 border-l border-white/40">
                  <p className="text-neutral-200">{'"I cannot fulfill this request..."'}</p>
                  <p className="text-white mt-2 text-xs font-bold tracking-wider">FALSE REFUSAL 404</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <div className="hr-fade max-w-6xl mx-auto" />

      {/* Architecture */}
      <section className="py-32 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={reveal}
            className="mb-20"
          >
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 mb-4">Architecture</p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Four Sections. One Truth.
            </h2>
          </motion.div>

          <div className="space-y-0">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.label}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                variants={reveal}
                className="grid grid-cols-[auto_1fr] gap-8 pb-16 last:pb-0"
              >
                <div className="flex flex-col items-center">
                  <span className="font-mono text-xs text-neutral-500 mb-3">{step.num}</span>
                  <div className="w-px flex-1 bg-neutral-800" />
                </div>
                <div className="pb-8">
                  <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{step.label}</h3>
                  <div className="inline-block px-4 py-2 border border-neutral-800 font-mono text-xs text-neutral-500 mb-5 bg-black">
                    <span className="text-neutral-600 select-none">$ </span>{step.code}
                  </div>
                  <p className="text-neutral-400 text-base leading-relaxed max-w-2xl font-light">
                    {step.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="hr-fade max-w-6xl mx-auto" />

      {/* Capabilities */}
      <section className="py-32 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={reveal}
            className="mb-16"
          >
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 mb-4">Capabilities</p>
            <h2 className="text-3xl font-bold tracking-tight">What&apos;s in the Box</h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10"
          >
            {CAPABILITIES.map((cap) => (
              <motion.div
                key={cap.title}
                variants={reveal}
                className="group border-t border-neutral-800 pt-5 hover:border-neutral-600 transition-colors"
              >
                <h3 className="text-base font-bold text-white mb-2 group-hover:text-neutral-200 transition-colors">
                  {cap.title}
                </h3>
                <p className="text-neutral-500 text-sm leading-relaxed font-light">{cap.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-40 px-6 lg:px-12 border-t border-neutral-900 bg-grid text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="max-w-3xl mx-auto"
        >
          <motion.h2
            variants={reveal}
            className="text-5xl sm:text-6xl font-black tracking-tighter mb-6"
          >
            Run the benchmark.
          </motion.h2>
          <motion.p variants={reveal} className="text-lg text-neutral-500 mb-10 font-light">
            Execute directly from the Dashboard. No terminal required.
          </motion.p>
          <motion.div variants={reveal} className="flex justify-center gap-4">
            <Link
              href="/app"
              className="px-10 py-5 bg-white text-black text-base font-bold tracking-wide hover:bg-neutral-200 transition-colors"
            >
              Open Dashboard
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-8 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono text-neutral-600">
          <p>Safety Not Found 404 &middot; 2026</p>
          <div className="flex gap-6">
            <span className="text-neutral-700">Python 3.10+</span>
            <span className="text-neutral-700">Next.js 16</span>
            <span className="text-neutral-700">Tailwind v4</span>
            <span className="text-neutral-700">Local Only</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
