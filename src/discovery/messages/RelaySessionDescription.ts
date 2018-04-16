import { SessionDescriptionType } from "./SessionDescriptionType";

export class RelaySessionDescription {
    static signal = "relaySessionDescription";

    socketId: string;
    description: RTCSessionDescription;

    constructor(socketId: string, description: RTCSessionDescription) {
        this.socketId = socketId;
        this.description = description;
    }
}
