'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import { useAccount } from 'wagmi';
import { useRouter, usePathname } from 'next/navigation';
import { getOnboardingState, resetOnboarding, setOnboardingCompleted } from '@/lib/onboarding-storage';
import { useUserStore } from '@/stores/User/useUserStore';
import { TOUR_STEPS } from './onboarding-config';
import { TourOverlay } from './onboarding-overlay';

interface OnboardingCtx {
  active: boolean;
  restart: () => void;
}

const defaultCtx: OnboardingCtx = { active: false, restart: () => {} };

const OnboardingContext = createContext<OnboardingCtx>(defaultCtx);
export const useOnboarding = () => useContext(OnboardingContext);

interface Props {
  children: ReactNode;
}

export function OnboardingProvider({ children }: Props) {
  const publicKey = useUserStore((s) => s.publicKey);
  const { isConnected } = useAccount();
  const router = useRouter();
  const pathname = usePathname();

  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const initializedRef = useRef(false);
  const lastNavigatedStepRef = useRef<number>(-1);

  useEffect(() => {
    if (initializedRef.current) return;
    const persisted = getOnboardingState(publicKey);
    if (!persisted.completed) {
      const timer = setTimeout(() => {
        initializedRef.current = true;
        setStep(0);
        setActive(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [publicKey]);

  const currentStep = TOUR_STEPS[step];

  useEffect(() => {
    if (!active || !currentStep) return;

    // Only navigate if we're on a different step than last navigation
    if (lastNavigatedStepRef.current === step) return;

    // Extract locale inside useEffect to avoid dependency loop
    const locale = pathname?.split('/')[1] || 'en';
    const targetPath = `/${locale}${currentStep.route}`;

    // Check if we need to navigate
    if (pathname !== targetPath) {
      lastNavigatedStepRef.current = step;
      router.push(targetPath);
    }
  }, [active, step, currentStep, pathname, router]);

  useEffect(() => {
    if (!active) return;
    if (currentStep?.id === 'wallet' && isConnected && publicKey) {
      const timer = setTimeout(() => setStep((s) => s + 1), 600);
      return () => clearTimeout(timer);
    }
  }, [active, currentStep, isConnected, publicKey]);

  const finish = useCallback(() => {
    setActive(false);
    initializedRef.current = false;
    setOnboardingCompleted(publicKey);
  }, [publicKey]);

  const restart = useCallback(() => {
    resetOnboarding(publicKey);
    initializedRef.current = true;
    setStep(0);
    setActive(true);
    // Extract locale inside callback to avoid dependency loop
    const locale = pathname?.split('/')[1] || 'en';
    const targetPath = `/${locale}/dashboard`;
    if (pathname !== targetPath) {
      router.push(targetPath);
    }
  }, [publicKey, pathname, router]);

  const next = useCallback(() => {
    if (step >= TOUR_STEPS.length - 1) {
      finish();
    } else {
      setStep((s) => s + 1);
    }
  }, [step, finish]);

  const prev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const ctx = useMemo<OnboardingCtx>(() => ({ active, restart }), [active, restart]);

  return (
    <OnboardingContext.Provider value={ctx}>
      {children}
      {active && (
        <TourOverlay steps={TOUR_STEPS} currentStep={step} onNext={next} onPrev={prev} onSkip={finish} />
      )}
    </OnboardingContext.Provider>
  );
}
