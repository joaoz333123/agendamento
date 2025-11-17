import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
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

const HeroCTA = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ContactGrid = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`;

const ContactCard = styled.div`
  flex: 1;
  min-width: 180px;
  background: #fff;
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  strong {
    color: var(--gray-900);
    font-size: 0.95rem;
  }

  span {
    color: var(--gray-500);
    font-size: 0.85rem;
  }
`;

const HeroTile = styled.div`
  background: linear-gradient(135deg, #0a4d8c, #1c7ff2);
  border-radius: 24px;
  padding: 24px;
  color: #fff;
  max-width: 320px;

  h3 {
    margin: 0 0 6px;
    font-size: 1.15rem;
  }

  p {
    margin: 0;
    color: #eef2ff;
    font-size: 0.9rem;
  }
`;

const LoginPrompt = styled.div`
  border: 1px dashed var(--cta-blue);
  border-radius: 16px;
  background: #fff;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  strong {
    color: var(--gray-900);
  }

  p {
    margin: 0;
    color: var(--gray-500);
    font-size: 0.9rem;
  }
`;

const LoginModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
`;

const LoginModalCard = styled(LoginPrompt)`
  max-width: 420px;
  width: 100%;
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.45);
`;

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
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [pendingReservation, setPendingReservation] = useState(false);

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
    api.get('/api/dates')
      .then(({ data }) => setDates(data.dates))
      .catch(() => setFeedback({ type: 'error', message: 'Erro ao carregar datas disponíveis.' }));
  }, []);

  useEffect(() => {
    if (selectedDate) {
      setLoadingSlots(true);
      api.get('/api/slots', { params: { date: selectedDate } })
        .then(({ data }) => {
          const normalized = data.slots
            ? data.slots.map((slot) => ({
                time: slot.time,
                available: slot.available
              }))
            : (data.availableSlots || []).map((time) => ({
                time,
                available: true
              }));
          setSlots(normalized);
        })
        .catch(() => setFeedback({ type: 'error', message: 'Não foi possível carregar os horários para a data selecionada.' }))
        .finally(() => setLoadingSlots(false));
    } else {
      setSlots([]);
      setSelectedSlot('');
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedSlot && !slots.some((slot) => slot.time === selectedSlot && slot.available)) {
      setSelectedSlot('');
    }
  }, [slots, selectedSlot]);

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

  const createReservation = useCallback(async () => {
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
  }, [formData, formIsValid, resetForm, selectedDate, selectedSlot]);

  useEffect(() => {
    if (pendingReservation && user) {
      if (!formIsValid) {
        setPendingReservation(false);
        return;
      }
      createReservation();
      setPendingReservation(false);
    }
  }, [pendingReservation, user, formIsValid, createReservation]);

  const handleSaveClick = () => {
    if (!formIsValid) return;
    if (!user) {
      setPendingReservation(true);
      setLoginModalOpen(true);
      return;
    }
    createReservation();
  };

  const handleCloseLoginModal = () => {
    setLoginModalOpen(false);
    setPendingReservation(false);
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
    setLoginModalOpen(false);
    setPendingReservation(false);
  };

  const handleGoogleLogin = (loggedUser) => {
    setUser(loggedUser);
    setLoginModalOpen(false);
  };

  const handleSelectDate = (date) => {
    setSelectedDate(date);
  };

  const handleSelectSlot = (slot) => {
    if (!slot?.available) return;
    setSelectedSlot(slot.time);
  };

  return (
    <Page>
      <TitleBlock>
        <HeroCTA>
          <span className="tagline">TZ Engenharia</span>
          <h1>Promovendo o crescimento da energia solar!</h1>
          <p>
            Soluções completas para operações corporativas de energia renovável.
            Garanta seu horário para homologação de materiais e suporte técnico com nossa equipe.
          </p>
          <Button>Fale conosco</Button>
        </HeroCTA>

        <ContactGrid>
          <ContactCard>
            <strong>Contato rápido</strong>
            <span>comercial@tzengenharia.com</span>
            <span>(11) 3090-2838</span>
          </ContactCard>
          <ContactCard>
            <strong>Endereço</strong>
            <span>Rua Verbo Divino, 2001 - CJ 305</span>
            <span>São Paulo / SP</span>
          </ContactCard>
        </ContactGrid>

        <HeroTile>
          <h3>Soluções industriais</h3>
          <p>Nossa presença garante pontualidade e aderência às normas em cada projeto.</p>
        </HeroTile>
      </TitleBlock>

      <Panel>
        {!reservation && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Agenda de atendimentos</h2>
                <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.95rem' }}>
                  Escolha a data e o horário, depois confirme seu cadastro.
                </p>
              </div>
              {user && (
                <Button variant="secondary" onClick={handleLogout}>
                  Encerrar
                </Button>
              )}
            </div>

            <DateSelector
              dates={dates}
              selectedDate={selectedDate}
              onSelect={handleSelectDate}
            />

            <Section>
              <h2>Horários disponíveis</h2>
              {loadingSlots ? (
                <p>Carregando horários...</p>
              ) : slots.length > 0 ? (
                <ChipGroup>
                  {slots.map((slot) => (
                    <Chip
                      key={slot.time}
                      active={selectedSlot === slot.time}
                      disabled={!slot.available}
                      onClick={() => handleSelectSlot(slot)}
                    >
                      {slot.time}
                    </Chip>
                  ))}
                </ChipGroup>
              ) : selectedDate ? (
                <Feedback type="error">Não há horários disponíveis nesta data.</Feedback>
              ) : (
                <p>Selecione uma data para ver os horários.</p>
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

            <Button disabled={!formIsValid} onClick={handleSaveClick}>
              Salvar pré-reserva
            </Button>
          </>
        )}

        {reservation && (
          <>
            <Feedback type="success">
              Pré-reserva confirmada para {reservation.data} às {reservation.horario}.
              O bloqueio permanece até{' '}
              {new Date(reservation.expira_em).toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo'
              })}
              .
            </Feedback>

            <UploadArea
              onUpload={handleUpload}
              loading={uploadState.loading}
              status={uploadState.status}
            />

            <Button variant="secondary" onClick={() => setReservation(null)}>
              Voltar à etapa inicial
            </Button>
          </>
        )}
      </Panel>

      {loginModalOpen && !user && (
        <LoginModalOverlay onClick={handleCloseLoginModal}>
          <LoginModalCard onClick={(event) => event.stopPropagation()}>
            <GoogleAuth onLogin={handleGoogleLogin} />
            <Button variant="secondary" onClick={handleCloseLoginModal}>
              Cancelar
            </Button>
          </LoginModalCard>
        </LoginModalOverlay>
      )}
    </Page>
  );
};

export default App;
