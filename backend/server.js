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

await fsExtra.ensureDir(DATA_DIR);
await fsExtra.ensureDir(UPLOAD_DIR);
await fsExtra.ensureDir(ADMIN_DIR);
if (!(await fsExtra.pathExists(DATA_FILE))) {
  await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
}

const mutex = new Mutex();

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

app.get('/api/admin/agenda', async (_, res) => {
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

app.post('/api/admin/agenda', async (req, res) => {
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

app.delete('/api/admin/agenda/:id', async (req, res) => {
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

app.use('/uploads', express.static(UPLOAD_DIR));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
