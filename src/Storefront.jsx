
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";

import API_URL from "./config.js";
import ProductCard from "./ProductCard";
import "./Storefront.css";
import runoLogo from "./runo.PNG";
import runoLogo2 from "./imgs/RUNOBOLD.png";
import runoLogo3 from "./imgs/RUNOCURSIV.png";

import HeroSlider from "./HeroSlider";
import ProductPage from "./ProductPage";

const CART_STORAGE_KEY = "runo_cart";

const formatPrice = (price) =>
  `${new Intl.NumberFormat("ru-RU").format(price)} сом`;

function getSearchFromUrl() {
  const match = window.location.pathname.match(/^\/search=(.*)$/);

  if (!match) return "";

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function updateSearchUrl(value) {
  const newUrl = value.trim()
    ? `/search=${encodeURIComponent(value.trim())}`
    : "/";

  if (
    window.location.pathname + window.location.search !== newUrl
  ) {
    window.history.pushState({}, "", newUrl);
  }
}

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

function shuffleProducts(products) {
  const result = [...products];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export default function Storefront({ onOpenProduct }) {
  const trackPixel = (event, data = {}) => {
  if (
    typeof window !== "undefined" &&
    typeof window.fbq === "function"
  ) {
    window.fbq("track", event, data);
  }
};
  // Данные магазина с backend
  const [selectedProductId, setSelectedProductId] = useState(
  getProductIdFromUrl
);
  const [products, setProducts] = useState([]);
  const [shuffledProducts, setShuffledProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [slides, setSlides] = useState([]);

  const [shopLoading, setShopLoading] = useState(true);
  const [shopError, setShopError] = useState("");

  const [language, setLanguage] = useState(
  () => localStorage.getItem("runo_language") || "RU"
);

const changeLanguage = (lang) => {
  if (lang !== "RU" && lang !== "KG") return;

  localStorage.setItem("runo_language", lang);
  setLanguage(lang);
};

function getProductIdFromUrl() {
  const match = window.location.pathname.match(/^\/product\/([^/]+)\/?$/);

  if (!match) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

// Открытие страницы товара
// Открытие страницы товара с изменением URL
const handleOpenProduct = (product) => {
  const productId =
    typeof product === "object" ? product?.id : product;

  if (!productId) return;

  const newUrl = `/product/${encodeURIComponent(productId)}`;

  if (window.location.pathname !== newUrl) {
    window.history.pushState({}, "", newUrl);
  }

  setSelectedProductId(String(productId));

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

// Возвращение назад
const handleBackToCatalog = () => {
  window.history.pushState({}, "", "/");

  setSelectedProductId(null);

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

const t = (ru, kg) => language === "KG" ? kg : ru;

  // Загрузка JSON с backend
  useEffect(() => {
    let cancelled = false;

    async function fetchShopData() {
      try {
        setShopLoading(true);
        setShopError("");

        const [
          productsResponse,
          categoriesResponse,
          slidesResponse,
        ] = await Promise.all([
          fetch(`${API_URL}/api/shop/products`, {
            credentials: "include",
          }),

          fetch(`${API_URL}/api/shop/categories`, {
            credentials: "include",
          }),

          fetch(`${API_URL}/api/shop/slides`, {
            credentials: "include",
          }),
        ]);

        if (
          !productsResponse.ok ||
          !categoriesResponse.ok ||
          !slidesResponse.ok
        ) {
          throw new Error(
            "Не удалось загрузить данные магазина"
          );
        }

        const [
          productsResult,
          categoriesResult,
          slidesResult,
        ] = await Promise.all([
          productsResponse.json(),
          categoriesResponse.json(),
          slidesResponse.json(),
        ]);

        if (cancelled) return;

       const loadedProducts = Array.isArray(productsResult.data)
  ? productsResult.data
  : [];

setProducts(loadedProducts);
setShuffledProducts(shuffleProducts(loadedProducts));

        setCategories(
          Array.isArray(categoriesResult.data)
            ? categoriesResult.data
            : []
        );

        setSlides(
          Array.isArray(slidesResult.data)
            ? slidesResult.data
            : []
        );

      } catch (error) {
        console.error("Ошибка загрузки магазина:", error);

        if (!cancelled) {
          setShopError(error.message);
        }
      } finally {
        if (!cancelled) {
          setShopLoading(false);
        }
      }
    }

    fetchShopData();

    return () => {
      cancelled = true;
    };
  }, []);

  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedFilling, setSelectedFilling] = useState("");
const [selectedBedType, setSelectedBedType] = useState("");
const [selectedSeason, setSelectedSeason] = useState("");

  const [search, setSearch] = useState(getSearchFromUrl);
  const [visibleCount, setVisibleCount] = useState(8);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loaderRef = useRef(null);
 const filteredProducts = useMemo(() => {
  return shuffledProducts.filter((product) => {
    const categoryMatches =
      activeCategory === "all" ||
      product.category === activeCategory;

    const query = search.trim().toLocaleLowerCase("ru");

    const searchMatches =
      !query ||
      product.title?.toLocaleLowerCase("ru").includes(query) ||
      product.titleKg?.toLocaleLowerCase("ru").includes(query);

    const fillingMatches =
      !selectedFilling ||
      product.filling === selectedFilling;

    const bedTypeMatches =
      !selectedBedType ||
      product.bedType === selectedBedType;

    const seasonMatches =
      !selectedSeason ||
      product.season === selectedSeason;

    return (
      categoryMatches &&
      searchMatches &&
      fillingMatches &&
      bedTypeMatches &&
      seasonMatches
    );
  });
}, [
  products,
  shuffledProducts,
  activeCategory,
  search,
  selectedFilling,
  selectedBedType,
  selectedSeason,
]);
  // Бесконечная загрузка товаров
useEffect(() => {
  const loader = loaderRef.current;

  if (!loader) return;

  if (visibleCount >= filteredProducts.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const [entry] = entries;

      if (entry.isIntersecting) {
        setVisibleCount((prev) =>
          Math.min(prev + 4, filteredProducts.length)
        );
      }
    },
    {
      root: null,
      rootMargin: "300px",
      threshold: 0,
    }
  );

  observer.observe(loader);

  return () => {
    observer.disconnect();
  };
}, [visibleCount, filteredProducts.length]);

useEffect(() => {
  setVisibleCount(8);
}, [
  activeCategory,
  search,
  selectedFilling,
  selectedBedType,
  selectedSeason,
]);

 const [cart, setCart] = useState(() => {
  try {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);

    return savedCart ? JSON.parse(savedCart) : {};
  } catch (error) {
    console.error("Ошибка загрузки корзины:", error);
    return {};
  }
});

useEffect(() => {
  const openCart = () => {
    setCartOpen(true);
  };

  const syncCart = () => {
    try {
      const savedCart = JSON.parse(
        localStorage.getItem("runo_cart") || "{}"
      );

      setCart(savedCart);
    } catch {
      setCart({});
    }
  };

  window.addEventListener("runo-open-cart", openCart);
  window.addEventListener("runo-cart-updated", syncCart);

  return () => {
    window.removeEventListener("runo-open-cart", openCart);
    window.removeEventListener("runo-cart-updated", syncCart);
  };
}, []);


useEffect(() => {
  localStorage.setItem("runo_cart", JSON.stringify(cart));
}, [cart]);

  const cartCount = Object.values(cart).reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  // Сохранение корзины
  useEffect(() => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(cart)
    );
  }, [cart]);

  // Добавление товара
// Добавление товара в корзину + Meta Pixel
const onAddToCart = (product) => {
  if (!product?.id) return;

  trackPixel("AddToCart", {
    content_ids: [String(product.id)],
    contents: [
      {
        id: String(product.id),
        quantity: 1,
      },
    ],
    content_type: "product",
    value: Number(product.price) || 0,
    currency: "KGS",
    num_items: 1,
  });

  setCart((prevCart) => {
    const existing = prevCart[product.id];

    return {
      ...prevCart,
      [product.id]: {
        product,
        quantity: existing
          ? existing.quantity + 1
          : 1,
      },
    };
  });
};

  // Изменение количества
  const onChangeQuantity = (productId, quantity) => {
    setCart((prevCart) => {
      if (quantity <= 0) {
        const updatedCart = { ...prevCart };

        delete updatedCart[productId];

        return updatedCart;
      }

      return {
        ...prevCart,
        [productId]: {
          ...prevCart[productId],
          quantity,
        },
      };
    });
  };

  const isSearchPage = search.trim().length > 0;

  // Синхронизация поиска с URL
useEffect(() => {
  const handlePopState = () => {
    const productId = getProductIdFromUrl();

    setSelectedProductId(productId);
    setSearch(getSearchFromUrl());
    setActiveCategory("all");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  window.addEventListener("popstate", handlePopState);

  return () => {
    window.removeEventListener("popstate", handlePopState);
  };
}, []);

  const handleSearch = (value) => {
    setSelectedProductId(null);
    setSearch(value);
    setActiveCategory("all");
    setVisibleCount(8);

    updateSearchUrl(value);
  };

  // Фильтрация товаров


  // Хиты продаж
  const hits = products
    .filter((product) => product.badge === "Хит")
    .slice(0, 4);

  // Новинки
  const newest = products
    .filter((product) => product.badge === "Новинка")
    .slice(0, 4);

  // Товары категории
  const categoryProducts = products
    .filter((product) => product.category === "clothes")
    .slice(0, 4);

  const visibleProducts = filteredProducts.slice(
    0,
    visibleCount
  );

  const handleCategory = (id) => {
    setActiveCategory(id);
    setMobileMenuOpen(false);

    document
      .getElementById("shop-catalog")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  const clearSearch = () => {
    handleSearch("");
  };

  // Экран загрузки
  if (shopLoading) {
    return (
      <div className="shop-loading">
        <span className="shop-spinner" />
        <p>{t("Загружаем магазин...", "Дүкөн жүктөлүүдө...")}</p>
      </div>
    );
  }

  // Ошибка загрузки
  if (shopError) {
    return (
      <div className="shop-loading">
        {t("Не удалось загрузить магазин", "Дүкөндү жүктөө мүмкүн болгон жок")}
        <p>{shopError}</p>

        <button
          className="shop-primary-button"
          onClick={() => window.location.reload()}
        >
          {t("Повторить", "Кайталоо")}
        </button>
      </div>
    );
  }
  // Страница отдельного товара

if (selectedProductId) {
  return (
    <>
      <ProductPage
        productId={selectedProductId}
        onBack={handleBackToCatalog}
        onOpenProduct={handleOpenProduct}
        onAddToCart={onAddToCart}
        language={language}
        changeLanguage={changeLanguage}
        cartCount={cartCount}
        setCartOpen={setCartOpen}
        search={search}
        handleSearch={handleSearch}
        clearSearch={clearSearch}
      />

      {cartOpen && (
        <CartDrawer
          cart={cart}
          onClose={() => setCartOpen(false)}
          onChangeQuantity={onChangeQuantity}
          onOrderSent={() => setCart({})}
          language={language}
        />
      )}
    </>
  );
}


  return (
    <div
  className="shop-shell"
  style={{
    "--shop-pattern": `url("${runoLogo3}")`,
  }}
>
      
      <header className="shop-header">
        <div className="shop-header-main shop-container">
          <button
            className="shop-logo"
            onClick={() => {
              clearSearch();
              setActiveCategory("all");

              window.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }}
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
                handleSearch(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  clearSearch();
                }
              }}
              placeholder={t("Найти товар...", "Товар издөө...")}
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
    onClick={() => changeLanguage("KG")}
  >
    KG
  </button>

  <button
    type="button"
    className={language === "RU" ? "active" : ""}
    onClick={() => changeLanguage("RU")}
  >
    RU
  </button>
</div>

  <button
            className="logo-up"
            onClick={() => {
              clearSearch();
              setActiveCategory("all");

              window.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }}
            aria-label="Runo — главная"
          >
            <img
              alt="Runo"
              className="logoshop2"
              src={runoLogo2}
            />
          </button>


          <button
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

      <main className="shop-container shop-main">
        {!isSearchPage && (
          <>
            {/* <HeroSlider slides={slides} language={language} /> */}

            <section className="shop-section mt-00">
              <div className="shop-section-heading">
                <div>
                  <p className="shop-eyebrow"></p>
                  <h2 className="mb-20">{t("Новинки", "Жаңылыктар")}</h2>
                </div>
{/* 
                <button
                  className="shop-text-link"
                  onClick={() =>
                    handleCategory("all")
                  }
                >
                  {t("Все товары", "Бардык товарлар")}<ArrowRight size={17} />
                </button> */}
              </div>

              <div className="shop-product-grid">
                {newest.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onOpen={handleOpenProduct}
                    onAddToCart={onAddToCart}
                    language={language}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        {/* Каталог и результаты поиска */}
        <section
          className="shop-section shop-catalog-section"
          id="shop-catalog"
        >
          <div className="shop-section-heading shop-catalog-heading">
            <div>
             <p className="shop-eyebrow">
  {isSearchPage
    ? t("РЕЗУЛЬТАТЫ ПОИСКА", "ИЗДӨӨНҮН ЖЫЙЫНТЫГЫ")
    : ""}
</p>

  <h2>
    {isSearchPage
      ? `${t("Результаты поиска", "Издөө жыйынтыгы")}: «${search}»`
      : activeCategory === "all"
        ? t("Всё, что тебе нужно", "Сага керектүү нерселердин баары")
        : categories.find(
            (item) => item.id === activeCategory
          )?.[language === "KG" ? "nameKg" : "name"] ||
          categories.find(
            (item) => item.id === activeCategory
          )?.name}
  </h2>


<p className="shop-results-count">
  {t("Найдено товаров:", "Табылган товарлар:")} {filteredProducts.length}
</p>
            </div>
          </div>

        
          <div className="filter">

  <div className="shop-product-filters">
    <select
      value={selectedFilling}
      onChange={(e) => setSelectedFilling(e.target.value)}
    >
      <option value="">{t("Наполнители", "Толтургучтар")}</option>
      <option value="Вата">{t("Вата", "Пахта")}</option>
      <option value="Шерсть">{t("Шерсть", "Жүн")}</option>
    </select>

    <select
      value={selectedBedType}
      onChange={(e) => setSelectedBedType(e.target.value)}
    >
      <option value="">{t("Размеры", "өлчөмдөр")}</option>
      <option value="Односпалка">{t("Односпалка", "Бир кишилик")}</option>
      <option value="Двухспалка">{t("Двухспалка", "Эки кишилик")}</option>
      <option value="Семейка">{t("Семейка", "Үй-бүлөлүк")}</option>
    </select>

    <select
      value={selectedSeason}
      onChange={(e) => setSelectedSeason(e.target.value)}
    >
      <option value="">{t("Сезоны", "Мезгилдер")}</option>
      <option value="Лето">{t("Лето", "Жай")}</option>
      <option value="Всесезонка">{t("Всесезонка", "Бардык мезгилге")}</option>
      <option value="Зима">{t("Зима", "Кыш")}</option>
    </select>

    {(selectedFilling || selectedBedType || selectedSeason) && (
      <button
        type="button"
        className="shop-filter-reset"
        onClick={() => {
          setSelectedFilling("");
          setSelectedBedType("");
          setSelectedSeason("");
        }}
      >
        <X size={15} />
        {t("Сбросить", "Тазалоо")}
      </button>
    )}
  </div>
</div>

  {!isSearchPage && (
            <div className="shop-filter-chips">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={
                    activeCategory === category.id
                      ? "is-active"
                      : ""
                  }
                  onClick={() =>
                    setActiveCategory(category.id)
                  }
                >
                   {language === "KG"
          ? category.nameKg || category.name
          : category.name}
                </button>
              ))}
            </div>
          )}

          {visibleProducts.length ? (
            <div className="shop-product-grid">
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpen={handleOpenProduct}
                  onAddToCart={onAddToCart}
                    language={language}
                />
              ))}
            </div>
          ) : (
            <div className="shop-no-results">
              <Search size={30} />

              <h3>{t("Ничего не найдено", "Эч нерсе табылган жок")}</h3>

<p>
  {t(
    "Попробуй изменить запрос или выбрать другую категорию.",
    "Издөө сөзүн өзгөртүп же башка категорияны тандап көрүңүз."
  )}
</p>

<button
  className="shop-primary-button"
  onClick={() => {
    clearSearch();
    setActiveCategory("all");
  }}
>
  {t("Вернуться в каталог", "Каталогго кайтуу")}
</button>
            </div>
          )}

       {visibleCount < filteredProducts.length && (
  <div
    className="shop-infinite-loader"
    ref={loaderRef}
  >
    <span className="shop-spinner" />
    {t("Загружаем ещё товары...", "Дагы товарлар жүктөлүүдө...")}
  </div>
)}

          {filteredProducts.length > 0 &&
            visibleCount >= filteredProducts.length && (
              <p className="shop-end-of-list">
                
                 {t("Ты посмотрел(а) все товары из этой подборки", "Бул топтомдогу бардык товарларды көрдүңүз")} 
              </p>
            )}
        </section>
      </main>

      {!isSearchPage && (
        <footer className="shop-footer">
          <div className="shop-container shop-footer-inner">
            <button
              className="shop-logo shop-footer-logo"
              onClick={() =>
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                })
              }
            >
              <span>.</span>
            </button>

            <p></p>

            <span>© 2026 RUNO · Кыргызстан</span>
          </div>
        </footer>
      )}

      {cartOpen && (
        <CartDrawer
          cart={cart}
          onClose={() => setCartOpen(false)}
          onChangeQuantity={onChangeQuantity}
          onOrderSent={() => setCart({})}
          language={language}
        />
      )}
    </div>
  );
}
