'use client';

import SpireKeyLogoAnimated from '@/assets/images/chainweaver-logo-light-animated.svg';
import EmbeddedSign from '@/components/Embedded/Sign';
import { Stack } from '@kadena/kode-ui';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

const toBase64 = (input: string) => {
  if (typeof window !== 'undefined' && window.btoa) {
    return window.btoa(unescape(encodeURIComponent(input)));
  }
  return Buffer.from(input, 'utf-8').toString('base64');
};

const fromBase64 = (input: string) => {
  if (typeof window !== 'undefined' && window.atob) {
    return decodeURIComponent(escape(window.atob(input)));
  }
  return Buffer.from(input, 'base64').toString('utf-8');
};

export default function SignPage() {
  const search = useSearchParams();
  const router = useRouter();

  const queryReturnUrl = search.get('returnUrl') || '';
  const queryTransactions = search.get('transactions') || undefined;
  const queryTransaction = search.get('transaction') || undefined;
  const queryAccounts = search.get('accounts') || undefined;

  const [hashReturnUrl, setHashReturnUrl] = useState<string | null>(null);
  const [hashTransactions, setHashTransactions] = useState<string | null>(null);
  const [hashTransaction, setHashTransaction] = useState<string | null>(null);
  const [hashAccounts, setHashAccounts] = useState<string | null>(null);

  useEffect(() => {
    const getHash = () => {
      const params = new URLSearchParams(
        window.location.hash.replace(/^#/, '?'),
      );
      setHashReturnUrl(params.get('returnUrl'));
      setHashTransactions(params.get('transactions'));
      setHashTransaction(params.get('transaction'));
      setHashAccounts(params.get('accounts'));
    };
    getHash();
    const onHashChanged = () => getHash();
    window.addEventListener('hashchange', onHashChanged);
    return () => window.removeEventListener('hashchange', onHashChanged);
  }, []);

  const returnUrl =
    queryReturnUrl || (hashReturnUrl ? decodeURIComponent(hashReturnUrl) : '');

  const transactionsRaw =
    queryTransactions ||
    hashTransactions ||
    queryTransaction ||
    hashTransaction;
  const accounts = queryAccounts || hashAccounts || '[]';

  const transactions = useMemo(() => {
    if (!transactionsRaw) return undefined;
    try {
      const decoded = fromBase64(transactionsRaw);
      const parsed = JSON.parse(decoded);
      if (Array.isArray(parsed)) {
        return JSON.stringify(parsed);
      }
      if (parsed.cmds && Array.isArray(parsed.cmds)) {
        return JSON.stringify(parsed.cmds);
      }
      return JSON.stringify([parsed]);
    } catch {
      try {
        const parsed = JSON.parse(transactionsRaw);
        if (Array.isArray(parsed)) {
          return transactionsRaw;
        }
        if (parsed.cmds && Array.isArray(parsed.cmds)) {
          return JSON.stringify(parsed.cmds);
        }
        return JSON.stringify([parsed]);
      } catch {
        return transactionsRaw;
      }
    }
  }, [transactionsRaw]);

  const onSign = useCallback(
    (signedTransactions: any) => {
      if (!returnUrl) return;
      try {
        const isArray = Array.isArray(signedTransactions);
        const transactionsToReturn = isArray
          ? signedTransactions
          : [signedTransactions];
        const encoded = toBase64(JSON.stringify(transactionsToReturn));
        const target = new URL(decodeURIComponent(returnUrl));
        if (isArray) {
          target.searchParams.set('transactions', encoded);
        } else {
          target.searchParams.set('transaction', encoded);
        }
        window.location.href = target.toString();
      } catch {}
    },
    [returnUrl],
  );

  const onCancel = useCallback(() => {
    if (returnUrl) {
      try {
        const target = new URL(decodeURIComponent(returnUrl));
        window.location.href = target.toString();
        return;
      } catch {}
    }
    router.back();
  }, [returnUrl, router]);

  const props = useMemo(
    () => ({
      transactions,
      accounts,
      onSign,
      onCancel,
    }),
    [transactions, accounts, onSign, onCancel],
  );

  if (!returnUrl) {
    if (transactions)
      return <EmbeddedSign transactions={transactions} accounts={accounts} />;
    return (
      <Stack alignItems="center" justifyContent="center" height="100%">
        <Image
          src={SpireKeyLogoAnimated}
          alt="Signing transaction.."
          height={128}
          width={128}
        />
      </Stack>
    );
  }

  if (!transactions) {
    return (
      <Stack alignItems="center" justifyContent="center" height="100%">
        <Image
          src={SpireKeyLogoAnimated}
          alt="Signing transaction.."
          height={128}
          width={128}
        />
      </Stack>
    );
  }

  return <EmbeddedSign {...props} />;
}
