# Checklist de Release / QA – Agendamento

Use este checklist sempre que aplicar correções ou preparar uma nova versão do fluxo de pré-reserva.

## 1. Preparação do ambiente
- [ ] Backend instalado com Node 22+ e `npm start` respondendo em `http://localhost:4000`.
- [ ] Frontend com `.env` atualizado (`REACT_APP_GOOGLE_CLIENT_ID` e `REACT_APP_API_URL`) e `npm start` sem warnings críticos.
- [ ] Pasta `backend/uploads/` mantida fora do Git e limpa após cada rodada de testes manuais.
- [ ] Arquivo `backend/data/agendamentos.json` restaurado para o estado base (sem reservas antigas) antes dos testes.

## 2. Fluxo de pré-reserva
- [ ] Datas e horários carregam corretamente; selecionar data sem horários exibe feedback “Não há horários disponíveis”.
- [ ] Clique em “Salvar pré-reserva” sem login abre o modal e o popup do Google; após autenticar, o POST é disparado automaticamente.
- [ ] Validações negativas: campos obrigatórios, e-mail inválido e telefone <10 dígitos exibem mensagens no bloco de erros.
- [ ] Reserva confirmada apresenta alerta “Pré-reserva confirmada…” com horário e expiração formatados para `pt-BR`.

## 3. Upload e pós-reserva
- [ ] Upload aceita apenas PDF/JPEG/PNG/WEBP até 4 MB e retorna mensagem de erro para formatos diferentes.
- [ ] Após upload válido, status muda para “Upload concluído com sucesso” e o arquivo fica gravado em `backend/uploads/`.
- [ ] Endpoint `/api/slots` volta a mostrar o horário como indisponível enquanto status ≠ `cancelado`.
- [ ] Confirmar via `agendamentos.json` que o registro tem `status: "reservado"` e os campos `upload_arquivo` preenchidos.

## 4. Resiliência / regressões rápidas
- [ ] Executar duas reservas simultâneas para o mesmo horário → segunda requisição deve retornar HTTP 409.
- [ ] Alterar o relógio (ou editar `expira_em`) para simular expiração e validar que o slot libera novamente após reload.
- [ ] Garantir que o botão “Encerrar” limpa formulário, feedbacks e fecha o modal (se aberto).

Registre cada execução em `validacoes.md` com data, ambiente e observações relevantes.
