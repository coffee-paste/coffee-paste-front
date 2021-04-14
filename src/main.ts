import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

import PrimeVue from 'primevue/config';
import Dialog from 'primevue/dialog';
import Editor from 'primevue/editor';
const app = createApp(App);

app.use(PrimeVue);
app.use(router);

app.component('Dialog', Dialog);
app.component('Editor', Editor);

app.mount("#app");
