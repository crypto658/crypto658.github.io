const COINGECKO_IDS = ["bitcoin", "ethereum", "solana", "ripple"];
const SIGNAL_ASSETS = [
    { id: "bitcoin", symbol: "BTC/ZAR" },
    { id: "ethereum", symbol: "ETH/ZAR" },
    { id: "solana", symbol: "SOL/ZAR" },
    { id: "ripple", symbol: "XRP/ZAR" }
];
const NEWS_FEEDS = [
    "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "https://cointelegraph.com/rss",
    "https://bitcoinmagazine.com/.rss/full/"
];
const CACHE_TTL_MS = {
    news: 10 * 60 * 1000,
    signals: 4 * 60 * 60 * 1000
};
const REFRESH_MS = {
    prices: 60 * 1000,
    stats: 5 * 60 * 1000,
    news: 10 * 60 * 1000,
    signals: 4 * 60 * 60 * 1000
};

function formatPrice(num, maximumFractionDigits = 2) {
    return new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency: "ZAR",
        maximumFractionDigits
    }).format(num);
}

function formatPercent(value, fractionDigits = 1) {
    if (!Number.isFinite(value)) {
        return "--";
    }
    return `${value.toFixed(fractionDigits)}%`;
}

function getChangeClass(change) {
    return change >= 0 ? "delta-up" : "delta-down";
}

function setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) {
        el.innerHTML = html;
    }
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = text;
    }
}

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
    }
    return response.json();
}

function setCachedData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
    } catch (error) {
        console.warn("Cache write skipped:", error);
    }
}

function getCachedData(key, ttlMs) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.timestamp || !parsed.data) {
            return null;
        }
        if (Date.now() - parsed.timestamp > ttlMs) {
            return null;
        }
        return parsed.data;
    } catch (error) {
        console.warn("Cache read skipped:", error);
        return null;
    }
}

