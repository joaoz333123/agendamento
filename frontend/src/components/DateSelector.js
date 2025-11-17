import React from 'react';
import { Section, ChipGroup, Chip, Feedback } from './Layout';

const DateSelector = ({ dates, selectedDate, onSelect }) => (
  <Section>
    <h2>Escolha a data</h2>
    <p>Atualizamos a agenda em tempo real conforme novas confirmações.</p>

    {dates.length === 0 ? (
      <Feedback type="error">
        Não encontramos datas disponíveis agora. Recarregue a página em instantes.
      </Feedback>
    ) : (
      <ChipGroup>
        {dates.map((date) => {
          const formatted = new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            weekday: 'short'
          });
          return (
            <Chip
              key={date}
              active={selectedDate === date}
              onClick={() => onSelect(date)}
            >
              {formatted}
            </Chip>
          );
        })}
      </ChipGroup>
    )}
  </Section>
);

export default DateSelector;
