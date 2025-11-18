import { useEffect, useRef } from 'react';
import styled from 'styled-components';

const LoginBox = styled.div`
  background: rgba(255,255,255,0.06);
  border-radius: 18px;
  padding: 24px;
  text-align: center;
  color: var(--gray-300);
  display: flex;
  flex-direction: column;
  gap: 12px;

  h3 {
    color: #fff;
    margin: 0;
  }
`;

const GoogleAuth = ({ onLogin, title = 'Entre com sua conta Google', description = 'Utilizamos apenas seu e-mail para identificar a reserva.', compact = false }) => {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!window.google || !buttonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || '<COLOQUE_SEU_CLIENT_ID>',
      ux_mode: 'popup',
      callback: (response) => {
        const credential = response.credential;
        if (!credential) return;
        const base64Payload = credential.split('.')[1];
        const decoded = JSON.parse(atob(base64Payload));
        onLogin?.({
          email: decoded.email,
          name: decoded.name,
          picture: decoded.picture,
          credential
        });
      }
    });

    buttonRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(
      buttonRef.current,
      { theme: 'outline', size: 'large' }
    );
  }, [onLogin]);

  const button = <div ref={buttonRef} />;

  if (compact) {
    return button;
  }

  return (
    <LoginBox>
      {title && <h3>{title}</h3>}
      {description && <p>{description}</p>}
      {button}
    </LoginBox>
  );
};

export default GoogleAuth;
