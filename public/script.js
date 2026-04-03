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
  const newsContainer = document.getElementById("newsContainer");
  const liveContainer = document.getElementById("liveContainer");
  const liveBtn = document.getElementById("liveBtn");
  const liveDrawerBtn = document.getElementById("liveDrawerBtn");
  const languageFilter = document.getElementById("languageFilter");

  /* ---------- STATE ---------- */
  let articles = [];
  let currentCat = "all";
  let page = 1;
  let loading = false;
  let loaded = false;
  let currentMode = "news"; // "news" or "live"
  let allChannels = [];
  let currentLiveFilter = "all";

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
    await loadNews();
    setupS2T();
    initBreakingNews();
    loadTrending();
    setupAutoRefresh();
  }
  window.onload = init;

  /* ---------- LOAD NEWS ---------- */
  async function loadNews(category = "general") {
    currentCat = category;
    if (loaded || loading) return;
    loading = true;

    console.log("📂 Loading category:", currentCat);
    
    // We modify mainMount instead of newsContainer so we don't destroy our hero and layout structure
    const container = document.getElementById("mainMount");

    // ✅ CLEAR OLD CONTENT
    if (container) container.innerHTML = "<p style='text-align:center;padding:50px;'>Loading...</p>";
    if (heroMount) heroMount.innerHTML = "";

    if (skel) skel.style.display = "block";
    if (app) app.style.display = "none";

    try {
      const mapped = mapCategory(category);
      const url = mapped && mapped !== 'all' ? `/api/news?category=${mapped}` : "/api/news";
      console.log(`🔍 Fetching news from API: ${url}`);

      const res = await fetch(url);
      const data = await res.json();

      console.log("NEWS DATA:", data);

      if (!Array.isArray(data)) {
        if (container) container.innerHTML = "<p style='text-align:center;padding:50px;'>Error loading news</p>";
        loading = false;
        return;
      }

      if (data.length === 0) {
        console.warn("⚠️ Supabase returned 0 rows.");
        renderEmpty();
        if (skel) skel.style.display = "none";
        if (app) app.style.display = "block";
        loading = false;
        return;
      }

      articles = data;
      window.allNews = articles;
      
      // ✅ CALLED RENDER (which replaces renderNews)
      render(); 
      loaded = true;

      if (skel) skel.style.display = "none";
      if (app) app.style.display = "block";

    } catch (err) {
      console.error(err);
      if (container) container.innerHTML = "<p style='text-align:center;padding:50px;'>Failed to load news</p>";
      if (skel) skel.style.display = "none";
      if (app) app.style.display = "block";
    } finally {
      loading = false;
      if (sentinel) sentinel.innerHTML = "";
    }
  }

  /* ---------- LIVE TV ---------- */
  function showLiveLoading() {
    const container = document.getElementById("live-container");
    if (!container) return;
    container.innerHTML = [1, 2, 3].map(() =>
      `<div class="live-card" style="background:#f5f5f5"><div style="width:100%;height:200px;background:#eee"></div></div>`
    ).join("");
  }

  function renderLive(filter) {
    currentLiveFilter = filter || currentLiveFilter;
    const container = document.getElementById("live-container");
    if (!container) return;
    const filtered = currentLiveFilter === "all" ? allChannels : allChannels.filter(c => c.language === currentLiveFilter);
    container.innerHTML = filtered.map(c => `
      <div class="live-card">
        <iframe src="${c.url || c.embedUrl}" allow="autoplay; encrypted-media" allowfullscreen></iframe>
        <h3>${esc(c.name)}</h3><p>${esc(c.language)}</p>
      </div>`).join("");
  }

  async function loadLiveChannels() {
    showLiveLoading();
    try {
      const { data, error } = await supabaseClient.from("live_tv").select("*").order("created_at", { ascending: false });
      if (!error) allChannels = data || [];
    } catch (e) { console.error("Live TV Error:", e); }
    renderLive(currentLiveFilter);
  }

  if (languageFilter) {
    languageFilter.addEventListener("change", (e) => renderLive(e.target.value));
  }

  function switchToLive(e) {
    if (e) e.preventDefault();
    console.log("Live clicked");

    document.querySelectorAll(".nav-link").forEach(l => {
      l.classList.remove("active");
      l.classList.remove("nav-a--on");
    });
    
    // ✅ HIGHLIGHT LIVE TAB
    const lBtn = document.getElementById("liveTab") || document.getElementById("liveBtn");
    if (lBtn) {
      lBtn.classList.add("active");
      lBtn.classList.add("nav-a--on");
    }

    const nContainer = document.getElementById("newsContainer");
    const lContainer = document.getElementById("liveContainer");

    if (nContainer) nContainer.style.display = "none";
    if (lContainer) lContainer.style.display = "block";
    
    currentMode = "live";
    loadLiveChannels();
  }

  if (liveBtn) liveBtn.addEventListener("click", switchToLive);
  if (liveDrawerBtn) liveDrawerBtn.addEventListener("click", (e) => {
    if (drawer) drawer.classList.remove("drawer--on");
    switchToLive(e);
  });

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
      loadNews();
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
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", (e) => {
      // Do not run news fetch logic if we are clicking Live
      if (link.id === "liveBtn" || link.id === "liveTab" || link.id === "liveDrawerBtn") return;
      e.preventDefault();

      const category = link.dataset.category || link.dataset.cat || "general";

      console.log("Clicked category:", category);

      // ✅ FIX 1: switch active tab
      document.querySelectorAll(".nav-link").forEach(l => {
        l.classList.remove("active");
        l.classList.remove("nav-a--on");
      });
      link.classList.add("active");
      link.classList.add("nav-a--on");

      const activeLink = document.querySelector(".nav-a--on");
      if (activeLink && activeLink.scrollIntoView) {
        activeLink.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }

      // ✅ FIX 2: FORCE EXIT LIVE MODE
      const liveC = document.getElementById("liveContainer");
      const newsC = document.getElementById("newsContainer");
      if (liveC) liveC.style.display = "none";
      if (newsC) newsC.style.display = "block";

      // ✅ FIX 3: CLEAR LIVE UI
      const liveInner = document.getElementById("live-container");
      if (liveInner) liveInner.innerHTML = "";

      currentMode = "news";
      page = 1;
      articles = [];
      loaded = false;

      // ✅ FIX 4: LOAD NEWS AGAIN (THIS WAS MISSING)
      loadNews(category);
    });
  });

  /* ---------- DRAWER ---------- */
  if (menuBtn) menuBtn.addEventListener("click", () => drawer.classList.add("drawer--on"));
  if (drawerClose) drawerClose.addEventListener("click", () => drawer.classList.remove("drawer--on"));
  drawerLinks.forEach(l => l.addEventListener("click", e => {
    // Only handle drawer closing here, navigation is handled by the unified .nav-link listener above
    if (l.id === "liveDrawerBtn") return; // Handled separately
    drawer.classList.remove("drawer--on");
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
