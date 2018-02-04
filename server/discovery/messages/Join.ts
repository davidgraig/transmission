import {JsonProperty} from "json-typescript-mapper";

export class Join {
    static signal = "join";

    @JsonProperty("channel")
    channel: string;
}
