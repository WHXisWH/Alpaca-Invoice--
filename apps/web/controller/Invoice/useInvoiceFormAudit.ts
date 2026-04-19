'use client';

import { useCallback, useMemo, useState } from 'react';
import { FIELD_SCOPE_IDS, getDefaultAuditExpiresAt } from '@/controller/Audit/auditConstants';

const DEFAULT_SCOPES = ['amount', 'tax_amount', 'buyer', 'seller'];

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function useInvoiceFormAudit() {
  const [enableAuditAuth, setEnableAuditAuth] = useState(false);
  const [auditKey, setAuditKey] = useState('');
  const [scopes, setScopes] = useState<string[]>(DEFAULT_SCOPES);
  const [expiresAt, setExpiresAt] = useState(getDefaultAuditExpiresAt);

  const toggleScope = useCallback((key: string) => {
    setScopes((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]));
  }, []);

  const generateAuditKey = useCallback(() => {
    const key = randomHex(32);
    setAuditKey(key);
    return key;
  }, []);

  const scopesBitmask = useMemo(() => {
    return scopes.reduce((mask, key) => {
      const id = FIELD_SCOPE_IDS[key];
      return id ? mask | (1n << BigInt(id - 1)) : mask;
    }, 0n);
  }, [scopes]);

  const expiresAtSeconds = useMemo(() => {
    return Math.floor(new Date(expiresAt).getTime() / 1000);
  }, [expiresAt]);

  const isAuditKeyValid = useCallback(() => {
    return !!auditKey && /^[0-9a-fA-F]{64}$/.test(auditKey.trim().replace(/\s/g, ''));
  }, [auditKey]);

  const normalizedAuditKey = useMemo(() => {
    return auditKey.trim().replace(/\s/g, '');
  }, [auditKey]);

  return {
    enableAuditAuth,
    setEnableAuditAuth,
    auditKey,
    setAuditKey,
    scopes,
    setScopes,
    expiresAt,
    setExpiresAt,
    toggleScope,
    generateAuditKey,
    scopesBitmask,
    expiresAtSeconds,
    isAuditKeyValid,
    normalizedAuditKey,
  };
}
