
import React, { useEffect, useMemo, useRef, useState } from "react";
import API_URL from "./config.js";
import { createRoot } from "react-dom/client";
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, Bell,
  CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, Clock3, Filter, LayoutDashboard, MessageCircle,
  MoreHorizontal, Plus, Search, Settings, Sparkles, Target,
  TrendingUp, Users, X, Eye, MousePointer2, Play, Pause,
  GripVertical, AlertTriangle, Upload, FileSpreadsheet, RefreshCw
} from "lucide-react";
import "./metaAnalys.css";

const initialAds = [
  {id:"AD-1048",name:"Комплект сатин — премиум",campaign:"Продажи · Direct",status:"В тесте",spend:1840,impressions:12450,reach:8920,frequency:1.40,clicks:312,conversations:28,qualified:16,sales:5,revenue:27500,ctr:2.51,cpm:147.79,cpc:5.90,creative:88,performance:82,days:2,format:"Видео",hook:"Показ ткани крупным планом",note:"Хорошее удержание и сильный CTR. Проверить качество переписок."},
  {id:"AD-1052",name:"Постельное бельё — подарок",campaign:"Сообщения · Instagram",status:"Новые",spend:0,impressions:0,reach:0,frequency:0,clicks:0,conversations:0,qualified:0,sales:0,revenue:0,ctr:0,cpm:0,cpc:0,creative:76,performance:null,days:0,format:"Карусель",hook:"Подарочная упаковка",note:"Новое объявление. Данных пока нет."},
  {id:"AD-1039",name:"Жууркан + комплект белья",campaign:"Сообщения · Messenger",status:"Тест пройден",spend:2650,impressions:18300,reach:12600,frequency:1.45,clicks:420,conversations:41,qualified:27,sales:9,revenue:48600,ctr:2.30,cpm:144.81,cpc:6.31,creative:91,performance:91,days:3,format:"Видео",hook:"Готовый комплект в интерьере",note:"Сильная экономика и высокая доля целевых обращений. Кандидат на масштабирование."},
  {id:"AD-1031",name:"Акция недели — 20%",campaign:"Сообщения · Instagram",status:"Стоп",spend:3200,impressions:22100,reach:15800,frequency:1.40,clicks:286,conversations:12,qualified:4,sales:1,revenue:4200,ctr:1.29,cpm:144.80,cpc:11.19,creative:58,performance:32,days:3,format:"Изображение",hook:"Скидка на первом кадре",note:"Высокая стоимость обращения и низкая конверсия в продажу."},
  {id:"AD-1060",name:"Новая коллекция — мягкий хлопок",campaign:"Сообщения · Instagram",status:"Масштабирование",spend:6800,impressions:46200,reach:29100,frequency:1.59,clicks:1190,conversations:106,qualified:72,sales:24,revenue:132000,ctr:2.58,cpm:147.19,cpc:5.71,creative:94,performance:95,days:8,format:"Видео",hook:"Текстура и детали ткани",note:"Стабильный результат. Следить за ростом частоты и стоимости переписки."}
];

const columns = ["Новые","В тесте","Тест пройден","Масштабирование","Стоп"];

const formatMoney = (value, currency = "USD") =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value) || 0);

const money = n =>
  new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0
  }).format(n);

const pct = n =>
  `${(n || 0).toFixed(2).replace(".",",")}%`;

