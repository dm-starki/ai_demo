import { App as AntApp, ConfigProvider, theme } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { App } from './App.js';
import { AuthProvider } from './auth/AuthContext.js';
import { store } from './store.js';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ConfigProvider locale={ruRU} theme={{ algorithm: theme.darkAlgorithm }}>
        <BrowserRouter>
          <AuthProvider>
            <AntApp>
              <App />
            </AntApp>
          </AuthProvider>
        </BrowserRouter>
      </ConfigProvider>
    </Provider>
  </React.StrictMode>,
);
