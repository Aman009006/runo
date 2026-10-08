import React, { useState } from "react";
import API_URL from "./config.js";

function Login({ onLogin }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!login.trim() || !password) {
      setError("Введите логин и пароль");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            login: login.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Не удалось выполнить вход"
        );
      }

      onLogin(data.branch);
    } catch (error) {
      setError(
        error.message ||
          "Ошибка подключения к серверу"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          RUNO
        </div>

        <h1 style={styles.title}>
          Вход в систему
        </h1>

        <p style={styles.subtitle}>
          Выберите филиал через логин
        </p>

        <form
          onSubmit={handleSubmit}
          style={styles.form}
        >
          <div>
            <label style={styles.label}>
              Логин
            </label>

            <input
              type="text"
              value={login}
              onChange={(event) =>
                setLogin(event.target.value)
              }
              placeholder="Введите логин"
              autoComplete="username"
              style={styles.input}
              disabled={loading}
            />
          </div>

          <div>
            <label style={styles.label}>
              Пароль
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Введите пароль"
              autoComplete="current-password"
              style={styles.input}
              disabled={loading}
            />
          </div>

          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? "Выполняется вход..."
              : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f7fa",
    padding: "20px",
    boxSizing: "border-box",
  },

  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#ffffff",
    borderRadius: "16px",
    padding: "36px",
    boxSizing: "border-box",
    boxShadow:
      "0 10px 35px rgba(0, 0, 0, 0.08)",
  },

  logo: {
    textAlign: "center",
    fontSize: "28px",
    fontWeight: 800,
    color: "#004175",
    marginBottom: "24px",
  },

  title: {
    margin: 0,
    textAlign: "center",
    fontSize: "24px",
    fontWeight: 700,
    color: "#1f2937",
  },

  subtitle: {
    margin: "8px 0 28px",
    textAlign: "center",
    color: "#6b7280",
    fontSize: "14px",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#374151",
  },

  input: {
    width: "100%",
    height: "48px",
    padding: "0 14px",
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    outline: "none",
    fontSize: "16px",
    background: "#ffffff",
  },

  error: {
    padding: "12px 14px",
    borderRadius: "9px",
    background: "#fef2f2",
    color: "#dc2626",
    fontSize: "14px",
  },

  button: {
    width: "100%",
    height: "48px",
    border: "none",
    borderRadius: "10px",
    background: "#004175",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
  },
};

export default Login;