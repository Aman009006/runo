import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  Plus,
  Trash2,
  Wallet,
  X,
  CalendarDays,
} from "lucide-react";

import "./expenses.css";

const API_URL = "http://localhost:5000";

const DEFAULT_CATEGORIES = [
  "Аренда",
  "Зарплата",
  "Транспорт",
  "Коммунальные услуги",
  "Закупка",
  "Другое",
];

const getDateKey = (date) => {
  const parsedDate = new Date(date);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return "";
  }

  const year =
    parsedDate.getFullYear();

  const month = String(
    parsedDate.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    parsedDate.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getTodayKey = () => {
  return getDateKey(new Date());
};

const formatDate = (date) => {
  if (!date) {
    return "Дата не указана";
  }

  const parsedDate =
    new Date(date);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return "Дата не указана";
  }

  return parsedDate.toLocaleString(
    "ru-RU",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
};

const formatDay = (dateKey) => {
  if (!dateKey) {
    return "";
  }

  const [
    year,
    month,
    day,
  ] = dateKey
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day,
  );

  return date.toLocaleDateString(
    "ru-RU",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );
};

const formatAmount = (amount) => {
  return Number(
    amount || 0,
  ).toLocaleString(
    "ru-RU",
    {
      maximumFractionDigits: 2,
    },
  );
};

