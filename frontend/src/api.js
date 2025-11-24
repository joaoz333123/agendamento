import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:4000',
  // Render pode demorar alguns segundos para “acordar” a API; aumentamos o timeout
  // para evitar que o salvamento automático do checklist falhe por lentidão inicial.
  timeout: 20000
});

export default api;
