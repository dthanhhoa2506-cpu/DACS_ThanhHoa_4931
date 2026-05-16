import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import UserPortal from './UserPortal';

function App() {
  return (
    <BrowserRouter>
      <UserPortal />
    </BrowserRouter>
  );
}

export default App;