export default function MetaAnalys() {
  const [ads, setAds] = useState(initialAds);
  const [page, setPage] = useState("Обзор");
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("7 дней");
  const [dragId, setDragId] = useState(null);
  const [toast, setToast] = useState("");

  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSummary, setImportSummary] = useState(null);
  const fileInputRef = useRef(null);

  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");

  // AI-анализ
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiAnalyzedAt, setAiAnalyzedAt] = useState(null);
  const [aiModel, setAiModel] = useState(null);

  // История AI-анализов
  const [aiHistory, setAiHistory] = useState([]);
  const [aiHistoryLoading, setAiHistoryLoading] = useState(false);
  const [selectedAIHistoryId, setSelectedAIHistoryId] = useState(null);

  const filtered = useMemo(
    () => ads.filter(a =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      String(a.id).toLowerCase().includes(query.toLowerCase())
    ),
    [ads, query]
  );

  const totalSpend = ads.reduce((s,a) => s + (Number(a.spend) || 0), 0);
  const totalMsgs = ads.reduce((s,a) => s + (Number(a.conversations) || 0), 0);
  const totalSales = ads.reduce((s,a) => s + (Number(a.sales) || 0), 0);
  const avgCost = totalMsgs ? totalSpend / totalMsgs : 0;
  const totalRevenue = ads.reduce((s,a) => s + (Number(a.revenue) || 0), 0);
  const activeAds = ads.filter(a => a.status !== "Стоп").length;

  useEffect(() => {
    const loadData = async () => {
      await loadMetaAds();
      await loadAnalytics();
      await loadAIHistory();
    };
    loadData();
  }, []);

  // Последний сохранённый анализ.
  // История должна приходить от backend в порядке от нового к старому.
  const latestAIAnalysis =
    aiHistory[0]?.analysis || aiAnalysis;

  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError("");

      const response = await fetch(
        `${API_URL}/api/meta-ads/analytics`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error(`Ошибка загрузки аналитики: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error("Backend не вернул данные аналитики");
      }

      setAnalytics(data);

      if (Array.isArray(data.ads)) {
        setAds(data.ads.map(ad => ({
          ...ad,
          format: ad.format || "Meta Ads",
          hook: ad.hook || "Импортировано из Meta Ads",
          creative: ad.creative ?? null,
          performance: ad.analytics?.performanceScore ?? ad.performance ?? null,
          days: ad.days ?? 0,
          qualified: ad.qualified ?? null,
          sales: ad.sales ?? null,
          revenue: ad.revenue ?? null,
          status: ad.status || "Новые"
        })));
      }
    } catch (error) {
      console.error("Analytics loading error:", error);
      setAnalyticsError(error.message);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  async function loadMetaAds() {
    try {
      const response = await fetch(
        `${API_URL}/api/meta-ads`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 401 || response.status === 403
            ? "Нет доступа к данным. Проверь авторизацию."
            : "Не удалось загрузить объявления."
        );
      }

      const result = await response.json();

      if (result.success && Array.isArray(result.ads)) {
        const importedAds = result.ads.map(ad => ({
          ...ad,
          format: ad.format || "Meta Ads",
          hook: ad.hook || "Импортировано из Meta Ads",
          creative: ad.creative ?? null,
          performance: ad.performance ?? null,
          days: ad.days ?? 0,
          qualified: ad.qualified ?? null,
          sales: ad.sales ?? null,
          revenue: ad.revenue ?? null,
          status: ad.status || "Новые"
        }));

        setAds(importedAds);
      }
    } catch (error) {
      console.error("Meta Ads loading error:", error);
      setImportError(error.message);
    }
  }

  async function loadAIHistory() {
    try {
      setAiHistoryLoading(true);

      const response = await fetch(
        `${API_URL}/api/meta-ads/ai/history`,
        { credentials: "include" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Не удалось загрузить историю AI"
        );
      }

      const history = Array.isArray(result.history)
        ? result.history
        : [];

      setAiHistory(history);

      setSelectedAIHistoryId(currentId => {
        if (currentId && history.some(item => item.id === currentId)) {
          return currentId;
        }
        return history[0]?.id || null;
      });

      // Восстанавливаем последний анализ после перезагрузки.
      if (history[0]?.analysis) {
        setAiAnalysis(history[0].analysis);
        setAiAnalyzedAt(history[0].analyzedAt || null);
        setAiModel(history[0].model || null);
      }
    } catch (error) {
      console.error("AI history loading error:", error);
      setAiError(error.message);
    } finally {
      setAiHistoryLoading(false);
    }
  }

  async function importMetaCsv(file) {
    if (!file) return;

    setImportLoading(true);
    setImportError("");
    setImportSummary(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_URL}/api/meta-ads/import`,
        {
          method: "POST",
          credentials: "include",
          body: formData
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Ошибка импорта CSV");
      }

      setImportSummary(result.summary);
      await loadMetaAds();
      await loadAnalytics();

      setToast("Импорт Meta Ads успешно завершён");
      setTimeout(() => setToast(""), 3000);
    } catch (error) {
      console.error("Meta CSV import error:", error);
      setImportError(error.message);
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function moveAd(id, status) {
    const previousAds = ads;

    setAds(prev =>
      prev.map(ad =>
        String(ad.id) === String(id)
          ? { ...ad, status }
          : ad
      )
    );

    try {
      const response = await fetch(
        `${API_URL}/api/meta-ads/${encodeURIComponent(id)}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Не удалось сохранить этап");
      }

      setToast(`Объявление перемещено: ${status}`);
    } catch (error) {
      console.error("Kanban status error:", error);
      setAds(previousAds);
      setToast(error.message);
    }

    setTimeout(() => setToast(""), 3000);
  }

  async function runAIAnalysis() {
    if (aiLoading) return;

    if (!ads.length) {
      setAiError("Сначала импортируйте объявления Meta Ads.");
      return;
    }

    setAiLoading(true);
    setAiError("");

    try {
      const response = await fetch(
        `${API_URL}/api/meta-ads/ai/analyze`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" }
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Не удалось выполнить AI-анализ"
        );
      }

      if (!result.analysis || !Array.isArray(result.analysis.ads)) {
        throw new Error("AI вернул данные в неизвестном формате.");
      }

      setAiAnalysis(result.analysis);
      setAiAnalyzedAt(result.analyzedAt || new Date().toISOString());
      setAiModel(result.model || null);

      await loadAIHistory();

      if (result.id) {
        setSelectedAIHistoryId(result.id);
      }

      setToast("AI-анализ завершён и сохранён в историю");
      setTimeout(() => setToast(""), 3000);
    } catch (error) {
      console.error("AI analysis frontend error:", error);
      setAiError(error.message || "Ошибка AI-анализа");
    } finally {
      setAiLoading(false);
    }
  }

  const nav = [
    {name:"Обзор",icon:LayoutDashboard},
    {name:"Kanban-доска",icon:GripVertical},
    {name:"Все объявления",icon:BarChart3},
    {name:"AI Analyst",icon:Sparkles},
    {name:"Настройки",icon:Settings}
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Activity size={21}/></div>
          <div><b>AI Ads Manager</b><span>Meta performance studio</span></div>
        </div>

        <div className="account-switch">
          <div className="account-avatar">E</div>
          <div className="account-copy">
            <b>EcoLove · Meta Ads</b>
            <span>Рекламный аккаунт</span>
          </div>
          <ChevronDown size={16}/>
        </div>

        <div className="nav-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>

        <nav>
          {nav.map(item => (
            <button
              key={item.name}
              className={`nav-item ${page === item.name ? "active" : ""}`}
              onClick={() => setPage(item.name)}
            >
              <item.icon size={18}/>
              <span>{item.name}</span>
              {item.name === "AI Analyst" && <span className="nav-new">AI</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sync-card">
            <div className="sync-top">
              <span className="green-dot"></span>
              <b>Meta не подключена</b>
            </div>
            <p>Сейчас показаны импортированные данные. Подключение будет на следующем этапе.</p>
            <button onClick={() => setPage("Настройки")}>
              Настроить подключение <ChevronRight size={14}/>
            </button>
          </div>

          <div className="profile">
            <div className="profile-avatar">EA</div>
            <div><b>Рабочее пространство</b><span>Личный проект</span></div>
            <MoreHorizontal size={18}/>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            Рабочее пространство <ChevronRight size={14}/> <b>{page}</b>
          </div>
          <div className="top-actions">
            <div className="sync-status">
              <span className="orange-dot"></span> Демо-режим
            </div>
            <button className="icon-btn" title="Уведомления"><Bell size={18}/></button>
            <button className="help-btn"><CircleHelp size={16}/> Помощь</button>
          </div>
        </header>

        {page === "Обзор" && (
          <Dashboard
            ads={ads}
            analytics={analytics}
            analyticsLoading={analyticsLoading}
            analyticsError={analyticsError}
            totalSpend={totalSpend}
            totalMsgs={totalMsgs}
            totalSales={totalSales}
            avgCost={avgCost}
            totalRevenue={totalRevenue}
            activeAds={activeAds}
            setPage={setPage}
            setSelected={setSelected}
            onImport={() => fileInputRef.current?.click()}
            importLoading={importLoading}
            importError={importError}
            importSummary={importSummary}
            fileInputRef={fileInputRef}
            onFileChange={e => importMetaCsv(e.target.files?.[0])}
          />
        )}

        {page === "Kanban-доска" && (
          <Kanban
            ads={filtered}
            aiAnalysis={latestAIAnalysis}
            query={query}
            setQuery={setQuery}
            dragId={dragId}
            setDragId={setDragId}
            moveAd={moveAd}
            setSelected={setSelected}
            currency={analytics?.overview?.currency || "USD"}
          />
        )}

        {page === "Все объявления" && (
          <AllAds
            ads={filtered}
            query={query}
            setQuery={setQuery}
            setSelected={setSelected}
            moveAd={moveAd}
          />
        )}

        {page === "AI Analyst" && (
          <AIPage
            ads={ads}
            analytics={analytics}
            setSelected={setSelected}
            aiAnalysis={aiAnalysis}
            aiLoading={aiLoading}
            aiError={aiError}
            aiAnalyzedAt={aiAnalyzedAt}
            aiModel={aiModel}
            aiHistory={aiHistory}
            aiHistoryLoading={aiHistoryLoading}
            selectedAIHistoryId={selectedAIHistoryId}
            onSelectAIHistory={setSelectedAIHistoryId}
            onRunAnalysis={runAIAnalysis}
          />
        )}

        {page === "Настройки" && <SettingsPage/>}
      </main>

      {selected && (
        <DetailModal
          ad={selected}
          onClose={() => setSelected(null)}
          onMove={moveAd}
        />
      )}

      {toast && <div className="toast"><Check size={16}/>{toast}</div>}
    </div>
  );
}

function PageHeader({eyebrow,title,subtitle,children}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}

function Metric({label,value,change,icon:Icon,sub}) {
  return (
    <div className="metric-card">
      <div className="metric-head">
        <span>{label}</span>
        <div className="metric-icon"><Icon size={17}/></div>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-foot">
        {change && (
          <span className={change.startsWith("-") ? "negative" : "positive"}>
            {change.startsWith("-")
              ? <ArrowDownRight size={14}/>
              : <ArrowUpRight size={14}/>
            }
            {change}
          </span>
        )}
        <span>{sub}</span>
      </div>
    </div>
  );
}

function Dashboard({
  ads,analytics,analyticsLoading,analyticsError,
  totalSpend,totalMsgs,totalSales,avgCost,totalRevenue,
  activeAds,setPage,setSelected,onImport,importLoading,
  importError,importSummary,fileInputRef,onFileChange
}) {
  const top = [...ads]
    .filter(a => a.performance !== null)
    .sort((a,b) => b.performance - a.performance)
    .slice(0,3);

  const overview = analytics?.overview || {};
  const currency = overview.currency || "USD";
  const realSpend = overview.totalSpend ?? 0;
  const realMessages = overview.totalConversations ?? 0;
  const realAdsCount = overview.adsCount ?? 0;
  const realAverageCost = realMessages > 0 ? realSpend / realMessages : 0;

  return (
    <div className="content">
      <PageHeader
        eyebrow="META ADS ANALYTICS"
        title="Обзор рекламы"
        subtitle="Анализ реальных рекламных объявлений."
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          style={{display:"none"}}
          onChange={onFileChange}
        />

        <button className="secondary-btn" onClick={onImport} disabled={importLoading}>
          {importLoading
            ? <RefreshCw size={16} className="import-spin"/>
            : <FileSpreadsheet size={16}/>
          }
          {importLoading ? "Импортируем..." : "Импорт CSV"}
        </button>

        <select className="select-control" defaultValue="30 дней">
          <option>7 дней</option>
          <option>30 дней</option>
          <option>Сегодня</option>
        </select>

        <button className="primary-btn" onClick={() => setPage("Kanban-доска")}>
          <GripVertical size={16}/> Открыть Kanban
        </button>
      </PageHeader>

      {importError && <div className="import-error">{importError}</div>}

      {importSummary && (
        <div className="import-success">
          <FileSpreadsheet size={18}/>
          <div>
            <b>Импорт завершён</b>
            <span>
              Новых: {importSummary.created} ·
              Обновлено: {importSummary.updated} ·
              Пропущено: {importSummary.skipped}
            </span>
          </div>
        </div>
      )}

      {analyticsError && <div className="import-error">{analyticsError}</div>}

      {analyticsLoading && !analytics && (
        <div className="notice">
          <RefreshCw size={17} className="import-spin"/>
          Загружаем реальные данные Meta Ads...
        </div>
      )}

      {analytics && (
        <>
          <div className="notice">
            <div className="notice-icon"><Check size={17}/></div>
            <div>
              <b>Реальные данные Meta Ads</b>
              <span>
                Период отчёта: {analytics.lastImport?.reportStart || "—"}
                {" — "}
                {analytics.lastImport?.reportEnd || "—"}
              </span>
            </div>
            <span>{realAdsCount} объявлений</span>
          </div>

          <div className="metrics-grid">
            <Metric label="Расходы на рекламу" value={formatMoney(realSpend,currency)} sub="За период импорта" icon={BarChart3}/>
            <Metric label="Начатые переписки" value={money(realMessages)} sub="Instagram + Messenger" icon={MessageCircle}/>
            <Metric label="Цена переписки" value={formatMoney(realAverageCost,currency)} sub="Расходы / переписки" icon={Target}/>
            <Metric label="Показы" value={money(overview.totalImpressions)} sub="Всего показов" icon={Eye}/>
            <Metric label="Клики" value={money(overview.totalClicks)} sub="Всего кликов" icon={MousePointer2}/>
            <Metric label="Продажи" value="Нет данных" sub="Нужна передача данных о продажах" icon={Users}/>
          </div>
        </>
      )}

      <div className="section-title">
        <div><h2>Лучшие объявления</h2><p>По оценке Performance Score</p></div>
        <button className="text-btn" onClick={() => setPage("Все объявления")}>
          Все объявления <ChevronRight size={15}/>
        </button>
      </div>

      <div className="top-ads">
        {top.map((a,i) => (
          <div className="top-ad-card" key={a.id} onClick={() => setSelected(a)}>
            <div className="rank">0{i+1}</div>
            <div className="ad-thumb">
              {a.format === "Видео" ? <Play size={18}/> : <Eye size={18}/>}
            </div>
            <div className="top-ad-info">
              <b>{a.name}</b>
              <span>
                {money(a.conversations)} переписок ·
                {a.conversations
                  ? ` ${formatMoney(a.spend / a.conversations,currency)} за переписку`
                  : " нет данных о стоимости"}
              </span>
            </div>
            <div className="score"><b>{a.performance}</b><span>Score</span></div>
            <ChevronRight size={16} className="muted"/>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchBar({query,setQuery}) {
  return (
    <div className="search-box">
      <Search size={16}/>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Поиск по названию или ID..."
      />
    </div>
  );
}

// Карточка объявления с AI-рекомендацией
function AdCard({ad,aiItem,setSelected,onDragStart,currency="USD"}) {
  const cost = ad.conversations > 0
    ? ad.spend / ad.conversations
    : null;

  const verdictLabels = {
    "сильное":"Сильное",
    "среднее":"Среднее",
    "слабое":"Слабое",
    "недостаточно данных":"Недостаточно данных"
  };

  const verdictClasses = {
    "сильное":"success",
    "среднее":"info",
    "слабое":"danger",
    "недостаточно данных":"warning"
  };

  const aiVerdictClass =
    verdictClasses[aiItem?.verdict] || "info";

  return (
    <div
      className="kanban-card"
      draggable
      onDragStart={() => onDragStart(ad.id)}
      onClick={() => setSelected(ad)}
    >
      <div className="card-top">
        <span className="ad-id">{ad.id}</span>
        <button
          className="dots"
          onClick={e => {
            e.stopPropagation();
            setSelected(ad);
          }}
        >
          <MoreHorizontal size={17}/>
        </button>
      </div>

      <div className="ad-preview">
        <div className="preview-art">
          <div className="fabric-fold fold-one"></div>
          <div className="fabric-fold fold-two"></div>
          <span>
            {ad.format === "Видео"
              ? "VIDEO"
              : (ad.format || "META ADS").toUpperCase()}
          </span>
        </div>
      </div>

      <h4>{ad.name}</h4>
      <p className="campaign-name">{ad.campaign || "Meta Ads"}</p>

      <div className="card-metrics">
        <div>
          <span>Расход</span>
          <b>{ad.spend > 0 ? formatMoney(ad.spend,currency) : "—"}</b>
        </div>
        <div>
          <span>Переписки</span>
          <b>{ad.conversations > 0 ? money(ad.conversations) : "—"}</b>
        </div>
        <div>
          <span>Цена / переписка</span>
          <b>{cost !== null ? formatMoney(cost,currency) : "—"}</b>
        </div>
      </div>

      <div className="card-footer">
        {ad.performance != null ? (
          <span className={`score-pill ${
            ad.performance >= 75 ? "good" :
            ad.performance < 50 ? "bad" : "mid"
          }`}>
            <Sparkles size={12}/> {ad.performance} Score
          </span>
        ) : (
          <span className="waiting-pill">Ожидает данных</span>
        )}

        <span className="card-age">
          {ad.days ? `${ad.days} дн.` : "Нет данных о тесте"}
        </span>
      </div>

      {aiItem ? (
        <div className="kanban-ai" onClick={e => e.stopPropagation()}>
          <div className="kanban-ai-heading">
            <Sparkles size={14}/>
            <b>Рекомендация AI</b>
            <span className={`kanban-ai-badge ${aiVerdictClass}`}>
              {verdictLabels[aiItem.verdict] || aiItem.verdict}
            </span>
          </div>

          {aiItem.explanation && (
            <p className="kanban-ai-explanation">
              {aiItem.explanation}
            </p>
          )}

          {aiItem.recommendations?.length > 0 && (
            <div className="kanban-ai-actions">
              <b>Что делать:</b>
              {aiItem.recommendations.slice(0,2).map((recommendation,index) => (
                <p key={index}>{recommendation}</p>
              ))}
            </div>
          )}

          {aiItem.confidence && (
            <div className="kanban-ai-confidence">
              Уверенность AI: {aiItem.confidence}
            </div>
          )}
        </div>
      ) : (
        <div className="kanban-ai-empty">
          <Sparkles size={13}/>
          AI-анализ ещё не проводился для этого объявления
        </div>
      )}
    </div>
  );
}

function Kanban({
  ads,aiAnalysis,query,setQuery,dragId,setDragId,
  moveAd,setSelected,currency="USD"
}) {
  // Связываем результаты AI с объявлениями по ID.
  const aiById = new Map(
    (aiAnalysis?.ads || []).map(item => [
      String(item.id),
      item
    ])
  );

  return (
    <div className="content">
      <PageHeader
        eyebrow="УПРАВЛЕНИЕ ТЕСТАМИ"
        title="Kanban-доска"
        subtitle="Перемещайте объявления вручную между этапами тестирования."
      >
        <button className="secondary-btn"><Filter size={16}/> Фильтры</button>
        <button className="primary-btn"><Plus size={16}/> Добавить заметку</button>
      </PageHeader>

      <div className="board-toolbar">
        <SearchBar query={query} setQuery={setQuery}/>
        <div className="board-hint">
          <GripVertical size={15}/> Перетаскивайте карточки между колонками
        </div>
        <span className="board-count">{ads.length} объявлений</span>
      </div>

      <div className="kanban-board">
        {columns.map((col,i) => {
          const items = ads.filter(a => a.status === col);

          return (
            <div
              className="kanban-column"
              key={col}
              onDragOver={e => e.preventDefault()}
              onDrop={() => {
                if (dragId) moveAd(dragId,col);
                setDragId(null);
              }}
            >
              <div className="column-heading">
                <div className="column-name">
                  <span className={`column-dot dot-${i}`}></span>
                  <b>{col}</b>
                  <span className="count">{items.length}</span>
                </div>
                <button className="dots"><MoreHorizontal size={17}/></button>
              </div>

              <div className="column-sub">
                {[
                  "Ожидают проверки",
                  "Активный тест · 72 часа",
                  "Можно принимать решение",
                  "Увеличение бюджета вручную",
                  "Остановленные объявления"
                ][i]}
              </div>

              <div className="column-cards">
                {items.map(a => (
                  <AdCard
                    key={a.id}
                    ad={a}
                    aiItem={aiById.get(String(a.id))}
                    setSelected={setSelected}
                    onDragStart={setDragId}
                    currency={currency}
                  />
                ))}

                {items.length === 0 && (
                  <div className="empty-column">
                    Перетащите сюда объявление
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="board-footnote">
        <Clock3 size={15}/>
        Тест длится 72 часа фактической активности. При паузе таймер должен останавливаться. Если статистики недостаточно, система покажет «Недостаточно данных».
      </div>
    </div>
  );
}

function AllAds({ads,query,setQuery,setSelected,moveAd}) {
  return (
    <div className="content">
      <PageHeader
        eyebrow="БИБЛИОТЕКА РЕКЛАМЫ"
        title="Все объявления"
        subtitle="Единый список объявлений, импортированных из Meta Ads."
      />

      <div className="panel table-panel">
        <div className="table-toolbar">
          <SearchBar query={query} setQuery={setQuery}/>
          <button className="secondary-btn"><Filter size={15}/> Фильтры</button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Объявление</th><th>Этап</th><th>Расходы</th>
                <th>Переписки</th><th>Цена переписки</th>
                <th>Performance</th><th></th>
              </tr>
            </thead>
            <tbody>
              {ads.map(a => (
                <tr key={a.id}>
                  <td>
                    <div className="table-ad" onClick={() => setSelected(a)}>
                      <div className="table-thumb"><Play size={14}/></div>
                      <div><b>{a.name}</b><span>{a.id} · {a.format}</span></div>
                    </div>
                  </td>
                  <td><span className="status-label">{a.status}</span></td>
                  <td>{a.spend ? `сом ${money(a.spend)}` : "—"}</td>
                  <td>{a.conversations || "—"}</td>
                  <td>{a.conversations ? `сом ${money(a.spend/a.conversations)}` : "—"}</td>
                  <td>
                    {a.performance != null
                      ? <span className={`score-pill ${
                          a.performance >= 75 ? "good" :
                          a.performance < 50 ? "bad" : "mid"
                        }`}>{a.performance}/100</span>
                      : "—"
                    }
                  </td>
                  <td>
                    <button className="dots" onClick={() => setSelected(a)}>
                      <MoreHorizontal size={17}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AIPage({
  ads,analytics,setSelected,aiAnalysis,aiLoading,aiError,
  aiAnalyzedAt,aiModel,aiHistory=[],aiHistoryLoading,
  selectedAIHistoryId,onSelectAIHistory,onRunAnalysis
}) {
  const overview = analytics?.overview || {};

  const selectedHistory = aiHistory.find(
    item => item.id === selectedAIHistoryId
  );

  const analysis = selectedHistory?.analysis || aiAnalysis;
  const displayedAnalyzedAt = selectedHistory?.analyzedAt || aiAnalyzedAt;
  const displayedModel = selectedHistory?.model || aiModel;

  const currency = overview.currency || "USD";

  const verdictLabels = {
    "сильное":"Сильное",
    "среднее":"Среднее",
    "слабое":"Слабое",
    "недостаточно данных":"Недостаточно данных"
  };

  const verdictClasses = {
    "сильное":"success",
    "среднее":"info",
    "слабое":"danger",
    "недостаточно данных":"warning"
  };

  const confidenceLabels = {
    "низкая":"Низкая уверенность",
    "средняя":"Средняя уверенность",
    "высокая":"Высокая уверенность"
  };

  const adsById = new Map(ads.map(ad => [String(ad.id),ad]));
  const analyzedAds = analysis?.ads || [];

  const analyzedAtLabel = displayedAnalyzedAt
    ? new Date(displayedAnalyzedAt).toLocaleString("ru-RU")
    : null;

  return (
    <div className="content">
      <PageHeader
        eyebrow="ИСКУССТВЕННЫЙ ИНТЕЛЛЕКТ"
        title="AI Analyst"
        subtitle="Реальный анализ рекламных объявлений с помощью OpenAI."
      >
        <button
          className="primary-btn"
          onClick={onRunAnalysis}
          disabled={aiLoading || ads.length === 0}
        >
          {aiLoading
            ? <RefreshCw size={16} className="import-spin"/>
            : <Sparkles size={16}/>
          }
          {aiLoading
            ? "Анализируем..."
            : analysis ? "Обновить AI-анализ" : "Запустить AI-анализ"
          }
        </button>
      </PageHeader>

      <div className="ai-intro">
        <div className="ai-orb"><Sparkles size={25}/></div>
        <div>
          <h3>AI-аналитик Meta Ads</h3>
          <p>
            AI изучает фактические показатели расходов, показов,
            кликов и переписок, сравнивает объявления и предлагает
            конкретные действия. Бюджеты и статусы он не изменяет.
          </p>
        </div>
        <span className="demo-tag">OPENAI</span>
      </div>

      <div className="panel ai-history-panel">
        <div className="ai-history-heading">
          <div>
            <h3>История AI-анализов</h3>
            <p>Сохранённые результаты предыдущих запусков</p>
          </div>
          <span className="ai-history-count">{aiHistory.length} записей</span>
        </div>

        {aiHistoryLoading && (
          <div className="ai-history-empty">
            <RefreshCw size={16} className="import-spin"/>
            Загружаем историю...
          </div>
        )}

        {!aiHistoryLoading && aiHistory.length === 0 && (
          <div className="ai-history-empty">
            <Clock3 size={18}/>
            История пока пустая. Запусти первый AI-анализ.
          </div>
        )}

        {!aiHistoryLoading && aiHistory.length > 0 && (
          <div className="ai-history-list">
            {aiHistory.map(item => {
              const active = item.id === selectedAIHistoryId;

              return (
                <button
                  type="button"
                  key={item.id}
                  className={`ai-history-item ${active ? "active" : ""}`}
                  onClick={() => onSelectAIHistory(item.id)}
                >
                  <div className="ai-history-item-icon"><Sparkles size={17}/></div>
                  <div className="ai-history-item-info">
                    <b>
                      AI-анализ от{" "}
                      {new Date(item.analyzedAt).toLocaleString("ru-RU")}
                    </b>
                    <span>
                      {item.adsAnalyzed ?? item.analysis?.ads?.length ?? 0}
                      {" "}объявлений · {item.model || "OpenAI"}
                    </span>
                  </div>
                  {active
                    ? <span className="ai-history-current">Открыт</span>
                    : <ChevronRight size={17}/>
                  }
                </button>
              );
            })}
          </div>
        )}
      </div>

      {aiError && (
        <div className="import-error">
          <AlertTriangle size={17}/><span>{aiError}</span>
        </div>
      )}

      {aiLoading && (
        <div className="notice">
          <RefreshCw size={18} className="import-spin"/>
          <div>
            <b>AI анализирует рекламный аккаунт</b>
            <span>Обрабатываем статистику объявлений. Это может занять некоторое время.</span>
          </div>
        </div>
      )}

      {!analysis && !aiLoading && (
        <div className="panel ai-empty">
          <Sparkles size={32}/>
          <h3>AI-анализ ещё не запускался</h3>
          <p>
            Нажми «Запустить AI-анализ», чтобы получить реальные
            рекомендации на основании импортированной статистики Meta Ads.
          </p>
          {ads.length === 0 && <span>Сначала импортируй CSV из Meta Ads.</span>}
        </div>
      )}

      {analysis && (
        <>
          <div className="panel ai-summary">
            <div className="ai-summary-header">
              <div>
                <span className="eyebrow">ОБЩИЙ АНАЛИЗ</span>
                <h2>Вывод AI-аналитика</h2>
              </div>
              <span className="status-label">{analyzedAds.length} объявлений</span>
            </div>

            <p className="ai-summary-text">{analysis.overallSummary}</p>

            <div className="ai-meta">
              {displayedModel && <span>Модель: {displayedModel}</span>}
              {analyzedAtLabel && <span>Дата анализа: {analyzedAtLabel}</span>}
            </div>
          </div>

          <div className="score-explain-grid">
            <div className="panel">
              <div className="score-big">
                <span>{ads.filter(a => a.creative != null).length}</span>
              </div>
              <b>Creative Score</b>
              <p>Объявления с отдельной оценкой креатива. AI не присваивает её автоматически по CSV.</p>
            </div>

            <div className="panel">
              <div className="score-big purple">
                <span>{ads.filter(a => a.performance != null).length}</span>
              </div>
              <b>Performance Score</b>
              <p>Количество объявлений с рассчитанной системой оценкой эффективности.</p>
            </div>
          </div>

          <div className="section-title">
            <div><h2>Основные выводы</h2><p>Анализ рекламного аккаунта</p></div>
          </div>

          <div className="panel ai-findings">
            {(analysis.accountFindings || []).map((finding,index) => (
              <div className="ai-finding" key={index}>
                <span>{index+1}</span><p>{finding}</p>
              </div>
            ))}
            {(!analysis.accountFindings || analysis.accountFindings.length === 0) && (
              <p>Дополнительных выводов нет.</p>
            )}
          </div>

          {analysis.warnings?.length > 0 && (
            <>
              <div className="section-title">
                <div><h2>Предупреждения</h2><p>Ограничения и недостатки исходных данных</p></div>
              </div>
              <div className="panel ai-warnings">
                {analysis.warnings.map((warning,index) => (
                  <div className="ai-warning" key={index}>
                    <AlertTriangle size={17}/><p>{warning}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="section-title">
            <div><h2>Анализ каждого объявления</h2><p>Вердикты и рекомендации OpenAI</p></div>
          </div>

          <div className="recommendations">
            {analyzedAds.map(item => {
              const ad = adsById.get(String(item.id));
              if (!ad) return null;

              const verdictClass = verdictClasses[item.verdict] || "info";
              const cost = Number(ad.conversations) > 0
                ? Number(ad.spend) / Number(ad.conversations)
                : null;

              return (
                <div className={`recommendation ${verdictClass}`} key={item.id}>
                  <div className="rec-icon">
                    {item.verdict === "сильное"
                      ? <Check size={18}/>
                      : item.verdict === "слабое"
                        ? <AlertTriangle size={18}/>
                        : <CircleHelp size={18}/>
                    }
                  </div>

                  <div className="rec-content">
                    <div className="rec-title">
                      {verdictLabels[item.verdict] || item.verdict}
                    </div>
                    <b>{ad.name}</b>
                    <div className="ai-confidence">
                      {confidenceLabels[item.confidence] || ""}
                    </div>
                    <p>{item.explanation}</p>

                    {item.evidence?.length > 0 && (
                      <div className="ai-evidence">
                        <b>Фактические показатели</b>
                        {item.evidence.map((evidence,index) => (
                          <div key={index}><Check size={13}/><span>{evidence}</span></div>
                        ))}
                      </div>
                    )}

                    {item.recommendations?.length > 0 && (
                      <div className="rec-action">
                        <Sparkles size={15}/>
                        <div>
                          <b>Рекомендации AI</b>
                          {item.recommendations.map((recommendation,index) => (
                            <p key={index}>{index+1}. {recommendation}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {cost !== null && (
                      <div className="ai-ad-cost">
                        Стоимость переписки: <b>{formatMoney(cost,currency)}</b>
                      </div>
                    )}
                  </div>

                  <button className="text-btn" onClick={() => setSelected(ad)}>
                    Подробнее <ChevronRight size={15}/>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="ai-disclaimer">
            AI предоставляет аналитические рекомендации, а не гарантирует продажи или прибыль.
            Решения по бюджетам и этапам Kanban принимает пользователь.
          </div>
        </>
      )}
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="content">
      <PageHeader
        eyebrow="КОНФИГУРАЦИЯ"
        title="Настройки"
        subtitle="Подключение рекламного аккаунта и правила обновления данных."
      />

      <div className="settings-grid">
        <div className="panel settings-panel">
          <div className="settings-title">
            <div className="settings-icon"></div>
            <div><h3>Подключение Meta Ads</h3><p>Instagram Direct и Messenger</p></div>
            <span className="status-off">Не подключено</span>
          </div>
          <p className="settings-description">
            После подключения система будет импортировать только объявления,
            которые участвуют в таргетированной рекламе, и обновлять их статистику.
          </p>
          <div className="permission-box">
            <b>Минимальные разрешения</b>
            <span><Check size={14}/> ads_read — чтение объявлений и статистики</span>
            <span className="muted-text">Управление бюджетами и рекламой через API не включается.</span>
          </div>
          <button className="primary-btn" disabled>
            Подключить Meta — следующий этап
          </button>
          <small className="disabled-note">OAuth и серверная часть ещё не реализованы в этом прототипе.</small>
        </div>

        <div className="panel settings-panel">
          <div className="settings-title">
            <div className="settings-icon"><Clock3 size={19}/></div>
            <div><h3>Обновление статистики</h3><p>Периодическая синхронизация</p></div>
          </div>
          <div className="setting-row"><div><b>Частота обновления</b><span>Данные Meta Ads Insights</span></div><strong>Каждые 6 часов</strong></div>
          <div className="setting-row"><div><b>Валюта</b><span>Берётся из рекламного аккаунта Meta</span></div><strong>Автоматически</strong></div>
          <div className="setting-row"><div><b>Часовой пояс</b><span>Будет получен из настроек аккаунта</span></div><strong>Автоматически</strong></div>
          <div className="setting-row"><div><b>Тестовое окно</b><span>С момента фактического запуска</span></div><strong>72 часа</strong></div>
        </div>

        <div className="panel settings-panel wide">
          <div className="settings-title">
            <div className="settings-icon"><Sparkles size={19}/></div>
            <div><h3>Правила AI-анализа</h3><p>Принципы принятия решений</p></div>
          </div>
          <div className="rules-grid">
            <div><b>Creative Score</b><span>Отдельная оценка привлекательности креатива.</span></div>
            <div><b>Performance Score</b><span>Отдельная оценка результата рекламы.</span></div>
            <div><b>Нет автоматических действий</b><span>AI рекомендует, но не меняет бюджет, статус или этап Kanban.</span></div>
            <div><b>Контроль достаточности данных</b><span>Нет достаточной статистики — нет ложной оценки «успех».</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ad,onClose,onMove}) {
  const [tab,setTab] = useState("Обзор");
  const cost = ad.conversations ? ad.spend / ad.conversations : 0;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="detail-modal">
        <div className="modal-header">
          <div>
            <span className="ad-id">{ad.id}</span>
            <h2>{ad.name}</h2>
            <p>{ad.campaign}</p>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={20}/></button>
        </div>

        <div className="modal-tabs">
          {["Обзор","Креатив","Экономика","AI-диагностика"].map(t => (
            <button
              className={tab === t ? "selected" : ""}
              onClick={() => setTab(t)}
              key={t}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Обзор" && (
          <>
            <div className="detail-score-row">
              <div className="detail-score"><span>{ad.creative ?? "—"}</span><small>Creative Score</small></div>
              <div className="detail-score purple"><span>{ad.performance ?? "—"}</span><small>Performance Score</small></div>
              <div className="detail-note"><Sparkles size={16}/><span>{ad.note || "Нет заметки"}</span></div>
            </div>

            <div className="detail-metrics">
              <div><span>Расходы</span><b>сом {money(ad.spend)}</b></div>
              <div><span>Показы</span><b>{money(ad.impressions)}</b></div>
              <div><span>Охват</span><b>{money(ad.reach)}</b></div>
              <div><span>Частота</span><b>{ad.frequency || "—"}</b></div>
              <div><span>CTR</span><b>{pct(ad.ctr)}</b></div>
              <div><span>CPC</span><b>{ad.spend ? `сом ${money(ad.cpc)}` : "—"}</b></div>
              <div><span>Переписки</span><b>{ad.conversations}</b></div>
              <div><span>Цена переписки</span><b>{cost ? `сом ${money(cost)}` : "—"}</b></div>
            </div>

            <div className="detail-section">
              <h3>Тестирование</h3>
              <div className="test-progress">
                <div><span>Прошло тестового периода</span><b>{ad.days || 0}/3 дня</b></div>
                <div className="progress-track">
                  <i style={{width:`${Math.min(100,(ad.days || 0)/3*100)}%`}}/>
                </div>
                <small>
                  В рабочей версии время будет считаться по фактическим показам
                  и приостанавливаться при остановке рекламы.
                </small>
              </div>
            </div>
          </>
        )}

        {tab === "Креатив" && (
          <div className="detail-section">
            <div className="large-preview">
              <div className="preview-art">
                <div className="fabric-fold fold-one"></div>
                <div className="fabric-fold fold-two"></div>
                <span>{ad.format}</span>
              </div>
            </div>
            <h3>Идея креатива</h3>
            <p>{ad.hook}</p>
            <p className="muted-text">
              После подключения Meta здесь будут доступны оригинальный медиафайл,
              текст объявления, заголовок и CTA.
            </p>
          </div>
        )}

        {tab === "Экономика" && (
          <div className="detail-section">
            <div className="detail-metrics">
              <div><span>Целевые обращения</span><b>{ad.qualified ?? "—"}</b></div>
              <div><span>Продажи</span><b>{ad.sales ?? "—"}</b></div>
              <div><span>Выручка</span><b>{ad.revenue != null ? `сом ${money(ad.revenue)}` : "Нет данных"}</b></div>
              <div><span>ROAS</span><b>{ad.spend && ad.revenue != null ? (ad.revenue/ad.spend).toFixed(2)+"x" : "—"}</b></div>
            </div>
            <p className="muted-text">
              Экономика будет точной только после передачи фактических продаж
              и выручки из CRM или ручного ввода.
            </p>
          </div>
        )}

        {tab === "AI-диагностика" && (
          <div className="detail-section">
            <div className="ai-diagnosis">
              <Sparkles size={20}/>
              <div>
                <b>Предварительный вывод</b>
                <p>{ad.note || "Для этого объявления пока нет отдельной заметки."}</p>
                <p>
                  Подробный результат AI-анализа смотри в разделе AI Analyst
                  и на карточке объявления в Kanban.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="modal-footer">
          <div>
            <span>Этап в системе</span>
            <select
              value={ad.status}
              onChange={e => onMove(ad.id,e.target.value)}
            >
              {columns.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button className="secondary-btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<MetaAnalys/>);
