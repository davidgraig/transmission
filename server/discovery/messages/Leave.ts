import {JsonProperty} from "json-typescript-mapper";
import { JsonSerializable } from "./JsonSerializable";

export class Leave extends JsonSerializable {
    static signal = "leave";

    @JsonProperty("channel")
    channel: string;
}
