import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Dictionary, Sender, SendMode } from '@ton/core';
import { OpCodes } from './imports/constants';
import { serializeMessage } from './imports/functions';
import { Message } from './imports/types';

export type RelayerDictConfig = {};

export function relayerDictConfigToCell(config: RelayerDictConfig): Cell {
    return beginCell().endCell();
}

export class RelayerDict implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new RelayerDict(address);
    }

    static createFromConfig(config: RelayerDictConfig, code: Cell, workchain = 0) {
        const data = relayerDictConfigToCell(config);
        const init = { code, data };
        return new RelayerDict(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendMessages(provider: ContractProvider, via: Sender, value: bigint, messages: Message[]) {
        let msgDict: Dictionary<number, Cell> = Dictionary.empty();
        for (let i = 0; i < messages.length; ++i) {
            msgDict.set(i, serializeMessage(messages[i]));
        }
        const body = beginCell().storeUint(OpCodes.sendMessage, 32).storeUint(0, 64).storeDict(msgDict, Dictionary.Keys.Uint(16), Dictionary.Values.Cell()).endCell();
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body,
        });
    }
}
