import { envFacade } from "./env-facade";
import { credentialsManager } from "./session-management/credential-manager";

export class NotesSocket extends WebSocket {

    public constructor() {
        super(`${envFacade.apiUrl.replace("http", "ws")}/notes?authentication=${credentialsManager.getToken()}`)
    }
}