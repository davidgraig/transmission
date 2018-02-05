import { JsonProperty } from "json-typescript-mapper";

export class IceCandidate  {
    static signal = "icecandidate";

    @JsonProperty("iceCandidate")
    iceCandidate: string;

    constructor() {
        this.iceCandidate = null;
    }
}
