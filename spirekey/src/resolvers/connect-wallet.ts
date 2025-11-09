import { useWallet } from '@/hooks/useWallet';
import { getHostname } from '@/utils/getHostname';
import { ApolloClient, gql, useLazyQuery } from '@apollo/client';
import {
  kadenaDecrypt,
  kadenaEncrypt,
  kadenaGenKeypairFromSeed,
  kadenaMnemonicToSeed,
} from '@kadena/hd-wallet';
import { ChainId } from '@kadena/types';
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import {
  base64URLStringToBuffer,
  bufferToBase64URLString,
  startAuthentication,
} from '@simplewebauthn/browser';
import { PublicKeyCredentialDescriptorJSON } from '@simplewebauthn/types';
import elliptic from 'elliptic';

type WalletsVariable = {
  networkId: string;
  chainId: ChainId;
};

type ApolloContext = {
  client: ApolloClient<any>;
};

const getCredentialsQuery = gql`
  query getCredentials($filter: String, $first: Int!, $after: String) {
    events(
      qualifiedEventName: "kadena.spirekey.REGISTER_CREDENTIAL"
      parametersFilter: $filter
      first: $first
      after: $after
    ) {
      totalCount
      edges {
        cursor
        node {
          chainId
          parameters
        }
      }
    }
  }
`;

type Query = InstanceType<typeof ApolloClient>['query'];

