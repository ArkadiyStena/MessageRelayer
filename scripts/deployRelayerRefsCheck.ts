import { toNano } from '@ton/core';
import { RelayerRefsCheck } from '../wrappers/RelayerRefsCheck';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const relayerRefsCheck = provider.open(RelayerRefsCheck.createFromConfig({}, await compile('RelayerRefsCheck')));

    await relayerRefsCheck.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(relayerRefsCheck.address);

    // run methods on `relayerRefsCheck`
}
