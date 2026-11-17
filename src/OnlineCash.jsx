import React, { useEffect, useState } from "react";
import "./OnlineCash.css";
import API_URL from "./config.js";

import runoLogo from "./runo1.png";

import slide1 from "./imgs/slides/1.jpg";
import slide2 from "./imgs/slides/2.jpg";
import slide3 from "./imgs/slides/3.jpg";

const EMPTY_SCREEN_IMAGES = [slide1, slide2, slide3];

const ONLINE_CASH_TERMINAL_ID = "main";
const WS_URL = API_URL.replace(/^http/, "ws");

const EMPTY_STATE = {
  isOpen: false,
  items: [],
  total: 0,
};

const EMPTY_PAYMENT = {
  status: "idle",
  qrCode: "",
  amount: 0,
  paymentId: "",
};

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("ru-RU")} сом`;
}

export default function OnlineCash() {
  const [state, setState] = useState(EMPTY_STATE);
  const [payment, setPayment] = useState(EMPTY_PAYMENT);
  const [slideIndex, setSlideIndex] = useState(0);

  // Подключение к серверу по WebSocket
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const branchId = params.get("branchId") || "";
    const terminalId = params.get("terminalId") || ONLINE_CASH_TERMINAL_ID;

    if (!branchId) {
      console.error("Не указан branchId: откройте /online-cash?branchId=...");
      return;
    }

    let ws;
    let closed = false;
    let retryTimer;

    const connect = () => {
      ws = new WebSocket(
        `${WS_URL}/ws/online-cash?role=display` +
          `&branchId=${encodeURIComponent(branchId)}` +
          `&terminalId=${encodeURIComponent(terminalId)}`,
      );

      ws.onmessage = (event) => {
        let data;

        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }

        if (data.type === "CART_UPDATE") {
          setState({
            isOpen: Boolean(data.isOpen),
            items: Array.isArray(data.items) ? data.items : [],
            total: Number(data.total || 0),
          });
        }

        if (data.type === "PAYMENT_UPDATE") {
          setPayment({
            status: data.status || "idle",
            qrCode: data.qrCode || "",
            amount: Number(data.amount || 0),
            paymentId: data.paymentId || "",
          });
        }
      };

      ws.onclose = () => {
        if (!closed) {
          retryTimer = setTimeout(connect, 2000);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      clearTimeout(retryTimer);
      ws?.close();
    };
  }, []);

  const totalQuantity = state.items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % EMPTY_SCREEN_IMAGES.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="online-cash">
      <header className="online-cash-header">
        <img src={runoLogo} alt="Logo" style={{ width: "100px" }} />
      </header>

      {payment.status === "pending" && payment.qrCode && (
        <div className="online-cash-payment">
          <div className="online-cash-payment-ornament">
            <img src={payment.qrCode} alt="QR-код оплаты О! Банк" />
          </div>
        </div>
      )}

      <section className="online-cash-content">
        {payment.status === "success" && (
          <div className="online-cash-payment-success">Оплата получена</div>
        )}

        <div className="online-cash-list">
          <div className="online-cash-list-header">
            <span>Товар</span>
            <span>Количество</span>
            <span>Сумма</span>
          </div>

          {state.items.map((item) => (
            <article className="online-cash-item" key={item.id}>
              <div className="online-cash-item-name">
                {item.name}

                <small>{formatMoney(item.price)} / шт.</small>
              </div>

              <div className="online-cash-item-quantity">× {item.quantity}</div>

              <div className="online-cash-item-total">
                {formatMoney(item.price * item.quantity)}
              </div>
            </article>
          ))}
        </div>
      </section>

      {state.items.length === 0 && (
        <div className="online-cash-empty">
          <div className="online-cash-slides">
            {EMPTY_SCREEN_IMAGES.map((src, index) => (
              <img
                key={src}
                src={src}
                alt=""
                className={`online-cash-slide ${
                  slideIndex === index ? "active" : ""
                }`}
              />
            ))}
          </div>

          <div className="online-cash-empty-overlay" />
        </div>
      )}

      <div className="online-cash-summary">
        <div className="online-cash-summary-row">
          <span>Количество товаров</span>

          <strong>{totalQuantity} шт.</strong>
        </div>

        <div className="online-cash-total">
          <span>Итого к оплате</span>

          <strong>{formatMoney(state.total)}</strong>
        </div>
      </div>
    </main>
  );
}