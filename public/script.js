console.log("SCRIPT STARTED");
console.log("🔥 SCRIPT LOADED");
async function loadNews() {
  try {
    const res = await fetch("https://jsonplaceholder.typicode.com/posts");
    const data = await res.json();

    const container = document.getElementById("news");

    if (!data || data.length === 0) {
      container.innerHTML = '<div class="no-news">No news available</div>';
      return;
    }

    container.innerHTML = data.slice(0, 10).map(n => `
      <div>
        <h3>${n.title}</h3>
        <p>${n.body}</p>
      </div>
    `).join("");

  } catch (err) {
    console.error("Fetch error:", err);
    const container = document.getElementById("news");
    if (container) container.innerHTML = '<div class="no-news">No news available</div>';
  }
}

loadNews();
