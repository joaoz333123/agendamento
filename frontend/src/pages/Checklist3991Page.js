import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Save
} from 'lucide-react';
import api from '../api';

const AUTO_SAVE_DELAY = 800;
const STORAGE_KEY = 'checklist3991SessionId';

const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const ChecklistField = ({ field, value, onChange }) => {
  if (field.type === 'textarea') {
    return (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white/70 text-sm text-slate-700 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-[90px]"
        placeholder="Escreva aqui..."
      />
    );
  }

  if (field.type === 'select' && Array.isArray(field.options)) {
    return (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white/70 text-sm text-slate-700 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">Selecione</option>
        {field.options.map((option) => (
          <option key={`${field.id}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border border-slate-200 bg-white/70 text-sm text-slate-700 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      placeholder="Digite aqui..."
    />
  );
};

const Checklist3991Page = () => {
  const [structure, setStructure] = useState(null);
  const [answers, setAnswers] = useState({});
  const [sessionId, setSessionId] = useState('');
  const [loadingChecklist, setLoadingChecklist] = useState(true);
  const [loadingAnswers, setLoadingAnswers] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const skipNextSaveRef = useRef(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    setLoadingChecklist(true);
    api
      .get('/api/checklists/3991')
      .then(({ data }) => {
        setStructure(data);
        setLoadError('');
      })
      .catch(() => {
        setLoadError('Não foi possível carregar o checklist de vistoria.');
      })
      .finally(() => setLoadingChecklist(false));
  }, []);

  useEffect(() => {
    const storedId =
      typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (storedId) {
      setSessionId(storedId);
      return;
    }
    const fallbackId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sessao-${Date.now()}`;
    window.localStorage.setItem(STORAGE_KEY, fallbackId);
    setSessionId(fallbackId);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    setLoadingAnswers(true);
    api
      .get(`/api/checklists/3991/responses/${sessionId}`)
      .then(({ data }) => {
        setAnswers(data.answers || {});
        const savedAt = data.updatedAt || null;
        setLastSavedAt(savedAt);
        setAutoSaveStatus(savedAt ? 'success' : 'idle');
      })
      .catch(() => {
        setAnswers({});
        setLastSavedAt(null);
        setAutoSaveStatus('idle');
      })
      .finally(() => {
        skipNextSaveRef.current = true;
        initializedRef.current = true;
        setLoadingAnswers(false);
      });
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !structure || !initializedRef.current) {
      return;
    }

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    setAutoSaveStatus('pending');
    const handler = setTimeout(() => {
      setAutoSaveStatus('saving');
      api
        .put('/api/checklists/3991/responses', { sessionId, answers })
        .then(({ data }) => {
          setLastSavedAt(data.savedAt || new Date().toISOString());
          setAutoSaveStatus('success');
        })
        .catch(() => {
          setAutoSaveStatus('error');
        });
    }, AUTO_SAVE_DELAY);

    return () => clearTimeout(handler);
  }, [answers, sessionId, structure]);

  const sessionLabel = useMemo(() => {
    if (!sessionId) return '---';
    if (sessionId.length <= 8) return sessionId;
    return `${sessionId.slice(0, 6)}…${sessionId.slice(-4)}`;
  }, [sessionId]);

  const handleFieldChange = (fieldKey, value) => {
    setAnswers((prev) => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const isLoading = loadingChecklist || loadingAnswers;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors bg-white/70 backdrop-blur px-4 py-2 rounded-full border border-slate-200 shadow-sm"
          >
            <ArrowLeft size={16} />
            Voltar
          </Link>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Sessão ativa</p>
            <p className="text-sm font-semibold text-slate-700">{sessionLabel}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg">
              <ClipboardCheck size={24} />
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs text-blue-500 font-semibold uppercase tracking-[0.3em]">
                Checklist 3991
              </p>
              <h1 className="text-2xl font-bold text-slate-900">
                {structure?.title || 'Checklist de Vistoria'}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                As respostas são salvas automaticamente em JSON e podem ser retomadas a qualquer
                momento neste dispositivo.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              {autoSaveStatus === 'saving' && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-50 text-blue-700 font-medium border border-blue-100">
                  <Loader2 size={16} className="animate-spin" />
                  Salvando respostas...
                </div>
              )}
              {autoSaveStatus === 'pending' && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 text-amber-800 font-medium border border-amber-100">
                  <Save size={16} />
                  Salvamento automático em segundos
                </div>
              )}
              {autoSaveStatus === 'success' && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-700 font-medium border border-emerald-100">
                  <CheckCircle2 size={16} />
                  Salvo às {formatDateTime(lastSavedAt)}
                </div>
              )}
              {autoSaveStatus === 'error' && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-red-50 text-red-700 font-medium border border-red-100">
                  <AlertCircle size={16} />
                  Erro ao salvar. Tentaremos novamente.
                </div>
              )}
              {!lastSavedAt && autoSaveStatus === 'idle' && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100 text-slate-500 font-medium border border-slate-200">
                  <Save size={16} />
                  Aguardando primeiras respostas
                </div>
              )}
            </div>
          </div>
        </div>

        {loadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-center gap-3">
            <AlertCircle size={18} />
            <p className="text-sm">{loadError}</p>
          </div>
        )}

        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center text-slate-500">
            <Loader2 size={32} className="animate-spin mb-4" />
            <p className="text-sm font-medium">Carregando checklist...</p>
          </div>
        ) : (
          <div className="space-y-10">
            {structure?.sections?.map((section) => {
              const sectionBadge =
                section.title?.match(/^\d+/)?.[0] ||
                (section.title || 'IG')
                  .split(' ')
                  .slice(0, 1)
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
              return (
                <section key={section.id} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-sm font-bold">
                      {sectionBadge}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
                      <p className="text-sm text-slate-500">
                        Registre informações e fotos conforme orientação da etapa.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {section.rows.map((row) => (
                      <div
                        key={row.id}
                        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
                      >
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-semibold text-slate-800">{row.label}</p>
                          {row.details && (
                            <p className="text-sm text-slate-500">{row.details}</p>
                          )}
                        </div>
                        {row.fields.length > 0 && (
                          <div className="grid gap-4 mt-4 md:grid-cols-2">
                            {row.fields.map((field) => (
                              <div key={field.id}>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                                  {field.label}
                                </label>
                                <ChecklistField
                                  field={field}
                                  value={answers[field.storageKey] ?? ''}
                                  onChange={(value) => handleFieldChange(field.storageKey, value)}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Checklist3991Page;
