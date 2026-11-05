
import React, { useMemo, useState, useEffect } from "react";
import {
  ArrowLeft,
  ChevronRight,
  ShoppingBag,
  Star,
  Truck,
  ShieldCheck,
  RotateCcw,
  Minus,
  Plus,
  Heart,
  Check,
  Search,
  X,
  ArrowRight,
} from "lucide-react";

import API_URL from "./config.js";
import runoLogo from "./runo.PNG";
import ProductCard from "./ProductCard";

const CART_STORAGE_KEY = "runo_cart";

const formatPrice = (price) =>
  `${new Intl.NumberFormat("ru-RU").format(price)} сом`;

// =====================================================
// CART DRAWER — СКОПИРОВАН ИЗ STOREFRONT
// =====================================================


function CartDrawer({
  cart,
  onClose,
  onChangeQuantity,
  onOrderSent,
  language,
}) {
  const t = (ru, kg) => language === "KG" ? kg : ru;

  const getProductTitle = (item) =>
    language === "KG"
      ? item?.titleKg || item?.title || ""
      : item?.title || "";

  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [customerAddress, setCustomerAddress] = React.useState("");

  const entries = Object.values(cart);

  const total = entries.reduce(
    (sum, entry) => sum + entry.product.price * entry.quantity,
    0
  );

  // Meta Pixel
  const trackPixel = (event, data = {}) => {
    if (
      typeof window !== "undefined" &&
      typeof window.fbq === "function"
    ) {
      window.fbq("track", event, data);
    }
  };

  // Оформление заказа
  const handleOrderSubmit = async (event) => {
    event.preventDefault();

    if (sending) return;

    const name = customerName.trim();
    const phone = customerPhone.trim();

    if (name.length < 2) {
      setError(t("Введите ваше имя", "Атыңызды жазыңыз"));
      return;
    }

    const phoneDigits = phone.replace(/\D/g, "");

    if (phoneDigits.length < 9 || phoneDigits.length > 15) {
      setError(
        t(
          "Введите корректный номер телефона",
          "Туура телефон номерин жазыңыз"
        )
      );
      return;
    }

    const address = customerAddress.trim();

    if (address.length < 5) {
      setError(
        t(
          "Укажите адрес доставки",
          "Жеткирүү дарегин жазыңыз"
        )
      );
      return;
    }

    if (entries.length === 0) {
      setError(t("Корзина пуста", "Себет бош"));
      return;
    }

    setSending(true);
    setError("");

    try {
      const orderItems = entries.map(({ product, quantity }) => ({
        id: product.id,
        quantity,
      }));

      const orderValue = total;

      const response = await fetch(`${API_URL}/api/shop/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name,
          phone,
          address,
          items: orderItems,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            t(
              "Не удалось отправить заказ",
              "Заказды жөнөтүү мүмкүн болгон жок"
            )
        );
      }

      // Успешно созданный заказ
      trackPixel("Purchase", {
        content_ids: orderItems.map((item) => String(item.id)),
        contents: orderItems.map((item) => ({
          id: String(item.id),
          quantity: item.quantity,
        })),
        content_type: "product",
        value: orderValue,
        currency: "KGS",
        num_items: orderItems.reduce(
          (sum, item) => sum + item.quantity,
          0
        ),
      });

      setSuccess(true);

      if (onOrderSent) {
        onOrderSent();
      }
    } catch (err) {
      setError(
        err.message ||
          t(
            "Ошибка при отправке заказа. Попробуйте ещё раз.",
            "Заказ жөнөтүүдө ката кетти. Кайра аракет кылыңыз."
          )
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="shop-overlay"
      onMouseDown={(event) =>
        event.target === event.currentTarget && onClose()
      }
    >
      <aside className="shop-cart-drawer">
        <div className="shop-cart-header">
          <div>
            <p className="shop-eyebrow">
              {t("Ваш выбор", "Сиздин тандооңуз")}
            </p>

            <h2>
              {t("Корзина", "Себет")}{" "}
              <span>
                (
                {entries.reduce(
                  (sum, item) => sum + item.quantity,
                  0
                )}
                )
              </span>
            </h2>
          </div>

          <button
            className="shop-icon-button"
            onClick={onClose}
            aria-label="Закрыть корзину"
          >
            <X />
          </button>
        </div>

        {success ? (
          <div className="shop-empty-cart shop-order-success">
            <div className="shop-order-success-icon">✓</div>

            <h3>
              {t("Заказ отправлен!", "Заказ жөнөтүлдү!")}
            </h3>

            <p>
              {t(
                "Спасибо за заказ! Наши продавцы скоро свяжутся с вами по телефону.",
                "Заказыңыз үчүн рахмат! Биздин сатуучулар жакында сиз менен байланышат."
              )}
            </p>

            <button
              className="shop-primary-button"
              onClick={onClose}
            >
              {t("Продолжить покупки", "Сатып алууну улантуу")}
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="shop-empty-cart">
            <ShoppingBag size={42} />

            <h3>
              {t("Корзина пока пуста", "Себет азырынча бош")}
            </h3>

            {t(
              "Добавьте товары, которые вам понравились.",
              "Өзүңүзгө жаккан товарларды кошуңуз."
            )}

            <button
              className="shop-primary-button"
              onClick={onClose}
            >
              {t("Перейти к покупкам", "Сатып алууга өтүү")}
            </button>
          </div>
        ) : (
          <>
            <div className="shop-cart-items">
              {entries.map(({ product, quantity }) => (
                <div className="shop-cart-item" key={product.id}>
                  <img
                    src={product.image}
                    alt={getProductTitle(product)}
                  />

                  <div className="shop-cart-item-info">
                    <strong>
                      {getProductTitle(product)}
                    </strong>

                    <span>{formatPrice(product.price)}</span>

                    <div className="shop-quantity">
                      <button
                        onClick={() =>
                          onChangeQuantity(
                            product.id,
                            quantity - 1
                          )
                        }
                        aria-label="Уменьшить количество"
                      >
                        −
                      </button>

                      <span>{quantity}</span>

                      <button
                        onClick={() =>
                          onChangeQuantity(
                            product.id,
                            quantity + 1
                          )
                        }
                        aria-label="Увеличить количество"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="shop-cart-footer">
              <div>
                <span>{t("Итого", "Жалпы сумма")}</span>
                <strong>{formatPrice(total)}</strong>
              </div>

              <button
                className="shop-primary-button"
                onClick={() => {
                  setError("");

                  trackPixel("InitiateCheckout", {
                    content_ids: entries.map(({ product }) =>
                      String(product.id)
                    ),
                    contents: entries.map(({ product, quantity }) => ({
                      id: String(product.id),
                      quantity,
                    })),
                    content_type: "product",
                    value: total,
                    currency: "KGS",
                    num_items: entries.reduce(
                      (sum, item) => sum + item.quantity,
                      0
                    ),
                  });

                  setCheckoutOpen(true);
                }}
              >
                {t("Оформить заказ", "Заказды тариздөө")}{" "}
                <ArrowRight size={18} />
              </button>
            </div>
          </>
        )}
      </aside>

      {checkoutOpen && !success && (
        <div
          className="shop-checkout-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !sending) {
              setCheckoutOpen(false);
              setError("");
            }
          }}
        >
          <div
            className="shop-checkout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-checkout-title"
          >
            <button
              className="shop-checkout-close"
              type="button"
              onClick={() => {
                if (!sending) {
                  setCheckoutOpen(false);
                  setError("");
                }
              }}
              aria-label="Закрыть"
              disabled={sending}
            >
              <X size={20} />
            </button>

            <p className="shop-eyebrow">
              {t("Последний шаг", "Акыркы кадам")}
            </p>

            <h3 id="shop-checkout-title">
              {t("Оформление заказа", "Заказды тариздөө")}
            </h3>

            <p className="shop-checkout-description">
              {t(
                "Оставьте свои контактные данные, и наш продавец свяжется с вами.",
                "Байланыш маалыматыңызды калтырыңыз, сатуучубуз сиз менен байланышат."
              )}
            </p>

            <form
              className="shop-checkout-form"
              onSubmit={handleOrderSubmit}
            >
              <label>
                {t("Ваше имя", "Сиздин атыңыз")}

                <input
                  type="text"
                  placeholder={t("Например, Аман", "Мисалы, Аман")}
                  value={customerName}
                  onChange={(event) =>
                    setCustomerName(event.target.value)
                  }
                  maxLength={80}
                  autoComplete="name"
                  required
                  disabled={sending}
                />
              </label>

              <label>
                {t("Номер телефона", "Телефон номери")}

                <input
                  type="tel"
                  placeholder="+996 700 123 456"
                  value={customerPhone}
                  onChange={(event) =>
                    setCustomerPhone(event.target.value)
                  }
                  maxLength={20}
                  autoComplete="tel"
                  required
                  disabled={sending}
                />
              </label>

              <label>
                {t("Адрес доставки", "Жеткирүү дареги")}

                <input
                  placeholder={t(
                    "Город, улица, дом, квартира",
                    "Шаар, көчө, үй, батир"
                  )}
                  value={customerAddress}
                  onChange={(event) =>
                    setCustomerAddress(event.target.value)
                  }
                  maxLength={300}
                  autoComplete="street-address"
                  required
                  disabled={sending}
                />
              </label>

              <div className="shop-checkout-total">
                <span>{t("К оплате", "Төлөнө турган сумма")}</span>
                <strong>{formatPrice(total)}</strong>
              </div>

              {error && (
                <p className="shop-checkout-error">
                  {error}
                </p>
              )}

              <button
                className="shop-primary-button"
                type="submit"
                disabled={sending}
              >
                {sending
                  ? t("Отправляем заказ...", "Заказ жөнөтүлүүдө...")
                  : t("Подтвердить заказ", "Заказды ырастоо")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


// =====================================================
// PRODUCT PAGE
// =====================================================

export default function ProductPage({
  productId,
  onBack,
  onOpenProduct,
  search = "",
  handleSearch,
  clearSearch,
}) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("runo_language") || "RU";
  });

  const t = (ru, kg) => (language === "KG" ? kg : ru);
const trackPixel = (event, data = {}) => {
  if (
    typeof window !== "undefined" &&
    typeof window.fbq === "function"
  ) {
    window.fbq("track", event, data);
  }
};
  // Переводы данных товара и категорий.
  const getProductTitle = (item) =>
    language === "KG"
      ? item?.titleKg || item?.title || ""
      : item?.title || "";

  const getProductDescription = (item) =>
    language === "KG"
      ? item?.descriptionKg || item?.description || ""
      : item?.description || "";

  const getCategoryName = (category) =>
    language === "KG"
      ? category?.nameKg || category?.name || ""
      : category?.name || "";

  const changeLanguage = (nextLanguage) => {
    setLanguage(nextLanguage);
    localStorage.setItem("runo_language", nextLanguage);
  };

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [added, setAdded] = useState(false);

  // Корзина ProductPage
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(CART_STORAGE_KEY) || "{}"
      );
    } catch {
      return {};
    }
  });

  const [cartOpen, setCartOpen] = useState(false);

  const cartCount = Object.values(cart).reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0
  );

  // Сохранение корзины
  useEffect(() => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(cart)
    );
  }, [cart]);

  // Загрузка товаров
  useEffect(() => {
    let cancelled = false;

    async function fetchShopData() {
      try {
        setLoading(true);
        setError("");

        const [productsResponse, categoriesResponse] =
          await Promise.all([
            fetch(`${API_URL}/api/shop/products`, {
              credentials: "include",
            }),
            fetch(`${API_URL}/api/shop/categories`, {
              credentials: "include",
            }),
          ]);

        if (!productsResponse.ok) {
          throw new Error("Не удалось загрузить товары");
        }

        if (!categoriesResponse.ok) {
          throw new Error("Не удалось загрузить категории");
        }

        const [productsResult, categoriesResult] =
          await Promise.all([
            productsResponse.json(),
            categoriesResponse.json(),
          ]);

        if (cancelled) return;

        setProducts(
          Array.isArray(productsResult.data)
            ? productsResult.data
            : []
        );

        setCategories(
          Array.isArray(categoriesResult.data)
            ? categoriesResult.data
            : []
        );
      } catch (err) {
        console.error("Ошибка загрузки товара:", err);

        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchShopData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Текущий товар
  const product = useMemo(() => {
    return products.find(
      (item) => String(item.id) === String(productId)
    );
  }, [products, productId]);

  // Сбрасываем состояние при смене товара
  useEffect(() => {
    setQuantity(1);
    setSelectedImage(product?.image || "");
    setIsFavorite(false);
    setAdded(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [productId, product?.image]);

  const categoryName =
    getCategoryName(
      categories.find(
        (category) =>
          String(category.id) === String(product?.category)
      )
    ) || t("Товары", "Товарлар");

  // Фотографии товара
  const images = useMemo(() => {
    if (!product) return [];

    return [product.image, ...(product.images || [])]
      .filter(
        (image, index, array) =>
          image && array.indexOf(image) === index
      )
      .slice(0, 6);
  }, [product]);

  // Рекомендации
  const recommended = useMemo(() => {
    if (!product) return [];

    const sameCategory = products.filter(
      (item) =>
        String(item.id) !== String(product.id) &&
        item.category === product.category
    );

    const otherCategory = products.filter(
      (item) =>
        String(item.id) !== String(product.id) &&
        item.category !== product.category
    );

    return [...sameCategory, ...otherCategory].slice(0, 4);
  }, [product, products]);

  // Добавление товара
  const addProductToCart = (item, amount = 1) => {
    if (!item) return;

    setCart((previousCart) => {
      const existing = previousCart[item.id];

      return {
        ...previousCart,
        [item.id]: {
          product: item,
          quantity:
            (Number(existing?.quantity) || 0) + amount,
        },
      };
    });
  };

const handleAddToCart = () => {
  if (!product) return;

  trackPixel("AddToCart", {
    content_ids: [String(product.id)],
    contents: [
      {
        id: String(product.id),
        quantity: quantity,
      },
    ],
    content_type: "product",
    value: Number(product.price) * quantity,
    currency: "KGS",
    num_items: quantity,
  });

  addProductToCart(product, quantity);
  setAdded(true);
};

  // Изменение количества в корзине
  const handleChangeQuantity = (productId, newQuantity) => {
    setCart((previousCart) => {
      const updatedCart = { ...previousCart };

      if (newQuantity <= 0) {
        delete updatedCart[productId];
      } else if (updatedCart[productId]) {
        updatedCart[productId] = {
          ...updatedCart[productId],
          quantity: newQuantity,
        };
      }

      return updatedCart;
    });
  };

  const goHome = () => {
    clearSearch?.();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    onBack?.();
  };

  // Загрузка
  if (loading) {
    return (
      <main className="shop-page shop-detail-page">
        <div className="shop-loading">
          <span className="shop-spinner" />
          <p>{t("Загружаем товар...", "Товар жүктөлүүдө...")}</p>
        </div>
      </main>
    );
  }

  // Ошибка
  if (error) {
    return (
      <main className="shop-page shop-detail-page">
        <button className="shop-back-button" onClick={onBack}>
          <ArrowLeft size={18} />
          {t("Назад в каталог", "Каталогго кайтуу")}
        </button>

        <section className="shop-product-not-found">
          <ShoppingBag size={44} />
          <h1>
            {t("Не удалось загрузить товар", "Товар жүктөлгөн жок")}
          </h1>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            {t("Повторить", "Кайталоо")}
          </button>
        </section>
      </main>
    );
  }

  // Товар не найден
  if (!product) {
    return (
      <main className="shop-page shop-detail-page">
        <button className="shop-back-button" onClick={onBack}>
          <ArrowLeft size={18} />
          {t("Назад в каталог", "Каталогго кайтуу")}
        </button>

        <section className="shop-product-not-found">
          <ShoppingBag size={44} />
          <h1>{t("Товар не найден", "Товар табылган жок")}</h1>
          <p>
            {t(
              "Возможно, товар был удалён или ссылка устарела.",
              "Балким, товар өчүрүлгөн же шилтеме эскирген."
            )}
          </p>
          <button onClick={onBack}>
            {t("Вернуться в каталог", "Каталогго кайтуу")}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="shop-page shop-detail-page">

      {/* КОРЗИНА ПРЯМО В PRODUCTPAGE */}
      {cartOpen && (
        <CartDrawer
          cart={cart}
          onClose={() => setCartOpen(false)}
          onChangeQuantity={handleChangeQuantity}
          onOrderSent={() => setCart({})}
          language={language}
        />
      )}

      {/* HEADER RUNO */}
      <header className="shop-header">
        <div className="shop-header-main shop-container">

          <button
            className="shop-logo"
            onClick={goHome}
            aria-label="Runo — главная"
          >
            <img
              alt="Runo"
              className="logoshop"
              src={runoLogo}
            />
          </button>

          <label className="shop-search">
            <Search size={18} />

            <input
              value={search}
              onChange={(event) =>
                handleSearch?.(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  clearSearch?.();
                }
              }}
              placeholder={t(
                "Найти товар...",
                "Товар издөө..."
              )}
            />

            {search && (
              <button
                type="button"
                className="shop-icon-button"
                onClick={clearSearch}
                aria-label="Очистить поиск"
              >
                <X size={17} />
              </button>
            )}
          </label>

          <div className="shop-language-switch">
            <button
              type="button"
              className={language === "KG" ? "active" : ""}
              onClick={() => changeLanguage?.("KG")}
            >
              KG
            </button>

            <button
              type="button"
              className={language === "RU" ? "active" : ""}
              onClick={() => changeLanguage?.("RU")}
            >
              RU
            </button>
          </div>

          <button
            type="button"
            className="shop-cart-button"
            onClick={() => setCartOpen(true)}
            aria-label="Открыть корзину"
          >
            <ShoppingBag size={20} />
            <span>{t("Корзина", "Себет")}</span>
            <b>{cartCount}</b>
          </button>

        </div>
      </header>

      <div className="shop-container shop-product-container">

        {/* НАЗАД */}
        <button
          className="shop-back-button"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
          {t("Назад в каталог", "Каталогго кайтуу")}
        </button>

        {/* ХЛЕБНЫЕ КРОШКИ */}
        <nav className="shop-breadcrumb">
          <button onClick={onBack}>
            {t("Главная", "Башкы бет")}
          </button>

          <ChevronRight size={14} />

          <span>{categoryName}</span>

          <ChevronRight size={14} />

          <span className="shop-breadcrumb-current">
            {getProductTitle(product)}
          </span>
        </nav>

        {/* ОСНОВНАЯ КАРТОЧКА */}
        <section className="shop-product-detail">

          {/* ФОТОГАЛЕРЕЯ */}
          <div className="shop-product-gallery">

            <div className="shop-product-thumbnails">
              {images.map((image, index) => (
                <button
                  type="button"
                  key={`${image}-${index}`}
                  className={
                    selectedImage === image ? "active" : ""
                  }
                  onClick={() => setSelectedImage(image)}
                  aria-label={`Фото ${index + 1}`}
                >
                  <img src={image} alt="" />
                </button>
              ))}
            </div>

            <div className="shop-product-main-image">

              {product.badge && (
                <span className="shop-product-badge">
                  {product.badge}
                </span>
              )}

              <button
                type="button"
                className={`shop-product-favorite ${
                  isFavorite ? "active" : ""
                }`}
                onClick={() =>
                  setIsFavorite((value) => !value)
                }
                aria-label="В избранное"
              >
                <Heart
                  size={23}
                  fill={isFavorite ? "currentColor" : "none"}
                />
              </button>

              <img
                src={selectedImage || product.image}
                alt={
                      language === "KG"
                        ? product.titleKg || product.title
                        : product.title
                    }
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = product.image;
                }}
              />
            </div>
          </div>

          {/* ИНФОРМАЦИЯ О ТОВАРЕ */}
          <div className="shop-product-info">

            <div className="shop-product-category">
              {categoryName}
            </div>

            <h1 className="shop-product-title titlepage">
              {getProductTitle(product)}
            </h1>

            <div className="shop-product-rating">
              <Star size={17} fill="currentColor" />
              <strong>{product.rating ?? "—"}</strong>
              <span>
                {product.reviews ?? 0}{" "}
                {t("отзывов", "пикир")}
              </span>
            </div>

            {/* ЦЕНА */}
            <div className="shop-product-price-block">
              <div className="shop-product-price">
                {formatPrice(product.price)}
              </div>

              {product.oldPrice > product.price && (
                <div className="shop-product-old-price-row">
                  <del>
                    {formatPrice(product.oldPrice)}
                  </del>

                  <span>
                    −
                    {Math.round(
                      ((product.oldPrice - product.price) /
                        product.oldPrice) *
                        100
                    )}
                    %
                  </span>
                </div>
              )}
            </div>

            <div className="shop-product-stock">
              <span />
              {t("Товар в наличии", "Товар кампада бар")}
            </div>

            <div className="shop-product-divider" />

            {/* КОЛИЧЕСТВО И ПОКУПКА */}
            <div className="shop-product-buy">

              <div className="shop-product-quantity">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() =>
                    setQuantity((value) =>
                      Math.max(1, value - 1)
                    )
                  }
                  aria-label="Уменьшить"
                >
                  <Minus size={17} />
                </button>

                <span>{quantity}</span>

                <button
                  type="button"
                  onClick={() =>
                    setQuantity((value) => value + 1)
                  }
                  aria-label="Увеличить"
                >
                  <Plus size={17} />
                </button>
              </div>

              <button
                type="button"
                className={`shop-product-add ${
                  added ? "added" : ""
                }`}
                onClick={handleAddToCart}
              >
                {added ? (
                  <Check size={20} />
                ) : (
                  <ShoppingBag size={20} />
                )}

                {added
                  ? t("Добавлено в корзину", "Себетке кошулду")
                  : t("Добавить в корзину", "Себетке кошуу")}
              </button>
            </div>

            {/* ДОСТАВКА */}
            <div className="shop-product-delivery">
              <div className="shop-product-delivery-icon">
                <Truck size={23} />
              </div>

              <div>
                <strong>{t("Доставка", "Жеткирүү")}</strong>
                <p>
                  {t(
                    "По Бишкеку и регионам Кыргызстана",
                    "Бишкек жана Кыргызстандын аймактарына"
                  )}
                </p>
              </div>
            </div>

            {/* ПРЕИМУЩЕСТВА */}
            <div className="shop-product-benefits">

              <div>
                <ShieldCheck size={21} />
                <span>
                  {t("Качество товаров", "Товардын сапаты")}
                </span>
              </div>

              <div>
                <RotateCcw size={21} />
                <span>
                  {t("Поддержка покупателей", "Кардарларды колдоо")}
                </span>
              </div>

            </div>

            {/* ОПИСАНИЕ */}
            <div className="shop-product-description">
              <h2>
                {t("Описание товара", "Товардын сүрөттөлүшү")}
              </h2>

              <p>
                {getProductDescription(product) ||
                  t(
                    "Подробная информация о товаре скоро появится.",
                    "Товар тууралуу толук маалымат жакында чыгат."
                  )}
              </p>
            </div>

          </div>
        </section>

        {/* ПОХОЖИЕ ТОВАРЫ */}
        <section className="shop-section shop-recommendations">

          <div className="shop-section-heading">
            <div>
              <p className="shop-eyebrow">
                {t("Может понравиться", "Сизге жагышы мүмкүн")}
              </p>

              <h2 className="mb-20">
                {t("Похожие товары", "Окшош товарлар")}
              </h2>
            </div>

            {/* <span className="shop-recommendations-count">
              {recommended.length} {t("товара", "товар")}
            </span> */}
          </div>

          {recommended.length > 0 ? (
            <div className="shop-product-grid">
              {recommended.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  onOpen={onOpenProduct}
                  onAddToCart={() => {
  trackPixel("AddToCart", {
    content_ids: [String(item.id)],
    contents: [
      {
        id: String(item.id),
        quantity: 1,
      },
    ],
    content_type: "product",
    value: Number(item.price) || 0,
    currency: "KGS",
    num_items: 1,
  });

  addProductToCart(item, 1);
}}
                  language={language}
                />
              ))}
            </div>
          ) : (
            <p className="shop-empty-recommendations">
              {t(
                "Скоро здесь появятся похожие товары.",
                "Жакында бул жерде окшош товарлар пайда болот."
              )}
            </p>
          )}

        </section>

      </div>
    </main>
  );
}
