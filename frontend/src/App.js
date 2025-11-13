import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from './api';
import {
  Page,
  TitleBlock,
  Panel,
  Section,
  Button,
  ChipGroup,
  Chip,
  Feedback
} from './components/Layout';
import GoogleAuth from './components/GoogleAuth';
import DateSelector from './components/DateSelector';
import FormFields from './components/FormFields';
import UploadArea from './components/UploadArea';

const App = () => {
  const [user, setUser] = useState(null);
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [formData, setFormData] = useState({
    shopping: '',
    nome_fantasia: '',
    nome_contato: '',
    telefone_whatsapp: '',
    email: '',
    informacoes_adicionais: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [reservation, setReservation] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [uploadState, setUploadState] = useState({ loading: false, status: null });

  const resetForm = useCallback(() => {
    setSelectedDate('');
    setSelectedSlot('');
    setFormData({
      shopping: '',
      nome_fantasia: '',
      nome_contato: '',
      telefone_whatsapp: '',
      email: user?.email || '',
      informacoes_adicionais: ''
    });
    setFormErrors({});
    setFeedback(null);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    api.get('/api/dates')
      .then(({ data }) => setDates(data.dates))
      .catch(() => setFeedback({ type: 'error', message: 'Erro ao carregar datas disponíveis.' }));
  }, [user]);

  useEffect(() => {
    if (selectedDate) {
      setLoadingSlots(true);
      api.get('/api/slots', { params: { date: selectedDate } })
        .then(({ data }) => setSlots(data.availableSlots))
        .catch(() => setFeedback({ type: 'error', message: 'Não foi possível carregar os horários para a data selecionada.' }))
        .finally(() => setLoadingSlots(false));
    } else {
      setSlots([]);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({ ...prev, email: user.email }));
    }
  }, [user]);

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validators = useMemo(() => ({
    email: (value) => /\S+@\S+\.\S+/.test(value),
    telefone_whatsapp: (value) => value.replace(/\D/g, '').length >= 10
  }), []);

  const formIsValid = useMemo(() => {
    const requiredFields = ['shopping', 'nome_fantasia', 'nome_contato', 'telefone_whatsapp', 'email'];
    const newErrors = {};

    requiredFields.forEach((field) => {
      if (!formData[field]?.trim()) {
        newErrors[field] = 'Preencha todos os campos obrigatórios.';
      }
    });

    if (formData.email && !validators.email(formData.email)) {
      newErrors.email = 'Informe um e-mail válido.';
    }

    if (formData.telefone_whatsapp && !validators.telefone_whatsapp(formData.telefone_whatsapp)) {
      newErrors.telefone_whatsapp = 'Informe um WhatsApp válido (mín. 10 dígitos).';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0 && selectedSlot && selectedDate;
  }, [formData, selectedSlot, selectedDate, validators]);

  const createReservation = async () => {
    if (!formIsValid) return;

    try {
      const payload = {
        ...formData,
        data: selectedDate,
        horario: selectedSlot
      };
      const { data } = await api.post('/api/reservations', payload);
      setReservation(data.reservation);
      setFeedback({
        type: 'success',
        message: 'Pré-reserva realizada! O horário ficará reservado por 24h para envio do material.'
      });
      resetForm();
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao salvar a pré-reserva.';
      setFeedback({ type: 'error', message });
    }
  };

  const handleUpload = async (file) => {
    if (!reservation) return;
    const formDataUpload = new FormData();
    formDataUpload.append('arquivo', file);

    setUploadState({ loading: true, status: null });

    try {
      const { data } = await api.post(`/api/reservations/${reservation.id}/upload`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadState({
        loading: false,
        status: { type: 'success', message: `${data.message} A confirmação final será enviada via WhatsApp.` }
      });
    } catch (error) {
      const message = error.response?.data?.message || 'Falha ao fazer upload. Verifique o arquivo e tente novamente.';
      setUploadState({
        loading: false,
        status: { type: 'error', message }
      });
    }
  };

  const handleLogout = () => {
    setUser(null);
    setReservation(null);
    resetForm();
    setFeedback(null);
    setUploadState({ loading: false, status: null });
  };

  return (
    <Page>
      <TitleBlock>
        <span className="tagline">Atendimento Personalizado</span>
        <h1>Agende seu horário</h1>
        <p>
          Escolha a data, confirme a pré-reserva e envie o material de apoio.
          O horário fica bloqueado por 24h aguardando a confirmação.
        </p>
        {user && (
          <Feedback type="success">
            Sessão ativa como <strong>{user.email}</strong>
            <br />
            <Button variant="secondary" onClick={handleLogout} style={{ marginTop: '12px' }}>
              Encerrar sessão
            </Button>
          </Feedback>
        )}
      </TitleBlock>

      <Panel>
        {!user && <GoogleAuth onLogin={setUser} />}

        {user && !reservation && (
          <>
            <DateSelector
              dates={dates}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
            />

            <Section>
              <h2>Horários disponíveis</h2>
              {loadingSlots ? (
                <p>Carregando horários...</p>
              ) : (
                <ChipGroup>
                  {slots.map((slot) => (
                    <Chip
                      key={slot}
                      active={selectedSlot === slot}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {slot}
                    </Chip>
                  ))}
                  {selectedDate && slots.length === 0 && (
                    <Feedback type="error">
                      Não há horários disponíveis nesta data.
                    </Feedback>
                  )}
                </ChipGroup>
              )}
            </Section>

            <FormFields
              formData={formData}
              onChange={handleFormChange}
              errors={formErrors}
            />

            {feedback && (
              <Feedback type={feedback.type}>{feedback.message}</Feedback>
            )}

            <Button disabled={!formIsValid} onClick={createReservation}>
              Salvar pré-reserva
            </Button>
          </>
        )}

        {reservation && (
          <>
            <Feedback type="success">
              Pré-reserva registrada para {reservation.data} às {reservation.horario}.
              <br />
              O horário permanece reservado até {new Date(reservation.expira_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.
            </Feedback>

            <UploadArea
              onUpload={handleUpload}
              loading={uploadState.loading}
              status={uploadState.status}
            />

            <Button onClick={() => setReservation(null)} variant="secondary">
              Voltar à tela inicial
            </Button>
          </>
        )}
      </Panel>
    </Page>
  );
};

export default App;
