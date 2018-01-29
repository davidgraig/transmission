import {JsonProperty} from "json-typescript-mapper";
import { JsonSerializable } from "./JsonSerializable";

export class RelayIceCandidate extends JsonSerializable {
    static signal = "relayIceCandidate";

    @JsonProperty("targetSocketId")
    targetSocketId: string;

    @JsonProperty("iceCandidate")
    iceCandidate: string;
}
