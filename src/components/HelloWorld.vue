<template>
  <div class="hello">
    <!-- <Editor v-model="content" toolbar="full" placeholder="Take a coffee and start pasting..." editorStyle="height: 320px"/> -->
    <Editor
      :key="lastFeedUpdate"
      v-model="contentHTML"
      toolbar="full"
      @text-change="onchange"
      placeholder="Take a coffee and start pasting..."
      editorStyle="height: 80vh"
    />
    CHANNEL STATUS: <strong>{{ status }}</strong> <br />
    MSG STATUS: <strong>{{ msgStatus }}</strong>
  </div>
</template>

<script lang="js">
// import { Options, Vue } from "vue-class-component";
// @Options({
//   props: {
//     msg: String,
//   },
//   methods: {
//     onchange: (e: { htmlValue: string; textValue: string }) => {},
//   },
// })

let ws;
export default {
  // msg!: string;
  // content!: string;
  name: "HelloWorld",
  created() {
    this.load();
  },
  data() {
    return {
      status: "unknwon",
      msgStatus: "unknwon",
      lastFeedUpdate: `${new Date().getTime()}`,
      noteId: "",
      contentHTML: "",
      contentText: "",
    };
  },
  methods: {
    async load() {
      const { VUE_APP_API_URL } = process.env;

      const token = localStorage.getItem("token");

      if (!token) {
        return;
      }

      const o = {
        method: "get",
        headers: {
          authentication: token,
        },
      };

      try {
        const response = await fetch(`${VUE_APP_API_URL}/notes/workspace`, o);

        const workspace = (await response.json());

        if (workspace.length < 1) {
          return;
        }

        this.noteId = workspace[0].id;
        this.contentHTML = workspace[0].contentHTML;
        ws = new WebSocket(
          `${VUE_APP_API_URL.replace(
            "http",
            "ws"
          )}/notes?authentication=${token}`
        );

        ws.onopen = () => {
          this.status = "OPEN";
        }

        ws.onerror = () => {
          this.status = "ERROR";
        }

        ws.onclose = () => {
          this.status = "CLOSE";
        }
        ws.onmessage = (msg) => {
          const data = JSON.parse(msg.data);
          this.contentHTML = data.contentHTML;
          this.lastFeedUpdate = `${new Date().getTime()}`;

          this.msgStatus = `RECIVED AT ${new Date().toString()}`
        };
      } catch (error) {
        console.log(error);
      }
    },
    onchange(e) {
      const f = this.noteId;
      // console.log(y.noteId);
      // y.noteId = '888';
      if (ws) {
        ws.send(
          JSON.stringify({
            noteId: this.noteId,
            contentHTML: e.htmlValue,
            contentText: e.textValue,
          })
        );
        this.msgStatus = `SENT AT ${new Date().toString()}`
      }
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>
