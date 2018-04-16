export class RelayIceCandidate {
    static signal = "relayIceCandidate";

    socketId: string;
    iceCandidate: RTCIceCandidate;

    constructor(socketId: string, iceCandidate: RTCIceCandidate) {
        this.socketId = socketId;
        this.iceCandidate = iceCandidate;
    }
}
