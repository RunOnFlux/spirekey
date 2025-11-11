'use client';

import SpireKeyLogoAnimated from '@/assets/images/chainweaver-logo-light-animated.svg';
import ConnectComponent from '@/components/Connect/Connect';
import EmbeddedConnect from '@/components/Embedded/Connect';
import { type ChainId } from '@kadena/client';
import { Stack } from '@kadena/kode-ui';
import type { Account } from '@kadena/spirekey-types';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

const toBase64 = (input: string) => {
  if (typeof window !== 'undefined' && window.btoa) {
    return window.btoa(unescape(encodeURIComponent(input)));
  }
  return Buffer.from(input, 'utf-8').toString('base64');
};

export default function ConnectPage() {
  const search = useSearchParams();
  const router = useRouter();

  const returnUrl = search.get('returnUrl') || '';
  const queryNetworkId = search.get('networkId') || undefined;
  const queryChainId = (search.get('chainId') as ChainId) || undefined;

  const [hashNetworkId, setHashNetworkId] = useState<string | null>(null);
  const [hashChainId, setHashChainId] = useState<ChainId | null>(null);

  useEffect(() => {
    if (returnUrl) return;
    const getHash = () => {
      const params = new URLSearchParams(
        window.location.hash.replace(/^#/, '?'),
      );
      setHashNetworkId(params.get('networkId'));
      setHashChainId((params.get('chainId') as ChainId) || ('0' as ChainId));
    };
    getHash();
    const onHashChanged = () => getHash();
    window.addEventListener('hashchange', onHashChanged);
    return () => window.removeEventListener('hashchange', onHashChanged);
  }, [returnUrl]);

  const networkId = queryNetworkId || hashNetworkId || 'development';
  const chainId =
    (queryChainId as ChainId) || (hashChainId as ChainId) || ('0' as ChainId);

  const onConnect = useCallback(
    (account: Account) => {
      if (!returnUrl) return;
      try {
        const credentials =
          account?.devices?.[0]?.guard?.keys?.map((k) => ({
            publicKey: k,
          })) || [];
        const userPayload = {
          accountName: account.accountName,
          alias: (account as any).alias || '',
          credentials,
          pendingTxIds: [],
        };
        const encoded = toBase64(JSON.stringify(userPayload));
        const target = new URL(decodeURIComponent(returnUrl));
        target.searchParams.set('user', encoded);
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
      chainId,
      networkId,
      onConnect,
      onCancel,
    }),
    [chainId, networkId, onConnect, onCancel],
  );

  if (!returnUrl) {
    if (hashNetworkId && hashChainId)
      return (
        <EmbeddedConnect networkId={hashNetworkId} chainId={hashChainId} />
      );
    return (
      <Stack alignItems="center" justifyContent="center" height="100%">
        <Image
          src={SpireKeyLogoAnimated}
          alt="Connecting account.."
          height={128}
          width={128}
        />
      </Stack>
    );
  }

  return <ConnectComponent {...props} />;
}
