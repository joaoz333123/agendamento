import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  HardHat,
  FileText,
  ChevronRight,
  LogOut,
  Lock,
  X
} from 'lucide-react';
import api from './api';
import GoogleAuth from './components/GoogleAuth';
import UploadArea from './components/UploadArea';

const ADMIN_EMAIL = 'joaozanetti3@gmail.com';

const InputField = ({
  label,
  type = 'text',
  placeholder,
  icon: Icon,
  required = false,
  options = null,
  value,
  onChange,
  name,
  error
}) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">
      {label} {required && <span className="text-blue-600">*</span>}
    </label>
    <div className="relative group">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
          <Icon size={18} />
        </div>
      )}

      {options ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          className={`w-full bg-slate-50 border ${error ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'} text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 ${Icon ? 'pl-10' : ''} transition-all outline-none appearance-none cursor-pointer hover:bg-white`}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((opt, idx) => (
            <option key={idx} value={opt.value || opt}>
              {opt.label || opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          className={`w-full bg-slate-50 border ${error ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'} text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 ${Icon ? 'pl-10' : ''} transition-all outline-none placeholder:text-slate-400 hover:bg-white`}
          placeholder={placeholder}
        />
      )}
    </div>
    {error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}
  </div>
);

const formatDateLabel = (value) => {
  if (!value) {
    return '';
  }
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

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
    const base = api.defaults?.baseURL || process.env.REACT_APP_API_URL || 'http://localhost:4000';
    return base.endsWith('/') ? base.slice(0, -1) : base;
  }, []);

  const resetForm = useCallback((defaultEmail = user?.email || '') => {
    setSelectedDate('');
    setSelectedSlot('');
    setFormData({
      shopping: '',
      nome_fantasia: '',
      nome_contato: '',
      telefone_whatsapp: '',
      email: defaultEmail,
      informacoes_adicionais: ''
    });
    setFormErrors({});
    setFeedback(null);
  }, [user]);

  useEffect(() => {
    api
      .get('/api/dates')
      .then(({ data }) => setDates(data.dates || []))
      .catch(() =>
        setFeedback({ type: 'error', message: 'Erro ao carregar datas disponíveis.' })
      );
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      setSlots([]);
      setSelectedSlot('');
      return;
    }

    setLoadingSlots(true);
    api
      .get('/api/slots', { params: { date: selectedDate } })
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
      .catch(() =>
        setFeedback({ type: 'error', message: 'Não foi possível carregar os horários.' })
      )
      .finally(() => setLoadingSlots(false));
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

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validators = useMemo(() => {
    const emailValidator = (value) => /\S+@\S+\.\S+/.test(value);
    const whatsappValidator = (value) => value.replace(/\D/g, '').length >= 10;
    return {
      email: emailValidator,
      telefone_whatsapp: whatsappValidator
    };
  }, []);

  const validationErrors = useMemo(() => {
    const requiredFields = [
      'shopping',
      'nome_fantasia',
      'nome_contato',
      'telefone_whatsapp',
      'email'
    ];
    const newErrors = {};

    requiredFields.forEach((field) => {
      if (!formData[field]?.trim()) {
        newErrors[field] = 'Campo obrigatório.';
      }
    });

    if (formData.email && !validators.email(formData.email)) {
      newErrors.email = 'E-mail inválido.';
    }

    if (
      formData.telefone_whatsapp &&
      !validators.telefone_whatsapp(formData.telefone_whatsapp)
    ) {
      newErrors.telefone_whatsapp = 'WhatsApp inválido (mín. 10 dígitos).';
    }

    return newErrors;
  }, [formData, validators]);

  useEffect(() => {
    setFormErrors(validationErrors);
  }, [validationErrors]);

  const formIsValid = useMemo(() => {
    return (
      Object.keys(validationErrors).length === 0 &&
      Boolean(selectedSlot) &&
      Boolean(selectedDate)
    );
  }, [validationErrors, selectedSlot, selectedDate]);

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
      setFeedback({ type: 'success', message: 'Visita agendada com sucesso!' });
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao salvar a pré-reserva.';
      setFeedback({ type: 'error', message });
    }
  }, [formData, formIsValid, selectedDate, selectedSlot]);

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

  const handleSaveClick = (event) => {
    event.preventDefault();
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

  const handleAdminLogin = useCallback(
    async (loggedUser) => {
      if (!loggedUser?.credential) {
        setAdminAccessMessage('Não foi possível validar sua conta Google.');
        return;
      }

      if ((loggedUser.email || '').toLowerCase() !== normalizedAdminEmail) {
        setAdminAccessMessage('Acesso não autorizado.');
        return;
      }

      try {
        setAdminAccessMessage('Validando acesso...');
        const { data } = await api.post('/api/admin/login', {
          credential: loggedUser.credential
        });
        setAdminAccessMessage(null);
        setAdminModalOpen(false);
        const dashboardUrl = `${backendBaseUrl}/admin/agenda.html#token=${encodeURIComponent(
          data.token
        )}`;
        window.open(dashboardUrl, '_blank', 'noopener,noreferrer');
      } catch (error) {
        const message = error.response?.data?.message || 'Erro no login admin.';
        setAdminAccessMessage(message);
      }
    },
    [normalizedAdminEmail, backendBaseUrl]
  );

  const handleUpload = async (file) => {
    if (!reservation) return;

    const formDataUpload = new FormData();
    formDataUpload.append('arquivo', file);
    setUploadState({ loading: true, status: null });

    try {
      const { data } = await api.post(
        `/api/reservations/${reservation.id}/upload`,
        formDataUpload,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      setUploadState({
        loading: false,
        status: {
          type: 'success',
          message: `${data.message} Confirmação enviada via WhatsApp.`
        }
      });
    } catch (error) {
      const message = error.response?.data?.message || 'Falha ao fazer upload.';
      setUploadState({
        loading: false,
        status: { type: 'error', message }
      });
    }
  };

  const handleLogout = () => {
    setUser(null);
    setReservation(null);
    resetForm('');
    setFeedback(null);
    setUploadState({ loading: false, status: null });
  };

  const handleGoogleLogin = (loggedUser) => {
    setUser(loggedUser);
    setLoginModalOpen(false);
  };

  if (reservation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-lg p-8 rounded-3xl shadow-xl text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Agendamento Confirmado!</h2>
          <p className="text-slate-600 mb-4">
            Visita para <strong>{reservation.data}</strong> às{' '}
            <strong>{reservation.horario}</strong>.
          </p>
          <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 mb-6 border border-blue-100">
            Bloqueio válido até:{' '}
            {new Date(reservation.expira_em).toLocaleString('pt-BR', {
              timeZone: 'America/Sao_Paulo'
            })}
          </div>

          <div className="mb-6 text-left">
            <UploadArea
              onUpload={handleUpload}
              loading={uploadState.loading}
              status={uploadState.status}
            />
          </div>

          <button
            onClick={() => {
              setReservation(null);
              resetForm();
              setUploadState({ loading: false, status: null });
              setFeedback(null);
            }}
            className="w-full py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  const isValidatingAdmin = adminAccessMessage?.toLowerCase().includes('validando');

  return (
    <div className="min-h-screen bg-[#f0f4f8] font-sans selection:bg-blue-200 text-slate-900">
      <div className="max-w-7xl mx-auto min-h-screen flex flex-col lg:flex-row">
        <div
          className="lg:w-5/12 p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-blue-900 text-white lg:rounded-r-[3rem] shadow-2xl z-10"
          style={{ background: 'linear-gradient(135deg, #050a1d 0%, #0c1d4a 60%, #004aad 100%)' }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20 translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
                <HardHat className="text-white" size={24} />
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-wide">TZ ENGENHARIA</h1>
                <p className="text-blue-200 text-xs tracking-wider font-medium uppercase">
                  Laudos • PMOCs • Auditorias
                </p>
              </div>
            </div>

            <h2 className="text-4xl lg:text-5xl font-bold leading-tight mb-6">
              Agendamento de <span className="text-blue-400">Visitas Técnicas</span>
            </h2>

            <p className="text-blue-100 text-lg leading-relaxed mb-8 max-w-md">
              Sistema exclusivo para agendamento de vistorias de engenharia. Garanta a conformidade do seu estabelecimento.
            </p>

            <a
              href="https://wa.me/5541992741261"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl p-4 mb-6 hover:bg-white/25 transition-colors cursor-pointer group no-underline text-white shadow-lg shadow-black/20"
            >
              <div className="mr-4 bg-green-500/20 p-2 rounded-full">
                <MessageSquare className="text-green-400" />
              </div>
              <div>
                <p className="text-xs text-blue-200 font-medium uppercase mb-0.5">Dúvidas?</p>
                <p className="font-semibold flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                  Falar no WhatsApp <ChevronRight size={16} />
                </p>
              </div>
            </a>

          </div>

          <div className="relative z-10 space-y-4 mt-10">
            <div className="flex items-center justify-between text-sm text-blue-200/80 pt-6 border-t border-white/10">
              <div>
                <p className="font-semibold text-white">TZ Engenharia Técnica</p>
                <p>(41) 99274-1261</p>
              </div>
              {user && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors text-xs font-semibold"
                >
                  <LogOut size={14} /> Sair ({user.name || 'Conta'})
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="lg:w-7/12 p-4 lg:p-16 flex items-center justify-center relative">
          <div className="w-full max-w-xl pb-20 lg:pb-0">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-100 rounded-2xl p-4 mb-8 flex items-start gap-4 shadow-sm">
              <div className="bg-orange-100 p-2 rounded-full text-orange-600 mt-1">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-orange-800 text-sm uppercase tracking-wide mb-1">
                  Lojistas de Shopping
                </h3>
                <p className="text-orange-700/80 text-sm leading-relaxed">
                  Temos <strong>pacotes de desconto</strong>. Preencha abaixo para verificar elegibilidade.
                </p>
              </div>
            </div>

            {feedback && feedback.type === 'error' && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-start gap-3">
                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                <p className="text-sm">{feedback.message}</p>
              </div>
            )}

            <form onSubmit={handleSaveClick} className="space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Calendar className="text-blue-600" size={20} />
                  Data e Hora
                </h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">
                    Data da Vistoria
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                      value={selectedDate}
                      onChange={(event) => setSelectedDate(event.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 pl-10 cursor-pointer hover:bg-white outline-none"
                    >
                      <option value="">Selecione um dia disponível...</option>
                      {dates.map((date) => (
                        <option key={date} value={date}>
                          {formatDateLabel(date)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedDate && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <Clock size={16} className="text-slate-400" /> Horários Disponíveis:
                    </p>
                    {loadingSlots ? (
                      <p className="text-slate-400 text-sm animate-pulse">Carregando horários...</p>
                    ) : slots.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {slots.map((slot) => (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => setSelectedSlot(slot.time)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              selectedSlot === slot.time
                                ? 'bg-blue-600 text-white shadow-md scale-105'
                                : slot.available
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                : 'bg-slate-50 text-slate-300 cursor-not-allowed decoration-slate-300 line-through'
                            }`}
                          >
                            {slot.time}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-orange-500 text-sm bg-orange-50 p-3 rounded-lg">
                        Nenhum horário para esta data.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <MapPin className="text-blue-600" size={20} />
                  Dados do Local
                </h3>

                <div className="grid gap-4">
                  <InputField
                    label="Shopping / Local"
                    placeholder="Selecione o local..."
                    options={[
                      'Shopping Curitiba',
                      'Shopping Estação',
                      'Shopping Mueller',
                      'Park Shopping Barigui',
                      'Jockey Plaza',
                      'Outro'
                    ]}
                    icon={Building2}
                    name="shopping"
                    value={formData.shopping}
                    onChange={handleInputChange}
                    error={formErrors.shopping}
                    required
                  />

                  <InputField
                    label="Nome Fantasia da Operação"
                    placeholder="Ex: Loja Exemplo Piso L2"
                    icon={FileText}
                    name="nome_fantasia"
                    value={formData.nome_fantasia}
                    onChange={handleInputChange}
                    error={formErrors.nome_fantasia}
                    required
                  />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="text-blue-600" size={20} />
                  Contato do Responsável
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <InputField
                      label="Nome Completo"
                      placeholder="Quem receberá o técnico?"
                      name="nome_contato"
                      value={formData.nome_contato}
                      onChange={handleInputChange}
                      error={formErrors.nome_contato}
                      required
                    />
                  </div>
                  <InputField
                    label="WhatsApp"
                    placeholder="(00) 00000-0000"
                    icon={Phone}
                    type="tel"
                    name="telefone_whatsapp"
                    value={formData.telefone_whatsapp}
                    onChange={handleInputChange}
                    error={formErrors.telefone_whatsapp}
                    required
                  />
                  <InputField
                    label="E-mail Corporativo"
                    placeholder="seu@email.com"
                    icon={Mail}
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    error={formErrors.email}
                    required
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">
                    Observações Adicionais
                  </label>
                  <textarea
                    name="informacoes_adicionais"
                    value={formData.informacoes_adicionais}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block p-3 transition-all outline-none min-h-[80px] resize-y hover:bg-white"
                    placeholder="Alguma restrição de horário ou detalhe de acesso?"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!formIsValid}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-blue-600/20 transition-all transform active:scale-[0.99] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  Agendar Visita Técnica <ChevronRight size={20} />
                </button>
              </div>
            </form>
          </div>

          <button
            onClick={handleOpenAdminModal}
            className="fixed bottom-4 left-4 bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl hover:scale-105 transition-transform flex items-center gap-2 z-50"
          >
            <Lock size={12} /> ADMIN
          </button>
        </div>
      </div>

      {loginModalOpen && !user && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={handleCloseLoginModal}
        >
          <div
            className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Finalizar Agendamento</h3>
              <button onClick={handleCloseLoginModal} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-slate-500 text-center mb-6 text-sm">
              Faça login com o Google para confirmar sua identidade e salvar o agendamento com segurança.
            </p>
            <div className="flex justify-center mb-4">
              <GoogleAuth onLogin={handleGoogleLogin} />
            </div>
            <button
              onClick={handleCloseLoginModal}
              className="w-full text-slate-400 text-sm hover:text-slate-600 mt-4 py-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {adminModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/80 flex items-center justify-center p-4 z-50"
          onClick={handleCloseAdminModal}
        >
          <div
            className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 mb-4">Acesso Administrativo</h3>
            <div className="flex justify-center mb-4">
              <GoogleAuth onLogin={handleAdminLogin} title={null} description={null} compact />
            </div>
            {adminAccessMessage && (
              <p className={`text-xs mt-2 ${isValidatingAdmin ? 'text-blue-500' : 'text-red-500'}`}>
                {adminAccessMessage}
              </p>
            )}
            <button
              onClick={handleCloseAdminModal}
              className="text-xs text-slate-400 mt-4 uppercase font-bold tracking-wider"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
