import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { Mutex } from 'async-mutex';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import fsExtra from 'fs-extra';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

dayjs.extend(utc);
dayjs.extend(timezone);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'agendamentos.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const ADMIN_DIR = path.join(__dirname, 'admin');
const CHECKLIST_FILE = path.join(UPLOAD_DIR, 'checklist_vistoria.md');
const CHECKLIST_RESPONSES_FILE = path.join(DATA_DIR, 'checklist_3991_responses.json');

await fsExtra.ensureDir(DATA_DIR);
await fsExtra.ensureDir(UPLOAD_DIR);
await fsExtra.ensureDir(ADMIN_DIR);
if (!(await fsExtra.pathExists(DATA_FILE))) {
  await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
}
if (!(await fsExtra.pathExists(CHECKLIST_RESPONSES_FILE))) {
  await fs.writeFile(CHECKLIST_RESPONSES_FILE, JSON.stringify({ sessions: {} }, null, 2));
} else {
  const checklistRaw = await fs.readFile(CHECKLIST_RESPONSES_FILE, 'utf-8');
  if (!checklistRaw.trim()) {
    await fs.writeFile(CHECKLIST_RESPONSES_FILE, JSON.stringify({ sessions: {} }, null, 2));
  }
}

const mutex = new Mutex();

const allowedAdminEmails = new Set(
  (process.env.ADMIN_ALLOWED_EMAILS || 'joaozanetti3@gmail.com')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'defina-um-segredo-seguro';
const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  process.env.ADMIN_GOOGLE_CLIENT_ID ||
  process.env.GOOGLE_OAUTH_CLIENT_ID ||
  process.env.REACT_APP_GOOGLE_CLIENT_ID ||
  '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const predefinedDates = [
  '2025-11-17',
  '2025-11-18',
  '2025-11-19',
  '2025-11-20',
  '2025-11-21'
];
const predefinedSlots = ['13:00', '14:00', '15:00', '16:00', '17:00'];
const adminStatuses = new Set(['aguardando_upload', 'reservado', 'cancelado']);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Formato inválido. Envie PDF ou imagem.'));
    }
    cb(null, true);
  }
});

