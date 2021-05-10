import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import ToastService from 'primevue/toastservice';
import { getLocalStorageItem, LocalStorageKey } from "./infrastructure/local-storage";

import PrimeVue from 'primevue/config';
import Dialog from 'primevue/dialog';
import Editor from 'primevue/editor';
import Card from 'primevue/card';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import SelectButton from 'primevue/selectbutton';
import Toast from 'primevue/toast';
import CascadeSelect from 'primevue/cascadeselect';
import Avatar from 'primevue/avatar';
import Tooltip from 'primevue/tooltip';
import ConfirmationService from 'primevue/confirmationservice';
import Menubar from 'primevue/menubar';

// Import theme CSS based 
(async () => {
    const theme = getLocalStorageItem<string>(LocalStorageKey.Theme, { itemType : 'string' });
    await import(`primevue/resources/themes/${theme ||'md-light-indigo'}/theme.css`);
})();

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
app.component('SelectButton', SelectButton);
app.component('CascadeSelect', CascadeSelect);
app.component('Avatar', Avatar);
app.component('Menubar', Menubar);

app.directive('tooltip', Tooltip);

app.mount("#app");
