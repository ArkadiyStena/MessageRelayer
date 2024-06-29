import { toNano } from '@ton/core';
import { RelayerDict } from '../wrappers/RelayerDict';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const relayerDict = provider.open(RelayerDict.createFromConfig({}, await compile('RelayerDict')));

    await relayerDict.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(relayerDict.address);

    // run methods on `relayerDict`
}
