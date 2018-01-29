import {JsonProperty} from "json-typescript-mapper";
import { JsonSerializable } from "./JsonSerializable";

export class SessionDescription extends JsonSerializable {
    static signal = "sessionDescription";

    @JsonProperty("sessionDescription")
    sessionDescription: string;

    constructor(sessionDescription: string) {
        super();
        this.sessionDescription = sessionDescription;
    }
}
