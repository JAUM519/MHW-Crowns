import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Papa from "papaparse";

import { auth, db } from "../firebase";

const AuthCtx = createContext(null);

function toSeedRowsFromTemplate(parsedRows) {
  // parsedRows = objetos con keys "Monstruo", etc.
  const cleaned = (parsedRows || [])
    .map((row, idx) => {
      const name = String(row["Monstruo"] ?? "").trim();
      if (!name) return null;
      return {
        id: `${name}__${idx}`,
        name,
        small: false,
        large: false,
      };
    })
    .filter(Boolean);

  return cleaned;
}

async function ensureUserDocument(uid) {
  const ref = doc(db, "users", uid, "crownData", "main");
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  // No existe => crear desde plantilla
  let rows = [];
  let fileName = "template.csv";

  try {
    const res = await fetch("/template.csv", { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudo cargar /template.csv");

    const text = await res.text();
    const parsed = Papa.parse(text, {
      header: true,
      delimiter: ";",
      skipEmptyLines: true,
      transformHeader: (h) => (h ?? "").trim(),
    });

    rows = toSeedRowsFromTemplate(parsed.data);
  } catch (e) {
    // Si falla, igual creamos el doc (vacío)
    rows = [];
    fileName = "";
    console.warn("Seed falló:", e);
  }

  await setDoc(
    ref,
    {
      rows,
      fileName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          // Asegura que exista la tabla para este usuario (primera vez)
          await ensureUserDocument(u.uid);
          setUser(u);
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  return <AuthCtx.Provider value={{ user, loading }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
