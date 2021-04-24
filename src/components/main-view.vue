<template>
  <div class="main-view">
    <MainViewToolbar />
    <NoteTabs :key="lastNoteFeedUpdate" :notes="notes" @noteChanged="onNoteChanged" @newNote="onNewNote" />
    <div class="status-container">
      CHANNEL STATUS: <strong>{{ status }}</strong> <br />
      MSG STATUS: <strong>{{ msgStatus }}</strong>
    </div>
  </div>
</template>

<script lang="ts">
import { NotesApi } from "@/infrafstructure/api-client";
import { defineComponent } from "vue";
import { NoteTabs } from "./tabs/note-tabs.vue";
import { INoteChangedEventArgs, INoteTab } from "./tabs/tab-interfaces";
import { credentialsManager } from "../infrafstructure/session-management/credential-manager";
import { MainViewToolbar } from "./toolbar/main-view-toolbar.vue";
import { NotesSocket } from "../infrafstructure/notes-socket";

let ws: WebSocket;

export default defineComponent({
  components: { NoteTabs, MainViewToolbar },
  created() {
    this.load();
  },
  data() {
    return {
      status: "UNKNOWN",
      msgStatus: "UNKNOWN",
      notes: [] as INoteTab[],
      lastNoteFeedUpdate: `${new Date().getTime()}`,
    };
  },
  methods: {
    async load() {
      this.status = "LOADING";

      try {
        console.log(`Fetching open notes...`);
        this.notes = (await new NotesApi({
          apiKey: credentialsManager.getToken(),
        }).getOpenNotes()) as INoteTab[];
        console.log(`Done! Content: ${JSON.stringify(this.notes)}`);

        if (this.notes?.length > 0 !== true) {
          this.status = "NO NOTES FOUND";
          // TODO add toast, and create a one
          return;
        }
        this.lastNoteFeedUpdate = `${new Date().getTime()}`;

        ws = new NotesSocket();

        ws.onopen = () => {
          this.status = "OPEN";
        };

        ws.onerror = () => {
          this.status = "ERROR";
        };

        ws.onclose = () => {
          this.status = "CLOSE";
          this.load();
        };

        ws.onmessage = (msg) => {
          const { noteId, contentHTML } = JSON.parse(msg.data);
          console.log(`Incoming message:  ${JSON.stringify(msg.data)}`);
          this.lastNoteFeedUpdate = `${new Date().getTime()}`;
          this.msgStatus = `RECIVED AT ${new Date().toString()}`;
          const changedNote = this.notes.find((n) => n.id === noteId);

          if (!changedNote) {
            this.notes.push({
              contentHTML,
              id: noteId,
              name: "", // TODO add this prop to the message
              lastNoteFeedUpdate: `${new Date().getTime()}`,
            });
            return;
          }

          changedNote.contentHTML = contentHTML;
          changedNote.lastNoteFeedUpdate = `${new Date().getTime()}`;
        };
      } catch (error) {
        this.status = "ERROR FETCH WORKSPACE";
        console.log(error);
      }
    },
    onNoteChanged(e: INoteChangedEventArgs): void {
      console.log(`Note changed: ${JSON.stringify(e)}`);
      if (!ws) {
        console.error("No websocket open, cannot send update");
        return;
      }
      ws.send(
        JSON.stringify({
          noteId: e.noteId,
          contentHTML: e.contentHTML,
          contentText: e.contentText,
        })
      );
      this.msgStatus = `SENT AT ${new Date().toString()}`;
    },
    async onNewNote(): Promise<void> {
      console.log("Creating new note...");
      const newNoteId = await new NotesApi({
        apiKey: credentialsManager.getToken(),
      }).createNotes();
      this.notes.push({ id: newNoteId });
    },
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">
.main-view {
  // Fix new line issue https://github.com/quilljs/quill/issues/1074
  * {
    margin: 0;
  }
  .status-container {
    margin-top: 1em;
  }
}
</style>