async function readAppointments() {
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

async function writeAppointments(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

function expireIfNeeded(appointments) {
  const now = dayjs().utc();
  return appointments.map((appt) => {
    if (appt.status !== 'cancelado' && appt.expira_em && dayjs(appt.expira_em).isBefore(now)) {
      return { ...appt, status: 'cancelado' };
    }
    return appt;
  });
}

function buildAgendaSnapshot(appointments) {
  const appointmentsByKey = new Map();
  appointments.forEach((appt) => {
    appointmentsByKey.set(`${appt.data}|${appt.horario}`, appt);
  });

  const uniqueDates = Array.from(new Set([
    ...predefinedDates,
    ...appointments.map((appt) => appt.data)
  ])).sort();

  const agenda = [];

  uniqueDates.forEach((date) => {
    const slotsForDate = new Set(predefinedSlots);
    appointments
      .filter((appt) => appt.data === date)
      .forEach((appt) => slotsForDate.add(appt.horario));

    Array.from(slotsForDate).sort().forEach((slot) => {
      const key = `${date}|${slot}`;
      if (appointmentsByKey.has(key)) {
        agenda.push(appointmentsByKey.get(key));
        return;
      }

      agenda.push({
        id: null,
        data: date,
        horario: slot,
        shopping: '',
        nome_fantasia: '',
        nome_contato: '',
        telefone_whatsapp: '',
        email: '',
        informacoes_adicionais: '',
        status: 'disponivel',
        upload_arquivo: {
          url: null,
          tipo: null,
          tamanho_mb: null
        },
        data_hora_reserva: null,
        expira_em: null
      });
    });
  });

  return {
    agenda,
    dates: uniqueDates,
    slots: predefinedSlots
  };
}

function sanitizeStatus(status) {
  if (status && adminStatuses.has(status)) {
    return status;
  }
  return 'aguardando_upload';
}

function normalizeString(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function normalizeUploadPayload(payloadUpload = {}, previousUpload = {}) {
  const normalized = {
    url: payloadUpload.url ?? payloadUpload.upload_url ?? previousUpload.url ?? null,
    tipo: payloadUpload.tipo ?? previousUpload.tipo ?? null,
    tamanho_mb: previousUpload.tamanho_mb ?? null
  };

  const rawSize = payloadUpload.tamanho_mb ?? payloadUpload.upload_tamanho_mb;
  if (typeof rawSize === 'number' && Number.isFinite(rawSize)) {
    normalized.tamanho_mb = +rawSize;
  } else if (typeof rawSize === 'string' && rawSize.trim() !== '') {
    const parsed = Number(rawSize);
    if (!Number.isNaN(parsed)) {
      normalized.tamanho_mb = +parsed;
    }
  }

  return normalized;
}

const columnDescriptionKeywords = ['o que', 'descrição', 'condição atual', 'conclusão preliminar'];
const checklistCache = {
  mtimeMs: null,
  data: null
};

function slugify(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function inferInputConfig(headerLabel = '') {
  const normalized = headerLabel.toLowerCase();
  const compact = normalized.replace(/[^a-z]/g, '');

  if (compact.includes('fotos') || normalized.includes('s/n')) {
    return {
      type: 'select',
      options: [
        { value: 'S', label: 'Sim (S)' },
        { value: 'N', label: 'Não (N)' },
        { value: 'NA', label: 'N/A' }
      ]
    };
  }

  if (compact.includes('srok')) {
    return {
      type: 'select',
      options: [
        { value: 'S', label: 'Substituir (S)' },
        { value: 'R', label: 'Reparar (R)' },
        { value: 'OK', label: 'OK' }
      ]
    };
  }

  if (normalized.includes('observa') || normalized.includes('anota')) {
    return { type: 'textarea' };
  }

  if (normalized.includes('preencher')) {
    return { type: 'text' };
  }

  return { type: 'text' };
}

function classifyColumn(headerLabel = '', columnIndex = 0) {
  if (columnIndex === 0) {
    return {
      key: `col${columnIndex}`,
      label: headerLabel || `Coluna ${columnIndex + 1}`,
      role: 'label',
      columnIndex
    };
  }

  const normalized = headerLabel.toLowerCase();
  if (columnDescriptionKeywords.some((keyword) => normalized.includes(keyword))) {
    return {
      key: `col${columnIndex}`,
      label: headerLabel,
      role: 'description',
      columnIndex
    };
  }

  const inputConfig = inferInputConfig(headerLabel);
  return {
    key: `col${columnIndex}`,
    label: headerLabel,
    role: 'input',
    inputType: inputConfig.type,
    options: inputConfig.options ?? null,
    columnIndex
  };
}

function parseTable(lines = []) {
  const sanitized = lines.filter((line) => line.trim().startsWith('|'));
  if (sanitized.length < 3) {
    return null;
  }

  const headerCells = sanitized[0]
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());

  const rows = [];
  for (let index = 2; index < sanitized.length; index += 1) {
    const rawLine = sanitized[index];
    if (!rawLine.includes('|')) continue;
    const cells = rawLine
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.every((cell) => cell === '')) continue;

    while (cells.length < headerCells.length) {
      cells.push('');
    }

    rows.push(cells);
  }

  if (!rows.length) {
    return null;
  }

  return {
    headers: headerCells,
    rows
  };
}

function buildSectionFromTable(title, table) {
  if (!table) return null;

  const sectionId = slugify(title || `secao-${Date.now()}`) || `secao-${Date.now()}`;
  const columns = table.headers.map((header, index) => classifyColumn(header, index));
  const rows = table.rows.map((cells, rowIndex) => {
    const label = cells[0] || `Item ${rowIndex + 1}`;
    const rowId = `${sectionId}-${slugify(`${label}-${rowIndex}`)}`;

    const descriptionColumn = columns.find((column) => column.role === 'description');
    const details =
      descriptionColumn && cells[descriptionColumn.columnIndex]
        ? cells[descriptionColumn.columnIndex]
        : '';

    const fields = columns
      .filter((column) => column.role === 'input')
      .map((column) => ({
        id: `${rowId}__${column.key}`,
        storageKey: `${sectionId}__${rowId}__${column.key}`,
        label: column.label,
        type: column.inputType || 'text',
        options: column.options || null,
        columnIndex: column.columnIndex
      }));

    return {
      id: rowId,
      label,
      details,
      fields
    };
  });

  return {
    id: sectionId,
    title: title || 'Seção',
    rows
  };
}

function parseChecklistMarkdown(markdown = '') {
  const lines = markdown.split(/\r?\n/);
  let mainTitle = 'Checklist';
  let currentSectionTitle = 'Informações Gerais';
  const sections = [];
  let pendingTableLines = [];

  const flushTable = () => {
    if (!pendingTableLines.length) return;
    const table = parseTable(pendingTableLines);
    pendingTableLines = [];
    if (!table) return;
    const section = buildSectionFromTable(currentSectionTitle, table);
    if (section) {
      sections.push(section);
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushTable();
      continue;
    }

    if (trimmed === '---' || trimmed.toLowerCase().startsWith('# versão compacta')) {
      flushTable();
      break;
    }

    if (trimmed.startsWith('# ')) {
      mainTitle = trimmed.replace(/^#\s*/, '').trim() || mainTitle;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flushTable();
      currentSectionTitle = trimmed.replace(/^##\s*/, '').trim() || currentSectionTitle;
      continue;
    }

    if (trimmed.startsWith('|')) {
      pendingTableLines.push(line);
      continue;
    }

    flushTable();
  }

  flushTable();

  if (sections.length) {
    sections[0] = {
      ...sections[0],
      id: sections[0].id || 'dados-gerais',
      title: sections[0].title || 'Dados Gerais do Veículo'
    };
  }

  return {
    title: mainTitle,
    sections
  };
}

async function loadChecklistStructure() {
  const stats = await fs.stat(CHECKLIST_FILE);
  if (checklistCache.data && checklistCache.mtimeMs === stats.mtimeMs) {
    return checklistCache.data;
  }

  const markdown = await fs.readFile(CHECKLIST_FILE, 'utf-8');
  const parsed = parseChecklistMarkdown(markdown);
  checklistCache.data = parsed;
  checklistCache.mtimeMs = stats.mtimeMs;
  return parsed;
}

async function readChecklistResponsesStore() {
  try {
    const raw = await fs.readFile(CHECKLIST_RESPONSES_FILE, 'utf-8');
    if (!raw.trim()) {
      return { sessions: {} };
    }
    const parsed = JSON.parse(raw);
    if (!parsed.sessions || typeof parsed.sessions !== 'object') {
      return { sessions: {} };
    }
    return { sessions: parsed.sessions };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { sessions: {} };
    }
    throw error;
  }
}

async function writeChecklistResponsesStore(store) {
  await fs.writeFile(CHECKLIST_RESPONSES_FILE, JSON.stringify(store, null, 2));
}

function buildAppointmentPayload(payload, previous = null) {
  const now = dayjs().utc();
  const base = previous ?? {
    id: uuidv4(),
    upload_arquivo: {
      url: null,
      tipo: null,
      tamanho_mb: null
    },
    data_hora_reserva: now.toISOString(),
    expira_em: now.add(24, 'hour').toISOString()
  };

  const infoAdicional = normalizeString(payload.informacoes_adicionais || '');

  const dataHoraReserva = payload.data_hora_reserva
    ? dayjs(payload.data_hora_reserva).isValid()
      ? dayjs(payload.data_hora_reserva).toISOString()
      : base.data_hora_reserva
    : base.data_hora_reserva;

  const expiraEm = payload.expira_em
    ? dayjs(payload.expira_em).isValid()
      ? dayjs(payload.expira_em).toISOString()
      : base.expira_em
    : base.expira_em;

  const previousUpload = previous?.upload_arquivo ?? base.upload_arquivo;

  return {
    ...base,
    data: payload.data,
    horario: payload.horario,
    shopping: normalizeString(payload.shopping || ''),
    nome_fantasia: normalizeString(payload.nome_fantasia || ''),
    nome_contato: normalizeString(payload.nome_contato || ''),
    telefone_whatsapp: normalizeString(payload.telefone_whatsapp || ''),
    email: normalizeString(payload.email || ''),
    informacoes_adicionais: infoAdicional.slice(0, 200),
    status: sanitizeStatus(payload.status || previous?.status),
    upload_arquivo: normalizeUploadPayload(
      payload.upload_arquivo ?? {
        url: payload.upload_url,
        tipo: payload.upload_tipo,
        tamanho_mb: payload.upload_tamanho_mb
      },
      previousUpload
    ),
    data_hora_reserva: dataHoraReserva,
    expira_em: expiraEm
  };
}

function isAllowedAdminEmail(email = '') {
  return allowedAdminEmails.has(email.trim().toLowerCase());
}

async function verifyGoogleCredential(credential) {
  if (!googleClient || !GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID não configurado para autenticação administrativa.');
  }
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: GOOGLE_CLIENT_ID
  });
  return ticket.getPayload();
}

function createAdminToken(email) {
  return jwt.sign({ email, role: 'admin' }, ADMIN_SESSION_SECRET, { expiresIn: '2h' });
}

function adminAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Credenciais administrativas ausentes.' });
  }

  try {
    const decoded = jwt.verify(token, ADMIN_SESSION_SECRET);
    const email = decoded?.email;

    if (!email || !isAllowedAdminEmail(email)) {
      return res.status(403).json({ message: 'Acesso administrativo não autorizado.' });
    }

    req.admin = { email };
    next();
  } catch (error) {
    console.error('Token administrativo inválido:', error.message);
    return res.status(401).json({ message: 'Sessão administrativa expirada ou inválida.' });
  }
}

