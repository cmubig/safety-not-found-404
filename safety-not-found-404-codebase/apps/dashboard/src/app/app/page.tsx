"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createAuthFlow, getAuthStatus, loadTokens, clearTokens, refreshAccessToken } from "@/lib/chatgpt-oauth";

export default function Dashboard() {
  const [logs, setLogs] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [authStatus, setAuthStatus] = useState(false);
  
  useEffect(() => {
    const checkAuth = async () => {
      let status = getAuthStatus().authenticated;
      if (!status) {
        const refreshed = await refreshAccessToken();
        if (refreshed) status = true;
      }
      setAuthStatus(status);
    };
    checkAuth();
  }, []);

  const handleChatGPTConnect = async () => {
    try {
      if (authStatus) {
        clearTokens();
        setAuthStatus(false);
        return;
      }
      const { authUrl } = await createAuthFlow();
      window.location.href = authUrl;
    } catch (err) {
      console.error(err);
      alert("Failed to initiate login flow.");
    }
  };
  
  const [apiKeys, setApiKeys] = useState({
    openai: "",
    gemini: "",
    anthropic: "",
  });

  const [seqProvider, setSeqProvider] = useState("openai");
  const [mazeLang, setMazeLang] = useState("ko");
  const [decScenario, setDecScenario] = useState("dilemma_baseline_ab");
  const [decModels, setDecModels] = useState("gpt-5.2");

  const appendLog = (text: string) => {
    setLogs((prev) => prev + text);
  };

  const handleRun = async (type: string, payload: any) => {
    if (isRunning) return;
    setIsRunning(true);
    setLogs(""); 
    
    const tokens = loadTokens();
    const oauthToken = tokens?.access_token;
    const oauthAccountId = tokens?.account_id;
    
    appendLog(`[SYSTEM] Initializing task: ${type}...\n`);
    if (oauthToken && (seqProvider === "openai" || type === "decision" || type === "maze")) {
       appendLog(`[SYSTEM] Using active ChatGPT OAuth Session (Account: ${oauthAccountId}). Bypassing api.openai.com.\n`);
    }

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          apiKeys,
          oauthToken,
          oauthAccountId,
          ...payload,
        }),
      });

      if (!response.body) {
        appendLog("[SYSTEM] Error: No response body.\n");
        setIsRunning(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          appendLog(chunk);
        }
      }
      appendLog(`\n[SYSTEM] Task completed successfully.\n`);
    } catch (error: any) {
      appendLog(`\n[SYSTEM ERROR] ${error.message}\n`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <header className="border-b border-neutral-800 pb-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Safety Not Found 404</h1>
          <p className="text-neutral-400">Project Benchmark & Experiment Control Center</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            variant={authStatus ? "outline" : "primary"} 
            onClick={handleChatGPTConnect}
            className="w-full sm:w-auto overflow-hidden text-ellipsis px-2"
          >
            {authStatus ? (
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#10a37f]"></div>
                ChatGPT Configured (Click to Logout)
              </span>
            ) : "Connect ChatGPT (OAuth)"}
          </Button>

          <Input 
            type="password" 
            placeholder="or OpenAI API Key" 
            className="w-full sm:w-48"
            value={apiKeys.openai}
            onChange={(e) => setApiKeys({...apiKeys, openai: e.target.value})}
            disabled={authStatus}
          />
          <Input 
            type="password" 
            placeholder="Gemini API Key" 
            className="w-full sm:w-48"
            value={apiKeys.gemini}
            onChange={(e) => setApiKeys({...apiKeys, gemini: e.target.value})}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column - Controls */}
        <div className="space-y-6">
          
          <Card>
            <CardHeader>
              <CardTitle>Section 1: Sequence</CardTitle>
              <CardDescription>Run baseline sequence experiments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-400">Provider</label>
                <Select value={seqProvider} onChange={(e) => setSeqProvider(e.target.value)}>
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Gemini</option>
                </Select>
              </div>
              <Button 
                className="w-full" 
                disabled={isRunning}
                onClick={() => handleRun("sequence", { provider: seqProvider })}
              >
                Run Sequence
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Section 2: Maze</CardTitle>
              <CardDescription>Run the maze pipeline.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-400">Language</label>
                <Select value={mazeLang} onChange={(e) => setMazeLang(e.target.value)}>
                  <option value="en">English (maze_pipeline_en.py)</option>
                  <option value="ko">Korean (maze_pipeline_ko.py)</option>
                </Select>
              </div>
              <Button 
                className="w-full" 
                variant="secondary"
                disabled={isRunning}
                onClick={() => handleRun("maze", { lang: mazeLang })}
              >
                Run Maze Pipeline
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Section 3: Decision Experiments</CardTitle>
              <CardDescription>Unified decision experiment runner.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-400">Scenario</label>
                <Select value={decScenario} onChange={(e) => setDecScenario(e.target.value)}>
                  <option value="dilemma_baseline_ab">Dilemma Baseline AB</option>
                  <option value="dilemma_factorial_abcd">Dilemma Factorial ABCD</option>
                  <option value="samarian_time_pressure">Samarian Time Pressure</option>
                  <option value="samarian_priming_time">Samarian Priming Time</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-400">Models (comma-separated)</label>
                <Input 
                  value={decModels} 
                  onChange={(e) => setDecModels(e.target.value)}
                  placeholder="e.g. gpt-5.2,gemini-3-flash-preview"
                />
              </div>
              <Button 
                className="w-full" 
                variant="outline"
                disabled={isRunning}
                onClick={() => handleRun("decision", { scenario: decScenario, models: decModels })}
              >
                Run Decision Experiment
              </Button>
            </CardContent>
          </Card>

        </div>

        {/* Right Column - Logs terminal */}
        <div className="flex flex-col h-full bg-[#050505] border border-neutral-800 rounded-md overflow-hidden relative shadow-lg">
          <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-white animate-pulse" : "bg-neutral-600"}`} />
              Terminal Output
            </h3>
            <span className="text-xs text-neutral-500 font-mono">/api/run</span>
          </div>
          <div className="p-4 flex-1 overflow-auto bg-[#000000] font-mono whitespace-pre-wrap text-sm text-neutral-300 leading-relaxed max-h-[800px]">
            {logs || <span className="text-neutral-600 italic">Waiting for execution...</span>}
          </div>
        </div>

      </div>
    </div>
  );
}
