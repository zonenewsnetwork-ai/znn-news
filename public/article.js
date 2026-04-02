/* ==========================================================
   ZNN – article.js  |  Article Page Logic v8
   ✅ Uses window.sbClient (set in supabase-config.js)
   ========================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const supabaseClient = window.supabaseClient;
  const bar = document.getElementById("progressBar");
  const s2t = document.getElementById("s2t");
  const trendM = document.getElementById("trendMount");
  const mreadM = document.getElementById("mostReadMount");
  const related = document.getElementById("relatedGrid");

  if (!supabaseClient) {
    console.error("❌ article.js: window.supabaseClient not available. Supabase queries will fail.");
  }

  /* ---------- SCROLL PROGRESS ---------- */
  window.addEventListener("scroll", () => {
    const h = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (bar) bar.style.width = ((scrollY / h) * 100) + "%";
    if (s2t) s2t.classList.toggle("s2t--on", scrollY > 400);
  });
  if (s2t) s2t.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  /* ---------- SHARE BUTTONS ---------- */
  document.querySelectorAll(".share-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const url = location.href;
      const t = document.getElementById("artTitle")?.innerText || "";
      let u = "";
      if (btn.classList.contains("twitter")) u = `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(url)}`;
      if (btn.classList.contains("facebook")) u = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
      if (btn.classList.contains("whatsapp")) u = `https://api.whatsapp.com/send?text=${encodeURIComponent(t + " " + url)}`;
      if (u) window.open(u, "_blank", "width=600,height=400");
    });
  });

  /* ---------- LOAD ARTICLE ---------- */
  async function loadArticle() {
    const el = {
      title: document.getElementById("artTitle"),
      sub: document.getElementById("artSubtitle"),
      img: document.getElementById("artImg"),
      cat: document.getElementById("artCat"),
      content: document.getElementById("artContent")
    };

    let art = null;

    // Priority 1: Load by ID from URL param (best for production)
    const params = new URLSearchParams(location.search);
    const articleId = params.get("id");
    const articleSlug = params.get("s");

    if (articleId && supabaseClient) {
      try {
        console.log("📰 Loading article by ID:", articleId);
        const { data, error } = await supabaseClient
          .from("news")
          .select("*")
          .eq("id", articleId)
          .single();

        if (error) {
          console.error("❌ Article fetch error:", error.message);
        } else if (data) {
          art = data;
          console.log("✅ Article loaded from Supabase:", art.title);
        }
      } catch (e) {
        console.error("❌ Article fetch exception:", e);
      }
    }

    // Priority 2: Load by slug
    if (!art && articleSlug && supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from("news")
          .select("*")
          .eq("slug", articleSlug)
          .single();

        if (!error && data) {
          art = data;
          console.log("✅ Article loaded by slug:", art.title);
        }
      } catch (e) {
        console.error("Article slug fetch:", e);
      }
    }

    // Priority 3: Fallback to localStorage
    if (!art) {
      const raw = localStorage.getItem("znn_article");
      if (raw) { try { art = JSON.parse(raw); } catch (e) { } }
    }

    // Priority 4: Fallback to title param
    if (!art) {
      if (params.get("title")) {
        art = {
          title: decodeURIComponent(params.get("title")),
          description: "Full report being loaded.",
          image_url: "https://images.unsplash.com/photo-1504711434969-e33886168d5c?w=1200&fit=crop"
        };
      }
    }

    if (art) {
      if (el.title) el.title.innerText = art.title;
      if (el.sub) el.sub.innerText = art.description || "";
      if (el.img) {
        const imgSrc = art.image_url || art.image || 'https://images.unsplash.com/photo-1504711434969-e33886168d5c?w=1200&fit=crop';
        el.img.src = imgSrc;
        el.img.onerror = function () { this.onerror = null; this.src = 'https://images.unsplash.com/photo-1504711434969-e33886168d5c?w=600'; };
      }
      if (el.cat) el.cat.innerText = art.category || "NEWS";

      // Content
      if (art.content && el.content) {
        let body = art.content;
        if (!body.includes("<p>")) body = body.split("\n\n").map(p => `<p>${p.trim()}</p>`).join("");
        el.content.innerHTML = body;
      }

      // SEO
      document.title = `${art.title} | ZNN`;
      setMeta("metaDesc", art.description);
      setMeta("ogTitle", art.title); setMeta("ogDesc", art.description); setMeta("ogImg", art.image_url || art.image);
      setMeta("twTitle", art.title);
      injectSchema(art);
    } else {
      if (el.title) el.title.innerText = "Article Not Found";
      if (el.sub) el.sub.innerText = "This story may have been moved or removed.";
      if (el.img) el.img.style.display = "none";
    }
  }

  function setMeta(id, v) { const e = document.getElementById(id); if (e && v) e.setAttribute("content", v); }
  function injectSchema(a) {
    const el = document.getElementById("articleSchema");
    if (!el) return;
    el.textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": "NewsArticle",
      "headline": a.title, "image": [a.image_url || a.image],
      "datePublished": new Date().toISOString().split("T")[0],
      "author": { "@type": "Person", "name": a.author || "ZNN Editorial" },
      "publisher": { "@type": "Organization", "name": "ZNN – Zone News Network", "logo": { "@type": "ImageObject", "url": "/logo.png" } },
      "description": a.description
    });
  }

  /* ---------- SIDEBAR (Direct Supabase) ---------- */
  async function loadSidebar() {
    if (!supabaseClient) {
      console.warn("⚠️ article.js sidebar: Supabase client not available.");
      return;
    }

    // Trending — sorted by views
    try {
      const { data, error } = await supabaseClient
        .from("news")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (!error && data && data.length > 0 && trendM) {
        trendM.innerHTML = data.map(a =>
          `<li class="t-item" onclick='openArticle(${safeJSON(a)})'><p class="t-item__title">${esc(a.title)}</p></li>`
        ).join("");
      }
    } catch (e) { console.error("Trending:", e); }

    // Most Read — sorted by created_at (recent)
    try {
      const { data, error } = await supabaseClient
        .from("news")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (!error && data && data.length > 0 && mreadM) {
        mreadM.innerHTML = data.map(a =>
          `<li class="t-item" onclick='openArticle(${safeJSON(a)})'><p class="t-item__title">${esc(a.title)}</p></li>`
        ).join("");
      }
    } catch (e) { console.error("Most Read:", e); }
  }

  /* ---------- RELATED ---------- */
  async function loadRelated() {
    if (!supabaseClient || !related) return;

    try {
      const { data, error } = await supabaseClient
        .from("news")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;

      let arr = data || [];

      if (related && arr.length > 0) {
        related.innerHTML = arr.slice(2, 6).map(a =>
          `<article class="card" onclick='openArticle(${safeJSON(a)})'>
            <div class="card__media"><img class="card__img" src="${a.image_url || a.image || 'https://images.unsplash.com/photo-1504711434969-e33886168d5c?w=600'}" alt="" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1504711434969-e33886168d5c?w=600'"></div>
            <div class="card__body"><div class="meta"><span class="meta__cat">${esc(a.category)}</span></div><h3 class="card__title">${esc(a.title)}</h3></div>
          </article>`
        ).join("");
      }
    } catch (e) { console.error("Related:", e); }
  }

  /* ---------- UTILS ---------- */
  window.openArticle = window.openArticle || function (a) {
    localStorage.setItem("znn_article", JSON.stringify(a));
    if (a.id) {
      location.href = `/article.html?id=${a.id}`;
    } else {
      location.href = "article.html";
    }
  };
  function esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }
  function safeJSON(a) { return JSON.stringify(a).replace(/'/g, "&apos;"); }

  /* ---------- INIT ---------- */
  loadArticle();
  loadSidebar();
  loadRelated();
});
