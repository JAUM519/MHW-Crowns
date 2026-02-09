import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth.jsx";

import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import MonsterCarousel from "./pages/MonsterCarousel.jsx";
import Friends from "./pages/Friends.jsx";
import PublicMonsterCarousel from "./pages/PublicMonsterCarousel.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth />}>
        <Route path="/app" element={<Dashboard />} />
        <Route path="/monsters" element={<MonsterCarousel />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/friends/:uid" element={<PublicMonsterCarousel />} />
      </Route>

      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
