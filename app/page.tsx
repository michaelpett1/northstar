'use client';
import Link from 'next/link';
import {
  ArrowRight, GitBranch, Map, Target, Lightbulb,
  BarChart3, Shield, Clock, CheckCircle, Sparkles,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Lightbulb,
    title: 'AI-Powered Suggestions',
    description: 'Claude Cowork scans JIRA, Confluence, and Slack to surface roadmap-worthy items automatically.',
    color: '#F59E0B',
  },
  {
    icon: GitBranch,
    title: 'Interactive Timelines',
    description: 'Gantt charts, boards, and table views — drag and drop to replan instantly.',
    color: '#2563EB',
  },
  {
    icon: Map,
    title: 'Visual Roadmap',
    description: 'Sprint-based roadmap with dev and UX swimlanes. Clone tickets across disciplines.',
    color: '#22C55E',
  },
  {
    icon: Target,
    title: 'OKR Tracking',
    description: 'Set objectives, define key results, and track progress with confidence scores.',
    color: '#8B5CF6',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Dashboard',
    description: 'Project health at a glance — status breakdowns, burn-up charts, and velocity metrics.',
    color: '#EC4899',
  },
  {
    icon: Shield,
    title: 'Duplicate Detection',
    description: 'AI analyses your existing roadmap to prevent duplicate items from cluttering your backlog.',
    color: '#06B6D4',
  },
];

