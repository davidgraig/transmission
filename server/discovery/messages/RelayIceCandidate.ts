import {JsonProperty} from "json-typescript-mapper";
import { IceCandidate } from "./IceCandidate";

export class RelayIceCandidate {
    static signal = "relayIceCandidate";

    @JsonProperty("targetSocketId")
    targetSocketId: string;

    @JsonProperty("iceCandidate")
    iceCandidate: string;
}
