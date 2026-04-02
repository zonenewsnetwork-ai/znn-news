/* ==========================================================
   ZNN – ads-demo.js  |  Ad Rotation Engine
   Realistic Fake Advertisements for Demo
   ========================================================== */
(function() {
  const AD_DATA = [
    {
      brand: "TechNova",
      tagline: "Unlocking the Future of Artificial Intelligence with Secure Cloud Solutions.",
      cta: "Explore Now"
    },
    {
      brand: "SmartX",
      tagline: "Elevate Your Digital Workflow. Seamless Integration for Modern Teams.",
      cta: "Get Started"
    },
    {
      brand: "ShopNow",
      tagline: "Exclusive Summer Sale: Up to 50% Off on Top Electronics & Home Goods.",
      cta: "Shop Deals"
    }
  ];

  let currentAdIndex = 0;
  const ROTATE_INTERVAL = 5000; // 5 seconds

  function createAdHTML(ad) {
    return `<div class="demo-ad demo-ad--300x250 fade-in" id="ad-banner">
      <div class="demo-ad__label">AD</div>
      <div class="demo-ad__sponsored">SPONSORED</div>
      <div class="demo-ad__content">
        <div class="demo-ad__brand">${ad.brand}</div>
        <div class="demo-ad__tagline">${ad.tagline}</div>
        <button class="demo-ad__cta">${ad.cta}</button>
      </div>
    </div>`;
  }

  function rotateAds(isFirst) {
    const desktop = document.getElementById('sidebar-ads');
    const mobile  = document.getElementById('mobile-ads');
    const isMobile = window.innerWidth <= 1024;

    if (!desktop && !mobile) return;

    // Show initial ad without fade-out
    if (isFirst) {
      const html = createAdHTML(AD_DATA[0]);
      if (desktop) desktop.innerHTML = html;
      if (mobile) {
        mobile.style.display = isMobile ? 'block' : 'none';
        mobile.innerHTML = html;
      }
      return;
    }

    const els = document.querySelectorAll('#ad-banner');
    els.forEach(el => { el.classList.remove('fade-in'); el.classList.add('fade-out'); });

    setTimeout(() => {
      currentAdIndex = (currentAdIndex + 1) % AD_DATA.length;
      const html = createAdHTML(AD_DATA[currentAdIndex]);
      if (desktop) desktop.innerHTML = html;
      if (mobile) {
        mobile.style.display = isMobile ? 'block' : 'none';
        mobile.innerHTML = html;
      }
    }, 400);
  }

  document.addEventListener('DOMContentLoaded', () => {
    rotateAds(true); // Initial
    setInterval(() => rotateAds(false), ROTATE_INTERVAL);
    
    // Also re-check on resize
    window.addEventListener('resize', () => {
      const mobile = document.getElementById('mobile-ads');
      if (mobile) mobile.style.display = window.innerWidth <= 1024 ? 'block' : 'none';
    });
  });

})();
