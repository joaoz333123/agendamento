import React from 'react';
import { Section, Input, Select, TextArea } from './Layout';

const FormFields = ({ formData, onChange, errors }) => {
  const shoppings = [
    'Shopping Centro',
    'Shopping Leste',
    'Shopping Norte',
    'Shopping Sul',
    'Shopping Oeste'
  ];

  return (
    <>
      <Section>
        <h2>Detalhes da operação</h2>
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
      </Section>

      <Section>
        <h2>Informações adicionais (opcional)</h2>
        <TextArea
          placeholder="Até 200 caracteres..."
          maxLength={200}
          value={formData.informacoes_adicionais}
          onChange={(e) => onChange('informacoes_adicionais', e.target.value)}
        />
      </Section>
      {errors && Object.values(errors).length > 0 && (
        <Section>
          <div style={{ color: '#ffb4a2', fontSize: '0.85rem' }}>
            {Object.values(errors).map((msg) => (
              <div key={msg}>{msg}</div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
};

export default FormFields;
