import {JsonProperty } from "json-typescript-mapper";
import { JsonSerializable } from "./JsonSerializable";

export class RemovePeer extends JsonSerializable {
    static signal = "remove-peer";

    @JsonProperty("peerId")
    peerId: string;

    constructor(peerId: string) {
        super();
        this.peerId = peerId;
    }
}
