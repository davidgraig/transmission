import {JsonProperty} from "json-typescript-mapper";

export class IceCandidate  {
    static signal = "iceCandidate";

    @JsonProperty("iceCandidate")
    iceCandidate: string;
}
