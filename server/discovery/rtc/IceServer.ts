export class IceServer implements RTCIceServer {
    urls: string[];

    constructor(urls: string[]) {
        this.urls = urls;
    }
}