app.use('/admin', express.static(ADMIN_DIR));

app.get('/api/dates', (_, res) => {
  res.json({ dates: predefinedDates });
});

app.get('/api/slots', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ message: 'Data é obrigatória.' });

  await mutex.runExclusive(async () => {
    const appointments = expireIfNeeded(await readAppointments());
    await writeAppointments(appointments);

    const taken = appointments
      .filter(
        (appt) =>
          appt.data === date &&
          appt.status !== 'cancelado'
      )
      .map((appt) => appt.horario);

    const slots = predefinedSlots.map((slot) => ({
      time: slot,
      available: !taken.includes(slot)
    }));

    res.json({
      slots,
      availableSlots: slots.filter((slot) => slot.available).map((slot) => slot.time)
    });
  });
});

app.post('/api/reservations', async (req, res) => {
  const payload = req.body;
  const required = [
    'data', 'horario', 'shopping',
    'nome_fantasia', 'nome_contato',
    'telefone_whatsapp', 'email'
  ];

  for (const field of required) {
    if (!payload[field] || String(payload[field]).trim() === '') {
      return res.status(400).json({ message: `Campo obrigatório ausente: ${field}` });
    }
  }

  const now = dayjs().utc();
  const expiraEm = now.add(24, 'hour');

  await mutex.runExclusive(async () => {
    let appointments = await readAppointments();
    appointments = expireIfNeeded(appointments);

    const existsActive = appointments.some(
      (appt) =>
        appt.data === payload.data &&
        appt.horario === payload.horario &&
        appt.status !== 'cancelado'
    );

    if (existsActive) {
      return res.status(409).json({ message: 'Horário indisponível. Escolha outro horário.' });
    }

    const newAppointment = {
      id: uuidv4(),
      data: payload.data,
      horario: payload.horario,
      shopping: payload.shopping,
      nome_fantasia: payload.nome_fantasia,
      nome_contato: payload.nome_contato,
      telefone_whatsapp: payload.telefone_whatsapp,
      email: payload.email,
      informacoes_adicionais: payload.informacoes_adicionais?.slice(0, 200) || '',
      status: 'aguardando_upload',
      upload_arquivo: {
        url: null,
        tipo: null,
        tamanho_mb: null
      },
      data_hora_reserva: now.toISOString(),
      expira_em: expiraEm.toISOString()
    };

    appointments.push(newAppointment);
    await writeAppointments(appointments);

    res.status(201).json({ reservation: newAppointment });
  });
});

