import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Wallet,
  X,
  RefreshCw,
  UserRound,
  Phone,
  MessageSquare,
  CalendarDays,
  CheckCircle2,
  ArrowLeft,
  Clock3,
  History,
} from "lucide-react";
import API_URL from "./config.js";

const EMPTY_FORM = { name: "", phone: "", amount: "", comment: "" };

const money = (value) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "KGS",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const dateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default function BudgetPage({ onBack }) {
  const [data, setData] = useState({
    topups: [],
    people: [],
    transactions: [],
    totals: { topups: 0, issued: 0, balance: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupComment, setTopupComment] = useState("");
  const [searchWaiting, setSearchWaiting] = useState("");
  const [searchReceived, setSearchReceived] = useState("");
  const [searchHistory, setSearchHistory] = useState("");

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/budget`, {
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Не удалось загрузить бюджет");
      }
      setData({
        topups: Array.isArray(result.topups) ? result.topups : [],
        people: Array.isArray(result.people) ? result.people : [],
        transactions: Array.isArray(result.transactions)
          ? result.transactions
          : [],
        totals: result.totals || { topups: 0, issued: 0, balance: 0 },
      });
    } catch (err) {
      setError(err.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const waiting = useMemo(
    () => data.people.filter((person) => person.status === "waiting"),
    [data.people],
  );
  const received = useMemo(
    () => data.people.filter((person) => person.status === "received"),
    [data.people],
  );

  const openModal = (kind) => {
    setForm(EMPTY_FORM);
    setTopupAmount("");
    setTopupComment("");
    setError("");
    setNotice("");
    setModal(kind);
  };

  const saveTopup = async (event) => {
    event.preventDefault();
    const amount = Number(topupAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Введите сумму пополнения больше нуля");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/budget/topups`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, comment: topupComment.trim() }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Не удалось пополнить бюджет");
      }
      setModal(null);
      setNotice("Бюджет успешно пополнен");
      await loadData(false);
    } catch (err) {
      setError(err.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const savePerson = async (event) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.name.trim()) {
      setError("Введите имя человека");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Введите сумму больше нуля");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/budget/entries`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          amount,
          comment: form.comment.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Не удалось добавить человека");
      }
      setModal(null);
      setNotice("Человек добавлен в список ожидающих");
      await loadData(false);
    } catch (err) {
      setError(err.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const markAsReceived = async (person) => {
    if (
      !window.confirm(
        `Подтвердить, что ${person.name} получил(а) ${money(person.amount)}?`,
      )
    ) {
      return;
    }
    setMarkingId(person.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `${API_URL}/api/budget/entries/${encodeURIComponent(person.id)}/received`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Не удалось подтвердить получение");
      }
      setNotice(`${person.name}: получение подтверждено`);
      await loadData(false);
    } catch (err) {
      setError(err.message || "Ошибка подтверждения");
    } finally {
      setMarkingId(null);
    }
  };

  const filterRows = (rows, query, fields) => {
    const q = query.trim().toLocaleLowerCase("ru");
    if (!q) return rows;
    return rows.filter((item) =>
      fields(item).join(" ").toLocaleLowerCase("ru").includes(q),
    );
  };

  const waitingFiltered = filterRows(waiting, searchWaiting, (item) => [
    item.name,
    item.phone,
    item.comment,
    String(item.amount),
  ]);
  const receivedFiltered = filterRows(received, searchReceived, (item) => [
    item.name,
    item.phone,
    item.comment,
    String(item.amount),
  ]);
  const historyFiltered = filterRows(
    data.transactions,
    searchHistory,
    (item) => [
      item.name,
      item.phone,
      item.comment,
      String(item.amount),
      item.label,
      item.type,
    ],
  );

  const PersonColumn = ({ type, title, rows, query, setQuery }) => (
    <section className="budget-panel">
      <div className="budget-panel-head">
        <div className="budget-panel-title">
          <span className={`budget-icon ${type}`}>
            {type === "waiting" ? (
              <Clock3 size={20} />
            ) : (
              <CheckCircle2 size={20} />
            )}
          </span>
          <div>
            <h2>{title}</h2>
            <p>{rows.length} человек</p>
          </div>
        </div>
        {type === "waiting" && (
          <button
            className="budget-button waiting"
            onClick={() => openModal("person")}
          >
            <Plus size={17} /> Добавить
          </button>
        )}
      </div>
      <input
        className="budget-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Поиск по имени, номеру или комментарию"
      />
      <div className="budget-records">
        {rows.length === 0 ? (
          <div className="budget-empty">
            <UserRound size={26} />
            <span>Записей пока нет</span>
          </div>
        ) : (
          rows.map((person) => (
            <article className="budget-record" key={person.id}>
              <div className="budget-record-top">
                <div className="budget-person">
                  <span className="budget-avatar">
                    {(person.name || "?").slice(0, 1).toUpperCase()}
                  </span>
                  <div className="budget-person-text">
                    <strong>{person.name}</strong>
                    {person.phone && (
                      <span>
                        <Phone size={13} /> {person.phone}
                      </span>
                    )}
                  </div>
                </div>
                <strong className={`budget-amount ${type}`}>
                  {money(person.amount)}
                </strong>
              </div>
              {person.comment && (
                <p className="budget-comment">
                  <MessageSquare size={14} /> {person.comment}
                </p>
              )}
              <div className="budget-date">
                <CalendarDays size={13} /> Добавлен:{" "}
                {dateTime(person.createdAt)}
              </div>
              {person.receivedAt && (
                <div className="budget-date">
                  <CheckCircle2 size={13} /> Получил:{" "}
                  {dateTime(person.receivedAt)}
                </div>
              )}
              {type === "waiting" && (
                <button
                  className="budget-confirm"
                  onClick={() => markAsReceived(person)}
                  disabled={markingId === person.id}
                >
                  <CheckCircle2 size={16} />
                  {markingId === person.id
                    ? "Сохранение…"
                    : "Отметить как полученное"}
                </button>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );

  return (
    <main className="budget-page">
      <style>{`
        .budget-page{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0f172a;padding:clamp(14px,2.5vw,30px);max-width:1600px;margin:0 auto}
        .budget-page *{box-sizing:border-box}.budget-page button,.budget-page input,.budget-page textarea{font:inherit}.budget-page button{cursor:pointer}
        .budget-header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:22px;flex-wrap:wrap}
        .budget-heading h1{font-size:clamp(24px,3vw,32px);margin:0 0 6px;font-weight:800;letter-spacing:-.7px}.budget-heading p{margin:0;color:#64748b;font-size:14px}
        .budget-refresh{display:flex;align-items:center;gap:8px;border:1px solid #dbe2ea;background:#fff;border-radius:10px;padding:10px 13px;color:#334155;font-weight:600}
        .budget-summary{background:linear-gradient(125deg,#101d36,#1e3a5f);color:#fff;border-radius:20px;padding:clamp(22px,3vw,32px);margin-bottom:22px;box-shadow:0 12px 30px #0f172a16}
        .budget-summary-top{display:flex;justify-content:space-between;gap:20px;align-items:center;flex-wrap:wrap}
        .budget-summary-label{color:#cbd5e1;font-size:14px;display:flex;align-items:center;gap:8px}
        .budget-total{font-size:clamp(34px,5vw,48px);font-weight:800;letter-spacing:-1.5px;margin:9px 0 0}
        .budget-topup{display:flex;align-items:center;gap:8px;border:0;border-radius:11px;padding:13px 17px;background:#fff;color:#172554;font-weight:750}
        .budget-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;align-items:start}
        .budget-panel,.budget-history{min-width:0;border:1px solid #e2e8f0;background:#fff;border-radius:16px;padding:18px;box-shadow:0 4px 16px #0f172a08}
        .budget-panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap}
        .budget-panel-title{display:flex;align-items:center;gap:11px}.budget-panel-title h2{font-size:18px;margin:0 0 4px}.budget-panel-title p{font-size:12px;color:#64748b;margin:0}
        .budget-icon{width:42px;height:42px;border-radius:12px;display:grid;place-items:center}.budget-icon.waiting{background:#fff7ed;color:#c2410c}.budget-icon.received{background:#ecfdf5;color:#047857}
        .budget-button{display:flex;align-items:center;gap:6px;border:0;border-radius:9px;padding:10px 12px;font-size:13px;font-weight:700}.budget-button.waiting{background:#fff7ed;color:#c2410c}
        .budget-search{width:100%;padding:11px 12px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:12px;outline:none;font-size:13px}
        .budget-search:focus,.budget-form-control:focus{border-color:#647fbd;box-shadow:0 0 0 3px #647fbd20}
        .budget-records{display:flex;flex-direction:column;gap:10px}.budget-record{padding:14px;border:1px solid #edf0f4;border-radius:12px;background:#fff}
        .budget-record-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.budget-person{display:flex;align-items:center;gap:10px;min-width:0}
        .budget-avatar{flex:0 0 36px;height:36px;border-radius:50%;background:#eef2ff;color:#3730a3;display:grid;place-items:center;font-weight:800}
        .budget-person-text{min-width:0;display:flex;flex-direction:column;gap:4px}.budget-person-text strong{font-size:14px;overflow-wrap:anywhere}
        .budget-person-text span{display:flex;align-items:center;gap:4px;color:#64748b;font-size:12px}.budget-amount{font-size:14px;white-space:nowrap;font-weight:750}
        .budget-amount.waiting{color:#c2410c}.budget-amount.received{color:#047857}
        .budget-comment{display:flex;align-items:flex-start;gap:6px;color:#475569;font-size:13px;line-height:1.45;margin:12px 0 8px;overflow-wrap:anywhere}.budget-comment svg{flex-shrink:0;margin-top:2px}
        .budget-date{display:flex;align-items:center;gap:5px;color:#94a3b8;font-size:11px;margin-top:9px}
        .budget-confirm{display:flex;justify-content:center;align-items:center;gap:7px;width:100%;margin-top:13px;padding:10px;border:0;border-radius:9px;background:#ecfdf5;color:#047857;font-size:13px;font-weight:750}.budget-confirm:disabled{opacity:.6;cursor:wait}
        .budget-empty{min-height:140px;display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;color:#94a3b8;font-size:13px}
        .budget-alert{padding:12px 14px;border-radius:10px;margin-bottom:14px;font-size:13px}.budget-alert.error{background:#fef2f2;color:#b91c1c}.budget-alert.notice{background:#ecfdf5;color:#047857}
        .budget-history{margin-top:22px}.budget-history-head{display:flex;align-items:center;gap:10px;margin-bottom:14px}.budget-history-head h2{margin:0;font-size:19px}.budget-history-head p{margin:4px 0 0;color:#64748b;font-size:12px}
        .budget-history-icon{width:40px;height:40px;display:grid;place-items:center;border-radius:11px;background:#eff6ff;color:#1d4ed8}
        .budget-table-wrap{overflow-x:auto}.budget-table{width:100%;border-collapse:collapse;min-width:760px;font-size:13px}.budget-table th{text-align:left;background:#f8fafc;color:#64748b;font-weight:650;font-size:12px}
        .budget-table th,.budget-table td{padding:12px 10px;border-bottom:1px solid #edf0f4;vertical-align:top}.budget-table td{color:#334155}.budget-table tr:last-child td{border-bottom:0}
        .budget-type{display:inline-flex;align-items:center;gap:5px;border-radius:20px;padding:5px 8px;font-size:11px;font-weight:750;white-space:nowrap}.budget-type.topup{background:#eff6ff;color:#1d4ed8}.budget-type.issued{background:#ecfdf5;color:#047857}
        .budget-history-amount{font-weight:750;white-space:nowrap}.budget-history-amount.topup{color:#1d4ed8}.budget-history-amount.issued{color:#047857}
        .budget-modal-backdrop{position:fixed;inset:0;background:#0f172a88;z-index:9999;display:grid;place-items:center;padding:16px}
        .budget-modal{width:min(100%,480px);max-height:90vh;overflow:auto;background:#fff;border-radius:18px;padding:22px;box-shadow:0 25px 80px #0003}
        .budget-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.budget-modal-head h2{margin:0;font-size:21px}
        .budget-close{border:0;background:#f1f5f9;border-radius:9px;width:36px;height:36px;display:grid;place-items:center}
        .budget-form{display:flex;flex-direction:column;gap:13px}.budget-form label{display:flex;flex-direction:column;gap:6px;font-size:13px;color:#334155;font-weight:650}
        .budget-form-control{width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:12px;outline:none;color:#0f172a;background:#fff;font-weight:400}.budget-form textarea{min-height:84px;resize:vertical}
        .budget-form-actions{display:flex;gap:10px;margin-top:5px}.budget-form-actions button{flex:1;border-radius:10px;padding:12px;border:1px solid #e2e8f0;background:#fff;font-weight:700}
        .budget-form-actions button[type=submit]{background:#1d4ed8;color:#fff;border-color:#1d4ed8}
        @media(max-width:900px){.budget-columns{grid-template-columns:1fr}}
        @media(max-width:520px){.budget-page{padding:12px}.budget-summary{border-radius:15px}.budget-panel,.budget-history{padding:13px}.budget-record-top{flex-direction:column}.budget-amount{padding-left:46px}.budget-total{letter-spacing:-1px}}
      `}</style>
<button
              className="amanat-back-button"
              onClick={onBack}
            >
              <ArrowLeft size={19} />
            </button>
      <div className="budget-header">
        <div className="budget-heading">
          <h1>Учёт бюджета</h1>
          <p>Ожидающие получения, получившие и история всех операций</p>
        </div>
        <button
          className="budget-refresh"
          onClick={() => loadData()}
          disabled={loading}
        >
          <RefreshCw size={16} /> Обновить
        </button>
      </div>

      {error && !modal && <div className="budget-alert error">{error}</div>}
      {notice && <div className="budget-alert notice">{notice}</div>}

      <section className="budget-summary">
        <div className="budget-summary-top">
          <div>
            <div className="budget-summary-label">
              <Wallet size={18} /> Доступный бюджет
            </div>
            <div className="budget-total">{money(data.totals.balance)}</div>
          </div>
          <button className="budget-topup" onClick={() => openModal("topup")}>
            <Plus size={18} /> Дополнить бюджет
          </button>
        </div>
      </section>

      {loading && data.people.length === 0 && data.transactions.length === 0 ? (
        <div className="budget-empty">
          <RefreshCw size={24} /> Загрузка бюджета…
        </div>
      ) : (
        <div className="budget-columns">
          <PersonColumn
            type="waiting"
            title="Ожидают получения"
            rows={waitingFiltered}
            query={searchWaiting}
            setQuery={setSearchWaiting}
          />
          <PersonColumn
            type="received"
            title="Уже получили"
            rows={receivedFiltered}
            query={searchReceived}
            setQuery={setSearchReceived}
          />
        </div>
      )}

      <section className="budget-history">
        <div className="budget-history-head">
          <span className="budget-history-icon">
            <History size={20} />
          </span>
          <div>
            <h2>История транзакций</h2>
            <p>Все пополнения и выдачи с датой, временем и данными операции</p>
          </div>
        </div>
        <input
          className="budget-search"
          value={searchHistory}
          onChange={(event) => setSearchHistory(event.target.value)}
          placeholder="Поиск по типу, имени, номеру, сумме или комментарию"
        />
        <div className="budget-table-wrap">
          <table className="budget-table">
            <thead>
              <tr>
                <th>Дата и время</th>
                <th>Операция</th>
                <th>Человек / номер</th>
                <th>Сумма</th>
                <th>Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {historyFiltered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      color: "#94a3b8",
                      padding: 28,
                    }}
                  >
                    Транзакций пока нет
                  </td>
                </tr>
              ) : (
                historyFiltered.map((item) => (
                  <tr key={item.id}>
                    <td>{dateTime(item.createdAt)}</td>
                    <td>
                      <span
                        className={`budget-type ${item.type === "topup" ? "topup" : "issued"}`}
                      >
                        {item.type === "topup" ? (
                          <>
                            <Plus size={12} /> Пополнение
                          </>
                        ) : (
                          <>
                            <ArrowUpRight size={12} /> Выдача
                          </>
                        )}
                      </span>
                    </td>
                    <td>
                      <strong>{item.name || "—"}</strong>
                      {item.phone && (
                        <div style={{ color: "#64748b", marginTop: 4 }}>
                          {item.phone}
                        </div>
                      )}
                    </td>
                    <td
                      className={`budget-history-amount ${item.type === "topup" ? "topup" : "issued"}`}
                    >
                      {item.type === "topup" ? "+" : "−"}
                      {money(item.amount)}
                    </td>
                    <td>{item.comment || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modal && (
        <div
          className="budget-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setModal(null);
          }}
        >
          <section className="budget-modal" role="dialog" aria-modal="true">
            <div className="budget-modal-head">
              <h2>
                {modal === "topup" ? "Пополнить бюджет" : "Добавить ожидающего"}
              </h2>
              <button
                className="budget-close"
                onClick={() => setModal(null)}
                disabled={saving}
                aria-label="Закрыть"
              >
                <X size={19} />
              </button>
            </div>
            {error && <div className="budget-alert error">{error}</div>}
            {modal === "topup" ? (
              <form className="budget-form" onSubmit={saveTopup}>
                <label>
                  Сумма пополнения, сом
                  <input
                    className="budget-form-control"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={topupAmount}
                    onChange={(event) => setTopupAmount(event.target.value)}
                    required
                    autoFocus
                  />
                </label>
                <label>
                  Комментарий
                  <textarea
                    className="budget-form-control"
                    value={topupComment}
                    onChange={(event) => setTopupComment(event.target.value)}
                    placeholder="Комментарий к пополнению"
                  />
                </label>
                <div className="budget-form-actions">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    disabled={saving}
                  >
                    Отмена
                  </button>
                  <button type="submit" disabled={saving}>
                    {saving ? "Сохранение…" : "Пополнить"}
                  </button>
                </div>
              </form>
            ) : (
              <form className="budget-form" onSubmit={savePerson}>
                <label>
                  Имя человека
                  <input
                    className="budget-form-control"
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    placeholder="Введите имя"
                    required
                    autoFocus
                  />
                </label>
                <label>
                  Номер телефона
                  <input
                    className="budget-form-control"
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      setForm({ ...form, phone: event.target.value })
                    }
                    placeholder="Например: 0555 123 456"
                  />
                </label>
                <label>
                  Сумма, сом
                  <input
                    className="budget-form-control"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) =>
                      setForm({ ...form, amount: event.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Комментарий
                  <textarea
                    className="budget-form-control"
                    value={form.comment}
                    onChange={(event) =>
                      setForm({ ...form, comment: event.target.value })
                    }
                    placeholder="Комментарий к записи"
                  />
                </label>
                <div className="budget-form-actions">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    disabled={saving}
                  >
                    Отмена
                  </button>
                  <button type="submit" disabled={saving}>
                    {saving ? "Сохранение…" : "Добавить в ожидающие"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
