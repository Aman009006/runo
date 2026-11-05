
import React, { useCallback, useEffect, useState } from "react";
import Storefront from "./Storefront";
import ProductPage from "./ProductPage";
import CashApp from "./CashApp";
import ShopAdmin from "./ShopAdmin";

const trackPixel = (event, data = {}) => {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", event, data);
  }
};

function getRoute() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/cash" || path.startsWith("/cash/")) {
    return { page: "cash" };
  }

  if (path === "/statisticForAdmin") {
    return { page: "statistics" };
  }

  if (path === "/shop-admin") {
    return { page: "shop-admin" };
  }

  const productMatch = path.match(/^\/product\/([^/]+)$/);

  if (productMatch) {
    return {
      page: "product",
      productId: decodeURIComponent(productMatch[1]),
    };
  }

  return { page: "store" };
}

export default function App() {
  const [route, setRoute] = useState(getRoute);
  const [cart, setCart] = useState({});

  // Отслеживание просмотров страниц и товаров
  useEffect(() => {
    if (route.page !== "store" && route.page !== "product") {
      return;
    }

    trackPixel("PageView");

    if (route.page === "product") {
      trackPixel("ViewContent", {
        content_ids: [String(route.productId)],
        content_type: "product",
      });
    }
  }, [route.page, route.productId]);

  useEffect(() => {
    const handlePopState = () => setRoute(getRoute());

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const navigate = useCallback((path) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }

    setRoute(getRoute());

    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, []);

  // Добавление товара в корзину
  const addToCart = useCallback((product) => {
    if (!product || !product.id) return;

    trackPixel("AddToCart", {
      content_ids: [String(product.id)],
      content_type: "product",
      value: Number(product.price) || 0,
      currency: "KGS",
    });

    setCart((current) => ({
      ...current,
      [product.id]: {
        product,
        quantity: (current[product.id]?.quantity || 0) + 1,
      },
    }));
  }, []);

  // Изменение количества товара
  const changeQuantity = useCallback(
    (productId, quantity) => {
      setCart((current) => {
        const next = { ...current };

        if (quantity <= 0) {
          delete next[productId];
        } else if (next[productId]) {
          next[productId] = {
            ...next[productId],
            quantity,
          };
        }

        return next;
      });
    },
    []
  );

  if (route.page === "cash") {
    return <CashApp />;
  }

  if (route.page === "statistics") {
    return <CashApp />;
  }

  if (route.page === "shop-admin") {
    return <ShopAdmin />;
  }

  if (route.page === "product") {
    return (
      <ProductPage
        productId={route.productId}
        onBack={() => navigate("/")}
        onOpenProduct={(id) =>
          navigate(`/product/${encodeURIComponent(id)}`)
        }
        onAddToCart={addToCart}
      />
    );
  }

  return (
    <Storefront
      onOpenProduct={(id) =>
        navigate(`/product/${encodeURIComponent(id)}`)
      }
      cart={cart}
      onAddToCart={addToCart}
      onChangeQuantity={changeQuantity}
    />
  );
}
