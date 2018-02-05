import { SessionDescriptionType } from "./SessionDescriptionType";

export class RelaySessionDescription {
    static signal = "relaySessionDescription";

    targetSocketId: string;
    type: SessionDescriptionType;
    sdp: string;

    constructor(targetSocketId: string, type: SessionDescriptionType, sdp: string) {
        this.targetSocketId = targetSocketId;
        this.type = type;
        this.sdp = sdp;
    }
}
