"use client";
import { useEffect, useState } from "react";

type Tone = "professional" | "casual" | "bold" | "followup";
type Length = "short" | "medium" | "detailed";

interface Result {
  atsKeywords: string;
  keywordsUsed: string;
  subjectLines: string;
  email: string;
  linkedinNote: string;
  companyType: string;
  toneReason: string;
}

interface AtsResult {
  score: number;
  matchedKeywords: string;
  missingKeywords: string;
  topTip: string;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? "#4ade80" : score >= 50 ? "#facc15" : "#f87171";

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          className="score-ring-progress"
        />
        <text x="50" y="50" textAnchor="middle" dy="0.35em" fill="white" fontSize="18" fontWeight="bold">
          {score}
        </text>
      </svg>
      <span className="text-xs text-white/40 mt-1">ATS Match</span>
    </div>
  );
}

function Pill({ text, type }: { text: string; type: "match" | "miss" }) {
  return (
    <span className={`inline-block px-2 py-1 rounded-full text-xs mr-1 mb-1 ${
      type === "match"
        ? "bg-green-500/10 text-green-400 border border-green-500/20"
        : "bg-red-500/10 text-red-400 border border-red-500/20"
    }`}>
      {type === "match" ? "✓" : "✗"} {text.trim()}
    </span>
  );
}

