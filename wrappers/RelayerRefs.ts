import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
import { Message } from './imports/types';
import { OpCodes } from './imports/constants';
import { serializeMessage } from './imports/functions';

export type RelayerRefsConfig = {};

export function relayerRefsConfigToCell(config: RelayerRefsConfig): Cell {
    return beginCell().endCell();
}

export class RelayerRefs implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new RelayerRefs(address);
    }

    static createFromConfig(config: RelayerRefsConfig, code: Cell, workchain = 0) {
        const data = relayerRefsConfigToCell(config);
        const init = { code, data };
        return new RelayerRefs(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendMessages(provider: ContractProvider, via: Sender, value: bigint, messages: Message[]) {
        let tmp = beginCell();
        let msgIndex = messages.length;
        let reminder = msgIndex % 3;
        reminder = reminder ? reminder : 3;
        msgIndex -= 1;
        
        for (let i = 0; i < reminder; i++) {
            tmp = tmp.storeRef(serializeMessage(messages[msgIndex - i]));
        }
        msgIndex -= reminder;
        let serializedMsgs = tmp.endCell();
        
        while (msgIndex > 0) {
            serializedMsgs = beginCell()
                                .storeRef(serializeMessage(messages[msgIndex - 2]))
                                .storeRef(serializeMessage(messages[msgIndex - 1]))
                                .storeRef(serializeMessage(messages[msgIndex]))
                            .storeRef(serializedMsgs).endCell();
            msgIndex -= 3;
        }
        const body = beginCell()
                        .storeUint(OpCodes.sendMessage, 32)
                        .storeUint(0, 64)
                        .storeUint(messages.length, 8)
                        .storeSlice(serializedMsgs.asSlice())
                    .endCell();
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body,
        });
    }
}
