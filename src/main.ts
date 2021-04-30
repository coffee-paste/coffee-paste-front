import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import ToastService from 'primevue/toastservice';

import PrimeVue from 'primevue/config';
import Dialog from 'primevue/dialog';
import Editor from 'primevue/editor';
import Card from 'primevue/card';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';
import ConfirmationService from 'primevue/confirmationservice';


import 'primevue/resources/themes/vela-purple/theme.css';
import 'primevue/resources/primevue.min.css';
import 'primeicons/primeicons.css';

const app = createApp(App);

app.use(PrimeVue);
app.use(router);
app.use(ToastService);
app.use(ConfirmationService);

app.component('Toast', Toast);
app.component('Dialog', Dialog);
app.component('Editor', Editor);
app.component('Card', Card);
app.component('Button', Button);
app.component('ProgressSpinner', ProgressSpinner);

app.mount("#app");
