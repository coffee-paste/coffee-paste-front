import { envFacade } from "./env-facade";

export class NotesSocket extends WebSocket {

    public constructor(channelKey: string) {
        super(`${envFacade.apiUrl.replace("http", "ws")}/notes?channelKey=${channelKey}`)
    }
}