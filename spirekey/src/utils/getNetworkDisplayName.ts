export const getNetworkDisplayName = (network: string) => {
  if (network === 'mainnet01') return 'Mainnet';
  if (network === 'testnet04') return 'Testnet';
  if (network === 'development' || 'fast-development') return 'Devnet';
  return network;
};

export const getRootkeyPasskeyName = (network: string) => {
  const rootkeyPasskeyName = `SpireKey Wallet Manager`;
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `${rootkeyPasskeyName} (${getNetworkDisplayName(network)}) ${ts}`;
};
