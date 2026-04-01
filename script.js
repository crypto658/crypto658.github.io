// Crypto ticker: fetch prices from CoinGecko, convert to ZAR
async function updateTicker() {
    try {
        // CoinGecko API (free, no key needed)
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple&vs_currencies=zar&include_24hr_change=true');
        const data = await response.json();

        // BTC/ZAR
        if (data.bitcoin) {
            const btc = data.bitcoin;
            const el = document.getElementById('btc-zar');
            el.innerHTML = formatPrice(btc.zar) + (btc. zar_24h_change ? ` <span style="color:${btc.zar_24h_change>=0?'#00ff88':'#ff4d4d'}">${btc.zar_24h_change.toFixed(1)}%</span>` : '');
        }

        // ETH/ZAR
        if (data.ethereum) {
            const eth = data.ethereum;
            const el = document.getElementById('eth-zar');
            el.innerHTML = formatPrice(eth.zar) + (eth.zar_24h_change ? ` <span style="color:${eth.zar_24h_change>=0?'#00ff88':'#ff4d4d'}">${eth.zar_24h_change.toFixed(1)}%</span>` : '');
        }

        // SOL/ZAR
        if (data.solana) {
            const sol = data.solana;
            const el = document.getElementById('sol-zar');
            el.innerHTML = formatPrice(sol.zar) + (sol.zar_24h_change ? ` <span style="color:${sol.zar_24h_change>=0?'#00ff88':'#ff4d4d'}">${sol.zar_24h_change.toFixed(1)}%</span>` : '');
        }

        // XRP/ZAR
        if (data.ripple) {
            const xrp = data.ripple;
            const el = document.getElementById('xrp-zar');
            el.innerHTML = formatPrice(xrp.zar) + (xrp.zar_24h_change ? ` <span style="color:${xrp.zar_24h_change>=0?'#00ff88':'#ff4d4d'}">${xrp.zar_24h_change.toFixed(1)}%</span>` : '');
        }

        // Update stats if elements exist
        if (document.getElementById('btc-dom')) {
            document.getElementById('btc-dom').textContent = '~55%';
        }
        if (document.getElementById('total-mc')) {
            document.getElementById('total-mc').textContent = formatPrice(2.7e12) + ' ZAR';
        }
        if (document.getElementById('fg-index')) {
            document.getElementById('fg-index').textContent = '73 (Greed)';
        }

    } catch (error) {
        console.error('Ticker error:', error);
        // Keep placeholders if fetch fails
    }
}

function formatPrice(num) {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 2 }).format(num);
}

// Refresh ticker every 60 seconds
window.addEventListener('DOMContentLoaded', () => {
    updateTicker();
    setInterval(updateTicker, 60000);
});
