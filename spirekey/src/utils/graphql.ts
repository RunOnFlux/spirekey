declare const process: { env: Record<string, string | undefined> };
const getGraphqlHost = (networkId: string) => {
  if (networkId === 'development') return 'http://localhost:8080/graphql';
  if (networkId === 'testnet04')
    return 'https://graph.testnet.kadena.network/graphql';
  return 'https://graph.kadena.network/graphql';
};
export const getGraphClient = async (
  networkId: string,
  query: string,
  variables: any,
) => {
  console.log('[SpireKey][GraphQL] Request', {
    networkId,
    endpoint: getGraphqlHost(networkId),
    hasApiKey: Boolean(process.env.NEXT_PUBLIC_GRAPHQL_API_KEY ?? process.env.GRAPHQL_API_KEY),
    opName: /\b(query|mutation)\s+(\w+)/.exec(query)?.[2],
    variables,
  });
  const apiKey =
    process.env.NEXT_PUBLIC_GRAPHQL_API_KEY ?? process.env.GRAPHQL_API_KEY;
  const baseHeaders: Record<string, string> = {
    accept:
      'application/graphql-response+json, application/json, multipart/mixed',
    'content-type': 'application/json',
  };
  const headers = apiKey
    ? { ...baseHeaders, 'x-api-key': apiKey }
    : baseHeaders;

  const res = await fetch(getGraphqlHost(networkId), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      extensions: {},
      query,
      variables,
    }),
  });

  const { data } = await res.json();
  console.log('[SpireKey][GraphQL] Response', {
    ok: Boolean(data),
  });
  if (!data)
    throw new Error(
      `Could not query: ${query} with: ${JSON.stringify(variables)}`,
    );
  return data;
};
