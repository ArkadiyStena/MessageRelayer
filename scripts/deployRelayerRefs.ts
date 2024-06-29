import { toNano } from '@ton/core';
import { RelayerRefs } from '../wrappers/RelayerRefs';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const relayerRefs = provider.open(RelayerRefs.createFromConfig({}, await compile('RelayerRefs')));

    await relayerRefs.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(relayerRefs.address);

    // run methods on `relayerRefs`
}
