import {JsonProperty } from "json-typescript-mapper";

export class RemovePeer {
    static signal = "removePeer";

    @JsonProperty("peerId")
    peerId: string;
}
