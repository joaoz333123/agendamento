import styled from 'styled-components';

export const Page = styled.div`
  width: min(1200px, 96vw);
  min-height: 680px;
  background: var(--surface);
  border-radius: 28px;
  padding: 32px 36px;
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 40px;
  box-shadow: 0 25px 70px rgba(16, 24, 40, 0.1);
  border: 1px solid var(--border-soft);
`;

export const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 20px;

  h1 {
    font-size: 3.1rem;
    margin: 8px 0;
    color: var(--gray-900);
    line-height: 1.1;
  }

  p {
    color: var(--gray-500);
    margin: 0;
    font-size: 1rem;
    line-height: 1.5;
  }

  .tagline {
    color: var(--hero-blue);
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    font-size: 0.8rem;
  }
`;

export const Panel = styled.div`
  background: #f8fbff;
  border-radius: 24px;
  padding: 24px 26px;
  border: 1px solid var(--border-soft);
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

export const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  h2 {
    margin: 0;
    font-size: 1rem;
    color: var(--gray-900);
    font-weight: 600;
  }

  p {
    margin: 0;
    color: var(--gray-500);
    font-size: 0.95rem;
  }
`;

export const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: ${({ variant }) =>
    variant === 'secondary' ? '#ffffff' : 'var(--cta-blue)'};
  color: ${({ variant }) => (variant === 'secondary' ? 'var(--cta-blue)' : '#fff')};
  border: ${({ variant }) =>
    variant === 'secondary' ? '1px solid var(--cta-blue)' : '1px solid transparent'};
  border-radius: 12px;
  padding: 12px 20px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
  transition: background 0.15s ease;

  &:hover {
    background: ${({ variant, disabled }) =>
      disabled ? undefined : variant === 'secondary' ? '#f0f6ff' : 'var(--cta-blue-dark)'};
  }
`;

const inputStyles = `
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--border-soft);
  background: #fff;
  color: var(--gray-900);
  outline: none;
  font-size: 0.95rem;
  width: 100%;

  &::placeholder {
    color: var(--gray-300);
  }

  &:focus {
    border-color: var(--cta-blue);
    box-shadow: 0 0 0 1px rgba(28, 127, 242, 0.2);
  }
`;

export const Input = styled.input`
  ${inputStyles}
`;

export const Select = styled.select`
  ${inputStyles}
  appearance: none;
`;

export const TextArea = styled.textarea`
  ${inputStyles}
  min-height: 90px;
  resize: none;
`;

export const ChipGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

export const Chip = styled.button`
  background: ${({ active, disabled }) =>
    disabled ? '#f2f4f7' : active ? 'var(--cta-blue)' : '#ffffff'};
  color: ${({ active, disabled }) =>
    disabled ? 'var(--gray-300)' : active ? '#fff' : 'var(--gray-500)'};
  border: 1px solid
    ${({ active, disabled }) =>
      disabled ? 'var(--border-soft)' : active ? 'var(--cta-blue)' : 'var(--border-soft)'};
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 0.9rem;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ disabled }) => (disabled ? 0.7 : 1)};
`;

export const Feedback = styled.div`
  padding: 12px 14px;
  border-radius: 12px;
  background: ${({ type }) =>
    type === 'error'
      ? 'rgba(235, 87, 87, 0.1)'
      : type === 'success'
      ? 'rgba(76, 175, 80, 0.1)'
      : '#eef2ff'};
  color: ${({ type }) =>
    type === 'error'
      ? '#b42318'
      : type === 'success'
      ? '#0f6c3e'
      : '#1c7ff2'};
  border: 1px solid
    ${({ type }) =>
      type === 'error'
        ? 'rgba(235, 87, 87, 0.3)'
        : type === 'success'
        ? 'rgba(76, 175, 80, 0.3)'
        : 'rgba(28, 127, 242, 0.3)'};
  font-size: 0.9rem;
`;
