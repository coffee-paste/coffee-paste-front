<template>
  <div class="hello">
    <!-- <Editor v-model="content" toolbar="full" placeholder="Take a coffee and start pasting..." editorStyle="height: 320px"/> -->
    <Editor v-model="content" toolbar="full" @text-change="onchange"  placeholder="Take a coffee and start pasting..." editorStyle="height: 80vh"/>
    {{ content }}
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";

@Options({
  props: {
    msg: String,
  },
  methods: {
    onchange : (e : { htmlValue: string, textValue: string }) => { }
  }
})
export default class HelloWorld extends Vue {
  msg!: string;
  content!: string;

  data() {
    return {
      content : ''
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">

</style>
