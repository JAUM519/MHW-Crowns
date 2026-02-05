import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { useAuth } from "../auth/AuthProvider";
import { Link } from "react-router-dom";

import "../styles/layout.css";
import "../styles/dashboard.css";

async function readFileAsLatin1Text(file) {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder("iso-8859-1").decode(buf);
  } catch {
    return new TextDecoder("utf-8").decode(buf);
  }
}

function normalize01(value) {
  if (value === 1 || value === "1" || value === true || value === "true") return 1;
  return 0;
}

function buildExportCsv(rows) {
  const header = ["Monstruo", "Corona Pequeña", "Corona Grande"];
  const lines = [header.join(";")];

  for (const r of rows) {
    const rawName = String(r.name ?? "");
    const name =
      rawName.includes(";") || rawName.includes('"')
        ? `"${rawName.replaceAll('"', '""')}"`
        : rawName;

    lines.push([name, r.small ? 1 : 0, r.large ? 1 : 0].join(";"));
  }
  return lines.join("\n");
}

export default function Dashboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [fileName, setFileName] = useState("");
  const [loadingCloud, setLoadingCloud] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadFromCloud(u) {
    setLoadingCloud(true);
    try {
      const ref = doc(db, "users", u.uid, "crownData", "main");
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
      setLoadingCloud(false);
    }
  }

  useEffect(() => {
    if (user) loadFromCloud(user);
  }, [user]);

  async function saveToCloud(nextRows, nextFileName) {
    setSaving(true);
    try {
      const ref = doc(db, "users", user.uid, "crownData", "main");
      await setDoc(
        ref,
        { rows: nextRows, fileName: nextFileName ?? "", updatedAt: Date.now() },
        { merge: true }
      );
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => {
    const total = rows.length;
    const small = rows.reduce((a, r) => a + (r.small ? 1 : 0), 0);
    const large = rows.reduce((a, r) => a + (r.large ? 1 : 0), 0);
    const both = rows.reduce((a, r) => a + (r.small && r.large ? 1 : 0), 0);
    return { total, small, large, both };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const match = !q || r.name.toLowerCase().includes(q);
      const missing = !onlyMissing || !(r.small && r.large);
      return match && missing;
    });
  }, [rows, query, onlyMissing]);

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const nextFileName = file.name;
    const text = await readFileAsLatin1Text(file);

    const result = Papa.parse(text, {
      header: true,
      delimiter: ";",
      skipEmptyLines: true,
      transformHeader: (h) => (h ?? "").trim(),
    });

    if (result.errors?.length) {
      console.error(result.errors);
      alert("Error leyendo CSV. Revisa consola (F12).");
      return;
    }

    const cleaned = (result.data || [])
      .map((row, idx) => {
        const name = String(row["Monstruo"] ?? "").trim();
        if (!name) return null;

        const small = normalize01(row["Corona Pequeña"]);
        const large = normalize01(row["Corona Grande"]);

        return { id: `${name}__${idx}`, name, small: small === 1, large: large === 1 };
      })
      .filter(Boolean);

    const currentByName = new Map(rows.map((r) => [r.name, r]));
    const merged = cleaned.map((r) => {
      const prev = currentByName.get(r.name);
      return prev ? { ...r, small: prev.small, large: prev.large, id: prev.id } : r;
    });

    setRows(merged);
    setFileName(nextFileName);
    await saveToCloud(merged, nextFileName);
  }

  async function toggleCrown(id, key) {
    const next = rows.map((r) => (r.id === id ? { ...r, [key]: !r[key] } : r));
    setRows(next);
    await saveToCloud(next, fileName);
  }

  function exportCsv() {
    const csv = buildExportCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName ? fileName.replace(/\.csv$/i, "") + "_actualizado.csv" : "coronas_actualizado.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <div className="container">
      <div className="header">
        <h1>MHW:I — Coronas</h1>
        <Link to="/monsters">Ver carrusel</Link>
        <span>{user.displayName || user.email}</span>
        <button className="btn" onClick={logout}>Salir</button>
      </div>

      {loadingCloud ? (
        <p>Cargando datos…</p>
      ) : (
        <>
          <div className="toolbar">
            <input className="input" type="file" accept=".csv,text/csv" onChange={handleImport} />
            <button className="btn" onClick={exportCsv} disabled={!rows.length}>Exportar CSV</button>
            <span className="stats">{saving ? "Guardando…" : "Guardado"}</span>
          </div>

          <div className="toolbar">
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar monstruo…"
            />
            <label>
              <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />{" "}
              Mostrar solo faltantes
            </label>

            <div className="stats">
              Total: {stats.total} · Pequeñas: {stats.small} · Grandes: {stats.large} · Ambas: {stats.both}
            </div>
          </div>

          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Monstruo</th>
                  <th>Corona pequeña</th>
                  <th>Corona grande</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const status =
                    r.small && r.large ? "Completo" : r.small || r.large ? "Parcial" : "Faltan";
                  return (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td style={{ textAlign: "center" }}>
                        <input type="checkbox" checked={r.small} onChange={() => toggleCrown(r.id, "small")} />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <input type="checkbox" checked={r.large} onChange={() => toggleCrown(r.id, "large")} />
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            r.small && r.large ? "ok" : r.small || r.large ? "partial" : "missing"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr>
                    <td colSpan={4} style={{ padding: 16 }}>
                      {rows.length ? "No hay resultados." : "Importa tu CSV para empezar."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