const STEPS = [
  {
    icon: Clock,
    number: '01',
    title: 'Connect your tools',
    description: 'Link JIRA, Confluence, and Slack. Northstar begins scanning on your schedule.',
  },
  {
    icon: Sparkles,
    number: '02',
    title: 'Review suggestions',
    description: 'AI surfaces relevant items, scored by priority and checked for duplicates.',
  },
  {
    icon: CheckCircle,
    number: '03',
    title: 'Build your roadmap',
    description: 'Accept suggestions with one click. They appear in your timeline and visual roadmap instantly.',
  },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF9' }}>

      {/* ─── Navbar ──────────────────────────────────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(250, 250, 249, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px',
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/assets/northstar-logo.svg" alt="Northstar" style={{ width: 34, height: 34 }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1C1917', letterSpacing: '-0.02em' }}>
              Northstar
            </span>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link
              href="/sign-in"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#6B7280',
                textDecoration: 'none',
                padding: '6px 14px',
                borderRadius: 6,
                transition: 'color 150ms',
              }}
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#FFFFFF',
                textDecoration: 'none',
                padding: '7px 16px',
                borderRadius: 7,
                background: '#2563EB',
                boxShadow: '0 1px 3px rgba(37, 99, 235, 0.3)',
                transition: 'background 150ms',
              }}
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '80px 24px 64px',
          textAlign: 'center',
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 14px 5px 8px',
            borderRadius: 99,
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            fontSize: 12,
            fontWeight: 600,
            color: '#1D4ED8',
            marginBottom: 28,
          }}
        >
          <Sparkles size={13} />
          AI-powered product management
        </div>

        <h1
          style={{
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 800,
            lineHeight: 1.1,
            color: '#0F172A',
            letterSpacing: '-0.03em',
            margin: '0 auto',
            maxWidth: 720,
          }}
        >
          Your roadmap,{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 50%, #EC4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            always in sync
          </span>
        </h1>

        <p
          style={{
            fontSize: 18,
            lineHeight: 1.6,
            color: '#6B7280',
            maxWidth: 560,
            margin: '20px auto 0',
          }}
        >
          Northstar scans JIRA, Confluence, and Slack to surface what matters.
          Review, accept, and plan — all in one place.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            marginTop: 36,
          }}
        >
          <Link
            href="/sign-up"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              fontWeight: 600,
              color: '#FFFFFF',
              textDecoration: 'none',
              padding: '11px 24px',
              borderRadius: 8,
              background: '#2563EB',
              boxShadow: '0 1px 3px rgba(37, 99, 235, 0.3), 0 4px 12px rgba(37, 99, 235, 0.15)',
              transition: 'transform 150ms, box-shadow 150ms',
            }}
          >
            Start for free
            <ArrowRight size={15} />
          </Link>
          <Link
            href="/sign-in"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 14,
              fontWeight: 500,
              color: '#374151',
              textDecoration: 'none',
              padding: '11px 20px',
              borderRadius: 8,
              background: '#FFFFFF',
              border: '1px solid rgba(0,0,0,0.1)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              transition: 'border-color 150ms',
            }}
          >
            Sign in
          </Link>
        </div>

        {/* Hero visual — app preview placeholder */}
        <div
          style={{
            marginTop: 64,
            borderRadius: 14,
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.08), 0 8px 20px rgba(0,0,0,0.04)',
            overflow: 'hidden',
            background: '#FFFFFF',
            maxWidth: 960,
            margin: '64px auto 0',
          }}
        >
          {/* Window chrome */}
          <div
            style={{
              height: 36,
              background: '#F5F4F2',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 14,
              gap: 7,
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FCA5A5' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FCD34D' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#86EFAC' }} />
          </div>
          {/* App mockup content */}
          <div
            style={{
              padding: '32px 40px',
              background: 'linear-gradient(180deg, #FAFAF9 0%, #F0F4FF 100%)',
              minHeight: 340,
            }}
          >
            <div style={{ display: 'flex', gap: 16 }}>
              {/* Sidebar mockup */}
              <div
                style={{
                  width: 48,
                  background: '#111827',
                  borderRadius: 8,
                  padding: '12px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                <img src="/assets/northstar-icon.svg" alt="" style={{ width: 24, height: 24, borderRadius: 5 }} />
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 5,
                      background: i === 0 ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                    }}
                  />
                ))}
              </div>
              {/* Content mockup */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Topbar */}
                <div style={{ height: 36, borderRadius: 6, background: '#fff', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                  <div style={{ width: 80, height: 8, borderRadius: 4, background: 'rgba(0,0,0,0.06)' }} />
                </div>
                {/* Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    { color: '#2563EB', w: '70%' },
                    { color: '#22C55E', w: '55%' },
                    { color: '#F59E0B', w: '85%' },
                  ].map((card, i) => (
                    <div
                      key={i}
                      style={{
                        background: '#fff',
                        borderRadius: 8,
                        border: '1px solid rgba(0,0,0,0.06)',
                        padding: 14,
                      }}
                    >
                      <div style={{ width: '60%', height: 8, borderRadius: 4, background: 'rgba(0,0,0,0.07)', marginBottom: 10 }} />
                      <div style={{ height: 6, borderRadius: 99, background: '#F3F4F6', overflow: 'hidden' }}>
                        <div style={{ width: card.w, height: '100%', borderRadius: 99, background: card.color }} />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Gantt bars */}
                <div
                  style={{
                    background: '#fff',
                    borderRadius: 8,
                    border: '1px solid rgba(0,0,0,0.06)',
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {[
                    { w: '65%', color: '#2563EB', ml: '5%' },
                    { w: '40%', color: '#22C55E', ml: '20%' },
                    { w: '55%', color: '#EC4899', ml: '10%' },
                    { w: '30%', color: '#F59E0B', ml: '35%' },
                  ].map((bar, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, height: 7, borderRadius: 3, background: 'rgba(0,0,0,0.05)', flexShrink: 0 }} />
                      <div style={{ flex: 1, height: 14, position: 'relative' }}>
                        <div
                          style={{
                            position: 'absolute',
                            left: bar.ml,
                            width: bar.w,
                            height: '100%',
                            borderRadius: 4,
                            background: bar.color,
                            opacity: 0.85,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Social proof strip ──────────────────────────────── */}
      <section
        style={{
          borderTop: '1px solid rgba(0,0,0,0.05)',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          padding: '28px 24px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9CA3AF', margin: 0 }}>
          Built for teams that ship
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 40,
            marginTop: 16,
            flexWrap: 'wrap',
          }}
        >
          {['JIRA', 'Confluence', 'Slack'].map((tool) => (
            <div
              key={tool}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 14,
                fontWeight: 600,
                color: '#374151',
              }}
            >
              <CheckCircle size={16} style={{ color: '#22C55E' }} />
              {tool}
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features grid ───────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Everything you need to plan
          </h2>
          <p style={{ fontSize: 16, color: '#6B7280', marginTop: 12, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
            From AI-powered scanning to interactive roadmaps, Northstar keeps your team aligned.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
          }}
        >
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.06)',
                  padding: '28px 24px',
                  transition: 'box-shadow 200ms, border-color 200ms',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: `${feature.color}12`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Icon size={20} style={{ color: feature.color }} />
                </div>
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#1C1917',
                    margin: '0 0 8px',
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: '#6B7280',
                    margin: 0,
                  }}
                >
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── How it works ────────────────────────────────────── */}
      <section
        style={{
          background: '#F8FAFC',
          borderTop: '1px solid rgba(0,0,0,0.04)',
          borderBottom: '1px solid rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              How it works
            </h2>
            <p style={{ fontSize: 16, color: '#6B7280', marginTop: 12 }}>
              Three steps to a roadmap that keeps itself updated.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 32,
            }}
          >
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.number} style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 20px',
                    }}
                  >
                    <Icon size={24} style={{ color: '#4F46E5' }} />
                  </div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: 'ui-monospace, monospace',
                      color: '#2563EB',
                      marginBottom: 8,
                    }}
                  >
                    STEP {step.number}
                  </span>
                  <h3
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: '#1C1917',
                      margin: '0 0 8px',
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: '#6B7280',
                      margin: 0,
                      maxWidth: 320,
                      marginLeft: 'auto',
                      marginRight: 'auto',
                    }}
                  >
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #1E3A5F 0%, #1E293B 100%)',
            borderRadius: 16,
            padding: '56px 32px',
          }}
        >
          <h2
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Ready to align your team?
          </h2>
          <p
            style={{
              fontSize: 15,
              color: 'rgba(255,255,255,0.65)',
              marginTop: 12,
              maxWidth: 440,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Start using Northstar today. Connect your tools, and let AI keep your roadmap up to date.
          </p>
          <Link
            href="/sign-up"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              fontWeight: 600,
              color: '#1E293B',
              textDecoration: 'none',
              padding: '11px 28px',
              borderRadius: 8,
              background: '#FFFFFF',
              marginTop: 28,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'transform 150ms',
            }}
          >
            Get started free
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid rgba(0,0,0,0.06)',
          padding: '32px 24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/assets/northstar-icon.svg" alt="Northstar" style={{ width: 22, height: 22, borderRadius: 5 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Northstar</span>
          </div>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
            Built with Next.js, Tailwind, and Claude AI
          </p>
        </div>
      </footer>
    </div>
  );
}
