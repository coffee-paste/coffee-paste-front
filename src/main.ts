import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

import PrimeVue from 'primevue/config';
import Dialog from 'primevue/dialog';
import Editor from 'primevue/editor';
import Card from 'primevue/card';
import Button from 'primevue/button';


import 'primevue/resources/themes/saga-blue/theme.css';
import 'primevue/resources/primevue.min.css';
import 'primeicons/primeicons.css';

const app = createApp(App);

app.use(PrimeVue);
app.use(router);

app.component('Dialog', Dialog);
app.component('Editor', Editor);
app.component('Card', Card);
app.component('Button', Button);

app.mount("#app");