function Expenses({ onBack }) {
  const [expenses, setExpenses] =
    useState([]);

  const [categories, setCategories] =
    useState(
      DEFAULT_CATEGORIES,
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState(null);

  const [success, setSuccess] =
    useState(null);

  const [isFormOpen, setIsFormOpen] =
    useState(false);

  const [amount, setAmount] =
    useState("");

  const [category, setCategory] =
    useState("");

  const [
    customCategory,
    setCustomCategory,
  ] = useState("");

  const [comment, setComment] =
    useState("");

  // Выбранная дата.
  const [selectedDate, setSelectedDate] =
    useState(getTodayKey());

  // Значение input[type=date].
  const [calendarDate, setCalendarDate] =
    useState(getTodayKey());

  /**
   * Загрузка всех расходов.
   */
  const loadExpenses = async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        expensesResponse,
        categoriesResponse,
      ] = await Promise.all([
        fetch(
          `${API_URL}/api/expenses`,
        ),
        fetch(
          `${API_URL}/api/expenses/categories`,
        ),
      ]);

      if (!expensesResponse.ok) {
        const data =
          await expensesResponse.json();

        throw new Error(
          data.message ||
            "Не удалось загрузить расходы",
        );
      }

      const expensesData =
        await expensesResponse.json();

      setExpenses(
        Array.isArray(
          expensesData,
        )
          ? expensesData
          : [],
      );

      if (
        categoriesResponse.ok
      ) {
        const categoriesData =
          await categoriesResponse.json();

        if (
          Array.isArray(
            categoriesData,
          )
        ) {
          setCategories([
            ...new Set([
              ...DEFAULT_CATEGORIES,
              ...categoriesData,
            ]),
          ]);
        }
      }
    } catch (err) {
      console.error(
        "Expenses error:",
        err,
      );

      setError(
        err.message ||
          "Не удалось загрузить расходы",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  /**
   * Все даты, за которые есть расходы.
   *
   * Здесь НЕТ ограничения по количеству дней.
   */
  const expenseDates = useMemo(() => {
    const dates = expenses
      .map((expense) =>
        getDateKey(
          expense.createdAt,
        ),
      )
      .filter(Boolean);

    return [
      ...new Set(dates),
    ].sort(
      (a, b) =>
        new Date(
          `${b}T00:00:00`,
        ) -
        new Date(
          `${a}T00:00:00`,
        ),
    );
  }, [expenses]);

  /**
   * Все расходы выбранной даты.
   */
  const filteredExpenses =
    useMemo(() => {
      return expenses.filter(
        (expense) =>
          getDateKey(
            expense.createdAt,
          ) === selectedDate,
      );
    }, [
      expenses,
      selectedDate,
    ]);

  /**
   * Сумма выбранного дня.
   */
  const selectedDayTotal =
    useMemo(() => {
      return filteredExpenses.reduce(
        (sum, expense) =>
          sum +
          Number(
            expense.amount || 0,
          ),
        0,
      );
    }, [filteredExpenses]);

  /**
   * Общая сумма всех расходов.
   */
  const allExpensesTotal =
    useMemo(() => {
      return expenses.reduce(
        (sum, expense) =>
          sum +
          Number(
            expense.amount || 0,
          ),
        0,
      );
    }, [expenses]);

  /**
   * Сброс формы.
   */
  const resetForm = () => {
    setAmount("");
    setCategory("");
    setCustomCategory("");
    setComment("");
  };

  /**
   * Закрытие формы.
   */
  const closeForm = () => {
    if (saving) {
      return;
    }

    setIsFormOpen(false);
    resetForm();
  };

  /**
   * Выбор даты через календарь.
   */
  const handleCalendarChange = (
    event,
  ) => {
    const value =
      event.target.value;

    if (!value) {
      return;
    }

    setCalendarDate(value);
    setSelectedDate(value);
  };

  /**
   * Выбор даты из списка истории.
   */
  const handleDateSelect = (
    date,
  ) => {
    setSelectedDate(date);
    setCalendarDate(date);
  };

  /**
   * Добавление расхода.
   */
  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    const normalizedAmount =
      Number(amount);

    if (
      !Number.isFinite(
        normalizedAmount,
      ) ||
      normalizedAmount <= 0
    ) {
      setError(
        "Введите корректную сумму",
      );
      return;
    }

    let finalCategory =
      category;

    if (
      category ===
      "__custom__"
    ) {
      finalCategory =
        customCategory.trim();
    }

    if (!finalCategory) {
      setError(
        "Выберите или укажите категорию",
      );
      return;
    }

    setSaving(true);

    try {
      const response =
        await fetch(
          `${API_URL}/api/expenses`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              amount:
                normalizedAmount,

              category:
                finalCategory,

              comment:
                comment.trim(),
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Не удалось сохранить расход",
        );
      }

      setExpenses((prev) => [
        data,
        ...prev,
      ]);

      setCategories((prev) => [
        ...new Set([
          ...prev,
          finalCategory,
        ]),
      ]);

      const createdDate =
        getDateKey(
          data.createdAt,
        );

      if (createdDate) {
        setSelectedDate(
          createdDate,
        );

        setCalendarDate(
          createdDate,
        );
      }

      setSuccess(
        "Расход успешно добавлен",
      );

      setIsFormOpen(false);
      resetForm();
    } catch (err) {
      console.error(
        "Create expense error:",
        err,
      );

      setError(
        err.message ||
          "Не удалось сохранить расход",
      );
    } finally {
      setSaving(false);
    }
  };

  /**
   * Удаление расхода.
   */
  const deleteExpense = async (
    id,
  ) => {
    const confirmed =
      window.confirm(
        "Удалить этот расход?",
      );

    if (!confirmed) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response =
        await fetch(
          `${API_URL}/api/expenses/${id}`,
          {
            method: "DELETE",
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Не удалось удалить расход",
        );
      }

      setExpenses((prev) =>
        prev.filter(
          (expense) =>
            String(
              expense.id,
            ) !==
            String(id),
        ),
      );

      setSuccess(
        "Расход удалён",
      );
    } catch (err) {
      console.error(
        "Delete expense error:",
        err,
      );

      setError(
        err.message ||
          "Не удалось удалить расход",
      );
    }
  };

  return (
    <div className="expenses-page">
      <div className="expenses-container">

        {/* HEADER */}

        <header className="expenses-header">

          <button
            type="button"
            className="expenses-back-button"
            onClick={onBack}
          >
            <ArrowLeft size={20} />
            Назад
          </button>

          <div className="expenses-title-wrapper">

            <div className="expenses-title-icon">
              <Wallet size={24} />
            </div>

            <div>
              <h1>
                Расходы
              </h1>

              <p>
                История и управление расходами
              </p>
            </div>

          </div>

          <button
            type="button"
            className="expenses-add-button"
            onClick={() => {
              setError(null);
              setSuccess(null);
              setIsFormOpen(true);
            }}
          >
            <Plus size={20} />
            Добавить расход
          </button>

        </header>

        {/* ALERTS */}

        {error && (
          <div className="expenses-alert expenses-alert-error">
            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError(null)
              }
            >
              <X size={17} />
            </button>
          </div>
        )}

        {success && (
          <div className="expenses-alert expenses-alert-success">
            <span>
              {success}
            </span>

            <button
              type="button"
              onClick={() =>
                setSuccess(null)
              }
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* SUMMARY */}

        {/* <div className="expenses-summary"> */}

          <div className="expenses-summary-card">

            <div className="expenses-summary-label">
              За выбранную дату
            </div>

            <div className="expenses-summary-value">
              {formatAmount(
                selectedDayTotal,
              )}{" "}
              сом
            </div>

          </div>

          {/* <div className="expenses-summary-card">

            <div className="expenses-summary-label">
              Всего за всё время
            </div>

            <div className="expenses-summary-value">
              {formatAmount(
                allExpensesTotal,
              )}{" "}
              сом
            </div>

          </div> */}

        {/* </div> */}

        {/* DATE SELECTOR */}

        <section className="expenses-days">

          <div className="expenses-section-title">
            <CalendarDays size={19} />

            История расходов
          </div>

          <div className="expenses-date-controls">

            <button
              type="button"
              className={`expenses-today-button ${
                selectedDate ===
                getTodayKey()
                  ? "active"
                  : ""
              }`}
              onClick={() => {
                const today =
                  getTodayKey();

                setSelectedDate(
                  today,
                );

                setCalendarDate(
                  today,
                );
              }}
            >
              Сегодня
            </button>

            <div className="expenses-calendar-wrapper">
              <CalendarDays
                size={18}
              />

              <input
                type="date"
                value={
                  calendarDate
                }
                onChange={
                  handleCalendarChange
                }
              />
            </div>

          </div>

          {expenseDates.length >
            0 && (
            <div className="expenses-history-dates">

              <div className="expenses-dates-label">
                Даты с расходами:
              </div>

              <div className="expenses-days-list">

                {expenseDates.map(
                  (date) => (
                    <button
                      type="button"
                      key={date}
                      className={`expenses-day-button ${
                        selectedDate ===
                        date
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        handleDateSelect(
                          date,
                        )
                      }
                    >
                      {formatDay(
                        date,
                      )}
                    </button>
                  ),
                )}

              </div>

            </div>
          )}

        </section>

        {/* HISTORY */}

        <section className="expenses-history">

          <div className="expenses-history-header">

            <div>

              <h2>
                Расходы за{" "}
                {selectedDate ===
                getTodayKey()
                  ? "сегодня"
                  : formatDay(
                      selectedDate,
                    )}
              </h2>

              <span>
                {filteredExpenses.length}{" "}
                {filteredExpenses.length ===
                1
                  ? "расход"
                  : "расходов"}
              </span>

            </div>

            <div className="expenses-day-total">
              {formatAmount(
                selectedDayTotal,
              )}{" "}
              сом
            </div>

          </div>

          {loading ? (
            <div className="expenses-empty">
              Загрузка расходов...
            </div>
          ) : filteredExpenses.length ===
            0 ? (
            <div className="expenses-empty">

              <Wallet size={38} />

              <strong>
                Расходов за эту дату нет
              </strong>

              <span>
                Выберите другую дату
                или добавьте новый расход.
              </span>

            </div>
          ) : (
            <div className="expenses-list">

              {filteredExpenses.map(
                (expense) => (
                  <div
                    className="expense-history-item"
                    key={expense.id}
                  >

                    <div className="expense-history-main">

                      <div className="expense-history-top">

                        <div className="expense-history-category">
                          {
                            expense.category
                          }
                        </div>

                        <div className="expense-history-amount">
                          −{" "}
                          {formatAmount(
                            expense.amount,
                          )}{" "}
                          сом
                        </div>

                      </div>

                      <div className="expense-history-comment">
                        {expense.comment ||
                          "Без комментария"}
                      </div>

                      <div className="expense-history-date">
                        {formatDate(
                          expense.createdAt,
                        )}
                      </div>

                    </div>

                    <button
                      type="button"
                      className="expense-delete-button"
                      onClick={() =>
                        deleteExpense(
                          expense.id,
                        )
                      }
                      title="Удалить расход"
                    >
                      <Trash2
                        size={18}
                      />
                    </button>

                  </div>
                ),
              )}

            </div>
          )}

        </section>

      </div>

      {/* ADD EXPENSE MODAL */}

      {isFormOpen && (
        <div className="expenses-modal-overlay">

          <div className="expenses-modal animate-modal">

            <div className="expenses-modal-header">

              <div>
                <h2>
                  Новый расход
                </h2>

                <p>
                  Добавьте информацию о расходе
                </p>
              </div>

              <button
                type="button"
                className="expenses-modal-close"
                onClick={closeForm}
                disabled={saving}
              >
                <X size={21} />
              </button>

            </div>

            <form
              className="expenses-form"
              onSubmit={
                handleSubmit
              }
            >

              <label className="expenses-field">

                <span>
                  Сумма, сом
                </span>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) =>
                    setAmount(
                      event.target.value,
                    )
                  }
                  placeholder="Например: 1500"
                  autoFocus
                />

              </label>

              <label className="expenses-field">

                <span>
                  Категория
                </span>

                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(
                      event.target.value,
                    )
                  }
                >

                  <option value="">
                    Выберите категорию
                  </option>

                  {categories.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    ),
                  )}

                  <option value="__custom__">
                    + Добавить свою категорию
                  </option>

                </select>

              </label>

              {category ===
                "__custom__" && (
                <label className="expenses-field">

                  <span>
                    Новая категория
                  </span>

                  <input
                    type="text"
                    value={
                      customCategory
                    }
                    onChange={(
                      event,
                    ) =>
                      setCustomCategory(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Например: Реклама"
                  />

                </label>
              )}

              <label className="expenses-field">

                <span>
                  Комментарий
                </span>

                <textarea
                  value={comment}
                  onChange={(event) =>
                    setComment(
                      event.target.value,
                    )
                  }
                  placeholder="Например: такси до склада"
                  rows={4}
                />

              </label>

              <div className="expenses-form-date">

                <CalendarDays
                  size={17}
                />

                <span>
                  Дата и время будут сохранены
                  автоматически
                </span>

              </div>

              <div className="expenses-form-actions">

                <button
                  type="button"
                  className="expenses-cancel-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Отмена
                </button>

                <button
                  type="submit"
                  className="expenses-save-button"
                  disabled={saving}
                >
                  {saving
                    ? "Сохранение..."
                    : "Сохранить расход"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}

export default Expenses;