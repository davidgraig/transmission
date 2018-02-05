import { SessionDescriptionType } from "./SessionDescriptionType";

export class SessionDescription {
    static signal = "sessionDescription";

    senderSocketId: string;
    type: SessionDescriptionType;
    sdp: string;

    constructor(sender: string, type: SessionDescriptionType, sdp: string) {
        this.senderSocketId = sender;
        this.type = type;
        this.sdp = sdp;
    }
}
