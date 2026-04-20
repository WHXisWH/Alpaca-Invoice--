'use client';

import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Layers3,
  Lock,
  Shield,
  Sparkles,
  Wallet,
  AlertTriangle,
  Scale,
  Database,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';

type DocSection = {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  bullets: string[];
};

type FaqItem = {
  question: string;
  answer: string;
};

const quickFacts = [
  {
    title: 'Design Goal',
    value: 'Business-grade invoicing with privacy-preserving upgrade paths',
  },
  {
    title: 'Runtime Shape',
    value: 'Next.js web app + relayer service + projection database + EVM contracts',
  },
  {
    title: 'MVP Settlement',
    value: 'Public ERC-20 style flow with FHE-oriented architecture and copy',
  },
  {
    title: 'Target End State',
    value: 'Confidential settlement and selective disclosure on an FHE-ready stack',
  },
];

const sections: DocSection[] = [
  {
    id: 'overview',
    eyebrow: 'Product Thesis',
    title: 'What Alpaca Invoice for FHE is trying to solve',
    summary:
      'The product is designed for teams that need structured invoice operations, clear settlement history, and a migration path toward confidential financial workflows without rebuilding the whole product every quarter.',
    bullets: [
      'Business users need invoice lifecycle control, not just wallet-to-wallet transfers.',
      'The stack is organized so public MVP flows can ship now while confidential payment rails can replace them later.',
      'The interface keeps invoice, escrow, dispute, and audit concepts first-class instead of hiding them behind generic wallet screens.',
    ],
  },
  {
    id: 'architecture',
    eyebrow: 'System Architecture',
    title: 'The current architecture is intentionally layered',
    summary:
      'The web app handles user interaction and local state, the relayer validates signed requests and persists projections, the contracts hold canonical lifecycle state, and the database keeps queryable business records for dashboards and operational views.',
    bullets: [
      'Web: localized Next.js app with wallet connection, invoice composition, dashboard, detail pages, dispute flows, and audit screens.',
      'Relayer: receives signed invoice requests, validates DTOs, submits transactions, and exposes projection APIs for the frontend.',
      'Contracts: invoice registry, escrow, dispute, and related orchestration contracts on the configured EVM network.',
      'Storage: projection-friendly database records that support reload-safe screens and backend reconciliation.',
    ],
  },
  {
    id: 'privacy',
    eyebrow: 'Privacy Model',
    title: 'Privacy is staged, not hand-waved',
    summary:
      'The current build is honest about what is public today and what is reserved for the FHE end state. Public settlement is treated as an MVP rail, while encrypted amount handling, selective disclosure, and confidential token flows remain part of the planned confidential path.',
    bullets: [
      'Invoice metadata and operational projections are available to the app so the business workflow remains usable.',
      'The architecture already separates public snapshot data from confidential amount inputs and cipher hashes.',
      'Audit and decrypt surfaces are modeled as explicit capabilities, not hidden implementation details.',
    ],
  },
  {
    id: 'invoice-flow',
    eyebrow: 'Invoice Lifecycle',
    title: 'Invoice creation and settlement follow a business-first flow',
    summary:
      'A seller composes an invoice, signs the request, sends it through the relayer, and receives a projection that can be tracked in dashboard and detail views. Buyers, sellers, and arbiters then operate on the same lifecycle state.',
    bullets: [
      'Creation collects buyer, due date, line items, currency, optional arbiter, and audit configuration.',
      'Detail pages expose status transitions such as pending, paid, cancelled, disputed, and refunded-style outcomes.',
      'Projection syncing lets the UI recover after reloads instead of depending on a single optimistic client session.',
    ],
  },
  {
    id: 'escrow-dispute',
    eyebrow: 'Escrow and Disputes',
    title: 'Escrow is treated as workflow infrastructure, not a side feature',
    summary:
      'The product assumes that some invoices need neutral resolution paths. Optional arbiter selection and dispute-aware state modeling keep that workflow aligned with invoice operations instead of splitting it into a separate app.',
    bullets: [
      'Invoices can be created with escrow and dispute capabilities enabled from the start.',
      'Dispute pages focus on participant roles, open items, and resolution state rather than generic event logs.',
      'The contract and relayer layers are structured so reconciliation can reason about escrow and dispute outcomes consistently.',
    ],
  },
  {
    id: 'current-state',
    eyebrow: 'Current Experience',
    title: 'What the current build is meant to support right now',
    summary:
      'This build is positioned as a serious FHE-oriented invoice product with a working application shell, real relayer-backed projections, contract-aware status flows, and UI paths for invoices, disputes, receipts, audit views, and wallet-driven operations.',
    bullets: [
      'The docs, dashboard, invoices, compose, detail, dispute, and audit surfaces are intended to describe the actual product direction rather than placeholder concepts.',
      'Wallet state and invoice projections are now expected to survive reloads in a materially better way than a pure in-memory demo.',
      'Confidential settlement is still a roadmap capability, so the docs explicitly separate what is live now from what is architected for the next phase.',
    ],
  },
];

