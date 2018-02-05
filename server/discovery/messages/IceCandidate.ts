export class IceCandidate  {
    static signal = "icecandidate";

    iceCandidate: string;

    constructor(iceCandidate: string) {
        this.iceCandidate = iceCandidate;
    }
}