app.post('/api/reservations/:id/upload', upload.single('arquivo'), async (req, res) => {
  const { id } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: 'Nenhum arquivo recebido.' });
  }

  await mutex.runExclusive(async () => {
    let appointments = await readAppointments();
    let updated = false;

    appointments = expireIfNeeded(appointments);

    appointments = appointments.map((appt) => {
      if (appt.id === id) {
        if (appt.status === 'cancelado') {
          fsExtra.remove(path.join(UPLOAD_DIR, file.filename));
          return appt;
        }
        updated = true;
        return {
          ...appt,
          status: 'reservado',
          upload_arquivo: {
            url: `/uploads/${file.filename}`,
            tipo: file.mimetype.includes('pdf') ? 'pdf' : 'imagem',
            tamanho_mb: +(file.size / (1024 * 1024)).toFixed(2)
          }
        };
      }
      return appt;
    });

    if (!updated) {
      fsExtra.remove(path.join(UPLOAD_DIR, file.filename));
      return res.status(404).json({ message: 'Agendamento não encontrado ou expirado.' });
    }

    await writeAppointments(appointments);
    res.json({ message: 'Upload concluído com sucesso.' });
  });
});

app.post('/api/admin/login', async (req, res) => {
  const { credential } = req.body ?? {};
  if (!credential) {
    return res.status(400).json({ message: 'É necessário enviar a credencial do Google.' });
  }

  try {
    const payload = await verifyGoogleCredential(credential);
    const email = payload?.email?.toLowerCase();

    if (!email || !isAllowedAdminEmail(email)) {
      return res.status(403).json({ message: 'Este e-mail não possui acesso administrativo.' });
    }

    const token = createAdminToken(email);
    res.json({ token, user: { email, name: payload?.name ?? '' } });
  } catch (error) {
    console.error('Falha na autenticação administrativa:', error);
    res.status(401).json({ message: 'Não foi possível validar a conta Google fornecida.' });
  }
});

