# Validações Realizadas

- Backend: Após implementar criação de reservas e upload, requisições `POST /api/reservations` e `/api/reservations/:id/upload` foram testadas com dados fictícios via cliente HTTP local, garantindo bloqueio de horário duplicado e atualização de status para `reservado`.
- Frontend: Verificado no navegador que o botão "Salvar pré-reserva" permanece desabilitado até preencher campos obrigatórios e que mensagens de sucesso/erro aparecem corretamente após simular upload.
