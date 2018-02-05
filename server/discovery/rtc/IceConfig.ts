
export class IceConfig implements RTCConfiguration {
    iceServers: RTCIceServer[];

    constructor(iceServers: RTCIceServer[]) {
        this.iceServers = iceServers;
    }
}
