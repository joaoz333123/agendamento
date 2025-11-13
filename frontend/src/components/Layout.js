import styled from 'styled-components';

export const Page = styled.div`
  background: rgba(20, 22, 24, 0.82);
  border-radius: 24px;
  padding: 32px 40px;
  width: min(960px, 90vw);
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 32px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35);

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 24px;
  }
`;

export const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  h1 {
    font-size: 2.2rem;
    margin: 0;
    color: var(--accent-light);
  }

  p {
    color: var(--gray-300);
    margin: 0;
  }

  .tagline {
    color: #fff;
    font-weight: 500;
    letter-spacing: 0.02em;
  }
`;

export const Panel = styled.div`
  background: rgba(35, 37, 39, 0.7);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  h2 {
    margin: 0;
    font-size: 1rem;
    color: var(--gray-300);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
`;

export const Button = styled.button`
  background: ${({ variant }) =>
    variant === 'secondary' ? 'transparent' : 'var(--accent)'};
  color: ${({ variant }) => (variant === 'secondary' ? 'var(--accent-light)' : '#fff')};
  border: ${({ variant }) => (variant === 'secondary' ? '1px solid var(--accent-light)' : 'none')};
  border-radius: 12px;
  padding: 14px 18px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ disabled }) => (disabled ? 0.4 : 1)};
  transition: 0.2s ease;

  &:hover {
    transform: ${({ disabled }) => (disabled ? 'none' : 'translateY(-1px)')};
    box-shadow: ${({ disabled }) =>
      disabled ? 'none' : '0 10px 22px rgba(79, 110, 247, 0.25)'};
  }
`;

export const Input = styled.input`
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  color: #fff;
  outline: none;
  font-size: 0.95rem;
  width: 100%;

  &:focus {
    border-color: var(--accent-light);
    box-shadow: 0 0 0 2px rgba(79, 110, 247, 0.2);
  }
`;

export const Select = styled.select`
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  color: #fff;
  outline: none;
  font-size: 0.95rem;

  option { color: #000; }

  &:focus {
    border-color: var(--accent-light);
    box-shadow: 0 0 0 2px rgba(79, 110, 247, 0.2);
  }
`;

export const TextArea = styled.textarea`
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  color: #fff;
  min-height: 80px;
  resize: vertical;
  font-size: 0.95rem;
  outline: none;

  &:focus {
    border-color: var(--accent-light);
    box-shadow: 0 0 0 2px rgba(79, 110, 247, 0.2);
  }
`;

export const ChipGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

export const Chip = styled.button`
  background: ${({ active }) => (active ? 'var(--accent)' : 'rgba(255,255,255,0.06)')};
  color: ${({ active }) => (active ? '#fff' : 'var(--gray-300)')};
  border: ${({ active }) => (active ? '1px solid var(--accent-light)' : '1px solid transparent')};
  border-radius: 20px;
  padding: 10px 16px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: 0.2s ease;

  &:hover {
    background: ${({ active }) => (active ? 'var(--accent)' : 'rgba(255,255,255,0.12)')};
  }
`;

export const Feedback = styled.div`
  padding: 12px 14px;
  border-radius: 12px;
  background: ${({ type }) =>
    type === 'error' ? 'rgba(231, 111, 81, 0.15)' : 'rgba(42, 157, 143, 0.15)'};
  color: ${({ type }) => (type === 'error' ? '#ffb4a2' : '#a5ffd6')};
  border: 1px solid ${({ type }) =>
    type === 'error' ? 'rgba(231, 111, 81, 0.45)' : 'rgba(42, 157, 143, 0.45)'};
  font-size: 0.9rem;
`;
