interface OnboardingPersistState {
  completed: boolean;
  autoLaunched?: boolean;
}

const VERSION = 'v2';

function storageKey(publicKey: string | null): string {
  return `alpaca-onboarding:${publicKey ?? 'guest'}:${VERSION}`;
}

function safeRead(publicKey: string | null): OnboardingPersistState {
  if (typeof window === 'undefined') return { completed: false };
  try {
    const raw = window.localStorage.getItem(storageKey(publicKey));
    if (!raw) return { completed: false };
    const parsed = JSON.parse(raw) as Partial<OnboardingPersistState>;
    return {
      completed: Boolean(parsed.completed),
      autoLaunched: Boolean(parsed.autoLaunched),
    };
  } catch {
    return { completed: false };
  }
}

function safeWrite(publicKey: string | null, value: OnboardingPersistState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(publicKey), JSON.stringify(value));
}

export function getOnboardingState(publicKey: string | null): OnboardingPersistState {
  return safeRead(publicKey);
}

export function setOnboardingCompleted(publicKey: string | null): void {
  const prev = safeRead(publicKey);
  safeWrite(publicKey, { ...prev, completed: true });
}

export function resetOnboarding(publicKey: string | null): void {
  const prev = safeRead(publicKey);
  safeWrite(publicKey, { ...prev, completed: false });
}

export function setOnboardingAutoLaunched(publicKey: string | null): void {
  const prev = safeRead(publicKey);
  safeWrite(publicKey, { ...prev, autoLaunched: true });
}
