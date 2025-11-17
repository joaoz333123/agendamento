import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  :root {
    --hero-blue: #0a4d8c;
    --cta-blue: #1c7ff2;
    --cta-blue-dark: #1562b8;
    --gray-900: #101828;
    --gray-500: #475467;
    --gray-300: #7a869a;
    --border-soft: #e4e7ec;
    --surface: #ffffff;
    font-size: 16px;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: 'Inter', Arial, sans-serif;
    background: #f5f8fc;
    color: var(--gray-900);
    min-height: 100vh;
    padding: 32px;
  }

  #root {
    width: 100%;
    min-height: calc(100vh - 64px);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  button {
    font-family: inherit;
  }
`;

export default GlobalStyle;
