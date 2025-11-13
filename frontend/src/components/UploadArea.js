import React, { useRef, useState } from 'react';
import { Section, Button, Feedback } from './Layout';

const UploadArea = ({ onUpload, loading, status }) => {
  const inputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
  };

  const handleSubmit = () => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  return (
    <Section>
      <h2>Envie o material</h2>
      <p style={{ color: 'var(--gray-300)', fontSize: '0.9rem', margin: 0 }}>
        Tipos aceitos: PDF ou imagem (até 4 MB). Apenas um arquivo por agendamento.
      </p>
      <Button variant="secondary" onClick={() => inputRef.current.click()}>
        Selecionar arquivo
      </Button>
      <input
        type="file"
        ref={inputRef}
        onChange={handleFile}
        accept=".pdf, image/png, image/jpeg, image/jpg, image/webp"
        style={{ display: 'none' }}
      />
      {selectedFile && (
        <Feedback type="success">
          Arquivo selecionado: <strong>{selectedFile.name}</strong> ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
        </Feedback>
      )}
      <Button onClick={handleSubmit} disabled={!selectedFile || loading}>
        {loading ? 'Enviando...' : 'Enviar arquivo'}
      </Button>
      {status && (
        <Feedback type={status.type}>
          {status.message}
        </Feedback>
      )}
    </Section>
  );
};

export default UploadArea;
