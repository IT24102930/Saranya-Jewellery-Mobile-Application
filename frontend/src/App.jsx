import React, { useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { pages } from './pages/index.js';
import { routeMap } from './routeMap';

const NO_BACK_ROUTES = new Set(['/', '/customer-login', '/staff-login']);

function SwipeBack() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (NO_BACK_ROUTES.has(location.pathname)) return undefined;

    const EDGE = 25;
    const X_THRESHOLD = 80;
    const Y_TOLERANCE = 60;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    function onTouchStart(e) {
      const t = e.touches[0];
      if (!t) return;
      if (t.clientX <= EDGE) {
        startX = t.clientX;
        startY = t.clientY;
        tracking = true;
      } else {
        tracking = false;
      }
    }

    function onTouchEnd(e) {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (dx >= X_THRESHOLD && dy <= Y_TOLERANCE) {
        navigate(-1);
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [navigate, location.pathname]);

  return null;
}

export default function App() {
  return (
    <>
      <SwipeBack />
      <Routes>
        {Object.entries(routeMap).map(([path, pageKey]) => {
          const PageComponent = pages[pageKey];
          if (!PageComponent) return null;

          return <Route key={path} path={path} element={<PageComponent />} />;
        })}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
