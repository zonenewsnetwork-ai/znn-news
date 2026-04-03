/**
 * ZNN – article-script.js | Article Page Logic (Vercel API Migration)
 */
document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const slug = params.get("s");

    /* ---------- LOAD ARTICLE ---------- */
    async function loadArticle() {
        try {
            if (!id && !slug) {
                // If no ID or slug, localStorage or homepage
                const raw = localStorage.getItem("znn_article");
                if (raw) { renderArticle(JSON.parse(raw)); return; }
                window.location.href = "/";
                return;
            }

            const url = id ? `/api/news/id/${id}` : `/api/news/${slug}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("API failure");
            
            const data = await res.json();
            if (data) {
                renderArticle(data);
                loadRelated(data.category, data.id);
            } else {
                document.getElementById("articleContent").innerHTML = "<h2>Article not found</h2>";
            }
        } catch (e) {
            console.error("Load Article Error:", e.message);
        }
    }

    function renderArticle(a) {
        // SEO Meta Updates
        document.title = `${a.title} | ZNN`;
        const metaDesc = document.getElementById("metaDesc");
        if (metaDesc) metaDesc.content = a.description;
        
        const ogTitle = document.getElementById("ogTitle");
        if (ogTitle) ogTitle.content = a.title;

        const ogImage = document.getElementById("ogImage");
        if (ogImage) ogImage.content = a.image_url || a.imageUrl;

        const content = document.getElementById("articleContent");
        content.innerHTML = `
            <div style="margin-bottom:20px">
                <span class="hero__cat" style="padding:6px 16px">${(a.category || "NEWS").toUpperCase()}</span>
                <h1 style="margin:16px 0;font-size:32px;line-height:1.2">${a.title}</h1>
                <div style="font-size:13px;color:#888;margin-bottom:28px">
                    <span>${a.source || "ZNN"}</span> · <span>${new Date(a.created_at).toLocaleDateString()}</span>
                </div>
            </div>
            <img src="${a.image_url || a.imageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168d5c?w=600'}" alt="${a.title}" style="width:100%;border-radius:12px;margin-bottom:32px" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1504711434969-e33886168d5c?w=600'">
            
            <div class="article-body">
                ${a.content || a.fullContent || a.full_content || `<p>${a.description}</p>`}
            </div>

            <div style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;font-size:14px">
                <p style="color:#888;margin-bottom:10px">Original Source: ${a.source || "ZNN"}</p>
                ${a.url ? `<a href="${a.url}" target="_blank" style="color:var(--accent);font-weight:700">Read Source Material →</a>` : ''}
            </div>
        `;
    }

    async function loadRelated(cat, excludeId) {
        try {
            const res = await fetch("/api/news");
            if (!res.ok) throw new Error("API failure");
            
            let data = await res.json();
            if (cat) data = data.filter(ar => ar.category === cat);
            if (excludeId) data = data.filter(ar => ar.id !== excludeId);
            data = data.slice(0, 6);

            const mount = document.getElementById("relatedMount");
            if (mount && data.length > 0) {
                mount.innerHTML = data.map(a => `
                    <div class="news-card" onclick="window.location.href='/article.html?id=${a.id}'">
                        <div class="news-image"><img src="${a.image_url || a.imageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168d5c?w=600'}" alt="${a.title}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1504711434969-e33886168d5c?w=600'"></div>
                        <div class="news-content">
                            <h3>${a.title}</h3>
                            <div class="meta-line"><span>${a.source || "ZNN"}</span></div>
                        </div>
                    </div>
                `).join("");
            }
        } catch (e) {
            console.error("Related Error:", e.message);
        }
    }

    loadArticle();
});
