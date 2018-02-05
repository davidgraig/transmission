import { JsonProperty } from "json-typescript-mapper";
import { SessionDescription } from "./SessionDescription";

export class RelaySessionDescription {
    static signal = "relaySessionDescription";

    @JsonProperty("targetSocketId")
    targetSocketId: string;

    @JsonProperty({clazz: SessionDescription})
    sessionDescription: SessionDescription;

    constructor() {
        this.targetSocketId = undefined;
        this.sessionDescription = undefined;
    }
}
