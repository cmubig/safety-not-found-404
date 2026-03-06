"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const TOC = [
  { id: "quick-start", label: "Quick Start" },
  { id: "requirements", label: "Requirements" },
  { id: "architecture", label: "Architecture" },
  { id: "authentication", label: "Authentication" },
  { id: "section-1", label: "Section 1 — Sequence" },
  { id: "section-2", label: "Section 2 — Maze" },
  { id: "section-3", label: "Section 3 — Decision" },
  { id: "section-4", label: "Section 4 — Safety-VLN" },
  { id: "api-reference", label: "API Reference" },
  { id: "project-structure", label: "Project Structure" },
  { id: "troubleshooting", label: "Troubleshooting" },
] as const;

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="bg-[#050505] border border-neutral-800 rounded-md overflow-hidden">
      {title && (
        <div className="px-4 py-2 border-b border-neutral-800 text-[11px] font-mono text-neutral-500 uppercase tracking-wider">
          {title}
        </div>
      )}
      <pre className="p-4 font-mono text-sm text-neutral-300 overflow-x-auto leading-relaxed whitespace-pre">
        {children}
      </pre>
    </div>
  );
}

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "required" | "optional" | "none" }) {
  const styles = {
    default: "border-neutral-700 text-neutral-400",
    required: "border-amber-800 text-amber-300",
    optional: "border-neutral-700 text-neutral-500",
    none: "border-emerald-900 text-emerald-400",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border ${styles[variant]}`}>
      {children}
    </span>
  );
}

function SectionHeading({ id, number, title }: { id: string; number: string; title: string }) {
  return (
    <div id={id} className="scroll-mt-20 border-b border-neutral-800 pb-3 flex items-baseline gap-4">
      <span className="font-mono text-xs text-neutral-600">{number}</span>
      <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
    </div>
  );
}

export default function DocsPage() {
  const [tocOpen, setTocOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 pb-32">
        {/* Header */}
        <div className="mb-12 space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <Badge>v0.1.0</Badge>
            <Badge>Python 3.10+</Badge>
            <Badge>Next.js 16</Badge>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            Developer Documentation
          </h1>
          <p className="text-lg text-neutral-400 leading-relaxed max-w-3xl">
            Technical reference for the Safety Not Found 404 benchmark framework.
            Covers installation, architecture, authentication, all four experimental
            pipelines, and the internal API surface.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[240px_1fr] gap-8">
          {/* Sidebar TOC */}
          <aside className="xl:sticky xl:top-20 xl:self-start">
            <button
              type="button"
              onClick={() => setTocOpen(!tocOpen)}
              className="xl:hidden w-full text-left px-4 py-3 border border-neutral-800 text-sm text-neutral-300 mb-4"
            >
              Table of Contents {tocOpen ? "▴" : "▾"}
            </button>
            <nav className={`space-y-1 ${tocOpen ? "block" : "hidden"} xl:block`}>
              <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-3 px-3">
                On this page
              </p>
              {TOC.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={() => setTocOpen(false)}
                  className="block px-3 py-1.5 text-sm text-neutral-500 hover:text-white hover:bg-neutral-900 transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <div className="space-y-16 min-w-0">
            {/* ===== QUICK START ===== */}
            <section className="space-y-6">
              <SectionHeading id="quick-start" number="01" title="Quick Start" />

              <div className="grid sm:grid-cols-4 gap-4">
                {[
                  { step: "1", title: "Clone", cmd: "git clone <repo-url>\ncd safety-not-found-404-codebase" },
                  { step: "2", title: "Env", cmd: "cp .env.example .env\n# Edit .env → add API keys" },
                  { step: "3", title: "Python", cmd: "cd services/research-engine\npython3.12 -m venv .venv\nsource .venv/bin/activate\npip install -r requirements.txt" },
                  { step: "4", title: "Dashboard", cmd: "cd apps/dashboard\nnpm install\nnpm run dev" },
                ].map((s) => (
                  <div key={s.step} className="border border-neutral-800 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center border border-neutral-700 text-xs font-mono text-neutral-400">
                        {s.step}
                      </span>
                      <span className="text-sm font-semibold text-white">{s.title}</span>
                    </div>
                    <pre className="text-[11px] font-mono text-neutral-500 leading-relaxed whitespace-pre">{s.cmd}</pre>
                  </div>
                ))}
              </div>

              <Card>
                <CardContent className="pt-6 text-neutral-400 text-sm leading-relaxed space-y-3">
                  <p>
                    After starting the dev server, open <code className="text-white">http://localhost:1455</code> in
                    your browser. The landing page is at <code className="text-white">/</code> and the
                    experiment dashboard is at <code className="text-white">/app</code>.
                  </p>
                  <p>
                    Port <strong className="text-neutral-300">1455</strong> is required for
                    ChatGPT OAuth callback routing. The Maze pipeline (Section 2) requires
                    no API key and can be tested immediately.
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* ===== REQUIREMENTS ===== */}
            <section className="space-y-6">
              <SectionHeading id="requirements" number="02" title="Requirements" />

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 text-left text-neutral-500">
                      <th className="py-3 pr-6 font-medium">Dependency</th>
                      <th className="py-3 pr-6 font-medium">Version</th>
                      <th className="py-3 pr-6 font-medium">Check</th>
                      <th className="py-3 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="text-neutral-400">
                    <tr className="border-b border-neutral-900">
                      <td className="py-3 pr-6 text-white font-medium">Node.js</td>
                      <td className="py-3 pr-6 font-mono text-xs">18+</td>
                      <td className="py-3 pr-6 font-mono text-xs">node --version</td>
                      <td className="py-3 text-xs">Required for the Next.js dashboard</td>
                    </tr>
                    <tr className="border-b border-neutral-900">
                      <td className="py-3 pr-6 text-white font-medium">Python</td>
                      <td className="py-3 pr-6 font-mono text-xs">3.10 – 3.13</td>
                      <td className="py-3 pr-6 font-mono text-xs">python3 --version</td>
                      <td className="py-3 text-xs">3.12 recommended. 3.14 may fail to build opencv-python</td>
                    </tr>
                    <tr className="border-b border-neutral-900">
                      <td className="py-3 pr-6 text-white font-medium">pip</td>
                      <td className="py-3 pr-6 font-mono text-xs">22+</td>
                      <td className="py-3 pr-6 font-mono text-xs">pip --version</td>
                      <td className="py-3 text-xs">Included with Python venv</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-6 text-white font-medium">Git</td>
                      <td className="py-3 pr-6 font-mono text-xs">2.30+</td>
                      <td className="py-3 pr-6 font-mono text-xs">git --version</td>
                      <td className="py-3 text-xs">LFS required for legacy video assets</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-200/80 leading-relaxed">
                <strong className="text-amber-200">Python 3.14 Warning:</strong>{" "}
                Several native extension packages (<code>opencv-python</code>, <code>numpy</code>)
                do not yet ship pre-built wheels for Python 3.14. Use{" "}
                <code>python3.12 -m venv .venv</code> to avoid C-level build failures.
              </div>
            </section>

            {/* ===== ARCHITECTURE ===== */}
            <section className="space-y-6">
              <SectionHeading id="architecture" number="03" title="Architecture" />

              <Card>
                <CardContent className="pt-6 text-neutral-300 space-y-5 leading-relaxed text-sm">
                  <p>
                    The framework follows a <strong className="text-white">two-process architecture</strong>:
                    a Next.js frontend that acts as a control plane, and a Python backend that executes
                    the actual benchmark logic.
                  </p>

                  <CodeBlock title="Request Flow">{`Browser (Dashboard UI)
  │
  ├─ POST /api/run  { type, apiKeys, ...params }
  │
  ▼
Next.js API Route (apps/dashboard/src/app/api/run/route.ts)
  │
  ├─ Resolves Python binary: .venv/bin/python → python3
  ├─ Injects API keys into env vars
  ├─ Spawns: python scripts/run_<type>.py --flags
  │
  ▼
Python Process (services/research-engine/)
  │
  ├─ stdout/stderr → streamed back as chunked text
  ├─ Artifacts written to disk (outputs/, maze_fin/)
  │
  ▼
Dashboard parses stream → progress bar, log feed, artifact list`}</CodeBlock>

                  <div className="grid sm:grid-cols-3 gap-4 pt-2">
                    <div className="border border-neutral-800 p-4">
                      <p className="text-xs font-mono text-neutral-500 uppercase tracking-wider mb-2">Frontend</p>
                      <p className="text-neutral-400 text-xs leading-relaxed">
                        Next.js 16 App Router. Tailwind CSS v4 monochrome design system.
                        Real-time log streaming via ReadableStream. Framer Motion transitions.
                      </p>
                    </div>
                    <div className="border border-neutral-800 p-4">
                      <p className="text-xs font-mono text-neutral-500 uppercase tracking-wider mb-2">API Bridge</p>
                      <p className="text-neutral-400 text-xs leading-relaxed">
                        Single POST endpoint (<code>/api/run</code>) with type-specific handlers.
                        Spawns Python child processes with environment-injected credentials.
                      </p>
                    </div>
                    <div className="border border-neutral-800 p-4">
                      <p className="text-xs font-mono text-neutral-500 uppercase tracking-wider mb-2">Python Engine</p>
                      <p className="text-neutral-400 text-xs leading-relaxed">
                        Modular package at <code>src/safety_not_found_404/</code>.
                        LLM abstraction layer supports OpenAI, Gemini, Anthropic, and ChatGPT OAuth.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* ===== AUTHENTICATION ===== */}
            <section className="space-y-6">
              <SectionHeading id="authentication" number="04" title="Authentication" />

              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-3">
                      ChatGPT OAuth (PKCE)
                      <Badge variant="optional">Auto-refresh</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-neutral-400 text-sm leading-relaxed space-y-3">
                    <p>
                      Authenticate with your ChatGPT Plus/Pro/Team account without exposing raw API keys.
                      The dashboard initiates an OAuth PKCE flow against <code>auth.openai.com</code>,
                      stores the ephemeral <code>access_token</code> in <code>localStorage</code>,
                      and auto-refreshes 5 minutes before expiry.
                    </p>
                    <p>
                      The token is injected as <code>OPENAI_API_KEY</code> into the Python subprocess
                      environment. Login opens in a new tab; the dashboard updates via a storage event listener.
                    </p>
                    <div className="border border-neutral-800 px-3 py-2 text-xs text-neutral-500">
                      OAuth callback requires <code>localhost:1455</code>. Other hostnames will be redirected.
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-3">
                      Manual API Keys
                      <Badge variant="optional">Multi-provider</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-neutral-400 text-sm leading-relaxed space-y-3">
                    <p>
                      Enter keys directly in the dashboard header. Three providers supported:
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-neutral-800 text-neutral-500 text-left">
                            <th className="py-2 pr-4 font-medium">Provider</th>
                            <th className="py-2 pr-4 font-medium">Env Variable</th>
                            <th className="py-2 pr-4 font-medium">Key Format</th>
                            <th className="py-2 font-medium">Used By</th>
                          </tr>
                        </thead>
                        <tbody className="text-neutral-400 font-mono">
                          <tr className="border-b border-neutral-900">
                            <td className="py-2 pr-4 text-white font-sans">OpenAI</td>
                            <td className="py-2 pr-4">OPENAI_API_KEY</td>
                            <td className="py-2 pr-4">sk-proj-...</td>
                            <td className="py-2 font-sans">Sequence, Decision, Safety-VLN</td>
                          </tr>
                          <tr className="border-b border-neutral-900">
                            <td className="py-2 pr-4 text-white font-sans">Google</td>
                            <td className="py-2 pr-4">GEMINI_API_KEY</td>
                            <td className="py-2 pr-4">AIza...</td>
                            <td className="py-2 font-sans">Sequence, Decision, Safety-VLN</td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-4 text-white font-sans">Anthropic</td>
                            <td className="py-2 pr-4">ANTHROPIC_API_KEY</td>
                            <td className="py-2 pr-4">sk-ant-...</td>
                            <td className="py-2 font-sans">Decision, Safety-VLN</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-neutral-500">
                      Resolution order: dashboard input → OAuth token → <code>.env</code> file.
                      API key and OAuth can coexist; API key takes priority for model catalog sync.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* ===== SECTION 1 ===== */}
            <section className="space-y-6">
              <SectionHeading id="section-1" number="05" title="Section 1 — Sequence Runner" />

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">Multi-Turn Adversarial Prompt Chains</CardTitle>
                    <Badge variant="required">LLM Required</Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-neutral-400 text-sm leading-relaxed space-y-4">
                  <p>
                    Generates evolving multi-turn prompt sequences that probe safety guardrail boundaries.
                    Each sequence sends image+text payloads through the vision LLM client and records
                    refusal/compliance patterns across semantic contexts.
                  </p>

                  <CodeBlock title="CLI">{`python scripts/run_sequence.py --run-defaults --provider openai
python scripts/run_sequence.py --run-defaults --provider gemini`}</CodeBlock>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="border border-neutral-800 p-3 space-y-1">
                      <p className="text-xs font-mono text-neutral-500">Providers</p>
                      <p className="text-xs text-neutral-300">OpenAI (GPT-4 Vision), Gemini</p>
                    </div>
                    <div className="border border-neutral-800 p-3 space-y-1">
                      <p className="text-xs font-mono text-neutral-500">Prerequisites</p>
                      <p className="text-xs text-neutral-300">
                        Image datasets at <code>data/sequence/masking/</code> and <code>data/sequence/validation/</code>
                      </p>
                    </div>
                    <div className="border border-neutral-800 p-3 space-y-1">
                      <p className="text-xs font-mono text-neutral-500">LLM Module</p>
                      <p className="text-xs text-neutral-300 font-mono">llm/factory.py → create_vision_client()</p>
                    </div>
                    <div className="border border-neutral-800 p-3 space-y-1">
                      <p className="text-xs font-mono text-neutral-500">Output</p>
                      <p className="text-xs text-neutral-300 font-mono">outputs/sequence/</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* ===== SECTION 2 ===== */}
            <section className="space-y-6">
              <SectionHeading id="section-2" number="06" title="Section 2 — Maze Pipeline" />

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">Maze Generation &amp; Visualization</CardTitle>
                    <Badge variant="none">No API Key</Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-neutral-400 text-sm leading-relaxed space-y-4">
                  <p>
                    Fully local pipeline that generates, analyzes, and visualizes constrained mazes.
                    Produces datasets for evaluating reasoning translation and logical consistency when
                    models navigate restrictive constraint environments across language borders.
                  </p>

                  <CodeBlock title="CLI">{`python scripts/run_maze_pipeline.py --language ko
python scripts/run_maze_pipeline.py --language en`}</CodeBlock>

                  <div className="space-y-3">
                    <p className="text-xs font-mono text-neutral-500 uppercase tracking-wider">Pipeline Stages</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        {
                          stage: "1",
                          title: "Map Generation",
                          desc: "BFS-based maze creation (5×5 to 20×20). Ensures exactly one valid S→G path by iteratively blocking cycle candidates.",
                          output: "maze_fin/maps/{size}.json",
                        },
                        {
                          stage: "2",
                          title: "Text Visualization",
                          desc: "Converts JSON maps to human-readable grid text files with headers showing start, goal, and statistics.",
                          output: "maze_fin/view/{size}.txt",
                        },
                        {
                          stage: "3",
                          title: "Turn Count Sort",
                          desc: "Analyzes each maze path for directional changes. Sorts by turn count descending (more turns = higher complexity).",
                          output: "maze_fin/sortview/{size}.txt",
                        },
                        {
                          stage: "4",
                          title: "Image Rendering",
                          desc: "Matplotlib renders the top-5 most complex mazes per size as PNG images with wall/path/start/goal visualization.",
                          output: "maze_fin/img/{size}.png",
                        },
                      ].map((s) => (
                        <div key={s.stage} className="border border-neutral-800 p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 flex items-center justify-center border border-neutral-700 text-[10px] font-mono text-neutral-500">
                              {s.stage}
                            </span>
                            <span className="text-xs font-semibold text-white">{s.title}</span>
                          </div>
                          <p className="text-xs text-neutral-500 leading-relaxed">{s.desc}</p>
                          <p className="text-[10px] font-mono text-neutral-600">{s.output}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="border border-neutral-800 p-3 space-y-1">
                      <p className="text-xs font-mono text-neutral-500">Parameters</p>
                      <p className="text-xs text-neutral-300">
                        <code>--min-size 5</code> <code>--max-size 20</code>{" "}
                        <code>--attempts-per-size 100</code>
                      </p>
                    </div>
                    <div className="border border-neutral-800 p-3 space-y-1">
                      <p className="text-xs font-mono text-neutral-500">Languages</p>
                      <p className="text-xs text-neutral-300">
                        <code>en</code> (English log output), <code>ko</code> (Korean log output)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* ===== SECTION 3 ===== */}
            <section className="space-y-6">
              <SectionHeading id="section-3" number="07" title="Section 3 — Decision Experiments" />

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">Ethical Decision Framework</CardTitle>
                    <Badge variant="required">LLM Required</Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-neutral-400 text-sm leading-relaxed space-y-4">
                  <p>
                    Evaluates model behavior under structured psychological scenarios.
                    Factorial experiment design systematically varies framing, demographics, and
                    answer space to expose algorithmic biases in moral decision-making.
                  </p>

                  <CodeBlock title="CLI">{`python scripts/run_decision_experiment.py \\
  --scenario dilemma_factorial_abcd \\
  --models gpt-4.1-mini,gemini-2.5-flash`}</CodeBlock>

                  <div className="space-y-3">
                    <p className="text-xs font-mono text-neutral-500 uppercase tracking-wider">Available Scenarios</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-neutral-800 text-neutral-500 text-left">
                            <th className="py-2 pr-4 font-medium">Key</th>
                            <th className="py-2 pr-4 font-medium">Design</th>
                            <th className="py-2 font-medium">Description</th>
                          </tr>
                        </thead>
                        <tbody className="text-neutral-400">
                          <tr className="border-b border-neutral-900">
                            <td className="py-2 pr-4 font-mono text-neutral-300">dilemma_baseline_ab</td>
                            <td className="py-2 pr-4">A/B binary</td>
                            <td className="py-2">Baseline trolley dilemma prompt set (100 cases)</td>
                          </tr>
                          <tr className="border-b border-neutral-900">
                            <td className="py-2 pr-4 font-mono text-neutral-300">dilemma_factorial_ab</td>
                            <td className="py-2 pr-4">2×2×2 factorial</td>
                            <td className="py-2">Factorial framing with A/B answer space</td>
                          </tr>
                          <tr className="border-b border-neutral-900">
                            <td className="py-2 pr-4 font-mono text-neutral-300">dilemma_factorial_abd</td>
                            <td className="py-2 pr-4">2×2×2 factorial</td>
                            <td className="py-2">Factorial framing with A/B/D answer space (includes deflection)</td>
                          </tr>
                          <tr className="border-b border-neutral-900">
                            <td className="py-2 pr-4 font-mono text-neutral-300">dilemma_factorial_abcd</td>
                            <td className="py-2 pr-4">2×2×2 factorial</td>
                            <td className="py-2">Full 4-choice factorial (A/B/C/D)</td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-4 font-mono text-neutral-300">dilemma_prompt_types_ab</td>
                            <td className="py-2 pr-4">Prompt variation</td>
                            <td className="py-2">Tests multiple prompt phrasings with A/B space</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-mono text-neutral-500 uppercase tracking-wider">Provider Support</p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { name: "OpenAI", cls: "OpenAITextProvider", api: "Chat Completions API" },
                        { name: "Gemini", cls: "GeminiTextProvider", api: "Google GenAI SDK" },
                        { name: "Anthropic", cls: "AnthropicTextProvider", api: "Messages API (REST)" },
                        { name: "ChatGPT OAuth", cls: "ChatGPTOAuthProvider", api: "Completions via OAuth token" },
                      ].map((p) => (
                        <div key={p.name} className="border border-neutral-800 p-3 space-y-1">
                          <p className="text-xs font-semibold text-white">{p.name}</p>
                          <p className="text-[10px] font-mono text-neutral-600">{p.cls}</p>
                          <p className="text-[10px] text-neutral-500">{p.api}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* ===== SECTION 4 ===== */}
            <section className="space-y-6">
              <SectionHeading id="section-4" number="08" title="Section 4 — Safety-VLN Benchmark" />

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">Three-Stage Gating Architecture</CardTitle>
                    <Badge variant="required">LLM Required</Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-neutral-400 text-sm leading-relaxed space-y-4">
                  <p>
                    A gated evaluation pipeline that prevents models from guessing through
                    comprehension barriers. Each stage must pass before the next is attempted,
                    ensuring measured responses reflect genuine understanding.
                  </p>

                  <div className="grid sm:grid-cols-3 gap-4">
                    {[
                      {
                        stage: "1",
                        title: "Comprehension",
                        desc: "Tests whether the model understands the scenario context. Failure skips all subsequent stages.",
                        gate: "Must pass to continue",
                      },
                      {
                        stage: "2",
                        title: "Situation Assessment",
                        desc: "Evaluates identification of safety-relevant elements. Requires Stage 1 pass.",
                        gate: "Must pass to continue",
                      },
                      {
                        stage: "3",
                        title: "Navigation Decision",
                        desc: "The actual safety decision. Scored with reward/penalty weights across safety, efficiency, and goal dimensions.",
                        gate: "Final evaluation",
                      },
                    ].map((s) => (
                      <div key={s.stage} className="border border-neutral-800 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 flex items-center justify-center bg-white text-black text-xs font-bold">
                            {s.stage}
                          </span>
                          <span className="text-sm font-semibold text-white">{s.title}</span>
                        </div>
                        <p className="text-xs text-neutral-500 leading-relaxed">{s.desc}</p>
                        <p className="text-[10px] font-mono text-neutral-600">{s.gate}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-mono text-neutral-500 uppercase tracking-wider">Dataset Workflow</p>
                    <CodeBlock>{`# 1. Generate synthetic dataset
python scripts/generate_safety_vln_dataset.py \\
  --out data/safety_vln/synthetic_v1.json \\
  --per-track 100 --event-ratio 0.5 --seed 20260304

# 2. Validate fairness constraints
python scripts/validate_safety_vln_dataset.py \\
  --dataset data/safety_vln/synthetic_v1.json

# 3. Run the benchmark
python scripts/run_safety_vln_benchmark.py \\
  --dataset data/safety_vln/synthetic_v1.json \\
  --provider openai --model gpt-4.1-mini \\
  --judge-mode rule`}</CodeBlock>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="border border-neutral-800 p-3 space-y-2">
                      <p className="text-xs font-mono text-neutral-500">Rule-Based Judge</p>
                      <p className="text-xs text-neutral-400">
                        Deterministic regex matching. Fast, reproducible, no API cost.
                        Suitable for development and CI.
                      </p>
                    </div>
                    <div className="border border-neutral-800 p-3 space-y-2">
                      <p className="text-xs font-mono text-neutral-500">LLM Judge</p>
                      <p className="text-xs text-neutral-400">
                        Uses a separate LLM to evaluate responses. More nuanced scoring
                        but requires API access. Configurable provider and model.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* ===== API REFERENCE ===== */}
            <section className="space-y-6">
              <SectionHeading id="api-reference" number="09" title="API Reference" />

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-mono">POST /api/run</CardTitle>
                </CardHeader>
                <CardContent className="text-neutral-400 text-sm leading-relaxed space-y-4">
                  <p>
                    Primary execution endpoint. Spawns a Python subprocess and streams
                    stdout/stderr back as chunked <code>text/plain</code>.
                  </p>

                  <CodeBlock title="Request Body">{`{
  "type": "sequence" | "maze" | "decision" | "safety_vln",
  "apiKeys": {
    "openai": "sk-...",       // optional, overrides .env
    "gemini": "AIza...",      // optional
    "anthropic": "sk-ant-..." // optional
  },
  "oauthToken": "eyJ...",    // optional, ChatGPT OAuth
  "oauthAccountId": "...",   // optional

  // Type-specific parameters:
  "lang": "ko",                    // maze
  "provider": "openai",            // sequence, safety_vln
  "scenario": "dilemma_factorial_abcd",  // decision
  "models": "gpt-4.1-mini",        // decision (comma-separated)
  "datasetPath": "data/...",        // safety_vln
  "judgeMode": "rule" | "llm",     // safety_vln
  "action": "run_benchmark" | "generate_dataset" | "validate_dataset"
}`}</CodeBlock>

                  <CodeBlock title="Response">{`HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Transfer-Encoding: chunked

Processing 5x5...
  progress: 10/100 | generated: 8
  progress: 20/100 | generated: 17
  ...
saved: /absolute/path/to/output.json
[Process exited with code 0]`}</CodeBlock>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-mono">GET /api/artifact?path=...</CardTitle>
                </CardHeader>
                <CardContent className="text-neutral-400 text-sm leading-relaxed space-y-3">
                  <p>
                    Serves generated artifact files (images, JSON, text) for in-browser preview.
                    Access is restricted to files within <code>services/research-engine/</code>.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-neutral-800 text-neutral-500 text-left">
                          <th className="py-2 pr-4 font-medium">Extension</th>
                          <th className="py-2 font-medium">Content-Type</th>
                        </tr>
                      </thead>
                      <tbody className="text-neutral-400 font-mono">
                        <tr className="border-b border-neutral-900"><td className="py-2 pr-4">.png</td><td className="py-2">image/png</td></tr>
                        <tr className="border-b border-neutral-900"><td className="py-2 pr-4">.json</td><td className="py-2">application/json</td></tr>
                        <tr className="border-b border-neutral-900"><td className="py-2 pr-4">.txt</td><td className="py-2">text/plain</td></tr>
                        <tr><td className="py-2 pr-4">.csv</td><td className="py-2">text/csv</td></tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* ===== PROJECT STRUCTURE ===== */}
            <section className="space-y-6">
              <SectionHeading id="project-structure" number="10" title="Project Structure" />

              <Card>
                <CardContent className="pt-6 text-neutral-300 space-y-4 leading-relaxed text-sm">
                  <CodeBlock>{`safety-not-found-404-codebase/
├── .env.example                      # API key template
├── apps/
│   └── dashboard/                    # Next.js 16 frontend
│       └── src/
│           ├── app/                  # Routes: /, /app, /docs, /api/*
│           ├── components/ui/        # Button, Card, Input, Select, Navbar
│           ├── features/dashboard/   # Hooks, components, utils, types
│           └── lib/                  # ChatGPT OAuth helpers
└── services/
    └── research-engine/              # Python 3.10+ backend
        ├── scripts/                  # CLI entry points
        │   ├── run_sequence.py
        │   ├── run_maze_pipeline.py
        │   ├── run_decision_experiment.py
        │   ├── run_safety_vln_benchmark.py
        │   ├── generate_safety_vln_dataset.py
        │   └── validate_safety_vln_dataset.py
        ├── src/safety_not_found_404/
        │   ├── common/               # Shared file/time utilities
        │   ├── llm/                  # LLM client abstraction layer
        │   │   ├── base.py           # VisionLLMClient protocol
        │   │   ├── openai_client.py  # OpenAI Chat Completions
        │   │   ├── gemini_client.py  # Google GenAI SDK
        │   │   ├── chatgpt_client.py # ChatGPT OAuth wrapper
        │   │   └── factory.py        # create_vision_client()
        │   ├── sequence/             # Section 1 runner
        │   ├── maze/                 # Section 2 pipeline
        │   ├── decision_experiments/ # Section 3 engine
        │   │   ├── providers.py      # Text LLM providers
        │   │   ├── engine.py         # run_scenario()
        │   │   ├── scenarios/        # Scenario registry
        │   │   └── prompts_404/      # Prompt generators
        │   ├── safety_vln/           # Section 4 benchmark
        │   └── evaluation/           # LLM judge service
        ├── tests/                    # 31+ pytest cases
        ├── outputs/                  # Generated results
        └── maze_fin/                 # Maze pipeline outputs`}</CodeBlock>

                  <CodeBlock title="Run Tests">{`cd services/research-engine
source .venv/bin/activate
python -m pytest -q`}</CodeBlock>
                </CardContent>
              </Card>
            </section>

            {/* ===== TROUBLESHOOTING ===== */}
            <section className="space-y-6">
              <SectionHeading id="troubleshooting" number="11" title="Troubleshooting" />

              <div className="space-y-4">
                {[
                  {
                    q: "python3 -m venv .venv fails with \"ensurepip is not available\"",
                    a: "Your Python installation is missing the venv module. On macOS: brew install python@3.12 and use python3.12 -m venv .venv. On Ubuntu: sudo apt install python3.12-venv.",
                  },
                  {
                    q: "pip install fails building opencv-python or numpy",
                    a: "Most likely Python 3.14 which lacks pre-built wheels. Recreate the venv with Python 3.12: rm -rf .venv && python3.12 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt",
                  },
                  {
                    q: "Dashboard experiment fails with \"python3: command not found\"",
                    a: "The API route looks for .venv/bin/python in services/research-engine/. Ensure you created the venv at the correct path. Run: ls services/research-engine/.venv/bin/python",
                  },
                  {
                    q: "OAuth login shows \"Only supported on localhost\"",
                    a: "ChatGPT OAuth callback is bound to localhost:1455. Access the dashboard via http://localhost:1455/app, not via IP address or other hostname.",
                  },
                  {
                    q: "Model catalog shows \"api.model.read scope missing\"",
                    a: "The OAuth token lacks model listing permission. Provide an OpenAI API key in the dashboard header for full live catalog sync. Experiments will still work with the compatibility model profile.",
                  },
                  {
                    q: "401 Unauthorized during experiment run",
                    a: "Invalid or expired API key. Check your .env file or re-enter the key in the dashboard. For OAuth, try disconnecting and reconnecting.",
                  },
                  {
                    q: "Sequence runner fails with \"folder not found\"",
                    a: "Sequence experiments require image datasets at services/research-engine/data/sequence/masking/ and data/sequence/validation/. Both must exist and contain image files (.png, .jpg).",
                  },
                ].map((item) => (
                  <details key={item.q} className="group border border-neutral-800">
                    <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-neutral-300 hover:text-white transition-colors flex items-center gap-3">
                      <span className="text-neutral-600 group-open:rotate-90 transition-transform text-xs">&#9654;</span>
                      {item.q}
                    </summary>
                    <div className="px-4 pb-4 pt-1 text-sm text-neutral-500 leading-relaxed border-t border-neutral-900">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
