export interface RuntimeDescriptor {
  chain: "fhenix";
  appName: string;
  relayerName: string;
}

export const runtimeDescriptor: RuntimeDescriptor = {
  chain: "fhenix",
  appName: "Alpaca Invoice",
  relayerName: "alpaca-relayer"
};
