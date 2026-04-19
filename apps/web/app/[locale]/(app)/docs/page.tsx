'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Zap,
  Shield,
  HelpCircle,
  Code,
  Wallet,
  DollarSign,
} from 'lucide-react';

type DocSection = {
  id: string;
  titleKey: string;
  icon: React.ElementType;
  content: string[];
};

export default function DocsPage() {
  const t = useTranslations('docs');
  const [expandedSections, setExpandedSections] = useState<string[]>(['getting-started']);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  const sections: DocSection[] = [
    {
      id: 'getting-started',
      titleKey: 'gettingStarted.title',
      icon: Zap,
      content: [
        'gettingStarted.step1',
        'gettingStarted.step2',
        'gettingStarted.step3',
        'gettingStarted.step4',
      ],
    },
    {
      id: 'invoices',
      titleKey: 'invoices.title',
      icon: FileText,
      content: [
        'invoices.create',
        'invoices.pay',
        'invoices.cancel',
        'invoices.view',
      ],
    },
    {
      id: 'wallet',
      titleKey: 'wallet.title',
      icon: Wallet,
      content: [
        'wallet.connect',
        'wallet.balance',
        'wallet.transactions',
        'wallet.security',
      ],
    },
    {
      id: 'privacy',
      titleKey: 'privacy.title',
      icon: Shield,
      content: [
        'privacy.fhe',
        'privacy.encryption',
        'privacy.viewKeys',
        'privacy.auditTrail',
      ],
    },
    {
      id: 'disputes',
      titleKey: 'disputes.title',
      icon: HelpCircle,
      content: [
        'disputes.create',
        'disputes.arbiter',
        'disputes.resolve',
        'disputes.timeline',
      ],
    },
    {
      id: 'api',
      titleKey: 'api.title',
      icon: Code,
      content: [
        'api.contracts',
        'api.functions',
        'api.events',
        'api.integration',
      ],
    },
  ];

  const quickLinks = [
    { titleKey: 'quickLinks.createInvoice', href: '/invoices/create', icon: FileText },
    { titleKey: 'quickLinks.viewDashboard', href: '/dashboard', icon: Zap },
    { titleKey: 'quickLinks.creditScore', href: '/credit', icon: DollarSign },
    { titleKey: 'quickLinks.auditCenter', href: '/audit', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950 p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-accent-500/20 p-6">
              <BookOpen className="h-16 w-16 text-accent-400" />
            </div>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight mb-4">{t('title')}</h1>
          <p className="text-xl text-primary-400 font-medium max-w-3xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link, idx) => {
            const Icon = link.icon;
            return (
              <a
                key={idx}
                href={link.href}
                className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:border-accent-500/30 hover:bg-accent-500/10"
              >
                <Icon className="h-8 w-8 text-accent-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-white">{t(link.titleKey)}</h3>
              </a>
            );
          })}
        </div>

        {/* Documentation Sections */}
        <div className="space-y-4">
          {sections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSections.includes(section.id);

            return (
              <div
                key={section.id}
                className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm overflow-hidden"
              >
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-6 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-accent-500/20 p-3">
                      <Icon className="h-6 w-6 text-accent-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white">{t(section.titleKey)}</h2>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-6 w-6 text-primary-400" />
                  ) : (
                    <ChevronRight className="h-6 w-6 text-primary-400" />
                  )}
                </button>

                {/* Section Content */}
                {isExpanded && (
                  <div className="border-t border-white/5 p-6 space-y-6">
                    {section.content.map((contentKey, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-accent-500/10 text-sm font-bold text-accent-400">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-2">
                            {t(`${contentKey}.title`)}
                          </h3>
                          <p className="text-sm text-primary-400 leading-relaxed">
                            {t(`${contentKey}.description`)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm">
          <h2 className="text-3xl font-black text-white mb-8 text-center">{t('faq.title')}</h2>
          <div className="space-y-6 max-w-3xl mx-auto">
            {[
              { q: 'faq.q1.question', a: 'faq.q1.answer' },
              { q: 'faq.q2.question', a: 'faq.q2.answer' },
              { q: 'faq.q3.question', a: 'faq.q3.answer' },
              { q: 'faq.q4.question', a: 'faq.q4.answer' },
            ].map((faq, idx) => (
              <div key={idx} className="space-y-2">
                <h4 className="text-lg font-bold text-white flex items-start gap-2">
                  <span className="flex-shrink-0 text-accent-400">Q{idx + 1}:</span>
                  <span>{t(faq.q)}</span>
                </h4>
                <p className="text-sm text-primary-400 leading-relaxed pl-8">
                  {t(faq.a)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Support Banner */}
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-8 text-center">
          <HelpCircle className="mx-auto h-12 w-12 text-blue-400 mb-4" />
          <h3 className="text-2xl font-black text-white mb-2">{t('support.title')}</h3>
          <p className="text-primary-300 mb-6 max-w-2xl mx-auto">
            {t('support.description')}
          </p>
          <a
            href="https://github.com/your-repo/alpaca-invoice"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-full bg-blue-500 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-blue-400"
          >
            {t('support.contactButton')}
          </a>
        </div>
      </div>
    </div>
  );
}
