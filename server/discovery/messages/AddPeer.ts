import {JsonProperty } from "json-typescript-mapper";

export class AddPeer {
    static signal = "addPeer";

    @JsonProperty("id")
    id: string;

    @JsonProperty("createOffer")
    createOffer: boolean;
}
