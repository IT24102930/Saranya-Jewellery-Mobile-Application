import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { pages } from './pages/index.js';
import { routeMap } from './routeMap';

export default function App() {
  return (
    <Routes>
      {Object.entries(routeMap).map(([path, pageKey]) => {
        const PageComponent = pages[pageKey];
        if (!PageComponent) return null;

        return <Route key={path} path={path} element={<PageComponent />} />;
      })}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
