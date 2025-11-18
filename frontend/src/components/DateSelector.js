import React from 'react';
import { Section, ChipGroup, Chip, Feedback } from './Layout';

const DateSelector = ({ dates, selectedDate, onSelect }) => (
  <Section>
    <h2>Data da vistoria</h2>
    <p>Selecione o dia disponível para nossa equipe.</p>

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
  </Section>
);

export default DateSelector;
