import { JsonProperty } from "json-typescript-mapper";

export class SessionDescription {
    static signal = "sessionDescription";

    @JsonProperty("type")
    type: string;

    @JsonProperty("sdp")
    sdp: string;

    constructor() {
        this.type = undefined;
        this.sdp = undefined;
    }
}
