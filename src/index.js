import './css/style.css';
import App from './js/App';

const apiUrl = document.body.dataset.apiUrl || 'http://localhost:7070';

const app = new App(apiUrl);
app.init();
