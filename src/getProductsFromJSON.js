
import API_URL from "./config.js";

export const formatPrice = (price) =>
  `${new Intl.NumberFormat("ru-RU").format(price)} сом`;