app.get('/api/admin/agenda', adminAuthMiddleware, async (_, res) => {
  try {
    let snapshot = { agenda: [], dates: [], slots: predefinedSlots };
    await mutex.runExclusive(async () => {
      const appointments = expireIfNeeded(await readAppointments());
      await writeAppointments(appointments);
      snapshot = buildAgendaSnapshot(appointments);
    });
    res.json(snapshot);
  } catch (error) {
    console.error('Erro ao carregar agenda administrativa:', error);
    res.status(500).json({ message: 'Erro ao carregar agenda.' });
  }
});

app.post('/api/admin/agenda', adminAuthMiddleware, async (req, res) => {
  try {
    await mutex.runExclusive(async () => {
      const payload = req.body ?? {};
      if (!payload.data || !payload.horario) {
        res.status(400).json({ message: 'Campos data e horário são obrigatórios.' });
        return;
      }

      let appointments = expireIfNeeded(await readAppointments());

      if (payload.id) {
        const idx = appointments.findIndex((appt) => appt.id === payload.id);
        if (idx === -1) {
          res.status(404).json({ message: 'Agendamento não encontrado.' });
          return;
        }

        const updated = buildAppointmentPayload(payload, appointments[idx]);
        appointments[idx] = updated;

        await writeAppointments(appointments);
        res.json({ appointment: updated });
        return;
      }

      const existsActive = appointments.some(
        (appt) =>
          appt.data === payload.data &&
          appt.horario === payload.horario &&
          appt.status !== 'cancelado'
      );

      if (existsActive) {
        res.status(409).json({ message: 'Já existe um agendamento ativo para este horário.' });
        return;
      }

      const created = buildAppointmentPayload(payload, null);
      appointments.push(created);

      await writeAppointments(appointments);
      res.status(201).json({ appointment: created });
    });
  } catch (error) {
    console.error('Erro ao salvar agendamento administrativo:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro ao salvar agendamento.' });
    }
  }
});

