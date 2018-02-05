import { JsonProperty } from "json-typescript-mapper";

export class Leave {
    static signal = "leave";

    @JsonProperty("channel")
    channel: string;

    constructor() {
        this.channel = undefined;
    }
}