const faqItems: FaqItem[] = [
  {
    question: 'Is this already a fully confidential payment product?',
    answer:
      'No. The current build is an FHE-oriented invoice system with a public MVP settlement rail. The architecture is arranged so confidential amount and settlement upgrades can replace the public rail instead of forcing a product rewrite.',
  },
  {
    question: 'Why keep a relayer if users already have wallets?',
    answer:
      'Because the product needs more than raw wallet writes. The relayer validates signed requests, persists projections, supports backend reconciliation, and gives the frontend queryable business records after page reloads or deployment restarts.',
  },
  {
    question: 'What is public today and what is meant to become private later?',
    answer:
      'Public snapshot data and lifecycle projections are available for usability today. Confidential amount inputs, selective disclosure, and FHE settlement are modeled separately so the system can move toward private finance without breaking the invoice workflow.',
  },
  {
    question: 'Can teams test the product before the confidential token rail is ready?',
    answer:
      'Yes. The point of the current build is to validate the end-to-end invoice product shape now: wallet onboarding, composition, projection-backed pages, disputes, audit concepts, and contract-aware transitions.',
  },
  {
    question: 'Does the frontend depend only on local browser state?',
    answer:
      'No. The frontend keeps local state for responsiveness, but it also hydrates from relayer-backed invoice projections so important screens can recover after refresh and reflect backend progress.',
  },
  {
    question: 'What should I evaluate first when reviewing the product?',
    answer:
      'Start with invoice creation, dashboard visibility, invoice detail transitions, dispute surfaces, and the docs themselves. Those areas show the strongest combination of business structure, product direction, and FHE-aware architecture.',
  },
];

