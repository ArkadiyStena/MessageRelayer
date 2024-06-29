import { Address, Cell } from "@ton/core";

export type Message = {
    toAddress: Address;
    value: bigint;
    payload?: Cell;
    stateInit?: Cell;
    bounceable?: boolean;
};