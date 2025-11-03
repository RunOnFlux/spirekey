import { accountBalances } from '@/resolvers/account-balances';
import { accountName } from '@/resolvers/account-name';
import { account, accounts } from '@/resolvers/accounts';
import { addDeviceTxs } from '@/resolvers/add-device';
import { autoTransfers } from '@/resolvers/auto-transfers';
import { connectWallet } from '@/resolvers/connect-wallet';
import { createAccount } from '@/resolvers/create-account';
import { createWallet } from '@/resolvers/create-wallet';
import { recoverAccount } from '@/resolvers/recover-account';
import { signSubmitHd } from '@/resolvers/sign-hd';
import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

declare const process: { env: Record<string, string | undefined> };
const getGraphqlHost = (networkId: string) => {
  if (networkId === 'development') return 'http://localhost:8080/graphql';
  if (networkId === 'testnet04')
    return 'https://graph.testnet.kadena.network/graphql';
  return 'https://indexer.kda-1.zelcore.io/graphql';
};
const cache = new InMemoryCache();
const httpLink = new HttpLink({
  includeUnusedVariables: true,
  fetch: (input: RequestInfo | URL, opts?: RequestInit) => {
    const apiKey =
      process.env.NEXT_PUBLIC_GRAPHQL_API_KEY ?? process.env.GRAPHQL_API_KEY;
    const mergedOpts = {
      ...opts,
      headers: {
        ...(opts?.headers || {}),
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
      },
    } as RequestInit;
    if (!opts?.body) return fetch(getGraphqlHost(''), mergedOpts);

    const { variables } = JSON.parse(opts.body.toString());
    return fetch(getGraphqlHost(variables.networkId), mergedOpts);
  },
});
export const apolloClient = new ApolloClient({
  link: httpLink,
  cache,
  resolvers: {
    Query: {
      accounts,
      account,
      addDeviceTxs,
      accountName,
      accountBalances,
      autoTransfers,
      connectWallet,
      recoverAccount,
    },
    Mutation: {
      createWallet,
      createAccount,
      signSubmitHd,
    },
  },
});
