import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle, ChevronDown, ChevronUp, MapPin, Printer, Trash2, User, X } from 'lucide-react';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

const hasFirebaseConfig =
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.authDomain &&
  !!firebaseConfig.projectId &&
  !!firebaseConfig.appId;

const firebaseApp = hasFirebaseConfig
  ? getApps().find((existingApp) => existingApp.name === 'vistoria-app') ||
    initializeApp(firebaseConfig, 'vistoria-app')
  : null;

const auth = firebaseApp ? getAuth(firebaseApp) : null;
const db = firebaseApp ? getFirestore(firebaseApp) : null;
const appId = process.env.REACT_APP_VISTORIA_APP_ID || 'default-app';
const LOCAL_STORAGE_KEY = 'vistoria_guindaste_state_v1';

// --- DADOS ESTRUTURADOS DO CHECKLIST ---
const CHECKLIST_DATA = [
  {
    id: 1,
    title: "1. Abertura da perícia",
    subsections: [
      {
        title: "1.1 Identificação",
        items: [
          { id: "1.1.1", label: "Registrar dados do processo, partes e quesitos principais." },
          { id: "1.1.2", label: "Modelo exato do guindaste (Rodomaq GHR-35.000), nº de série, ano se houver placa." },
          { id: "1.1.3", label: "Local de armazenagem (galpão, pátio, piso de terra, etc.)." },
          { id: "1.1.4", label: "Data, hora, condições ambientais (umidade, poeira, exposição à chuva)." }
        ]
      },
      {
        title: "1.2 Situação de armazenamento",
        items: [
          { id: "1.2.1", label: "Equipamento apoiado diretamente no solo / sobre calços?" },
          { id: "1.2.2", label: "Presença de água, lama, produtos químicos no entorno." },
          { id: "1.2.3", label: "Proteção contra intempéries (coberto / descoberto)." },
          { id: "1.2.4", label: "Tempo aproximado armazenado nessa condição (informação das partes)." }
        ]
      }
    ]
  },
  {
    id: 2,
    title: "2. Inventário dos conjuntos",
    description: "Marcar: Presente completo / Parcial / Ausente e fotografar.",
    type: "inventory", // Tipo especial com select
    items: [
      { id: "2.1", label: "Base e braços das patolas." },
      { id: "2.2", label: "Coluna de giro." },
      { id: "2.3", label: "Conjunto de lanças (todos os estágios)." },
      { id: "2.4", label: "Cilindros hidráulicos (lança, patolas, giro, outros)." },
      { id: "2.5", label: "Blocos de válvulas e comandos (alavancas)." },
      { id: "2.6", label: "Tubos rígidos hidráulicos." },
      { id: "2.7", label: "Mangueiras hidráulicas." },
      { id: "2.8", label: "Reservatório de óleo hidráulico." },
      { id: "2.9", label: "Bomba hidráulica e tomada de força/eixo cardan." },
      { id: "2.10", label: "Chicotes elétricos, sensores, botoeiras (se existirem)." },
      { id: "2.11", label: "Acessórios de carga (gancho, moitão, olhais, etc.)." },
      { id: "2.12", label: "Documentos físicos localizados junto ao equipamento." }
    ]
  },
  {
    id: 3,
    title: "3. Estrutura – inspeção visual detalhada",
    subsections: [
      {
        title: "3.1 Base e patolas",
        items: [
          { id: "3.1.1", label: "Fotografar a base vista de cima, de lado e por baixo." },
          { id: "3.1.2", label: "Procurar e registrar: trincas, fissuras, amassamentos, deformações." },
          { id: "3.1.3", label: "Registrar soldas de reparo (cor diferente, cordão irregular)." },
          { id: "3.1.4", label: "Verificar braços das patolas: empenos, trincas, soldas novas." },
          { id: "3.1.5", label: "Sapatas das patolas: presentes? quebradas? improvisadas?" }
        ]
      },
      {
        title: "3.2 Coluna de giro",
        items: [
          { id: "3.2.1", label: "Verificar 360° da coluna: trincas, deformações, furos extras, soldas." },
          { id: "3.2.2", label: "Região de apoio/giro: rachaduras, folgas excessivas aparentes." },
          { id: "3.2.3", label: "Fotografar qualquer reparo ou dano." }
        ]
      },
      {
        title: "3.3 Lanças",
        items: [
          { id: "3.3.1", label: "Conferir todos os estágios: estão presentes?" },
          { id: "3.3.2", label: "Procurar: amassamentos, empenos visíveis, corrosão forte, cortes ou furos." },
          { id: "3.3.3", label: "Verificar se há seções claramente tortas." },
          { id: "3.3.4", label: "Registrar e fotografar pontos de solda e eventuais reforços improvisados." }
        ]
      },
      {
        title: "3.4 Acessórios estruturais",
        items: [
          { id: "3.4.1", label: "Suportes, orelhas de fixação de cilindros e pinos: trincas, deformações." },
          { id: "3.4.2", label: "Travessas, tirantes ou reforços: estado geral e sinais de reparo." }
        ]
      }
    ]
  },
  {
    id: 4,
    title: "4. Sistema hidráulico – componentes desmontados",
    subsections: [
      {
        title: "4.1 Cilindros hidráulicos",
        items: [
          { id: "4.1.1", label: "Corpo externo: corrosão, amassamentos, soldas." },
          { id: "4.1.2", label: "Haste (quando exposta): riscos profundos, pontos sem cromo, ferrugem." },
          { id: "4.1.3", label: "Terminais (olhais, orelhas): trincas, deformações, soldas." },
          { id: "4.1.4", label: "Vazamento visível nas vedações (óleo escorrendo ou crostas)." },
          { id: "4.1.5", label: "Registrar se há cilindros faltando ou com hastes cortadas." }
        ]
      },
      {
        title: "4.2 Mangueiras e tubos",
        items: [
          { id: "4.2.1", label: "Estado das mangueiras: rachaduras, bolhas, achatamentos, capas rompidas." },
          { id: "4.2.2", label: "Emendas improvisadas, engates rápidos danificados." },
          { id: "4.2.3", label: "Tubos rígidos: corrosão intensa, dobras, amassamentos, rachaduras." },
          { id: "4.2.4", label: "Conexões: roscas danificadas, vazamentos antigos (manchas de óleo)." }
        ]
      },
      {
        title: "4.3 Blocos de válvulas e comandos",
        items: [
          { id: "4.3.1", label: "Completo de carretéis/alavancas? algum faltando/quebrado?" },
          { id: "4.3.2", label: "Vazamentos antigos (óleo acumulado, crostas)." },
          { id: "4.3.3", label: "Marcação das funções nas alavancas (legível ou apagada)." },
          { id: "4.3.4", label: "Presença de válvulas de segurança e possíveis lacres (rompidos/inexistentes)." }
        ]
      },
      {
        title: "4.4 Bomba, TDF e reservatório",
        items: [
          { id: "4.4.1", label: "Bomba hidráulica: presença, modelo, sinais de impacto ou trinca." },
          { id: "4.4.2", label: "Eixo cardan / acoplamentos: empeno, folga, corrosão." },
          { id: "4.4.3", label: "Reservatório: amassamentos, furos, pontos de corrosão, tampas e respiros." },
          { id: "4.4.4", label: "Vestígios de contaminação (água, lama) na região das conexões." }
        ]
      }
    ]
  },
  {
    id: 5,
    title: "5. Sistema mecânico",
    items: [
      { id: "5.1.1", label: "Pinos presentes em todas as articulações principais?" },
      { id: "5.1.2", label: "Diâmetro visivelmente reduzido por desgaste?" },
      { id: "5.1.3", label: "Buchas aparentes com folga excessiva." },
      { id: "5.1.4", label: "Pinos substituídos por barras/ferros inadequados." },
      { id: "5.2.1", label: "Eixos visíveis: empenos, torções." },
      { id: "5.2.2", label: "Conjuntos de engrenagens expostas: dentes quebrados, desgaste severo." },
      { id: "5.2.3", label: "Coroa/rolamento de giro: rachaduras, falta de parafusos." }
    ]
  },
  {
    id: 6,
    title: "6. Sistema elétrico e controles",
    items: [
      { id: "6.1", label: "Existência de chicotes elétricos relacionados ao guindaste." },
      { id: "6.2", label: "Estado de isolação: rachaduras, remendos, fios expostos." },
      { id: "6.3", label: "Conectores, plugues: quebrados, corroídos, faltando." },
      { id: "6.4", label: "Botões, sensores, micro switches de fim de curso." }
    ]
  },
  {
    id: 7,
    title: "7. Integridade Geral (Conclusão Preliminar)",
    items: [
      { id: "7.1.1", label: "Trincas críticas em elementos principais." },
      { id: "7.1.2", label: "Deformações permanentes relevantes." },
      { id: "7.2.1", label: "Quantidade de cilindros em mau estado." },
      { id: "7.2.2", label: "Quantidade de mangueiras/tubos com danos graves." },
      { id: "7.2.3", label: "Indícios fortes de contaminação." },
      { id: "7.3.1", label: "Situação geral do bloco de válvulas." },
      { id: "7.3.2", label: "Situação dos controles." },
      { id: "7.4.1", label: "Listar componentes essenciais ausentes." },
      { id: "7.4.2", label: "Identificar componentes estranhos (sucata misturada)." }
    ]
  },
  {
    id: 8,
    title: "8. Registro fotográfico",
    items: [
      { id: "8.1", label: "Foto panorâmica do conjunto (vistas 360°)." },
      { id: "8.2", label: "Fotos por subsistema." },
      { id: "8.3", label: "Fotos de cada dano relevante numeradas." },
      { id: "8.4", label: "Anotar correspondência foto ↔ item do checklist." }
    ]
  }
];

