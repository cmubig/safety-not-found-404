import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function DocsPage() {
  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto space-y-12 font-sans pb-24">
      <div className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Developer Documentation</h1>
        <p className="text-lg text-neutral-400 leading-relaxed max-w-3xl">
          Comprehensive guide to running the &quot;Safety Not Found 404&quot; benchmark GUI. Learn about the architecture, authentication methods, and the specifics of the experimental pipelines.
        </p>
      </div>

      <div className="space-y-8">
        <section id="quick-start" className="space-y-6">
          <div className="border-b border-neutral-800 pb-2">
            <h2 className="text-2xl font-semibold text-white">1. Quick Start</h2>
          </div>
          <Card>
            <CardContent className="pt-6 text-neutral-300 space-y-4 leading-relaxed">
              <p>
                The GUI acts as a frontend control center for the core Python benchmark scripts. To use it, you must run the Next.js development server on a specific port.
              </p>
              <div className="bg-[#050505] border border-neutral-800 rounded-md p-4 font-mono text-sm">
                <span className="text-neutral-500"># Start Next.js on port 1455</span><br/>
                cd safety-not-found-404-codebase/apps/dashboard<br/>
                npm run dev
              </div>
              <p>
                Point your browser to <code>http://localhost:1455</code> to access the dashboard. The specific port (1455) is required to receive callbacks from the ChatGPT OAuth provider.
              </p>
            </CardContent>
          </Card>
        </section>

        <section id="architecture" className="space-y-6">
          <div className="border-b border-neutral-800 pb-2">
            <h2 className="text-2xl font-semibold text-white">2. Architecture Overview</h2>
          </div>
          <Card>
            <CardContent className="pt-6 text-neutral-300 space-y-4 leading-relaxed">
              <p>
                The project utilizes a <strong>Next.js App Router</strong> frontend and a robust <strong>Python Subprocess API Bridge</strong> backend.
              </p>
              <ul className="list-disc leading-loose pl-5 space-y-2 text-neutral-400">
                <li><strong className="text-white">Frontend:</strong> Styled strictly with Tailwind CSS (pure monochrome, zero gradients). Manages state, API keys, and streams log output using Server-Sent-Events formatting via the active browser reader.</li>
                <li><strong className="text-white">API Bridge (`/api/run`):</strong> A Next.js API route that securely spawns the heavy <code>.qa_venv/bin/python</code> scripts locally. It injects required <code>OPENAI_API_KEY</code> and other provider keys invisibly into the environment variables (<code>process.env</code>) of the child process.</li>
                <li><strong className="text-white">Python Backend:</strong> The core logic, encompassing parser evaluations, maze pipelines, and automated prompt generators. The GUI acts only as a clean execution trigger and logging interface.</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section id="authentication" className="space-y-6">
          <div className="border-b border-neutral-800 pb-2">
            <h2 className="text-2xl font-semibold text-white">3. Authentication Strategy</h2>
          </div>
          <Card>
            <CardContent className="pt-6 text-neutral-300 space-y-4 leading-relaxed">
              <p>We provide two first-class authentication layers depending on operator preference:</p>
              
              <h3 className="text-lg font-medium text-white pt-2">A. ChatGPT Auto-Auth (OAuth PKCE)</h3>
              <p>
                You can authenticate directly using your ChatGPT Plus/Pro/Team account without exposing raw OpenAI API keys. Using OAuth PKCE application credentials, the GUI bounces you to <code>auth.openai.com</code>. Once approved, the system stores an ephemeral <code>access_token</code> inside <code>localStorage</code>.
                This token is automatically injected into the API payload and parsed over to the python environments as a valid <code>OPENAI_API_KEY</code>. It will automatically refresh in the background 5 minutes before expiry window.
              </p>

              <h3 className="text-lg font-medium text-white pt-2">B. Manual API Keys</h3>
              <p>
                For Gemini, Anthropic, or operators refusing OAuth, standard password inputs exist in the header. To prevent confusion, if a user successfully logs in via ChatGPT OAuth, the manual OpenAI input is forcibly disabled. The Next.js API prioritizes OAuth over Manual Keys over <code>.env</code> values.
              </p>
            </CardContent>
          </Card>
        </section>

        <section id="experiments" className="space-y-6">
          <div className="border-b border-neutral-800 pb-2">
            <h2 className="text-2xl font-semibold text-white">4. Benchmark Pipelines</h2>
          </div>
          
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Section 1: Sequence Runner</CardTitle>
              </CardHeader>
              <CardContent className="text-neutral-400 leading-relaxed text-sm">
                Executes <code>scripts/run_sequence.py --run-defaults</code>. Generates the base adversarial safety bounds tracking standard models parsing multi-turn generation metrics. Available natively with OpenAI or Gemini configurations.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Section 2: Maze Pipeline</CardTitle>
              </CardHeader>
              <CardContent className="text-neutral-400 leading-relaxed text-sm">
                Executes <code>scripts/run_maze_pipeline.py --language [en|ko]</code>. Calculates logical resolution metrics where an agent must trace paths securely. Evaluated in dual setups targeting translation discrepancies.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Section 3: Decision Engines</CardTitle>
              </CardHeader>
              <CardContent className="text-neutral-400 leading-relaxed text-sm space-y-3">
                <p>Executes the complex unification runner via <code>scripts/run_decision_experiment.py</code>. Supports variable models injected by comma separators. Evaluates deep ethical implications using established psychological scenarios:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Dilemma Factorial ABCD:</strong> 4-point trolley variations tracking utilitarian versus algorithmic compliance.</li>
                  <li><strong>Samarian Baseline:</strong> Tests empathetic disruption triggers against time pressure context.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
