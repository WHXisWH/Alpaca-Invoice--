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
import { usePathname, useRouter } from 'next/navigation';
import {
  getOnboardingState,
  resetOnboarding,
  setOnboardingAutoLaunched,
  setOnboardingCompleted,
} from '@/lib/onboarding-storage';
import { toLocalizedHref } from '@/lib/locale-routing';
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

  const normalizedPublicKey = useMemo(() => {
    const pk = typeof publicKey === 'string' ? publicKey.trim() : '';
    return pk.length > 0 ? pk : null;
  }, [publicKey]);

  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const initializedRef = useRef(false);
  const lastNavigatedStepRef = useRef<number>(-1);

  useEffect(() => {
    if (initializedRef.current) return;
    const walletState = getOnboardingState(normalizedPublicKey);
    const guestState = getOnboardingState(null);
    const completed = walletState.completed || guestState.completed;
    const alreadyAutoLaunched = Boolean(walletState.autoLaunched || guestState.autoLaunched);

    // Auto-launch the tour only once (first visit), even if user refreshes before finishing.
    if (!completed && !alreadyAutoLaunched) {
      setOnboardingAutoLaunched(null);
      if (normalizedPublicKey) setOnboardingAutoLaunched(normalizedPublicKey);
      const timer = setTimeout(() => {
        initializedRef.current = true;
        setStep(0);
        setActive(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [normalizedPublicKey]);

  useEffect(() => {
    if (!normalizedPublicKey) return;
    const completedForWallet = getOnboardingState(normalizedPublicKey).completed;
    const completedForGuest = getOnboardingState(null).completed;
    if (completedForGuest && !completedForWallet) {
      setOnboardingCompleted(normalizedPublicKey);
    }
  }, [normalizedPublicKey]);

  const currentStep = TOUR_STEPS[step];

  useEffect(() => {
    if (!active || !currentStep) return;

    // Only navigate if we're on a different step than last navigation
    if (lastNavigatedStepRef.current === step) return;

    const targetPath = toLocalizedHref(pathname, currentStep.route);

    if (pathname !== targetPath) {
      lastNavigatedStepRef.current = step;
      router.push(targetPath);
    }
  }, [active, step, currentStep, pathname, router]);

  useEffect(() => {
    if (!active) return;
    if (currentStep?.id === 'wallet' && isConnected && normalizedPublicKey) {
      const timer = setTimeout(() => setStep((s) => s + 1), 600);
      return () => clearTimeout(timer);
    }
  }, [active, currentStep, isConnected, normalizedPublicKey]);

  const finish = useCallback(() => {
    setActive(false);
    initializedRef.current = false;
    setOnboardingCompleted(null);
    if (normalizedPublicKey) setOnboardingCompleted(normalizedPublicKey);
  }, [normalizedPublicKey]);

  const restart = useCallback(() => {
    resetOnboarding(normalizedPublicKey);
    initializedRef.current = true;
    setStep(0);
    setActive(true);
    const targetPath = toLocalizedHref(pathname, '/dashboard');
    if (pathname !== targetPath) {
      router.push(targetPath);
    }
  }, [normalizedPublicKey, pathname, router]);

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
