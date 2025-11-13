import { useEffect } from 'react';
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

const GoogleAuth = ({ onLogin }) => {
  useEffect(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || '<COLOQUE_SEU_CLIENT_ID>',
        callback: (response) => {
          const credential = response.credential;
          if (!credential) return;
          const base64Payload = credential.split('.')[1];
          const decoded = JSON.parse(atob(base64Payload));
          onLogin({
            email: decoded.email,
            name: decoded.name
          });
        }
      });

      window.google.accounts.id.renderButton(
        document.getElementById('googleSignInDiv'),
        { theme: 'outline', size: 'large' }
      );

      window.google.accounts.id.prompt();
    }
  }, [onLogin]);

  return (
    <LoginBox>
      <h3>Entre com sua conta Google</h3>
      <p>Utilizamos apenas seu e-mail para identificar a reserva.</p>
      <div id="googleSignInDiv" />
    </LoginBox>
  );
};

export default GoogleAuth;
