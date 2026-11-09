import { createApp } from 'vue'
import 'katex/dist/katex.min.css'
import App from './App.vue'

// Uwaga: celowo bez './assets/main.css' z szablonu create-vue,
// bo jego układ dwukolumnowy na szerokich ekranach rozwala stronę.
createApp(App).mount('#app')
