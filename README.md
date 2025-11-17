# Agendamento Corporativo – TZ Engenharia

Aplicação full-stack para gerenciamento de pré-reservas de atendimento técnico. O fluxo combina um backend em Node.js/Express (persistência em arquivo JSON + uploads locais) e um frontend em React que valida o formulário, orquestra autenticação Google em popup e acompanha o envio de materiais.

## Tecnologias principais

- **Backend:** Node.js 22+, Express, Multer, Day.js, async-mutex e fs-extra.
- **Frontend:** React 18 (CRA), Axios, Styled Components e Google Identity Services.
- **Persistência:** Arquivo `backend/data/agendamentos.json` + diretório `backend/uploads/` (ignorado no Git).

## Funcionalidades em destaque

- Login obrigatório via Google após preencher o formulário; a pré-reserva é enviada automaticamente assim que o usuário conclui o popup.
- Datas e horários pré-definidos com bloqueio otimista e expiração automática em 24h.
- Formulário validado em tempo real, incluindo máscara básica de telefone e limite de caracteres adicionais.
- Upload único (PDF ou imagem de até 4 MB) vinculado ao agendamento, com registro do tipo e tamanho do arquivo.
- API REST simples (`/api/dates`, `/api/slots`, `/api/reservations`, `/api/reservations/:id/upload`) com tratamento para conflitos, expirados e anexos inválidos.

## Estrutura do projeto

```
backend/
  data/agendamentos.json
  server.js
  uploads/               # armazenado localmente; ignorado no Git
frontend/
  public/
  src/
    api.js
    components/
    App.js
checklist.md
validacoes.md
```

## Pré-requisitos

- Node.js **>= 22** e npm **>= 11** (engines definidas nos `package.json`).
- Conta Google com autorização para criar credenciais OAuth/Web (para o Client ID).
- Python 3.11+ apenas se optar pelo deploy estático exemplo via Flask (opcional).

## Configuração rápida

1. **Instale dependências**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
2. **Variáveis de ambiente do frontend**
   Crie `frontend/.env` (ou `.env.local`) com:
   ```ini
   REACT_APP_GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
   REACT_APP_API_URL=http://localhost:4000
   ```
   - `REACT_APP_GOOGLE_CLIENT_ID`: obtido no [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (OAuth Client ID → App da Web, com `http://localhost:3000` em *Authorized JavaScript origins*).
   - `REACT_APP_API_URL`: URL pública do backend. Pode ser omitida em desenvolvimento (padrão `http://localhost:4000`).

3. **Execute os servidores**
   ```bash
   # terminal 1
   cd backend
   npm start            # Porta padrão: 4000

   # terminal 2
   cd frontend
   npm start            # Porta padrão: 3000
   ```

4. **Fluxo**
   - Acesse `http://localhost:3000`, escolha data e horário, complete o formulário e clique em “Salvar pré-reserva”. O popup do Google será exibido; ao autorizar, a reserva é enviada.
   - Envie o material através da etapa de upload. Os arquivos ficam em `backend/uploads/` e o registro do agendamento é atualizado no JSON.

### Scripts úteis

| Local      | Script         | Ação                                                                 |
| ---------- | -------------- | -------------------------------------------------------------------- |
| backend    | `npm start`    | Inicia o servidor Express em modo produção.                          |
| frontend   | `npm start`    | CRA em modo desenvolvimento (hot reload).                            |
| frontend   | `npm run build`| Gera o bundle estático (para deploy).                                |
| frontend   | `npm test`     | Executa testes padrão do CRA (se houver).                            |

## Endpoints expostos

| Método | Rota                               | Descrição                                                                 |
| ------ | ---------------------------------- | ------------------------------------------------------------------------- |
| GET    | `/api/dates`                       | Lista os próximos 10 dias úteis para agendamento.                         |
| GET    | `/api/slots?date=YYYY-MM-DD`       | Retorna cada horário com flag `available` para a data informada.          |
| POST   | `/api/reservations`                | Cria pré-reserva (validação de campos obrigatórios e conflito de slots).  |
| POST   | `/api/reservations/:id/upload`     | Faz upload único (`arquivo`) e marca o agendamento como `reservado`.      |
| GET    | `/uploads/:filename`               | Serve os arquivos armazenados (apenas localmente).                        |

> **Obs.:** O backend atual persiste em arquivo e utiliza um `Mutex` para evitar condições de corrida; para produção recomenda-se mover persistência/arquivos para serviços dedicados (banco + storage).

## Deploy estático do frontend (opcional)

1. Gere `npm run build` dentro de `frontend/`.
2. Sirva o diretório `build/` via o servidor de sua preferência (NGINX, Vercel, S3, etc.). Para testes rápidos, utilize o snippet Flask oferecido anteriormente:
   ```python
   from flask import Flask, send_from_directory

   app = Flask(__name__, static_folder='build', static_url_path='')

   @app.route('/')
   def root():
       return send_from_directory(app.static_folder, 'index.html')

   @app.route('/<path:path>')
   def assets(path):
       return send_from_directory(app.static_folder, path)

   if __name__ == '__main__':
       app.run(host='0.0.0.0', port=8080)
   ```
3. Atualize `REACT_APP_API_URL` com a URL pública do backend antes de rebuildar.

## Documentação complementar

- `checklist.md`: macro-itens que todo release precisa validar antes de disponibilizar aos clientes.
- `validacoes.md`: histórico das execuções manuais recentes (fluxos de reserva, upload, mensagens de erro, etc.).

Mantenha ambos atualizados a cada melhoria relevante para preservar o rastro de qualidade e facilitar handoff entre times.
