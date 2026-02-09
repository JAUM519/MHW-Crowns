import React, { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { Link, useNavigate } from "react-router-dom";

import "../styles/layout.css";
import "../styles/friends.css";

export default function Friends() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const nav = useNavigate();

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db, "publicUsers"),
                    where("isPublic", "==", true),
                    orderBy("displayName", "asc")
                );
                const snap = await getDocs(q);
                setUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <div className="container">
            <div className="header">
                <Link to="/app">← Volver</Link>
                <h1>Usuarios públicos</h1>
            </div>

            {loading ? (
                <p>Cargando…</p>
            ) : users.length ? (
                <div className="friends-grid">
                    {users.map((u) => (
                        <button
                            key={u.uid}
                            className="friend-card"
                            onClick={() => nav(`/friends/${u.uid}`)}
                        >
                            <img
                                className="friend-avatar"
                                src={u.photoURL || "/monster-placeholder.png"}
                                alt={u.displayName || u.email || u.uid}
                            />
                            <div className="friend-meta">
                                <div className="friend-name">{u.displayName || "Sin nombre"}</div>
                                <div className="friend-sub">{u.email || u.uid}</div>
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <p>No hay usuarios públicos todavía.</p>
            )}
        </div>
    );
}
