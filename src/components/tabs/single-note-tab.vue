<template>
  <Editor
    :key="lastNoteUpdate"
    v-model="contentHTML"
    toolbar="full"
    @text-change="onChange"
    placeholder="Take a coffee and start pasting..."
    editorStyle="height: 77vh"
  >
    <template #toolbar>
      <span class="ql-formats">
        <select class="ql-font"></select>
        <select class="ql-size"></select>
      </span>
      <span class="ql-formats">
        <button class="ql-bold"></button>
        <button class="ql-italic"></button>
        <button class="ql-underline"></button>
        <button class="ql-strike"></button>
      </span>
      <span class="ql-formats">
        <select class="ql-color"></select>
        <select class="ql-background"></select>
      </span>
      <span class="ql-formats">
        <button class="ql-script" value="sub"></button>
        <button class="ql-script" value="super"></button>
      </span>
      <span class="ql-formats">
        <button class="ql-header" value="1"></button>
        <button class="ql-header" value="2"></button>
        <button class="ql-blockquote"></button>
        <button class="ql-code-block"></button>
      </span>
      <span class="ql-formats">
        <button class="ql-list" value="ordered"></button>
        <button class="ql-list" value="bullet"></button>
        <button class="ql-indent" value="-1"></button>
        <button class="ql-indent" value="+1"></button>
      </span>
      <span class="ql-formats">
        <button class="ql-direction" value="rtl"></button>
        <select class="ql-align"></select>
      </span>
      <span class="ql-formats">
        <button class="ql-link"></button>
        <button class="ql-image"></button>
        <button class="ql-video"></button>
        <!-- Formula dosn't work proprly  -->
        <!-- <button class="ql-formula"></button> -->
      </span>
      <span class="ql-formats">
        <button class="ql-clean"></button>
      </span>
    </template>
  </Editor>
</template>


<script lang='ts'>
import { INoteChangedEventArgs } from "./tab-interfaces";
import { defineComponent } from "vue";

const NoteTabComponent = defineComponent({
  emits: {
    noteChanged: (e: INoteChangedEventArgs) => !!e.noteId,
  },
  props: {
    id: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: false,
    },
    lastNoteFeedUpdate: {
      type: String,
      required: false,
    },
  },
  data() {
    return {
      contentHTML: this.content,
      lastNoteInternalUpdate: `${new Date().getTime()}`,
    };
  },
  computed : {
      lastNoteUpdate(): string {
          return `${this.lastNoteInternalUpdate}:${this.lastNoteFeedUpdate}`;
      }
  },
  methods: {
    onChange(e: { htmlValue: string; textValue: string }): void {
      this.$emit("noteChanged", {
        noteId: this.id,
        contentHTML: e.htmlValue,
        contentText: e.textValue,
      });
    },
  },
});

export const NoteTab = NoteTabComponent;
export default NoteTab;
</script>


<style lang="scss">
</style>