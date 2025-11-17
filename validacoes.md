# Registro de Validações Manuais

Documenta os principais testes exploratórios executados após alterações relevantes. Use o mesmo formato para novos ciclos.

## 17/11/2025 – Fluxo completo com Google Login
- **Ambiente:** Dev local (`backend` em `http://localhost:4000`, `frontend` em `http://localhost:3000`, Node 22.11).
- **Objetivo:** Garantir que o login só é solicitado ao salvar e que a reserva é disparada automaticamente depois do popup.
- **Passos:**
  1. Selecionar data “2025-11-20” e horário “13:00”.
  2. Preencher todos os campos obrigatórios (telefone com DDD + número >10 dígitos).
  3. Clicar em “Salvar pré-reserva” sem estar logado → modal aparece, popup do Google aberto, autenticação concluída.
  4. Observar mensagem de sucesso e JSON gravado em `backend/data/agendamentos.json`.
- **Resultado:** ✅ Reserva criada (`status: "aguardando_upload"`), botão muda para etapa de upload, `selectedSlot` limpado ao encerrar sessão.

## 17/11/2025 – Upload e regras de negócio
- **Ambiente:** Mesmo acima.
- **Objetivo:** Validar upload, bloqueio de horário e erros esperados.
- **Passos:**
  1. Após reserva ativa, tentar enviar `.txt` → mensagem “Formato inválido” retornada pelo backend.
  2. Enviar PNG de ~2 MB → resposta 200 e toast “Upload concluído com sucesso”.
  3. Checar `agendamentos.json`: status alterado para `reservado`, `upload_arquivo.url` preenchido, `tamanho_mb` arredondado.
  4. Requisitar novamente `GET /api/slots?date=<data>` → horário aparece com `available: false`.
  5. Duplicar reserva para mesmo horário → servidor responde 409.
- **Resultado:** ✅ Regras confirmadas; mutex impede corrida e arquivos são descartados quando requisição falha.

## Observações gerais
- Todas as execuções foram feitas com o diretório `backend/uploads/` limpo e fora do Git.
- Após cada rodada, horários de teste foram manualmente expirados (edição do campo `expira_em`) para confirmar desbloqueio automático.
