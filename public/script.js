/* ==========================================================
   ZNN – script.js  |  Live News Engine v10
   Premium UI • Infinite Scroll • Auto-Refresh
   ✅ Uses window.sbClient (set in supabase-config.js)
   ========================================================== */
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Loading news...");
  // --- Grab the shared Supabase client ---
  const supabaseClient = window.supabaseClient;
  console.log("Supabase:", window.supabaseClient);
  if (!supabaseClient) {
    console.error("❌ FATAL: window.supabaseClient is not defined. Check supabase-config.js load order.");
    const skel = document.getElementById("skel");
    const app = document.getElementById("app");
    if (skel) skel.style.display = "none";
    if (app) {
      app.style.display = "block";
      const mainMount = document.getElementById("mainMount");
      if (mainMount) mainMount.innerHTML = '<div class="no-news">Supabase client failed to load. Check browser console (F12).</div>';
    }
    return;
  }
  console.log("✅ script.js: Supabase client (supabaseClient) is available.");

  const app = document.getElementById("app");
  const skel = document.getElementById("skel");
  const heroMount = document.getElementById("heroMount");
  const mainMount = document.getElementById("mainMount");
  const trendM = document.getElementById("trendMount");
  const mreadM = document.getElementById("mostReadMount");
  const navLinks = document.querySelectorAll(".nav-a");
  const s2t = document.getElementById("s2t");
  const sentinel = document.getElementById("sentinel");
  const drawer = document.getElementById("drawer");
  const menuBtn = document.getElementById("menuBtn");
  const drawerClose = document.getElementById("drawerClose");
  const drawerLinks = document.querySelectorAll(".drawer__a");

  /* ---------- STATE ---------- */
  let articles = [];
  let currentCat = "all";
  let page = 1;
  let loading = false;
  let loaded = false;

  /* ---------- CATEGORY MAPPER ---------- */
  function mapCategory(cat) {
    if (!cat) return 'all';
    const map = {
      'home': 'all',
      'all': 'all',
      'world': 'world',
      'tech': 'technology',
      'technology': 'technology',
      'business': 'business',
      'politics': 'politics',
      'entertainment': 'entertainment',
      'sports': 'sports',
      'science': 'science',
      'general': 'general'
    };
    return map[cat.toLowerCase()] || cat.toLowerCase();
  }

  const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1504711434969-e33886168d5c?w=600';

  /* ---------- INIT ---------- */
  async function init() {
    await fetchNews();
    setupS2T();
    initBreakingNews();
    loadTrending();
    setupAutoRefresh();
  }
  window.onload = init;

  /* ---------- FETCH ---------- */
  async function fetchNews(isFallback) {
    if (loaded || loading) return;
    loading = true;

    if (skel) skel.style.display = "block";
    if (app) app.style.display = "none";

    try {
      const mapped = mapCategory(currentCat);
      const url = mapped && mapped !== 'all' ? `/api/news?category=${mapped}` : "/api/news";
      console.log(`🔍 Fetching news from API: ${url}`);

      const response = await fetch(url);
      const data = await response.json();
      const status = response.status;
      let error = null;

      if (!response.ok) {
        error = { message: data.error || "Failed to fetch news" };
      }

      // --- Debug: Log raw response ---
      console.log("📦 API response:", { status, dataLength: data ? data.length : 0 });
      console.log("DATA:", data);

      if (error) {
        console.error("❌ API FETCH ERROR:", error.message);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn("⚠️ Supabase returned 0 rows.");
        if (status === 200) {
          console.warn("   → HTTP 200 with empty array usually means RLS is blocking.");
          console.warn("   → Fix: Go to Supabase SQL Editor and run:");
          console.warn('   CREATE POLICY "public_read" ON "public"."news" FOR SELECT USING (true);');
        }

        // FALLBACK: If category-specific fetch returned empty, try fetching all
        if (!isFallback && mapped && mapped !== 'all') {
          console.warn(`   Falling back to "all" category...`);
          currentCat = 'all';
          loading = false;
          loaded = false;
          fetchNews(true);
          return;
        }
        console.warn("   No articles found even for 'all' category.");
        renderEmpty();
        if (skel) skel.style.display = "none";
        if (app) app.style.display = "block";
        loading = false;
        return;
      }

      console.log(`✅ Loaded ${data.length} articles. First title: "${data[0].title}"`);
      articles = data;
      render();
      loaded = true;

      if (skel) skel.style.display = "none";
      if (app) app.style.display = "block";
    } catch (e) {
      console.error("❌ News fetch exception:", e);
      renderEmpty();
      if (skel) skel.style.display = "none";
      if (app) app.style.display = "block";
    } finally {
      loading = false;
      if (sentinel) sentinel.innerHTML = "";
    }
  }

  /* ---------- RENDER ---------- */
  function render() {
    if (!articles || !articles.length) { renderEmpty(); return; }

    const feat = articles[0];
    const rest = articles.slice(1);

    if (heroMount) heroMount.innerHTML = heroHTML(feat);

    // RENDER MAIN FEED WITH DYNAMIC ADS EVERY 3 ARTICLES
    let mainHTML = "";
    let adIdx = 0;
    rest.forEach((a, i) => {
      mainHTML += cardHTML(a, i);
      // Inject Dynamic Ad every 3 articles if available
      if ((i + 1) % 3 === 0) {
        if (window.__ZNN_ADS && window.__ZNN_ADS.betweenPosts && window.__ZNN_ADS.betweenPosts.length > adIdx) {
          const ad = window.__ZNN_ADS.betweenPosts[adIdx];
          mainHTML += `<div class="ad-container between-posts-ad" style="margin:24px 0">${ad.code}</div>`;
          adIdx++;
        } else {
          mainHTML += `<div class="ad-placeholder inline-ad">Advertisement · SPONSORED CONTENT</div>`;
        }
      }
    });

    if (mainMount) mainMount.innerHTML = mainHTML;

    // Load Latest News as Most Read
    if (mreadM) {
      const mostRead = [...articles].slice(0, 5);
      mreadM.innerHTML = mostRead.map(tItemHTML).join("");
    }
  }

  function renderEmpty() {
    if (mainMount) mainMount.innerHTML = '<div class="no-news">No latest news available</div>';
    if (heroMount) heroMount.innerHTML = "";
    if (trendM) trendM.innerHTML = "";
    if (mreadM) mreadM.innerHTML = "";
  }

  /* ---------- TEMPLATES ---------- */
  function heroHTML(a) {
    const j = safeJSON(a);
    const validImg = (a.image_url || a.imageUrl) && (a.image_url || a.imageUrl).startsWith("http") ? (a.image_url || a.imageUrl) : FALLBACK_IMAGE;
    const isBreaking = a.is_breaking ? '<span class="badge badge--breaking">BREAKING</span>' : '';
    return `<div class="hero fade-in" onclick='openArticle(${j})'>
      <img
        src="${validImg}"
        class="hero-img"
        alt="${esc(a.title)}"
        onerror="this.src='${FALLBACK_IMAGE}'"
      />
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="meta-badges">
          ${isBreaking}
          <span class="category">${esc(a.category || "NEWS")}</span>
        </div>
        <h1>${esc(a.title)}</h1>
        <p>${esc(a.description)}</p>
      </div>
    </div>`;
  }

  function cardHTML(a, idx) {
    const j = safeJSON(a);
    const validImg = (a.image_url || a.imageUrl) && (a.image_url || a.imageUrl).startsWith("http") ? (a.image_url || a.imageUrl) : FALLBACK_IMAGE;
    const delay = Math.min(idx * 0.04, 0.3);
    const isBreaking = a.is_breaking ? '<span class="badge badge--breaking">BREAKING</span>' : '';
    return `<div class="news-card fade-in" style="animation-delay:${delay}s" onclick='openArticle(${j})'>
      <div class="news-image">
        <img
          src="${validImg}"
          alt="${esc(a.title)}"
          loading="lazy"
          onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"
        />
        <div class="card-badges">${isBreaking}</div>
      </div>
      <div class="news-content">
        <span class="category">${esc(a.category || "NEWS")}</span>
        <h3>${esc(a.title)}</h3>
        <p>${esc(a.description || "")}</p>
        <div class="meta-line">
          <span>${esc(a.source || "ZNN")}</span>
          <span>·</span>
          <span>${timeAgo(a.created_at)}</span>
        </div>
      </div>
    </div>`;
  }

  /* ---------- TRENDING (DIRECT SUPABASE) ---------- */
  async function loadTrending() {
    if (!trendM) return;
    try {
      const response = await fetch("/api/news");
      const data = await response.json();

      if (!response.ok) throw new Error("API failed");

      if (data && data.length > 0) {
        // Use just the first 10 for trending
        const trending = [...data].slice(0, 10);
        trendM.innerHTML = trending.map(tItemHTML).join("");
      }
    } catch (e) { console.error("API Trending Load:", e); }
  }

  function tItemHTML(a) {
    return `<li class="t-item" onclick='openArticle(${safeJSON(a)})'>
      <p class="t-item__title">${esc(a.title)}</p>
    </li>`;
  }


  /* ---------- AUTO-REFRESH (60s) ---------- */
  function setupAutoRefresh() {
    setInterval(() => {
      console.log("🔄 Auto-refreshing news...");
      loaded = false;
      articles = [];
      fetchNews();
    }, 60000);
  }

  /* ---------- SCROLL-TO-TOP ---------- */
  function setupS2T() {
    if (!s2t) return;
    window.addEventListener("scroll", () => { s2t.classList.toggle("s2t--on", scrollY > 500); });
    s2t.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  /* ---------- BREAKING NEWS TICKER ---------- */
  async function initBreakingNews() {
    const tickerTrack = document.getElementById("tickerTrack");
    const tickerBar = document.getElementById("breakingTicker");
    if (!tickerTrack || !tickerBar) return;

    try {
      const response = await fetch("/api/news");
      const data = await response.json();

      if (!response.ok) throw new Error("API failed");

      if (data && data.length > 0) {
        tickerBar.style.display = "flex";
        const breaking = data.filter(a => a.is_breaking).slice(0, 10);
        if (breaking.length > 0) {
          const content = breaking.map(a => `<span>● ${a.title}</span>`).join("");
          tickerTrack.innerHTML = content + content;
        } else {
          tickerBar.style.display = "none";
        }
      } else {
        tickerBar.style.display = "none";
      }
    } catch (e) {
      console.error("API Ticker:", e);
      tickerBar.style.display = "none";
    }

    // Auto-refresh ticker every 60 seconds
    setTimeout(initBreakingNews, 60000);
  }

  /* ---------- NAV ---------- */
  function setActiveCat(cat) {
    currentCat = cat;
    navLinks.forEach(l => l.classList.toggle("nav-a--on", l.dataset.cat === cat));
    const active = document.querySelector(".nav-a--on");
    if (active) active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }
  navLinks.forEach(l => l.addEventListener("click", e => {
    e.preventDefault();
    setActiveCat(l.dataset.cat);
    page = 1;
    articles = [];
    loaded = false;
    fetchNews();
  }));

  /* ---------- DRAWER ---------- */
  if (menuBtn) menuBtn.addEventListener("click", () => drawer.classList.add("drawer--on"));
  if (drawerClose) drawerClose.addEventListener("click", () => drawer.classList.remove("drawer--on"));
  drawerLinks.forEach(l => l.addEventListener("click", e => {
    e.preventDefault();
    drawer.classList.remove("drawer--on");
    setActiveCat(l.dataset.cat);
    page = 1;
    articles = [];
    loaded = false;
    fetchNews();
  }));



  /* ---------- UTILS ---------- */
  window.openArticle = function (a) {
    // Navigate to full article page by ID
    if (a.id) {
      window.location.href = `/article.html?id=${a.id}`;
    } else if (a.slug) {
      window.location.href = `/article.html?s=${a.slug}`;
    } else {
      localStorage.setItem("znn_article", JSON.stringify(a));
      window.location.href = "article.html";
    }
  };
  function esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }
  function safeJSON(a) { return JSON.stringify(a).replace(/'/g, "&apos;"); }
  function timeAgo(d) {
    if (!d) return "Just now";
    const diff = Math.floor((Date.now() - new Date(d)) / 60000);
    if (diff < 1) return "Just now";
    if (diff < 60) return diff + "m ago";
    if (diff < 1440) return Math.floor(diff / 60) + "h ago";
    return Math.floor(diff / 1440) + "d ago";
  }
  function formatViews(n) {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  }

  // init handled by window.onload
});
