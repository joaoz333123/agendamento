import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import { Section, Button, Feedback } from './Layout';

const ActionsRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 8px;
`;

const FileBadge = styled.div`
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: var(--gray-300);
  font-size: 0.85rem;

  strong {
    color: #fff;
  }
`;

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
      <p>Arquivos em PDF ou imagem, até 4 MB. Apenas um arquivo por agendamento.</p>

      <ActionsRow>
        <Button variant="secondary" onClick={() => inputRef.current.click()}>
          Selecionar arquivo
        </Button>
        <Button onClick={handleSubmit} disabled={!selectedFile || loading}>
          {loading ? 'Enviando...' : 'Enviar arquivo'}
        </Button>
      </ActionsRow>

      <input
        type="file"
        ref={inputRef}
        onChange={handleFile}
        accept=".pdf, image/png, image/jpeg, image/jpg, image/webp"
        style={{ display: 'none' }}
      />

      {selectedFile && (
        <FileBadge>
          Arquivo selecionado: <strong>{selectedFile.name}</strong>{' '}
          ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
        </FileBadge>
      )}

      {status && (
        <Feedback type={status.type}>
          {status.message}
        </Feedback>
      )}
    </Section>
  );
};

export default UploadArea;
