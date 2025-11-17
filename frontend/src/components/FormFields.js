import React from 'react';
import styled from 'styled-components';
import { Section, Input, Select, TextArea } from './Layout';

const FieldsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const NoteWrapper = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 6px;

  small {
    color: var(--gray-300);
    font-size: 0.8rem;
  }
`;

const ErrorList = styled.div`
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(231, 111, 81, 0.35);
  background: rgba(231, 111, 81, 0.08);
  color: #ffb4a2;
  font-size: 0.85rem;
  line-height: 1.3;
`;

const FormFields = ({ formData, onChange, errors }) => {
  const shoppings = [
    'Shopping Centro',
    'Shopping Leste',
    'Shopping Norte',
    'Shopping Sul',
    'Shopping Oeste'
  ];

  return (
    <Section>
      <h2>Detalhes da operação</h2>
      <FieldsGrid>
        <Select
          value={formData.shopping}
          onChange={(e) => onChange('shopping', e.target.value)}
        >
          <option value="">Selecione o shopping...</option>
          {shoppings.map((shop) => (
            <option key={shop} value={shop}>
              {shop}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Nome fantasia da operação"
          value={formData.nome_fantasia}
          onChange={(e) => onChange('nome_fantasia', e.target.value)}
        />
        <Input
          placeholder="Nome do contato"
          value={formData.nome_contato}
          onChange={(e) => onChange('nome_contato', e.target.value)}
        />
        <Input
          placeholder="Telefone WhatsApp"
          value={formData.telefone_whatsapp}
          onChange={(e) => onChange('telefone_whatsapp', e.target.value)}
        />
        <Input
          placeholder="Email"
          value={formData.email}
          onChange={(e) => onChange('email', e.target.value)}
        />
        <NoteWrapper>
          <TextArea
            placeholder="Informações adicionais para nossa equipe..."
            maxLength={200}
            value={formData.informacoes_adicionais}
            onChange={(e) => onChange('informacoes_adicionais', e.target.value)}
          />
          <small>Opcional · limite de 200 caracteres.</small>
        </NoteWrapper>
      </FieldsGrid>

      {errors && Object.values(errors).length > 0 && (
        <ErrorList>
          {Object.values(errors).map((msg) => (
            <div key={msg}>{msg}</div>
          ))}
        </ErrorList>
      )}
    </Section>
  );
};

export default FormFields;
