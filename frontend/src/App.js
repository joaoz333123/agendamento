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

const AdminButton = styled.button`
  position: fixed;
  left: 24px;
  bottom: 24px;
  border: none;
  border-radius: 999px;
  padding: 10px 18px;
  text-transform: uppercase;
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  background: rgba(15, 23, 42, 0.9);
  color: #f8fafc;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.35);
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  z-index: 900;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 22px 55px rgba(15, 23, 42, 0.5);
    background: #0f172a;
  }
`;

const AdminStatusMessage = styled.p`
  font-size: 0.85rem;
  margin: 8px 0 0;
  color: ${({ $error }) => ($error ? '#f87171' : '#22c55e')};
`;

const ADMIN_EMAIL = 'joaozanetti3@gmail.com';

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
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminAccessMessage, setAdminAccessMessage] = useState(null);
  const [pendingReservation, setPendingReservation] = useState(false);
  const normalizedAdminEmail = ADMIN_EMAIL.toLowerCase();
  const backendBaseUrl = useMemo(() => {
    const base = api.defaults.baseURL || 'http://localhost:4000';
    return base.endsWith('/') ? base.slice(0, -1) : base;
  }, []);

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
        message: 'Visita Agendada!'
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

  const handleOpenAdminModal = () => {
    setAdminModalOpen(true);
    setAdminAccessMessage(null);
  };

  const handleCloseAdminModal = () => {
    setAdminModalOpen(false);
    setAdminAccessMessage(null);
  };

  const handleAdminLogin = useCallback(async (loggedUser) => {
    if (!loggedUser?.credential) {
      setAdminAccessMessage('Não foi possível validar sua conta Google. Tente novamente.');
      return;
    }
    if ((loggedUser.email || '').toLowerCase() !== normalizedAdminEmail) {
      setAdminAccessMessage('Este e-mail não está autorizado a acessar o painel.');
      return;
    }
    try {
      setAdminAccessMessage('Validando acesso...');
      const { data } = await api.post('/api/admin/login', {
        credential: loggedUser.credential
      });
      setAdminAccessMessage(null);
      setAdminModalOpen(false);
      const dashboardUrl = `${backendBaseUrl}/admin/agenda.html#token=${encodeURIComponent(data.token)}`;
      window.open(dashboardUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      const message =
        error.response?.data?.message || 'Falha ao liberar o painel administrativo.';
      setAdminAccessMessage(message);
    }
  }, [backendBaseUrl, normalizedAdminEmail]);

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
    <>
      <Page>
        <TitleBlock>
        <HeroCTA>
          <span className="tagline">TZ Engenharia · Laudos, PMOCs, Auditorias</span>
          <h1>Agendamento de visitas técnicas</h1>
          <p>
            Exclusivo para: PMOCs, Auditorias e Laudos de Engenharia. 
          </p>
          <Button
            as="a"
            href="https://wa.me/5541992741261"
            target="_blank"
            rel="noreferrer"
            style={{ background: '#1f2a37' }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16 3C9.373 3 4 8.373 4 15c0 2.109.576 4.082 1.58 5.773L4 29l8.445-1.554A11.94 11.94 0 0 0 16 27c6.627 0 12-5.373 12-12S22.627 3 16 3Z"
                stroke="#25D366"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M11.5 11.5c0-.552.448-1 1-1h.667c.424 0 .796.27.934.672l.852 2.556a1 1 0 0 1-.24 1.014l-.631.631a6.5 6.5 0 0 0 2.744 2.744l.631-.631a1 1 0 0 1 1.014-.24l2.556.852c.401.134.671.51.671.935V19.5c0 .552-.448 1-1 1a9.5 9.5 0 0 1-9.5-9.5Z"
                stroke="#25D366"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Falar no WhatsApp
          </Button>
        </HeroCTA>

        <ContactGrid>
          <ContactCard>
            <strong>TZ Engenharia Técnica</strong>
            <span>Contato (WhatsApp)</span>
            <span>(41) 99274-1261</span>
          </ContactCard>
        </ContactGrid>

        <HeroTile>
          <h3>PMOCs, Auditorias e Laudos de Engenharia</h3>
          <p>Sistema exclusivo para agendamentos</p>
        </HeroTile>
      </TitleBlock>

      <Panel>
        {!reservation && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Agenda de visitas (PACOTES DE DESCONTO PARA LOJISTAS DE SHOPPING)</h2>
                <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.95rem' }}>
                  Insira as informações de local
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
                <Feedback type="error">Encontre a melhor opção de horário para você</Feedback>
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
              Agendar visita
            </Button>
          </>
        )}

        {reservation && (
          <>
            <Feedback type="success">
              Visita confirmada para {reservation.data} às {reservation.horario}.
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
      </Page>

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

      {adminModalOpen && (
        <LoginModalOverlay onClick={handleCloseAdminModal}>
          <LoginModalCard onClick={(event) => event.stopPropagation()}>
            <h3 style={{ margin: 0 }}>Acesso restrito</h3>
            <GoogleAuth
              onLogin={handleAdminLogin}
              title={null}
              description={null}
              compact
            />
            {adminAccessMessage && (
              <AdminStatusMessage
                $error={!adminAccessMessage.toLowerCase().includes('validando')}
              >
                {adminAccessMessage}
              </AdminStatusMessage>
            )}
            <Button variant="secondary" onClick={handleCloseAdminModal}>
              Fechar
            </Button>
          </LoginModalCard>
        </LoginModalOverlay>
      )}

      <AdminButton type="button" onClick={handleOpenAdminModal} aria-label="Abrir painel admin">
        admin
      </AdminButton>
    </>
  );
};

export default App;
