/* ==========================================================
   ZNN – article.js  |  Article Page Logic v8
   ✅ Uses window.sbClient (set in supabase-config.js)
   ========================================================== */
document.addEventListener("DOMContentLoaded", () => {
    const bar = document.getElementById("progressBar");
  const s2t = document.getElementById("s2t");
  const trendM = document.getElementById("trendMount");
  const mreadM = document.getElementById("mostReadMount");
  const related = document.getElementById("relatedGrid");

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

    if (articleId) {
      try {
        console.log("📰 Loading article by ID:", articleId);
        const res = await fetch(`/api/news/id/${articleId}`);
        if (res.ok) {
          art = await res.json();
          console.log("✅ Article loaded from API:", art.title);
        }
      } catch (e) { console.error("❌ Article API fetch exception:", e); }
    }

    if (!art && articleSlug) {
      try {
        const res = await fetch(`/api/news/${articleSlug}`);
        if (res.ok) {
          art = await res.json();
          console.log("✅ Article loaded by slug from API:", art.title);
        }
      } catch (e) { console.error("Article slug API fetch:", e); }
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

  /* ---------- SIDEBAR (API) ---------- */
  async function loadSidebar() {
    try {
      const res = await fetch("/api/news");
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data) && data.length > 0) {
          if (trendM) trendM.innerHTML = data.slice(0, 5).map(a =>
            `<li class="t-item" onclick='openArticle(${safeJSON(a)})'><p class="t-item__title">${esc(a.title)}</p></li>`
          ).join("");
          if (mreadM) mreadM.innerHTML = data.slice(5, 10).map(a =>
            `<li class="t-item" onclick='openArticle(${safeJSON(a)})'><p class="t-item__title">${esc(a.title)}</p></li>`
          ).join("");
        }
      }
    } catch (e) { console.error("Sidebar API Load:", e); }
  }

  /* ---------- RELATED (API) ---------- */
  async function loadRelated() {
    if (!related) return;
    try {
      const res = await fetch("/api/news");
      if (res.ok) {
        let arr = await res.json();
        if (!Array.isArray(arr)) {
          console.error("Related: API did not return an array:", arr);
          return;
        }
        if (arr.length > 0) {
          related.innerHTML = arr.slice(2, 6).map(a =>
            `<article class="card" onclick='openArticle(${safeJSON(a)})'>
              <div class="card__media"><img class="card__img" src="${a.image_url || a.image || 'https://images.unsplash.com/photo-1504711434969-e33886168d5c?w=600'}" alt="" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1504711434969-e33886168d5c?w=600'"></div>
              <div class="card__body"><div class="meta"><span class="meta__cat">${esc(a.category)}</span></div><h3 class="card__title">${esc(a.title)}</h3></div>
            </article>`
          ).join("");
        }
      }
    } catch (e) { console.error("Related API Load:", e); }
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