const createInitialFormData = () => ({
  localVistoria: '',
  municipio: '',
  data: '',
  horaInicio: '',
  horaTermino: '',
  veiculoModelo: '',
  veiculoPlaca: '',
  veiculoChassi: '',
  processo: '0004595-85.2016.8.16.0058',
  juizo: '',
  testemunhas: []
});

const mergeFormDataWithDefaults = (incoming) => ({
  ...createInitialFormData(),
  ...(incoming || {})
});

const loadCachedState = () => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Falha ao carregar cache da vistoria.', error);
    return null;
  }
};

const persistCachedState = (payload) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Falha ao salvar cache da vistoria.', error);
  }
};

export default function VistoriaPage({ onClose }) {
  // --- ESTADOS ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(() => createInitialFormData());
  const [checklistResponses, setChecklistResponses] = useState({});
  const [activeSection, setActiveSection] = useState(null);
  const supportsFirebase = Boolean(auth && db);

  useEffect(() => {
    const cached = loadCachedState();
    if (cached?.formData) {
      setFormData(mergeFormDataWithDefaults(cached.formData));
    }
    if (cached?.checklistResponses) {
      setChecklistResponses(cached.checklistResponses);
    }
    setLoading(false);
  }, []);

  // --- AUTENTICAÇÃO E CARREGAMENTO ---
  useEffect(() => {
    if (!supportsFirebase || !auth) return undefined;

    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, [supportsFirebase]);

  // Carregar dados salvos (Firestore)
  useEffect(() => {
    if (!supportsFirebase || !user) return;

    const loadData = async () => {
      try {
        // Tenta carregar do Firestore se disponível
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'vistoria_current');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.formData) {
            setFormData(mergeFormDataWithDefaults(data.formData));
          }
          if (data.checklistResponses) {
            setChecklistResponses(data.checklistResponses);
          }
        }
      } catch (e) {
        console.log("Modo offline ou erro de fetch:", e);
      }
    };
    loadData();
  }, [supportsFirebase, user]);

  // --- SALVAMENTO ---
  const saveData = async (newFormData, newResponses) => {
    const dataToSave = {
      formData: newFormData || formData,
      checklistResponses: newResponses || checklistResponses,
      lastUpdated: new Date().toISOString()
    };

    persistCachedState(dataToSave);

    if (!supportsFirebase || !user) return;

    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vistoria_current'), dataToSave);
    } catch (e) {
      console.error("Erro ao salvar:", e);
    }
  };

  // --- HANDLERS DE FORMULÁRIO ---
  const handleFormChange = (e) => {
    const newFormData = { ...formData, [e.target.name]: e.target.value };
    setFormData(newFormData);
    saveData(newFormData, null);
  };

  const addWitness = () => {
    const newWitnesses = [...formData.testemunhas, { nome: '', documento: '' }];
    const newFormData = { ...formData, testemunhas: newWitnesses };
    setFormData(newFormData);
    saveData(newFormData, null);
  };

  const updateWitness = (index, field, value) => {
    const newWitnesses = [...formData.testemunhas];
    newWitnesses[index][field] = value;
    const newFormData = { ...formData, testemunhas: newWitnesses };
    setFormData(newFormData);
    saveData(newFormData, null);
  };

  const removeWitness = (index) => {
    const newWitnesses = formData.testemunhas.filter((_, i) => i !== index);
    const newFormData = { ...formData, testemunhas: newWitnesses };
    setFormData(newFormData);
    saveData(newFormData, null);
  };

  // --- HANDLERS DO CHECKLIST ---
  const toggleSection = (id) => {
    setActiveSection(activeSection === id ? null : id);
  };

  const handleCheckResult = (itemId, result) => {
    const currentItem = checklistResponses[itemId] || {};
    const newResponses = {
      ...checklistResponses,
      [itemId]: { ...currentItem, result }
    };
    setChecklistResponses(newResponses);
    saveData(null, newResponses);
  };

  const handleNoteChange = (itemId, text) => {
    const currentItem = checklistResponses[itemId] || {};
    const newResponses = {
      ...checklistResponses,
      [itemId]: { ...currentItem, note: text }
    };
    setChecklistResponses(newResponses);
    // Debounce save for text would be better, saving directly for simplicity
    saveData(null, newResponses);
  };

  // --- LÓGICA DE FOTO (IMPORTANTE) ---
  const handlePhotoCapture = async (itemId, e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. Validação de Tamanho (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 2MB.");
      return;
    }

    // 2. Converter para Base64 para preview e "upload" simulado
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      
      const currentItem = checklistResponses[itemId] || {};
      const currentPhotos = currentItem.photos || [];
      
      const newPhoto = {
        id: Date.now(),
        data: base64String,
        timestamp: new Date().toISOString(),
        uploaded: true // Em um app real, isso seria false até o servidor confirmar
      };

      const newResponses = {
        ...checklistResponses,
        [itemId]: { 
          ...currentItem, 
          photos: [...currentPhotos, newPhoto] 
        }
      };

      setChecklistResponses(newResponses);
      saveData(null, newResponses);
      
      // Simulando upload para servidor externo
      // await uploadToServer(file); 
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (itemId, photoId) => {
    const currentItem = checklistResponses[itemId];
    if (!currentItem) return;

    const newPhotos = currentItem.photos.filter(p => p.id !== photoId);
    const newResponses = {
      ...checklistResponses,
      [itemId]: { ...currentItem, photos: newPhotos }
    };
    setChecklistResponses(newResponses);
    saveData(null, newResponses);
  };

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-600">Carregando Vistoria...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans print:bg-white">
      {/* HEADER FIXO */}
      <div className="bg-blue-900 text-white p-4 shadow-md sticky top-0 z-10 print:static print:bg-transparent print:text-black">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Ficha de Vistoria Pericial</h1>
            <p className="text-sm text-blue-200 print:text-gray-600">Rodomaq GHR-35.000 - Série: 008013</p>
          </div>
          <div className="flex items-center gap-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 rounded-md border border-white/40 text-white text-sm font-semibold hover:bg-white/10 transition print:hidden"
              >
                Voltar
              </button>
            )}
            <button onClick={() => window.print()} className="p-2 bg-blue-700 rounded-full hover:bg-blue-600 print:hidden">
              <Printer size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* CABEÇALHO DE INFORMAÇÕES ESTÁTICAS */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 print:shadow-none print:border-black">
          <h2 className="font-bold text-gray-700 border-b pb-2 mb-3">Dados do Equipamento</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <p><span className="font-semibold">Equipamento:</span> Guindaste Hidráulico</p>
            <p><span className="font-semibold">Marca/Modelo:</span> Rodomaq GHR-35.000</p>
            <p><span className="font-semibold">Fabricação:</span> 2012 (Nº 8195)</p>
            <p><span className="font-semibold">Perito:</span> João Paulo Tardivo Zanetti (CREA/PR 145560/D)</p>
          </div>
        </div>

        {/* FORMULÁRIO INICIAL */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 print:shadow-none">
          <h2 className="font-bold text-gray-700 border-b pb-2 mb-3 flex items-center gap-2">
            <MapPin size={18} /> Dados da Vistoria
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Local da Vistoria</label>
              <input 
                type="text" name="localVistoria" value={formData.localVistoria} onChange={handleFormChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Município/UF</label>
              <input 
                type="text" name="municipio" value={formData.municipio} onChange={handleFormChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Data</label>
              <input 
                type="date" name="data" value={formData.data} onChange={handleFormChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              />
            </div>
            <div className="flex gap-2">
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700">Início</label>
                <input 
                  type="time" name="horaInicio" value={formData.horaInicio} onChange={handleFormChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                />
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700">Término</label>
                <input 
                  type="time" name="horaTermino" value={formData.horaTermino} onChange={handleFormChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* TESTEMUNHAS */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 print:shadow-none">
          <div className="flex justify-between items-center border-b pb-2 mb-3">
            <h2 className="font-bold text-gray-700 flex items-center gap-2">
              <User size={18} /> Testemunhas
            </h2>
            <button onClick={addWitness} className="text-sm text-blue-600 hover:text-blue-800 font-semibold print:hidden">+ Adicionar</button>
          </div>
          {formData.testemunhas.map((witness, index) => (
            <div key={index} className="flex gap-2 mb-2 items-end bg-gray-50 p-2 rounded">
              <div className="flex-1">
                <label className="text-xs text-gray-500">Nome</label>
                <input 
                  value={witness.nome} onChange={(e) => updateWitness(index, 'nome', e.target.value)}
                  className="w-full text-sm p-1 border rounded"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500">Documento</label>
                <input 
                  value={witness.documento} onChange={(e) => updateWitness(index, 'documento', e.target.value)}
                  className="w-full text-sm p-1 border rounded"
                />
              </div>
              <button onClick={() => removeWitness(index)} className="text-red-500 p-2 print:hidden"><Trash2 size={16}/></button>
            </div>
          ))}
          {formData.testemunhas.length === 0 && <p className="text-sm text-gray-400 italic">Nenhuma testemunha registrada.</p>}
        </div>

        {/* CHECKLIST SECTIONS */}
        <div className="space-y-4">
          {CHECKLIST_DATA.map((section) => (
            <div key={section.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden print:shadow-none print:border-black">
              <button 
                onClick={() => toggleSection(section.id)}
                className="w-full p-4 bg-gray-100 flex justify-between items-center text-left font-bold text-gray-800 hover:bg-gray-200 transition-colors print:bg-gray-200"
              >
                <span>{section.title}</span>
                <span className="print:hidden">
                  {activeSection === section.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </span>
              </button>

              {/* Content */}
              <div className={`${activeSection === section.id ? 'block' : 'hidden'} print:block p-4`}>
                {section.description && <p className="text-sm text-gray-500 mb-4 italic">{section.description}</p>}
                
                {/* Handle Subsections or direct Items */}
                {section.subsections ? (
                  section.subsections.map((sub, idx) => (
                    <div key={idx} className="mb-6">
                      <h3 className="font-semibold text-blue-800 mb-3 border-b border-blue-100 pb-1">{sub.title}</h3>
                      <div className="space-y-6">
                        {sub.items.map(item => (
                          <ChecklistItem 
                            key={item.id} 
                            item={item} 
                            sectionType={section.type}
                            response={checklistResponses[item.id] || {}}
                            onCheck={(res) => handleCheckResult(item.id, res)}
                            onNote={(text) => handleNoteChange(item.id, text)}
                            onPhoto={(e) => handlePhotoCapture(item.id, e)}
                            onRemovePhoto={(photoId) => removePhoto(item.id, photoId)}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-6">
                    {section.items.map(item => (
                      <ChecklistItem 
                        key={item.id} 
                        item={item} 
                        sectionType={section.type}
                        response={checklistResponses[item.id] || {}}
                        onCheck={(res) => handleCheckResult(item.id, res)}
                        onNote={(text) => handleNoteChange(item.id, text)}
                        onPhoto={(e) => handlePhotoCapture(item.id, e)}
                        onRemovePhoto={(photoId) => removePhoto(item.id, photoId)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTE DO ITEM DO CHECKLIST ---
function ChecklistItem({ item, response, onCheck, onNote, onPhoto, onRemovePhoto, sectionType }) {
  const fileInputRef = useRef(null);

  return (
    <div className="border-b border-gray-100 last:border-0 pb-4 page-break-inside-avoid">
      <div className="flex justify-between items-start gap-2">
        <p className="text-gray-800 font-medium text-sm flex-1">{item.label}</p>
        
        {/* Status Indicators for Print */}
        <div className="hidden print:block text-xs font-bold border p-1">
          {response.result || "________"}
        </div>
      </div>

      {/* Controls (Hidden on Print) */}
      <div className="mt-3 flex flex-wrap gap-2 print:hidden">
        {sectionType === 'inventory' ? (
          <div className="flex gap-1">
            {['Completo', 'Parcial', 'Ausente'].map(opt => (
               <button
               key={opt}
               onClick={() => onCheck(opt)}
               className={`px-3 py-1 text-xs rounded-full border ${
                 response.result === opt 
                   ? 'bg-blue-600 text-white border-blue-600' 
                   : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
               }`}
             >
               {opt}
             </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-1">
            <button onClick={() => onCheck('Conforme')} className={`p-2 rounded ${response.result === 'Conforme' ? 'bg-green-100 text-green-700 ring-2 ring-green-500' : 'bg-gray-100 text-gray-500'}`}><CheckCircle size={16}/></button>
            <button onClick={() => onCheck('Não Conforme')} className={`p-2 rounded ${response.result === 'Não Conforme' ? 'bg-red-100 text-red-700 ring-2 ring-red-500' : 'bg-gray-100 text-gray-500'}`}><X size={16}/></button>
            <button onClick={() => onCheck('N/A')} className={`p-2 rounded ${response.result === 'N/A' ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-500' : 'bg-gray-100 text-gray-500'}`}>N/A</button>
          </div>
        )}

        <button 
          onClick={() => fileInputRef.current.click()}
          className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 ml-auto"
        >
          <Camera size={14} /> Foto
        </button>
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" // Opens rear camera on mobile
          ref={fileInputRef} 
          className="hidden" 
          onChange={onPhoto}
        />
      </div>

      {/* Observações */}
      <div className="mt-2">
        <textarea 
          placeholder="Observações..." 
          value={response.note || ''} 
          onChange={(e) => onNote(e.target.value)}
          className="w-full text-sm p-2 border rounded bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 min-h-[40px] resize-y print:bg-transparent print:border-none print:p-0"
        />
      </div>

      {/* Galeria de Fotos */}
      {response.photos && response.photos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
          {response.photos.map((photo) => (
            <div key={photo.id} className="relative aspect-square bg-gray-100 rounded overflow-hidden border">
              <img src={photo.data} alt="Evidência" className="w-full h-full object-cover" />
              <button 
                onClick={() => onRemovePhoto(photo.id)}
                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600 print:hidden"
              >
                <X size={12} />
              </button>
              {/* Upload Status Indicator */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5 print:hidden">
                {photo.uploaded ? "Salvo" : "Pendente"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
