/**
 * ZNN Ads Injection System
 * Dynamically loads and injects ads/scripts based on placement.
 */
(function() {
  window.__ZNN_ADS = {
    betweenPosts: [],
    sidebar: []
  };

  async function loadAds() {
    try {
      const res = await fetch('/api/ads');
      if (!res.ok) throw new Error("API failure");
      const data = await res.json();
      
      if (!data || data.length === 0) return;

      data.forEach(ad => {
        if (ad.placement === 'header') injectHeader(ad);
        else if (ad.placement === 'footer') injectFooter(ad);
        else if (ad.placement === 'sidebar') window.__ZNN_ADS.sidebar.push(ad);
        else if (ad.placement === 'between-posts') window.__ZNN_ADS.betweenPosts.push(ad);
      });

      // Render if sidebar container is already present
      renderSidebarAds();
    } catch (e) {
      console.error('Supabase Ads Injection Error:', e);
    }
  }

  function injectHeader(ad) {
    const div = document.createElement('div');
    div.innerHTML = ad.code;
    document.head.appendChild(div);
  }

  function injectFooter(ad) {
    const div = document.createElement('div');
    div.innerHTML = ad.code;
    document.body.appendChild(div);
  }

  function renderSidebarAds() {
    const sidebar = document.getElementById('sidebar-ads');
    if (!sidebar) return;
    
    window.__ZNN_ADS.sidebar.forEach(ad => {
      const adDiv = document.createElement('div');
      adDiv.className = 'ad-container sidebar-ad-dynamic';
      adDiv.style.margin = '20px 0';
      adDiv.innerHTML = ad.code;
      sidebar.appendChild(adDiv);
    });
  }

  // Initial load
  loadAds();

  // Watch for sidebar if it renders later
  const pollSidebar = setInterval(() => {
    if (document.getElementById('sidebar-ads') && document.getElementById('sidebar-ads').innerHTML === '') {
      renderSidebarAds();
      clearInterval(pollSidebar);
    }
  }, 1000);
  setTimeout(() => clearInterval(pollSidebar), 10000);

})();
