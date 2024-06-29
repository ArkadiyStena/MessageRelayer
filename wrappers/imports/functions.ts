import { beginCell, Address} from "@ton/core";
import { Message } from "./types";
import { WORKCHAIN } from "./constants";
import { randomBytes } from "crypto";


export function serializeMessage(message: Message) {
    let msg = beginCell()
                    .storeUint(message.bounceable ? 0x18 : 0x10, 6)
                    .storeAddress(message.toAddress)
                    .storeCoins(message.value)
                    .storeUint(0, 1 + 4 + 4 + 64 + 32);
    
    msg = message.stateInit ? msg.storeUint(3, 2).storeRef(message.stateInit) : msg.storeBit(0);

    if (message.payload && message.payload.bits.length > 134) {
        msg = msg.storeMaybeRef(message.payload);
    }
    else if (message.payload){
        msg = msg.storeBit(0).storeSlice(message.payload.asSlice());
    }
    else {
        msg = msg.storeUint(0, 2);
    }

    return msg.endCell();
}

export function randomBigCell() {
    let res = beginCell().storeBuffer(randomBytes(127)).endCell();
    for (let i = 0; i < 0x6; ++i) {
        res = beginCell().storeBuffer(randomBytes(127)).storeRef(res).endCell()
    }
    // console.log(res)
    return res;
}