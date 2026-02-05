import React, { useEffect, useMemo, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../auth/AuthProvider";
import { Link } from "react-router-dom";

import "../styles/layout.css";
import "../styles/carousel.css";

function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function monsterImageUrl(monsterName) {
  const slug = slugify(monsterName);
  return `/monsters/${slug}.png`; // cambia a .jpg si tus imágenes son jpg
}

export default function MonsterCarousel() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [idx, setIdx] = useState(0);
  const [imgError, setImgError] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const ref = doc(db, "users", user.uid, "crownData", "main");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setRows(Array.isArray(data?.rows) ? data.rows : []);
        setFileName(typeof data?.fileName === "string" ? data.fileName : "");
      } else {
        setRows([]);
        setFileName("");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  useEffect(() => {
    if (idx >= rows.length) setIdx(0);
  }, [rows.length, idx]);

  useEffect(() => {
    setImgError(false);
  }, [idx]);

  const current = rows[idx];

  const progress = useMemo(() => {
    if (!rows.length) return { done: 0, total: 0 };
    const done = rows.reduce((a, r) => a + (r.small && r.large ? 1 : 0), 0);
    return { done, total: rows.length };
  }, [rows]);

  async function saveToCloud(nextRows) {
    setSaving(true);
    try {
      const ref = doc(db, "users", user.uid, "crownData", "main");
      await setDoc(ref, { rows: nextRows, fileName, updatedAt: Date.now() }, { merge: true });
    } finally {
      setSaving(false);
    }
  }

  async function toggle(key) {
    const next = rows.map((r, i) => (i === idx ? { ...r, [key]: !r[key] } : r));
    setRows(next);
    await saveToCloud(next);
  }

  function prev() {
    setIdx((i) => (rows.length ? (i - 1 + rows.length) % rows.length : 0));
  }

  function next() {
    setIdx((i) => (rows.length ? (i + 1) % rows.length : 0));
  }

  if (loading) return <p className="container">Cargando…</p>;

  if (!rows.length) {
    return (
      <div className="carousel-wrap">
        <Link to="/app">← Volver</Link>
        <h1>No hay datos</h1>
        <p>Primero importa tu CSV en la página principal.</p>
      </div>
    );
  }

  const status =
    current.small && current.large ? "Completo" : current.small || current.large ? "Parcial" : "Faltan";

  const monsterSrc = imgError ? "/monster-placeholder.png" : monsterImageUrl(current.name);

  return (
    <div className="carousel-wrap">
      <div className="carousel-top">
        <Link to="/app">← Volver</Link>
        <div className="carousel-meta">
          {saving ? "Guardando…" : "Guardado"} · {progress.done}/{progress.total} completos
        </div>
      </div>

      <div className="card carousel-card">
        <div className="carousel-nav">
          <button className="btn" onClick={prev}>◀</button>

          <div className="carousel-center">
            <div className="carousel-count">
              {idx + 1} / {rows.length}
            </div>
            <h2 className="carousel-title">{current.name}</h2>
            <div className="carousel-status">Estado: {status}</div>
          </div>

          <button className="btn" onClick={next}>▶</button>
        </div>

        <div className="monster-media">
          <img
            className="monster-img"
            src={monsterSrc}
            alt={current.name}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        </div>

        {/* Coronas grandes debajo de la imagen */}
        <div className="crowns-row">
          <div className={`crown-card ${current.small ? "active" : ""}`}>
            <img className="crown-icon" src="/crowns/small.png" alt="Corona pequeña" />
            <div className="crown-text">Pequeña</div>
          </div>

          <div className={`crown-card ${current.large ? "active" : ""}`}>
            <img className="crown-icon" src="/crowns/large.png" alt="Corona grande" />
            <div className="crown-text">Grande</div>
          </div>
        </div>

        <div className="carousel-actions">
          <label className="check">
            <input type="checkbox" checked={current.small} onChange={() => toggle("small")} />
            Corona pequeña
          </label>
          <label className="check">
            <input type="checkbox" checked={current.large} onChange={() => toggle("large")} />
            Corona grande
          </label>
        </div>
      </div>
    </div>
  );
}
