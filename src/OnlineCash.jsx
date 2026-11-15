import React, { useEffect, useState } from "react";
import "./OnlineCash.css";
import runoLogo from "./runo1.png";
import slide1 from "./imgs/slides/1.jpg";
import slide2 from "./imgs/slides/2.jpg";
import slide3 from "./imgs/slides/3.jpg";

 const EMPTY_SCREEN_IMAGES = [slide1, slide2, slide3];

const CHANNEL_NAME = "runo-online-cash";
const STORAGE_KEY = "runo-online-cash-state";

const EMPTY_STATE = {
  isOpen: false,
  items: [],
  total: 0,
};
const PAYMENT_STORAGE_KEY = "runo-online-cash-payment-state";
const EMPTY_PAYMENT = {
  status: "idle",
  qrCode: "",
  amount: 0,
  paymentId: "",
};

function getInitialState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error("Ошибка чтения онлайн-кассы:", error);
  }

  return EMPTY_STATE;
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("ru-RU")} сом`;
}

export default function OnlineCash() {
  const [state, setState] = useState(getInitialState);
const [payment, setPayment] = useState(EMPTY_PAYMENT);
  useEffect(() => {
    const applyUpdate = (data) => {
      if (data?.type !== "CART_UPDATE") return;

      setState({
        isOpen: Boolean(data.isOpen),
        items: Array.isArray(data.items) ? data.items : [],
        total: Number(data.total || 0),
      });
    };
    const applyPaymentUpdate = (data) => {
  if (data?.type !== "PAYMENT_UPDATE") return;

  setPayment({
    status: data.status || "idle",
    qrCode: data.qrCode || "",
    amount: Number(data.amount || 0),
    paymentId: data.paymentId || "",
  });
};

    let channel;

    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (event) => {
  applyUpdate(event.data);
  applyPaymentUpdate(event.data);
};
    }

   const handleStorage = (event) => {
  if (!event.newValue) return;

  try {
    const data = JSON.parse(event.newValue);

    if (event.key === STORAGE_KEY) {
      applyUpdate(data);
    }

    if (event.key === PAYMENT_STORAGE_KEY) {
      applyPaymentUpdate(data);
    }
  } catch (error) {
    console.error("Ошибка получения обновления:", error);
  }
};

    window.addEventListener("storage", handleStorage);

    return () => {
      channel?.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const totalQuantity = state.items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );
  const [slideIndex, setSlideIndex] = React.useState(0);

React.useEffect(() => {
  const interval = setInterval(() => {
    setSlideIndex((prev) => (prev + 1) % EMPTY_SCREEN_IMAGES.length);
  }, 4000);

  return () => clearInterval(interval);
}, []);


  return (
    <main className="online-cash">
      <header className="online-cash-header">
      <img
                  src={runoLogo}
                  alt="Logo"
                  style={{
                    width: "100px"
                  }}
                />
      </header>
  {payment.status === "pending" && payment.qrCode && (
          <div className="online-cash-payment">
            <div className="online-cash-payment-ornament">
            <img
              src={payment.qrCode}
              alt="QR-код оплаты О! Банк"
            />
          </div>
          </div>
        )}
      <section className="online-cash-content">
      

{payment.status === "success" && (
  <div className="online-cash-payment-success">
    Оплата получена
  </div>
)}
          <>
            <div className="online-cash-list">
              <div className="online-cash-list-header">
                <span>Товар</span>
                <span>Количество</span>
                <span>Сумма</span>
              </div>

              {state.items.map((item) => (
                <article
                  className="online-cash-item"
                  key={item.id}
                >
                  <div className="online-cash-item-name">
                    {item.name}
                    <small>
                      {formatMoney(item.price)} / шт.
                    </small>
                  </div>

                  <div className="online-cash-item-quantity">
                    × {item.quantity}
                  </div>

                  <div className="online-cash-item-total">
                    {formatMoney(item.price * item.quantity)}
                  </div>
                </article>
              ))}
            </div>
          </>
        
      </section>

      <div>
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
) }
      </div>
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