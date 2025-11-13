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

await fsExtra.ensureDir(DATA_DIR);
await fsExtra.ensureDir(UPLOAD_DIR);
if (!(await fsExtra.pathExists(DATA_FILE))) {
  await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
}

const mutex = new Mutex();

const predefinedDates = Array.from({ length: 10 }).map((_, idx) =>
  dayjs().tz('America/Sao_Paulo').add(idx + 1, 'day').format('YYYY-MM-DD')
);
const predefinedSlots = [
  '09:00', '10:00', '11:00',
  '13:00', '14:00', '15:00',
  '16:00', '17:00'
];

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

app.get('/api/dates', (_, res) => {
  res.json({ dates: predefinedDates });
});

app.get('/api/slots', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ message: 'Data é obrigatória.' });

  await mutex.runExclusive(async () => {
    const appointments = expireIfNeeded(await readAppointments());
    await writeAppointments(appointments);

    const taken = appointments.filter(
      (appt) =>
        appt.data === date &&
        appt.status !== 'cancelado'
    ).map((appt) => appt.horario);

    const available = predefinedSlots.filter((slot) => !taken.includes(slot));
    res.json({ availableSlots: available });
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

app.use('/uploads', express.static(UPLOAD_DIR));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
