import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  :root {
    --gray-900: #1d1f20;
    --gray-700: #3a3d3f;
    --gray-500: #6c6f72;
    --gray-300: #a5a8aa;
    --accent: #4f6ef7;
    --accent-light: #7f95ff;
    --success: #2a9d8f;
    --error: #e76f51;
    font-size: 16px;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    font-family: 'Inter', Arial, sans-serif;
    background: linear-gradient(135deg, var(--gray-900) 0%, #54585c 100%);
    color: #fff;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  button {
    font-family: inherit;
  }
`;

export default GlobalStyle;
