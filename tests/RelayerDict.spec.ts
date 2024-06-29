import { Blockchain, SandboxContract, TreasuryContract, prettyLogTransactions, printTransactionFees } from '@ton/sandbox';
import { Address, Cell, Transaction, TransactionComputeVm, beginCell, toNano } from '@ton/core';
import { RelayerDict } from '../wrappers/RelayerDict';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { Message } from '../wrappers/imports/types';
import { findTransactionRequired, randomAddress } from '@ton/test-utils';
import { OpCodes, WORKCHAIN } from '../wrappers/imports/constants';
import { randomBytes } from 'crypto';
import { randomBigCell } from '../wrappers/imports/functions';
import { computedGeneric, printTxGasStats } from './gas';


describe('RelayerDict', () => {
    let relayerCode: Cell;

    beforeAll(async () => {
        relayerCode = await compile('RelayerDict');
    });

    let blockchain: Blockchain;
    let user: SandboxContract<TreasuryContract>;
    let relayer: SandboxContract<RelayerDict>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = 1000000000

        user = await blockchain.treasury("user");
        relayer = await blockchain.openContract(RelayerDict.createFromConfig({}, relayerCode));
        await relayer.sendDeploy(user.getSender(), toNano("0.01"));
    });

    it('should calculate compute fee', async () => {
        // blockchain.verbosity.vmLogs = "vm_logs"
        let fees: Array<bigint> = [];
        for(let msgCount = 1; msgCount < 255; ++ msgCount) {
            let messages: Array<Message> = [];
            for (let i = 0; i < msgCount; ++i) {
                messages.push({
                    toAddress: randomAddress(WORKCHAIN),
                    value: 0n,
                    payload: randomBigCell()
                })
            }

            let res = await relayer.sendMessages(user.getSender(), toNano(250), messages);
            // printTransactionFees(res.transactions.slice(0, 3));
            
            for (let i = 0; i < messages.length; ++i) {
                expect(res.transactions).toHaveTransaction({
                    to: messages[i].toAddress,
                })
            }
            
            const transaction = findTransactionRequired(res.transactions, {
                on: relayer.address,
                from: user.address,
                op: OpCodes.sendMessage,
                success: true
            });
            fees.push(computedGeneric(transaction).gasUsed);
        }
        
        let outputRes = "RelayerDict\n";
        for (let i of fees) {
            outputRes = outputRes + " " + i.toString();
        }
        console.log(outputRes);
        // const send_gas_fee = printTxGasStats(`RelayerDict ${msgCount} messages cost:`, transaction);
    });

});
