import { serialize } from "json-typescript-mapper";

export class JsonSerializable {
    toJsonString(): string {
        return serialize(this);
    }
}
