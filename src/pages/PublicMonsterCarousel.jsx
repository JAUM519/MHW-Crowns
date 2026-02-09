import React, { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Link, useParams } from "react-router-dom";

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
    return `/monsters/${slugify(monsterName)}.png`;
}

export default function PublicMonsterCarousel() {
    const { uid } = useParams();
    const [profile, setProfile] = useState(null);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [idx, setIdx] = useState(0);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const profRef = doc(db, "publicUsers", uid);
                const profSnap = await getDoc(profRef);

                if (!profSnap.exists() || profSnap.data()?.isPublic !== true) {
                    setProfile(null);
                    setRows([]);
                    return;
                }

                setProfile({ uid, ...profSnap.data() });

                const dataRef = doc(db, "publicUsers", uid, "crownData", "main");
                const dataSnap = await getDoc(dataRef);
                const data = dataSnap.exists() ? dataSnap.data() : {};
                setRows(Array.isArray(data?.rows) ? data.rows : []);
            } finally {
                setLoading(false);
            }
        })();
    }, [uid]);

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

    function prev() {
        setIdx((i) => (rows.length ? (i - 1 + rows.length) % rows.length : 0));
    }
    function next() {
        setIdx((i) => (rows.length ? (i + 1) % rows.length : 0));
    }

    if (loading) return <p className="container">Cargando…</p>;

    if (!profile) {
        return (
            <div className="carousel-wrap">
                <Link to="/friends">← Volver</Link>
                <h1>No disponible</h1>
                <p>Este usuario no es público o no existe.</p>
            </div>
        );
    }

    if (!rows.length) {
        return (
            <div className="carousel-wrap">
                <Link to="/friends">← Volver</Link>
                <h1>{profile.displayName || "Usuario"}</h1>
                <p>No tiene datos públicos aún.</p>
            </div>
        );
    }

    const status =
        current.small && current.large ? "Completo" : current.small || current.large ? "Parcial" : "Faltan";

    const monsterSrc = imgError ? "/monster-placeholder.png" : monsterImageUrl(current.name);

    return (
        <div className="carousel-wrap">
            <div className="carousel-top">
                <Link to="/friends">← Volver</Link>
                <div className="carousel-meta">
                    {profile.displayName || profile.email || profile.uid} · {progress.done}/{progress.total} completos
                </div>
            </div>

            <div className="card carousel-card">
                <div className="carousel-nav">
                    <button className="btn" onClick={prev}>◀</button>

                    <div className="carousel-center">
                        <div className="carousel-count">{idx + 1} / {rows.length}</div>
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

                {/* Coronas (solo lectura) */}
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

                {/* SIN checkboxes */}
            </div>
        </div>
    );
}
