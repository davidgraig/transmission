import { IceCandidate } from "./IceCandidate";

export class RelayIceCandidate {
    static signal = "relayIceCandidate";

    targetSocketId: string;
    iceCandidate: string;

    constructor(targetSocketId: string, iceCandidate: string) {
        this.targetSocketId = targetSocketId;
        this.iceCandidate = iceCandidate;
    }
}