app.delete('/api/admin/agenda/:id', adminAuthMiddleware, async (req, res) => {
  try {
    await mutex.runExclusive(async () => {
      let appointments = expireIfNeeded(await readAppointments());
      const { id } = req.params;
      const initialLength = appointments.length;
      appointments = appointments.filter((appt) => appt.id !== id);

      if (appointments.length === initialLength) {
        res.status(404).json({ message: 'Agendamento não encontrado.' });
        return;
      }

      await writeAppointments(appointments);
      res.json({ message: 'Agendamento removido com sucesso.' });
    });
  } catch (error) {
    console.error('Erro ao remover agendamento administrativo:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro ao remover agendamento.' });
    }
  }
});

app.get('/api/checklists/3991', async (_, res) => {
  try {
    const checklist = await loadChecklistStructure();
    res.json(checklist);
  } catch (error) {
    console.error('Erro ao carregar checklist 3991:', error);
    res.status(500).json({ message: 'Não foi possível carregar o checklist solicitado.' });
  }
});

app.get('/api/checklists/3991/responses/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId || !sessionId.trim()) {
    return res.status(400).json({ message: 'sessionId é obrigatório.' });
  }

  try {
    const store = await readChecklistResponsesStore();
    const session = store.sessions[sessionId] ?? null;
    res.json({
      sessionId,
      answers: session?.answers ?? {},
      updatedAt: session?.updatedAt ?? null,
      createdAt: session?.createdAt ?? null
    });
  } catch (error) {
    console.error('Erro ao recuperar respostas do checklist 3991:', error);
    res.status(500).json({ message: 'Erro ao recuperar respostas salvas.' });
  }
});

app.put('/api/checklists/3991/responses', async (req, res) => {
  const payload = req.body ?? {};
  const answersPayload = payload.answers;
  const nowIso = new Date().toISOString();
  let sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : '';
  if (!sessionId) {
    sessionId = uuidv4();
  }

  if (!answersPayload || typeof answersPayload !== 'object' || Array.isArray(answersPayload)) {
    return res.status(400).json({ message: 'Envie um objeto "answers" com os campos do checklist.' });
  }

  try {
    await mutex.runExclusive(async () => {
      const store = await readChecklistResponsesStore();
      const existing = store.sessions[sessionId] ?? {
        sessionId,
        createdAt: nowIso,
        updatedAt: nowIso,
        answers: {}
      };

      const mergedAnswers = { ...existing.answers };
      Object.entries(answersPayload).forEach(([key, value]) => {
        if (typeof key !== 'string') return;
        const normalizedKey = key.trim();
        if (!normalizedKey) return;
        const sanitizedValue =
          value === null || value === undefined
            ? ''
            : typeof value === 'string'
            ? value
            : String(value);
        mergedAnswers[normalizedKey] = sanitizedValue.trim();
      });

      const updatedSession = {
        sessionId,
        createdAt: existing.createdAt || nowIso,
        updatedAt: nowIso,
        answers: mergedAnswers
      };

      store.sessions[sessionId] = updatedSession;
      await writeChecklistResponsesStore(store);

      res.json({
        sessionId,
        savedAt: updatedSession.updatedAt,
        answers: updatedSession.answers
      });
    });
  } catch (error) {
    console.error('Erro ao salvar respostas do checklist 3991:', error);
    res.status(500).json({ message: 'Erro ao salvar respostas do checklist.' });
  }
});

app.use('/uploads', express.static(UPLOAD_DIR));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
