import { JsonProperty } from "json-typescript-mapper";

export class RelaySessionDescription {
    static signal = "relaySessionDescription";

    @JsonProperty("targetSocketId")
    targetSocketId: string;

    @JsonProperty("sessionDescription")
    sessionDescription: string;

    constructor() {
        this.targetSocketId = undefined;
        this.sessionDescription = undefined;
    }
}
