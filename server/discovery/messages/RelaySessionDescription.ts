import {JsonProperty} from "json-typescript-mapper";
import { JsonSerializable } from "./JsonSerializable";

export class RelaySessionDescription extends JsonSerializable {
    static signal = "relaySessionDescription";

    @JsonProperty("targetSocketId")
    targetSocketId: string;

    @JsonProperty("sessionDescription")
    sessionDescription: string;
}