async function fetchSimplePrices() {
    const ids = COINGECKO_IDS.join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=zar&include_24hr_change=true`;
    return fetchJson(url);
}

function renderTickerPrice(targetId, entry) {
    if (!entry || !Number.isFinite(entry.zar)) {
        return;
    }
    const change = entry.zar_24h_change;
    const changeHtml = Number.isFinite(change)
        ? ` <span class="${getChangeClass(change)}">${change.toFixed(1)}%</span>`
        : "";
    setHTML(targetId, `${formatPrice(entry.zar)}${changeHtml}`);
}

async function updateTicker() {
    try {
        const data = await fetchSimplePrices();
        renderTickerPrice("btc-zar", data.bitcoin);
        renderTickerPrice("eth-zar", data.ethereum);
        renderTickerPrice("sol-zar", data.solana);
        renderTickerPrice("xrp-zar", data.ripple);
    } catch (error) {
        console.error("Ticker error:", error);
    }
}

async function updateMarketStats() {
    try {
        const global = await fetchJson("https://api.coingecko.com/api/v3/global");
        const marketCapUsd = global?.data?.total_market_cap?.usd;
        const btcDom = global?.data?.market_cap_percentage?.btc;

        if (Number.isFinite(btcDom)) {
            setText("btc-dom", formatPercent(btcDom));
        }

        if (Number.isFinite(marketCapUsd)) {
            setText("total-mc", new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                notation: "compact",
                maximumFractionDigits: 2
            }).format(marketCapUsd));
        }

        // Keep placeholder until a dedicated source is wired.
        setText("fg-index", "Source pending");
    } catch (error) {
        console.error("Market stats error:", error);
    }
}

function normalizeNewsItem(item, fallbackSource) {
    const publishedRaw = item.pubDate || item.published || item.isoDate || item.date;
    const publishedAt = new Date(publishedRaw || Date.now()).getTime();
    return {
        title: item.title || "Untitled update",
        link: item.link || "#",
        description: (item.description || item.contentSnippet || "")
            .replace(/<[^>]+>/g, "")
            .trim(),
        source: item.author || item.source || fallbackSource,
        publishedAt: Number.isFinite(publishedAt) ? publishedAt : Date.now()
    };
}

function renderNews(items) {
    const newsList = document.getElementById("live-news-list");
    const status = document.getElementById("live-news-status");
    if (!newsList || !status) {
        return;
    }

    if (!items.length) {
        status.textContent = "Unable to load live news right now. Showing latest analysis below.";
        newsList.innerHTML = "";
        return;
    }

    status.textContent = `Updated ${new Date().toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}`;
    newsList.innerHTML = items.map((item) => {
        const timeText = new Date(item.publishedAt).toLocaleString("en-ZA", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        });
        const excerpt = item.description ? `${item.description.slice(0, 180)}${item.description.length > 180 ? "..." : ""}` : "Read the full story for details.";
        return `
            <article class="news-item">
                <div class="news-meta">
                    <span class="source-pill">${item.source}</span>
                    <time>${timeText}</time>
                </div>
                <h3><a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a></h3>
                <p>${excerpt}</p>
            </article>
        `;
    }).join("");
}

async function fetchFeed(feedUrl) {
    const rss2jsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
    const payload = await fetchJson(rss2jsonUrl);
    const sourceTitle = payload?.feed?.title || "Crypto News";
    const items = Array.isArray(payload?.items) ? payload.items : [];
    return items.map((item) => normalizeNewsItem(item, sourceTitle));
}

async function updateNews() {
    const cached = getCachedData("crypto-live-news", CACHE_TTL_MS.news);
    if (cached) {
        renderNews(cached);
    }

    try {
        const batches = await Promise.allSettled(NEWS_FEEDS.map((feed) => fetchFeed(feed)));
        const merged = batches
            .filter((result) => result.status === "fulfilled")
            .flatMap((result) => result.value)
            .filter((item) => item.link && item.title);

        const uniqueByLink = new Map();
        merged.forEach((item) => {
            if (!uniqueByLink.has(item.link)) {
                uniqueByLink.set(item.link, item);
            }
        });

        const latest = Array.from(uniqueByLink.values())
            .sort((a, b) => b.publishedAt - a.publishedAt)
            .slice(0, 8);

        if (!latest.length && cached) {
            return;
        }

        renderNews(latest);
        if (latest.length) {
            setCachedData("crypto-live-news", latest);
        }
    } catch (error) {
        console.error("News error:", error);
        if (!cached) {
            renderNews([]);
        }
    }
}

function calculateEma(prices, period) {
    if (!prices.length || period <= 1) {
        return [];
    }
    const k = 2 / (period + 1);
    const ema = [prices[0]];
    for (let i = 1; i < prices.length; i += 1) {
        ema.push(prices[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
}

function calculateRsi(prices, period = 14) {
    if (prices.length < period + 1) {
        return null;
    }
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i += 1) {
        const diff = prices[i] - prices[i - 1];
        if (diff >= 0) {
            gains += diff;
        } else {
            losses += Math.abs(diff);
        }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < prices.length; i += 1) {
        const diff = prices[i] - prices[i - 1];
        const gain = diff > 0 ? diff : 0;
        const loss = diff < 0 ? Math.abs(diff) : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (avgLoss === 0) {
        return 100;
    }
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

function buildSignal(asset, prices, dayChange) {
    const rsi = calculateRsi(prices, 14);
    const emaShort = calculateEma(prices, 12);
    const emaLong = calculateEma(prices, 26);

    const shortNow = emaShort[emaShort.length - 1];
    const shortPrev = emaShort[emaShort.length - 2];
    const longNow = emaLong[emaLong.length - 1];
    const longPrev = emaLong[emaLong.length - 2];

    const trendUp = shortNow > longNow && shortPrev <= longPrev;
    const trendDown = shortNow < longNow && shortPrev >= longPrev;
    const shortSlopeUp = shortNow > shortPrev;
    const shortSlopeDown = shortNow < shortPrev;

    let action = "HOLD";
    let reason = "Mixed indicators";
    let confidence = 55;

    if (rsi !== null && rsi < 35 && (trendUp || shortSlopeUp)) {
        action = "BUY";
        reason = "RSI is oversold and momentum is turning up";
        confidence = trendUp ? 78 : 68;
    } else if (rsi !== null && rsi > 65 && (trendDown || shortSlopeDown)) {
        action = "SELL";
        reason = "RSI is overheated and momentum is turning down";
        confidence = trendDown ? 78 : 68;
    }

    if (Number.isFinite(dayChange)) {
        if (action === "BUY" && dayChange > 0) {
            confidence += 4;
        } else if (action === "SELL" && dayChange < 0) {
            confidence += 4;
        }
    }

    return {
        asset: asset.symbol,
        action,
        confidence: Math.min(90, Math.max(50, confidence)),
        rsi: rsi !== null ? rsi.toFixed(1) : "--",
        dayChange: Number.isFinite(dayChange) ? dayChange.toFixed(1) : "--",
        reason
    };
}

function renderSignals(signals) {
    const container = document.getElementById("signals-list");
    const status = document.getElementById("signals-status");
    if (!container || !status) {
        return;
    }

    if (!signals.length) {
        status.textContent = "Unable to calculate signals right now.";
        container.innerHTML = "";
        return;
    }

    status.textContent = `Updated ${new Date().toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}`;
    container.innerHTML = signals.map((signal) => `
        <div class="signal" data-action="${signal.action}">
            <div class="signal-header">
                <strong>${signal.asset}</strong>
                <span class="signal-action">${signal.action}</span>
            </div>
            <div class="signal-meta">
                Confidence ${signal.confidence}% | RSI ${signal.rsi} | 24h ${signal.dayChange}%
            </div>
            <div class="signal-reason">${signal.reason}</div>
        </div>
    `).join("");
}

async function updateSignals() {
    const cached = getCachedData("crypto-indicator-signals", CACHE_TTL_MS.signals);
    if (cached) {
        renderSignals(cached);
    }

    try {
        const simplePrices = await fetchSimplePrices();
        const signalPromises = SIGNAL_ASSETS.map(async (asset) => {
            const endpoint = `https://api.coingecko.com/api/v3/coins/${asset.id}/market_chart?vs_currency=zar&days=30&interval=daily`;
            const chart = await fetchJson(endpoint);
            const prices = Array.isArray(chart?.prices)
                ? chart.prices.map((point) => point[1]).filter(Number.isFinite)
                : [];
            const dayChange = simplePrices?.[asset.id]?.zar_24h_change;
            if (prices.length < 30) {
                return null;
            }
            return buildSignal(asset, prices, dayChange);
        });

        const results = await Promise.allSettled(signalPromises);
        const signals = results
            .filter((result) => result.status === "fulfilled" && result.value)
            .map((result) => result.value);

        if (!signals.length && cached) {
            return;
        }

        renderSignals(signals);
        if (signals.length) {
            setCachedData("crypto-indicator-signals", signals);
        }
    } catch (error) {
        console.error("Signals error:", error);
        if (!cached) {
            renderSignals([]);
        }
    }
}

window.addEventListener("DOMContentLoaded", () => {
    updateTicker();
    updateMarketStats();
    updateNews();
    updateSignals();

    setInterval(updateTicker, REFRESH_MS.prices);
    setInterval(updateMarketStats, REFRESH_MS.stats);
    setInterval(updateNews, REFRESH_MS.news);
    setInterval(updateSignals, REFRESH_MS.signals);
});