export default function DocsPage() {
  const [expandedSection, setExpandedSection] = useState<string>('overview');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-8 shadow-[0_26px_70px_-34px_rgba(15,23,42,0.35)]">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[linear-gradient(135deg,rgba(15,23,42,0.02),rgba(34,197,94,0.08))] lg:block" />
        <div className="relative grid gap-8 lg:grid-cols-[1.3fr,0.9fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              FHE Invoice Handbook
            </div>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-primary-950 md:text-5xl">
                Designed for private finance, structured like a real invoice product.
              </h1>
              <p className="max-w-3xl text-base leading-7 text-primary-700 md:text-lg">
                Alpaca Invoice on an FHE-oriented stack is built around one idea: privacy upgrades
                should strengthen invoice operations, not replace them. The product keeps business
                workflow, auditability, and dispute handling at the center while preparing the
                settlement layer for confidential finance.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/invoices/create"
                className="inline-flex items-center gap-2 rounded-full bg-primary-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-800"
              >
                Create an invoice
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#architecture"
                className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/80 px-5 py-3 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50"
              >
                Read architecture
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="grid gap-3 self-start sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                  <Layers3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary-950">Four-layer product shape</p>
                  <p className="text-sm text-primary-600">Web, relayer, contracts, projections</p>
                </div>
              </div>
              <p className="text-sm leading-6 text-primary-700">
                The app is designed so product screens, signing flows, backend orchestration, and
                chain state each have a clean job instead of being collapsed into one demo layer.
              </p>
            </div>

            <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary-950">Honest privacy posture</p>
                  <p className="text-sm text-primary-600">Public MVP rail, confidential end state</p>
                </div>
              </div>
              <p className="text-sm leading-6 text-primary-700">
                The product does not pretend that today&apos;s public rail is already confidential.
                Instead, it documents the transition path clearly and keeps the architecture ready
                for FHE-native settlement.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickFacts.map((fact) => (
          <div key={fact.title} className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.28)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-500">{fact.title}</p>
            <p className="mt-3 text-sm leading-6 text-primary-800">{fact.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.72fr,1.28fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.28)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-500">Reading Map</p>
            <div className="mt-4 space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setExpandedSection(section.id)}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition-colors ${
                    expandedSection === section.id
                      ? 'bg-primary-950 text-white'
                      : 'bg-primary-50/80 text-primary-700 hover:bg-primary-100'
                  }`}
                >
                  <span>{section.title}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.22)]">
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-950">Current phase note</p>
                <p className="text-sm text-amber-800">Confidential settlement is still roadmap work</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-amber-900">
              This documentation intentionally separates production-minded invoice architecture from
              future confidential token execution. That distinction is a feature, not a disclaimer.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {sections.map((section) => {
            const isExpanded = expandedSection === section.id;
            return (
              <article
                key={section.id}
                id={section.id}
                className="overflow-hidden rounded-3xl border border-white/60 bg-white/88 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.28)] backdrop-blur"
              >
                <button
                  type="button"
                  onClick={() => setExpandedSection(isExpanded ? '' : section.id)}
                  className="flex w-full items-start justify-between gap-4 px-6 py-5 text-left"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-500">
                      {section.eyebrow}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-primary-950">{section.title}</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-primary-700">
                      {section.summary}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="mt-1 h-5 w-5 flex-shrink-0 text-primary-500" />
                  ) : (
                    <ChevronRight className="mt-1 h-5 w-5 flex-shrink-0 text-primary-500" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-primary-100/80 px-6 py-5">
                    <div className="grid gap-3">
                      {section.bullets.map((bullet) => (
                        <div
                          key={bullet}
                          className="rounded-2xl border border-primary-100 bg-primary-50/70 px-4 py-3 text-sm leading-6 text-primary-800"
                        >
                          {bullet}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/60 bg-white/88 p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.28)]">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-primary-100 p-3 text-primary-700">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-950">What you can test now</p>
              <p className="text-sm text-primary-600">Core product experience</p>
            </div>
          </div>
          <div className="space-y-2 text-sm leading-6 text-primary-800">
            <p>Wallet connection and session continuity across reloads.</p>
            <p>Invoice composition, invoice detail, dashboard visibility, and receipts.</p>
            <p>Dispute-oriented screens and audit-oriented surfaces.</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/88 p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.28)]">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-950">What keeps it stable</p>
              <p className="text-sm text-primary-600">Projection-backed frontend recovery</p>
            </div>
          </div>
          <div className="space-y-2 text-sm leading-6 text-primary-800">
            <p>The relayer exposes queryable invoice projections instead of forcing a pure wallet-only UX.</p>
            <p>The frontend hydrates from those projections so invoice pages do not depend on a single tab session.</p>
            <p>Backend reconciliation has a clean place to update status without rewriting UI logic.</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/88 p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.28)]">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-rose-100 p-3 text-rose-700">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-950">What is still next</p>
              <p className="text-sm text-primary-600">Confidential execution path</p>
            </div>
          </div>
          <div className="space-y-2 text-sm leading-6 text-primary-800">
            <p>Confidential token settlement and deeper FHE-native disclosure controls.</p>
            <p>More complete encrypted amount handling across backend and user-facing flows.</p>
            <p>Selective disclosure UX that matches the audit and decrypt capabilities modeled today.</p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/60 bg-white/88 p-8 shadow-[0_22px_50px_-30px_rgba(15,23,42,0.3)]">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-2xl bg-primary-100 p-3 text-primary-700">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-500">FAQ</p>
            <h2 className="text-2xl font-semibold text-primary-950">Common questions from reviewers and builders</h2>
          </div>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, index) => {
            const isOpen = expandedFaq === index;
            return (
              <div key={item.question} className="overflow-hidden rounded-2xl border border-primary-100 bg-primary-50/55">
                <button
                  type="button"
                  onClick={() => setExpandedFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-primary-950">{item.question}</span>
                  {isOpen ? (
                    <ChevronDown className="h-5 w-5 flex-shrink-0 text-primary-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 flex-shrink-0 text-primary-500" />
                  )}
                </button>
                {isOpen && (
                  <div className="border-t border-primary-100/80 px-5 py-4 text-sm leading-7 text-primary-700">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[2rem] border border-primary-200/70 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.96))] p-8 text-white shadow-[0_26px_70px_-34px_rgba(15,23,42,0.5)]">
        <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              <Shield className="h-3.5 w-3.5" />
              Review Path
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">If you want the fastest product read, start here.</h2>
            <p className="max-w-3xl text-sm leading-7 text-white/75">
              Open the dashboard, create an invoice, inspect the detail page, and compare the
              business structure against the architecture notes above. That sequence shows how the
              product is trying to marry FHE direction with practical invoice operations.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Link
              href="/dashboard"
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4" />
                Open dashboard
              </div>
            </Link>
            <Link
              href="/audit"
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4" />
                Inspect audit surfaces
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
