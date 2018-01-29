import {JsonProperty} from "json-typescript-mapper";
import { JsonSerializable } from "./JsonSerializable";

export class IceCandidate extends JsonSerializable {
    static signal = "iceCandidate";

    @JsonProperty("iceCandidate")
    iceCandidate: string;

    constructor(iceCandidate: string) {
        super();
        this.iceCandidate = iceCandidate;
    }
}