function ColdCraftMark({ className = "" }: { className?: string }) {
  return (
    <div className={`brand-mark ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 64 64" role="img" focusable="false">
        <defs>
          <linearGradient id="coldcraft-mark-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#7cecff" />
            <stop offset="100%" stopColor="#00d9ff" />
          </linearGradient>
        </defs>
        <path
          d="M32 10C22.06 10 14 18.06 14 28v8c0 9.94 8.06 18 18 18 5.58 0 10.52-2.55 13.82-6.55"
          fill="none"
          stroke="url(#coldcraft-mark-gradient)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M38 21.5 28.5 32 38 42.5"
          fill="none"
          stroke="url(#coldcraft-mark-gradient)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="46.5" cy="17.5" r="3.5" fill="#ffffff" opacity="0.95" />
        <path d="M46.5 11.5v12M40.5 17.5h12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
      </svg>
    </div>
  );
}

export default function Home() {
  const [now, setNow] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [length, setLength] = useState<Length>("medium");
  const [result, setResult] = useState<Result | null>(null);
  const [atsResult, setAtsResult] = useState<AtsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"email" | "ats">("email");

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);



  useEffect(() => {
    let rafId = 0;
    const handleScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--scroll-y", `${window.scrollY}px`);
        rafId = 0;
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const handleGenerate = async () => {
    if (!resume.trim() || !jobDescription.trim()) return;
    setLoading(true);
    setResult(null);
    setAtsResult(null);
    setError("");

    try {
      const [emailRes, atsRes] = await Promise.all([
        fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume, jobDescription, tone, length }),
        }),
        fetch("/api/ats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume, jobDescription }),
        }),
      ]);

      const emailData = await emailRes.json().catch(() => null);
      const atsData = await atsRes.json().catch(() => null);

      if (!emailRes.ok) {
        setError(emailData?.error || "Failed to generate email.");
        return;
      }
      if (!atsRes.ok) {
        setError(atsData?.error || "Failed to analyze ATS score.");
        return;
      }

      setResult(emailData);
      setAtsResult(atsData);
      setActiveTab("email");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  const tones: { value: Tone; label: string; emoji: string; desc: string }[] = [
    { value: "professional", label: "Professional", emoji: "💼", desc: "Formal & polished" },
    { value: "casual", label: "Casual", emoji: "👋", desc: "Warm & friendly" },
    { value: "bold", label: "Bold", emoji: "🔥", desc: "Confident & direct" },
    { value: "followup", label: "Follow-up", emoji: "📩", desc: "No reply in 1 week" },
  ];

  const lengths: { value: Length; label: string; desc: string }[] = [
    { value: "short", label: "Short", desc: "3–4 lines" },
    { value: "medium", label: "Medium", desc: "2 paragraphs" },
    { value: "detailed", label: "Detailed", desc: "3 paragraphs" },
  ];

  const subjectLineList = (result?.subjectLines ?? "")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => l.replace(/^\d+\.\s*/, "").trim());

  const matchedList = (atsResult?.matchedKeywords ?? "")
    .split(",")
    .filter((k) => k.trim());
  const missingList = (atsResult?.missingKeywords ?? "")
    .split(",")
    .filter((k) => k.trim());
  const atsKeywordList = (result?.atsKeywords ?? "")
    .split(",")
    .filter((k) => k.trim());
  const usedKeywordList = (result?.keywordsUsed ?? "")
    .split(",")
    .filter((k) => k.trim());
  const linkedinProgress = Math.min((((result?.linkedinNote?.length ?? 0) / 300) * 100), 100);
  const linkedinProgressBucket = Math.min(100, Math.max(0, Math.round(linkedinProgress / 10) * 10));

  return (
    <main className="site-shell">
      <div className="site-bg" aria-hidden="true" />

      <header className="site-header">
        <div className="logo-block">
          <ColdCraftMark className="brand-mark--header" />
          <div>
            <div className="logo-text">ColdCraft</div>
            <div className="logo-subtext">AI cold emails that land replies</div>
          </div>
        </div>
        <div className="live-clock" aria-live="polite">
          {mounted ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--"}
        </div>
        <div className="header-right">
          <div className="badge">ATS-Aware</div>
          <div className="badge">AI-Powered</div>
          <nav className="header-nav">
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
            <a href="#generate">Generate ↓</a>
          </nav>
        </div>
      </header>

      <div className="site-content">
        <section className="hero layered-section">
          <div className="hero-pill">✦ The smartest cold email tool for job seekers</div>
          <h1 className="hero-title">Cold emails that<br />actually get replies.</h1>
          <p className="hero-subtitle">
            Most tools just write emails. ColdCraft analyzes the job description for ATS keywords and embeds them
            naturally into your email — so you speak the company&apos;s language before you even get a reply.
          </p>
          <div className="hero-stats">
            <span>✦ ATS-keyword optimized</span>
            <span>✦ 3 subject lines generated</span>
            <span>✦ LinkedIn note included</span>
          </div>
          <a href="#generate" className="hero-cta">Start Generating →</a>
          <div className="scroll-indicator">scroll to generate ↓</div>
        </section>

        <section id="how-it-works" className="section layered-section">
          <div className="section-label">./how-it-works</div>
          <h2 className="section-title">Three steps. One perfect email.</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-icon">📄</div>
              <h3>Paste your resume</h3>
              <p>Drop in your resume text. ColdCraft reads your skills, experience, and background to personalize every word.</p>
            </div>
            <div className="step-card">
              <div className="step-icon">🎯</div>
              <h3>Add the job description</h3>
              <p>Paste the role you&apos;re targeting. We extract the exact ATS keywords the company uses internally.</p>
            </div>
            <div className="step-card">
              <div className="step-icon">✨</div>
              <h3>Get your email instantly</h3>
              <p>A tailored cold email, 3 subject lines, an ATS match score, and a LinkedIn note — all generated in seconds.</p>
            </div>
          </div>
        </section>

        <section id="features" className="section layered-section">
          <div className="section-label">./features</div>
          <h2 className="section-title">Everything you need to get noticed.</h2>
          <p className="section-subtitle">Not just an email generator. A complete job outreach toolkit built for serious candidates.</p>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🧠</div>
              <h3>ATS-Aware Generation</h3>
              <p>We extract keywords from the job description and embed them naturally into your email. Your outreach mirrors the company&apos;s own language — before you even get an interview.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>ATS Score Checker</h3>
              <p>See exactly how well your resume matches the job description. Get matched keywords, missing keywords, and one actionable tip to improve your score instantly.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎭</div>
              <h3>Tone Control</h3>
              <p>Professional, casual, bold, or follow-up. Choose how you want to come across and the AI adapts the entire email to match — not just the words, the energy.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📬</div>
              <h3>3 Subject Lines</h3>
              <p>Never stare at a blank subject field again. Get three high-converting options ranked and ready to copy with one click.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💼</div>
              <h3>LinkedIn Note</h3>
              <p>A 300-character LinkedIn connection request generated alongside your email. Same tone, same keywords, ready to send in one click.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🏢</div>
              <h3>Company Type Detection</h3>
              <p>The AI detects whether you&apos;re targeting a startup, big tech, agency, or mid-size company — and adjusts the strategy automatically.</p>
            </div>
          </div>
        </section>

        <section id="generate" className="section layered-section">
          <div className="section-label">./generate</div>
          <h2 className="section-title">Generate your email.</h2>
          <p className="section-subtitle">Paste your details below and hit generate. Takes about 10 seconds.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="field-label">./your-resume</label>
              <textarea
                className="field-textarea"
                placeholder="Paste your resume text here..."
                value={resume}
                onChange={(e) => setResume(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">./job-description</label>
              <textarea
                className="field-textarea"
                placeholder="Paste the job description or describe the company and role you&apos;re targeting..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="field-label">./tone</label>
            <div className="flex gap-2 flex-wrap">
              {tones.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`tone-pill ${tone === t.value ? "tone-pill-active" : ""}`}
                >
                  <span>{t.emoji}</span>
                  <span>{t.label}</span>
                  <span className={`tone-desc ${tone === t.value ? "tone-desc-active" : ""}`}>- {t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <label className="field-label">./length</label>
            <div className="flex gap-2 flex-wrap">
              {lengths.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLength(l.value)}
                  className={`length-pill ${length === l.value ? "length-pill-active" : ""}`}
                >
                  {l.label} <span className={`length-desc ${length === l.value ? "length-desc-active" : ""}`}>({l.desc})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={loading || !resume.trim() || !jobDescription.trim()}
              className={`studio-cta w-fit px-12 py-4 ${loading ? "studio-cta-loading" : ""}`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                Analyzing keywords & crafting email...
              </span>
              ) : "Generate ✨"}
            </button>
          </div>

          {error && <p className="mt-4 text-red-400 text-sm text-center">{error}</p>}

          {(result || atsResult) && (
            <div className="mt-12">
              {result?.companyType && (
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-xs bg-white/10 border border-white/10 px-3 py-1 rounded-full text-white/60">
                    Detected: {result.companyType}
                  </span>
                  {result.toneReason && (
                    <span className="text-xs text-white/30 hidden md:block">{result.toneReason}</span>
                  )}
                </div>
              )}

              <div className="flex gap-1 mb-6 bg-white/5 p-1 rounded-xl w-fit border border-white/10">
                <button
                  onClick={() => setActiveTab("email")}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "email" ? "bg-white text-black" : "text-white/40 hover:text-white"}`}
                >
                  Email
                </button>
                <button
                  onClick={() => setActiveTab("ats")}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "ats" ? "bg-white text-black" : "text-white/40 hover:text-white"}`}
                >
                  ATS Score
                  {atsResult && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                        activeTab === "ats"
                          ? "bg-black/10 text-black"
                          : atsResult.score >= 75
                          ? "bg-green-500/20 text-green-400"
                          : atsResult.score >= 50
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {atsResult.score}
                    </span>
                  )}
                </button>
              </div>

              {activeTab === "email" && result && (
                <div className="space-y-4">
                  {atsKeywordList.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <p className="text-xs text-white/40 uppercase tracking-widest mb-3">ATS Keywords Detected from Job Description</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {atsKeywordList.map((k, i) => (
                          <span
                            key={i}
                            className={`text-xs px-2 py-1 rounded-full border ${
                              usedKeywordList.some(u => u.toLowerCase().includes(k.toLowerCase().trim()))
                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                : "bg-white/5 text-white/30 border-white/10"
                            }`}
                          >
                            {k.trim()}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-white/30">
                        <span className="text-green-400">Green</span> = embedded in your email &nbsp;·&nbsp; Grey = detected but not used
                      </p>
                    </div>
                  )}

                  <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-sm">Subject Lines</h3>
                      <button onClick={() => copyToClipboard(result.subjectLines, "subjects")}
                        className="text-xs text-white/30 hover:text-white transition-colors">
                        {copied === "subjects" ? "✓ Copied" : "Copy all"}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {subjectLineList.map((line, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/5 px-4 py-3 rounded-lg text-sm group hover:bg-white/8 transition-all">
                          <span className="text-white/70">{line}</span>
                          <button onClick={() => copyToClipboard(line, `subject-${i}`)}
                            className="text-xs text-white/20 hover:text-white transition-colors ml-4 shrink-0 opacity-0 group-hover:opacity-100">
                            {copied === `subject-${i}` ? "✓" : "Copy"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-sm">Cold Email</h3>
                      <button onClick={() => copyToClipboard(result.email, "email")}
                        className="text-xs text-white/30 hover:text-white transition-colors">
                        {copied === "email" ? "✓ Copied!" : "Copy"}
                      </button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed text-white/70">{result.email}</p>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-sm">LinkedIn Connection Note</h3>
                      <button onClick={() => copyToClipboard(result.linkedinNote, "linkedin")}
                        className="text-xs text-white/30 hover:text-white transition-colors">
                        {copied === "linkedin" ? "✓ Copied!" : "Copy"}
                      </button>
                    </div>
                    <p className="text-sm text-white/70">{result.linkedinNote}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className={`linkedin-progress-fill linkedin-progress-fill-${linkedinProgressBucket}`} />
                      </div>
                      <span className="text-xs text-white/30">{result.linkedinNote.length}/300</span>
                    </div>
                  </div>

                  <button onClick={handleGenerate} disabled={loading}
                    className="w-full py-3 rounded-xl text-sm border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-all">
                    Regenerate ↺
                  </button>
                </div>
              )}

              {activeTab === "ats" && atsResult && (
                <div className="space-y-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                      <ScoreRing score={atsResult.score} />
                      <div className="flex-1 text-center md:text-left">
                        <h3 className="font-semibold mb-1">
                          {atsResult.score >= 75 ? "Strong Match 💪" : atsResult.score >= 50 ? "Decent Match ⚡" : "Needs Work 🔧"}
                        </h3>
                        <p className="text-sm text-white/50 mb-4">
                          {atsResult.score >= 75
                            ? "Your resume aligns well with this job. The email mirrors the company's language."
                            : atsResult.score >= 50
                            ? "Moderate match. Adding more keywords to your resume would help significantly."
                            : "Low match. Focus on adding the missing keywords to your resume before applying."}
                        </p>
                        {atsResult.topTip && (
                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-3 text-sm text-yellow-300">
                            💡 {atsResult.topTip}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                      <h3 className="font-semibold text-sm mb-3 text-green-400">✓ Matched Keywords</h3>
                      <div className="flex flex-wrap">
                        {matchedList.length > 0
                          ? matchedList.map((k, i) => <Pill key={i} text={k} type="match" />)
                          : <p className="text-white/30 text-sm">None detected</p>}
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                      <h3 className="font-semibold text-sm mb-3 text-red-400">✗ Missing Keywords</h3>
                      <div className="flex flex-wrap">
                        {missingList.length > 0
                          ? missingList.map((k, i) => <Pill key={i} text={k} type="miss" />)
                          : <p className="text-white/30 text-sm">None — great match!</p>}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <p className="text-xs text-white/40 uppercase tracking-widest mb-3">What your email already covers</p>
                    <div className="flex flex-wrap">
                      {usedKeywordList.map((k, i) => (
                        <span key={i} className="inline-block px-2 py-1 rounded-full text-xs mr-1 mb-1 bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          ✦ {k.trim()}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-white/30 mt-2">These ATS keywords were naturally embedded in your cold email</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section id="why-coldcraft" className="section layered-section">
          <div className="section-label">./why-coldcraft</div>
          <h2 className="section-title">Why not just use ChatGPT?</h2>
          <div className="compare-table">
            <div className="compare-header">ChatGPT</div>
            <div className="compare-header">ColdCraft ✦</div>
            <div className="compare-row">You write a long prompt every time</div>
            <div className="compare-row">Two inputs. One click. Done.</div>
            <div className="compare-row">Generic output, same for everyone</div>
            <div className="compare-row">Tailored to your resume + the specific role</div>
            <div className="compare-row">No ATS keyword analysis</div>
            <div className="compare-row">Extracts & embeds ATS keywords automatically</div>
            <div className="compare-row">No subject lines</div>
            <div className="compare-row">3 optimized subject lines included</div>
            <div className="compare-row">No LinkedIn note</div>
            <div className="compare-row">LinkedIn connection note generated alongside</div>
            <div className="compare-row">Forgets you every session</div>
            <div className="compare-row">Purpose-built for job seekers, every time</div>
          </div>
        </section>

        <section className="section final-cta layered-section">
          <h2>Stop writing cold emails from scratch.</h2>
          <p>Paste your resume. Paste the job. Get an ATS-optimized cold email in 10 seconds.</p>
          <a href="#generate" className="hero-cta">Generate My Email →</a>
          <span className="cta-note">Free to use · No sign up required</span>
        </section>
      </div>

      <footer className="site-footer">
        <div className="footer-container">
          <h2 className="footer-heading-main">Get In Touch</h2>
          <div className="footer-grid">
            <div className="footer-column">
              <div className="footer-logo-section">
                <ColdCraftMark className="brand-mark--footer" />
                <div className="footer-logo-name">ColdCraft</div>
              </div>
              <div className="footer-logo-underline"></div>
              <p className="footer-description">The ATS-aware cold email generator designed to help serious job seekers land more interviews.</p>
            </div>

            <div className="footer-column">
              <h3 className="footer-section-heading">Quick Links</h3>
              <nav className="footer-links">
                <a href="#how-it-works" className="footer-link">How it works</a>
                <a href="#features" className="footer-link">Features</a>
                <a href="#generate" className="footer-link">Generate</a>
                <a href="#why-coldcraft" className="footer-link">Compare</a>
              </nav>
            </div>

            <div className="footer-column">
              <h3 className="footer-section-heading">Contact</h3>
              <div className="footer-contact-items">
                <a href="mailto:contact@coldcraft.io" className="footer-contact-card">
                  <span className="footer-contact-icon">📧</span>
                  <span>wdivej@gmail.com</span>
                </a>
                <a href="tel:+123456789" className="footer-contact-card">
                  <span className="footer-contact-icon">📱</span>
                  <span>+91 880 265 9915</span>
                </a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span className="footer-copyright">© 2026 ColdCraft. All rights reserved.</span>
            <span className="footer-builtwith">Built with <span className="footer-heart">❤</span> for better outreach.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