const getCredentials = async (
  networkId: string,
  credentialId: string,
  domain: string,
  query: Query,
) => {
  const PAGE_SIZE = 200;
  const filter = `{"array_contains": ["${credentialId}", "${domain}"]}`;
  console.log('[SpireKey][ConnectWallet] GraphQL getCredentials request', { networkId, filter });
  let after: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const res: any = await query({
      query: getCredentialsQuery,
      variables: {
        filter,
        first: PAGE_SIZE,
        after,
        networkId,
      },
    });
    const edges: any[] = res.data?.events?.edges || [];
    console.log('[SpireKey][ConnectWallet] GraphQL getCredentials response', { totalCount: res.data?.events?.totalCount, edgesCount: edges.length });
    
    const filtered = edges
      .map((e: any) => {
        try {
          const [cid, pubKey, dom] = JSON.parse(e?.node?.parameters) as [
            string,
            string,
            string,
          ];
          return { cid, pubKey, dom };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .filter((i: any) => i.cid === credentialId && i.dom === domain);
    
    if (filtered.length) return filtered.map((i: any) => i.pubKey);
    
    if (!edges.length) {
      hasMore = false;
    } else {
      after = edges[edges.length - 1]?.cursor;
      hasMore = !!after;
    }
  }
  
  throw new Error('No credentials found for cid and domain');
};

export const connectWalletQuery = gql`
  query ConnectWallet($networkId: String!) {
    connectWallet(networkId: $networkId) @client
  }
`;

export const useCredentials = () => {
  const [execute] = useLazyQuery(connectWalletQuery);
  const getCredentials = async (networkId: string) => {
    console.log('[SpireKey][ConnectWallet] useCredentials.execute', { networkId });
    const { data, error } = await execute({
      variables: {
        networkId,
      },
    });
    if (error) {
      console.error('[SpireKey][ConnectWallet] useCredentials.error', error);
      throw error;
    }
    console.log('[SpireKey][ConnectWallet] useCredentials.result', { hasData: Boolean(data?.connectWallet) });
    if (!data.connectWallet) throw new Error('No credentials found');
    const { publicKey, secretKey, mnemonic } = data.connectWallet;
    return { publicKey, secretKey, mnemonic };
  };
  return {
    getCredentials,
  };
};

export const connectWallet = async (
  _: any,
  { networkId }: WalletsVariable,
  { client }: ApolloContext,
) => {
  const { getWallet } = useWallet();
  const cid = getWallet(networkId);
  console.log('[SpireKey][ConnectWallet] Start', { networkId, cid });
  const { publicKey, secretKey, mnemonic } = await getPubkeyFromPasskey(
    networkId,
    client.query,
    cid,
  );
  console.log('[SpireKey][ConnectWallet] Recovered keys', { hasMnemonic: Boolean(mnemonic), publicKey });
  return { publicKey, secretKey, mnemonic };
};

const getAllowedCredentials = (cid: string | null) => {
  if (!cid) return;
  const allowedCredential: PublicKeyCredentialDescriptorJSON = {
    type: 'public-key',
    id: cid,
  };
  return [allowedCredential];
};

const getPubkeyFromPasskey = async (
  networkId: string,
  query: Query,
  cid: string | null,
): Promise<{ publicKey: string; secretKey: string; mnemonic?: string }> => {
  const { setWallet } = useWallet();
  console.log('[SpireKey][ConnectWallet] Requesting passkey (WebAuthn.startAuthentication)');
  const { response, id } = await startAuthentication({
    rpId: getHostname(),
    challenge: bufferToBase64URLString(
      crypto.getRandomValues(new Uint8Array(32)).buffer,
    ),
    timeout: 60000,
    allowCredentials: getAllowedCredentials(cid),
  });
  console.log('[SpireKey][ConnectWallet] Passkey returned', { id, allowCredentials: Boolean(cid) });

  const usignature = new Uint8Array(
    base64URLStringToBuffer(response.signature),
  );

  const rStart = usignature[4] === 0 ? 5 : 4;
  const rEnd = rStart + 32;
  const sStart = usignature[rEnd + 2] === 0 ? rEnd + 3 : rEnd + 2;
  const r = usignature.slice(rStart, rEnd);
  const s = usignature.slice(sStart);

  const ec = new elliptic.ec('p256');

  const rBigInt = BigInt('0x' + hex(r));
  const sBigInt = BigInt('0x' + hex(s));

  const sig = { r: rBigInt.toString(16), s: sBigInt.toString(16) };

  const concatenatedData = concatenateData(
    base64URLStringToBuffer(response.authenticatorData),
    await sha256(base64URLStringToBuffer(response.clientDataJSON)),
  );
  const messageHash = new Uint8Array(
    await sha256(concatenatedData.buffer),
  );
  console.log('[SpireKey][ConnectWallet] Message hash prepared', { length: messageHash.length });

  const domain = `${window.location.protocol}//${getHostname()}`;
  console.log('[SpireKey][ConnectWallet] Querying credentials', { networkId, id, domain });
  const foundKeys = await getCredentials(networkId, id, domain, query);
  console.log('[SpireKey][ConnectWallet] Credentials found', { count: foundKeys.length, keys: foundKeys });
  const newRecoveredKeys = await Promise.all(
    [
      ec.recoverPubKey(messageHash, sig, 0),
      ec.recoverPubKey(messageHash, sig, 1),
    ].map(async (p) => {
      const tempPassword = crypto.getRandomValues(new Uint8Array(32));
      const entropy = await crypto.subtle.digest(
        'sha-256',
        Buffer.from(p.encode('hex', false)),
      );
      const mnemonic = bip39.entropyToMnemonic(
        new Uint8Array(entropy),
        wordlist,
      );
      const seed = await kadenaMnemonicToSeed(tempPassword, mnemonic);
      const [pubKey, privateKey] = await kadenaGenKeypairFromSeed(
        tempPassword,
        seed,
        0,
      );
      const secretBin = await kadenaDecrypt(tempPassword, privateKey);
      return {
        mnemonic,
        publicKey: pubKey,
        secretKey: Buffer.from(secretBin).toString('hex'),
      };
    }),
  );
  const newRecoveredKey = newRecoveredKeys.find(({ publicKey }) =>
    foundKeys.includes(publicKey),
  );
  if (newRecoveredKey) {
    localStorage.setItem(`${networkId}:wallet:cid`, id);
    console.log('[SpireKey][ConnectWallet] Matched mnemonic key', { publicKey: newRecoveredKey.publicKey });
    return newRecoveredKey;
  }
  const recoveredKeys = await Promise.all(
    [0, 1, 2, 3]
      .map((recId) => ec.recoverPubKey(messageHash, sig, recId))
      .map(async (p) => {
      const tempPassword = crypto.getRandomValues(new Uint8Array(32));
      const seed = await crypto.subtle.digest(
        'sha-512',
        Buffer.from(p.encode('hex', false)),
      );
      const [pubKey, privateKey] = await kadenaGenKeypairFromSeed(
        tempPassword,
        await kadenaEncrypt(tempPassword, seed),
        0,
      );
      const secretBin = await kadenaDecrypt(tempPassword, privateKey);
      return {
        publicKey: pubKey,
        secretKey: Buffer.from(secretBin).toString('hex'),
      };
    }),
  );
  const recoveredKey = recoveredKeys.find(({ publicKey }) =>
    foundKeys.includes(publicKey),
  );
  if (!recoveredKey) throw new Error('No public key could be recovered');
  setWallet(networkId, id);
  console.log('[SpireKey][ConnectWallet] Matched legacy key', { publicKey: recoveredKey.publicKey });
  return recoveredKey;
};

const hex = (bytes: Uint8Array) => Array.from(bytes).map(i2hex).join('');

function i2hex(i: number) {
  return ('0' + i.toString(16)).slice(-2);
}

async function sha256(clientDataJSON: ArrayBuffer) {
  return await window.crypto.subtle.digest('SHA-256', clientDataJSON);
}

function concatenateData(
  authenticatorData: ArrayBuffer,
  clientDataHash: ArrayBuffer,
) {
  const concatenated = new Uint8Array(
    authenticatorData.byteLength + clientDataHash.byteLength,
  );
  concatenated.set(new Uint8Array(authenticatorData), 0);
  concatenated.set(
    new Uint8Array(clientDataHash),
    authenticatorData.byteLength,
  );
  return concatenated;
}
