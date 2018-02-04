import {JsonProperty} from "json-typescript-mapper";

export class SessionDescription {
    static signal = "sessionDescription";

    @JsonProperty("sessionDescription")
    sessionDescription: string;
}
