import { Blockchain, SandboxContract, TreasuryContract, printTransactionFees } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { RelayerRefsCheck } from '../wrappers/RelayerRefsCheck';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { Message } from '../wrappers/imports/types';
import { findTransactionRequired, randomAddress } from '@ton/test-utils';
import { OpCodes, WORKCHAIN } from '../wrappers/imports/constants';
import { randomBigCell } from '../wrappers/imports/functions';
import { computedGeneric, printTxGasStats } from './gas';
import { randomInt } from 'crypto';

describe('RelayerRefsCheck', () => {
    let relayerCode: Cell;

    beforeAll(async () => {
        relayerCode = await compile('RelayerRefsCheck');
    });

    
    let blockchain: Blockchain;
    let user: SandboxContract<TreasuryContract>;
    let relayer: SandboxContract<RelayerRefsCheck>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = 1000000000

        user = await blockchain.treasury("user");
        relayer = await blockchain.openContract(RelayerRefsCheck.createFromConfig({}, relayerCode));
        await relayer.sendDeploy(user.getSender(), toNano("0.01"));
        console.log((await blockchain.getContract(relayer.address)).account!!.account!!.storageStats.used)
        return ;
    });

    it('should send transactions', async () => {
        // blockchain.verbosity.vmLogs = "vm_logs"
        const startBalance = Number((await blockchain.getContract(relayer.address)).balance) / 1e9;

        let fees: Array<bigint> = [];
        const cyclesNumber = 10;
        const msgStartIndex = 5;
        const msgEndIndex = 30;

        for (let cycle = 0; cycle < cyclesNumber; ++cycle) {
            for(let msgCount = msgStartIndex; msgCount < msgEndIndex; ++ msgCount) {
                let messages: Array<Message> = [];
                let tonToSend = 0;
                for (let i = 0; i < msgCount; ++i) {
                    let msgValue = randomInt(1000000) / 1e4;
                    messages.push({
                        toAddress: randomAddress(WORKCHAIN),
                        value: toNano(msgValue.toFixed(4)),
                        payload: randomBigCell()
                    })
                    tonToSend += msgValue + 0.1;
                }
                // blockchain.now! += 60 * 60 * 24 * 90;
                let res = await relayer.sendMessages(user.getSender(), toNano(tonToSend.toFixed(2)), messages);
                // printTransactionFees(res.transactions);
                // console.log(Number((await blockchain.getContract(relayer.address)).balance) / 1e9);
                for (let i = 0; i < messages.length; ++i) {
                    expect(res.transactions).toHaveTransaction({
                        to: messages[i].toAddress,
                        body: messages[i].payload
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
        }
        const endRelayerBalance = Number((await blockchain.getContract(relayer.address)).balance) / 1e9;
        console.log(`Start balance: ${startBalance.toFixed(5)};\nEnd balance: ${endRelayerBalance.toFixed(5)};` + 
                    `\nDiff: ${(endRelayerBalance - startBalance).toFixed(6)};\nTotal transactions: ${(msgEndIndex - msgStartIndex) * cyclesNumber}`);
        // let outputRes = "RelayerRefsCheck\n";
        // for (let i of fees) {
        //     outputRes = outputRes + " " + i.toString();
        // }
        // console.log(outputRes);
    });

    it('should reject transactions', async () => {
        const cyclesNumber = 10;
        const msgStartIndex = 5;
        const msgEndIndex = 30;
        const userStartBalance = Number((await blockchain.getContract(user.address)).balance) / 1e9;

        for (let cycle = 0; cycle < cyclesNumber; ++cycle) {
            for(let msgCount = msgStartIndex; msgCount < msgEndIndex; ++ msgCount) {
                let messages: Array<Message> = [];
                let tonToSend = 0;
                for (let i = 0; i < msgCount; ++i) {
                    let msgValue = randomInt(1000000) / 1e4;
                    messages.push({
                        toAddress: randomAddress(WORKCHAIN),
                        value: toNano(msgValue.toFixed(4)),
                        payload: randomBigCell()
                    })
                    tonToSend += msgValue + 0.002;
                }
                let res = await relayer.sendMessages(user.getSender(), toNano(tonToSend.toFixed(2)), messages);
                // printTransactionFees(res.transactions);
                expect(res.transactions).toHaveTransaction({
                    to: user.address,
                    op: 0xffffffff,
                })
            }
        }

        const userEndBalance = Number((await blockchain.getContract(user.address)).balance) / 1e9;
        console.log(`User balance diff: ${userStartBalance - userEndBalance}\nTotal transactions: ${(msgEndIndex - msgStartIndex) * cyclesNumber}`)
        expect(userStartBalance - userEndBalance).toBeLessThan(0.15 * cyclesNumber * (msgEndIndex - msgStartIndex));
    });
});
