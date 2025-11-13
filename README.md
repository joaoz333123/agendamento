# Sistema de Agendamento com Pré-Reserva

Este repositório contém uma solução full-stack composta por um backend em Node.js/Express e um frontend em React, permitindo a pré-reserva de horários com autenticação Google e upload de material.

## Estrutura

```
backend/
frontend/
checklist.md
```

## Executando Localmente

### Backend
1. Instale as dependências:
   ```bash
   cd backend
   npm install
   ```
2. Inicie o servidor:
   ```bash
   npm start
   ```
3. API disponível em `http://localhost:4000`.

### Frontend
1. Instale as dependências:
   ```bash
   cd frontend
   npm install
   ```
2. Defina `REACT_APP_GOOGLE_CLIENT_ID` em um arquivo `.env` (opcional) para o login Google.
3. Execute o aplicativo:
   ```bash
   npm start
   ```
4. Interface disponível em `http://localhost:3000`.

### Deploy Estático com Flask (Python 3.11)
1. Gere o build do frontend:
   ```bash
   cd frontend
   npm run build
   ```
2. Instale o Flask:
   ```bash
   pip install flask
   ```
3. Utilize o arquivo `app.py` abaixo dentro da pasta `frontend`:
   ```python
   from flask import Flask, send_from_directory
   app = Flask(__name__, static_folder='build')

   @app.route('/')
   def serve_root():
       return send_from_directory(app.static_folder, 'index.html')

   @app.route('/<path:path>')
   def serve_file(path):
       return send_from_directory(app.static_folder, path)

   if __name__ == '__main__':
       app.run(host='0.0.0.0', port=8080)
   ```
4. Execute `python app.py` para servir o build estático.

## Validações
Consulte `validacoes.md` para um registro das principais verificações executadas após ajustes relevantes.
