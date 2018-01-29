import {JsonProperty} from "json-typescript-mapper";
import { JsonSerializable } from "./JsonSerializable";

export class Join extends JsonSerializable {
    static signal = "join";

    @JsonProperty("channel")
    channel: string;
}
