import React from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../auth/AuthProvider";
import { Navigate, useLocation } from "react-router-dom";

import "../styles/layout.css";
import "../styles/login.css";

export default function Login() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const from = location.state?.from || "/app";

  async function loginGoogle() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  if (loading) return <p className="container">Cargando…</p>;
  if (user) return <Navigate to={from} replace />;

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-left" aria-hidden="true">
          <div className="login-left-inner">
            <div className="login-kicker">WELCOME</div>
            <h1 className="login-headline">Coronas MHW:I</h1>
            <p className="login-subtitle">
              Inicia sesión con Google para guardar tu progreso en la nube y continuar en cualquier dispositivo.
            </p>

            <div className="orb orb-1" />
            <div className="orb orb-2" />
            <div className="orb orb-3" />
          </div>
        </section>

        <section className="login-right">
          <div className="login-card">
            <div className="login-title">Sign in</div>
            <div className="login-hint">Usa tu cuenta de Google.</div>

            <button className="login-google-btn" onClick={loginGoogle}>
              <span className="g-dot" aria-hidden="true" />
              Iniciar sesión con Google
            </button>

            <div className="login-footnote">
              Al iniciar sesión, tus coronas se guardan en Firebase con tu usuario.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
