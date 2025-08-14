document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const SUPABASE_URL = 'https://arwpuyiwuvfvlggrjmdp.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyd3B1eWl3dXZmdmxnZ3JqbWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NTM0MTQsImV4cCI6MjA2OTMyOTQxNH0.J495r3gLQbVPMDCKYZRNIiCwAOuoawIbzbH2mzG6_q0';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- DOM ELEMENTS ---
    const mainView = document.getElementById('main-view');
    const productPageView = document.getElementById('product-page-view');
    const categoryPageView = document.getElementById('category-page-view');
    const searchInput = document.getElementById('home-search-input');
    const searchResultsContainer = document.getElementById('live-search-results');
    const sidePanel = document.getElementById('side-panel');
    const footer = document.getElementById('footer');
    const menuBtn = document.getElementById('menu-btn');
    const backBtn = document.getElementById('back-btn');

    // --- LANGUAGE DICTIONARY ---
    const translations = {
        en: { settings: 'Settings', darkMode: 'Dark Mode', language: 'Language', todaysDeals: "Today's Deals", searchPlaceholder: 'Search for anything...', categories: 'Categories', forYou: 'Specials For You', reviews: 'Reviews & Ratings', suggestions: 'You might also like', buyNow: 'Buy Now', about: 'About Nascart', aboutText: 'Your smart shopping assistant, bringing you handpicked collections and unbeatable deals from top online stores.', otherPlatforms: 'Other Platforms', poweredBy: 'Powered by', privacyPolicy: 'Privacy Policy', lastUpdated: 'Last updated:', privacyIntro: 'Welcome to Nascart. We are committed to protecting your privacy. This Privacy Policy explains how we handle your information when you use our application.', privacyL1: '1. Information We Collect (Locally)', privacyP1: "Nascart is designed with your privacy in mind. We do not collect or store any of your personal data on our servers. All data collection happens and stays on your own device in your browser's IndexedDB. We have no access to this information.", privacyL2: '2. How We Use Information', privacyP2: 'The locally stored data is used exclusively to enhance your user experience by tailoring content and product recommendations to your interests.', privacyL3: '3. Third-Party Links & Affiliates', privacyP3: 'Nascart is an affiliate marketing application. When you click on a "Buy Now" link, you will be redirected to a third-party e-commerce website (e.g., Amazon, Flipkart). This Privacy Policy does not apply to these external sites.' },
        hi: { settings: 'सेटिंग्स', darkMode: 'डार्क मोड', language: 'भाषा', todaysDeals: 'आज के सौदे', searchPlaceholder: 'कुछ भी खोजें...', categories: 'श्रेणियाँ', forYou: 'आपके लिए कुछ खास', reviews: 'समीक्षा और रेटिंग', suggestions: 'आपको यह भी पसंद आ सकता है', buyNow: 'अभी खरीदें', about: 'Nascart के बारे में', aboutText: 'आपका स्मार्ट शॉपिंग सहायक, जो आपको शीर्ष ऑनलाइन स्टोर से चुनिंदा संग्रह और शानदार डील प्रदान करता है।', otherPlatforms: 'अन्य प्लेटफॉर्म', poweredBy: 'द्वारा संचालित', privacyPolicy: 'गोपनीयता नीति', lastUpdated: 'अंतिम अपडेट:', privacyIntro: 'Nascart में आपका स्वागत है। हम आपकी गोपनीयता की रक्षा के लिए प्रतिबद्ध हैं...', privacyL1: '1. हम कौन सी जानकारी एकत्र करते हैं (स्थानीय रूप से)', privacyP1: 'Nascart को आपकी गोपनीयता को ध्यान में रखकर बनाया गया है...', privacyL2: '2. हम जानकारी का उपयोग कैसे करते हैं', privacyP2: 'स्थानीय रूप से संग्रहीत डेटा का उपयोग विशेष रूप से आपके उपयोगकर्ता अनुभव को बढ़ाने के लिए किया जाता है...', privacyL3: '3. तृतीय-पक्ष लिंक और सहयोगी', privacyP3: 'Nascart एक एफिलिएट मार्केटिंग एप्लिकेशन है...' }
    };
    
    let db;
    const request = indexedDB.open("NascartUserDB_v3", 1);
    request.onupgradeneeded = e => { const dbInstance = e.target.result; if (!dbInstance.objectStoreNames.contains('viewHistory')) { dbInstance.createObjectStore("viewHistory", { keyPath: "id" }); }};
    request.onsuccess = e => { db = e.target.result; };
    const logViewedProduct = (product) => { if (db) { const tx = db.transaction("viewHistory", "readwrite"); tx.objectStore("viewHistory").put({ id: product.id, categoryId: product.category_id }); } };
    const getRecentCategories = () => new Promise((resolve) => { if (!db) { resolve([]); return; } const tx = db.transaction("viewHistory", "readonly"); const store = tx.objectStore("viewHistory"); const req = store.getAll(); req.onsuccess = () => resolve([...new Set(req.result.map(item => item.categoryId).filter(Boolean))].slice(-5)); req.onerror = () => resolve([]); });

    const openNav = () => sidePanel.style.width = "280px";
    const closeNav = () => sidePanel.style.width = "0";
    const applyTheme = (theme) => { document.body.className = theme; localStorage.setItem('nascart-theme', theme); };
    const formatPrice = (price) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(price);
    
    function setLanguage(lang) {
        localStorage.setItem('nascart-lang', lang);
        document.querySelectorAll('[data-lang-key]').forEach(el => {
            const key = el.getAttribute('data-lang-key');
            if (translations[lang] && translations[lang][key]) {
                el.textContent = translations[lang][key];
            }
        });
        document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
            const key = el.getAttribute('data-lang-placeholder');
            if (translations[lang] && translations[lang][key]) {
                el.placeholder = translations[lang][key];
            }
        });
    }

    function handleRouteChange() {
        const hash = window.location.hash || '#home';
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        if (hash.startsWith('#/product/')) {
            const productId = hash.split('/')[2];
            loadProductPage(productId);
            productPageView.classList.add('active');
            footer.style.display = 'none';
            menuBtn.style.display = 'none';
            backBtn.style.display = 'block';
        } else if (hash.startsWith('#/category/')) {
            const categoryId = hash.split('/')[2];
            loadCategoryPage(categoryId);
            categoryPageView.classList.add('active');
            footer.style.display = 'none';
            menuBtn.style.display = 'none';
            backBtn.style.display = 'block';
        } else {
            mainView.classList.add('active');
            footer.style.display = 'block';
            menuBtn.style.display = 'block';
            backBtn.style.display = 'none';
        }
    }

    const createPlaceholders = (count, type) => { let html = ''; if (type === 'product') { for (let i = 0; i < count; i++) html += '<div class="skeleton skeleton-product"></div>'; return `<div class="placeholder product-grid-placeholder">${html}</div>`; } if (type === 'category') { for (let i = 0; i < 4; i++) html += '<div class="skeleton skeleton-category"></div>'; return `<div class="placeholder category-placeholder-list">${html}</div>`; } return ''; }
    
    async function loadHomepageContent() {
        const lang = localStorage.getItem('nascart-lang') || 'en';
        document.getElementById('banner-container').innerHTML = '<div class="placeholder"><div class="skeleton-banner skeleton"></div></div>';
        document.getElementById('categories-container').innerHTML = `<h2 data-lang-key="categories">${translations[lang]['categories']}</h2>` + createPlaceholders(4, 'category');
        document.getElementById('products-container').innerHTML = `<h2 data-lang-key="forYou">${translations[lang]['forYou']}</h2>` + createPlaceholders(8, 'product');
        await Promise.all([fetchBanners(), fetchCategories(), fetchHomepageProducts()]);
    }
    
    async function fetchBanners() { const container = document.getElementById('banner-container'); try { const { data, error } = await supabaseClient.from('banners').select('images, target_url').order('created_at', { ascending: false }); if (error) throw error; let allBannersHtml = ''; data.forEach(banner => { if (banner.images && banner.images.length > 0) { banner.images.forEach(imgUrl => { allBannersHtml += `<div class="banner-slide"><a href="${banner.target_url || '#'}" target="_blank"><img src="${imgUrl}" alt="Banner"></a></div>`; }); } }); container.innerHTML = `<div id="banner-slider" class="banner-slider"><div id="banner-wrapper" class="banner-wrapper">${allBannersHtml}</div></div>`; if (allBannersHtml) { document.getElementById('banner-slider').style.display = 'block'; initBannerSlider(document.getElementById('banner-wrapper').children.length); } } catch (e) { console.error('Error fetching banners:', e.message); container.innerHTML = ''; } }
    async function fetchCategories() { const container = document.getElementById('categories-container'); try { const { data, error } = await supabaseClient.from('categories').select('*').order('name'); if (error) throw error; const lang = localStorage.getItem('nascart-lang') || 'en'; container.innerHTML = `<h2 data-lang-key="categories">${translations[lang]['categories']}</h2><div id="category-list" class="category-list">${data.map(cat => `<div class="category-item" onclick="location.hash='#/category/${cat.id}'"><img src="${cat.image_url}" alt="${cat.name}"><p>${cat.name}</p></div>`).join('')}</div>`; } catch (e) { console.error('Error fetching categories:', e.message); container.innerHTML = ''; } }
    async function fetchHomepageProducts() {
        const productContainer = document.getElementById('products-container');
        try {
            const { data: newest } = await supabaseClient.from('products').select('*').order('created_at', { ascending: false }).limit(10);
            const { data: trending } = await supabaseClient.from('products').select('*').order('view_count', { ascending: false }).neq('view_count', 0).limit(10);
            const recentCats = await getRecentCategories(); let personalized = [];
            if (recentCats.length > 0) { const { data } = await supabaseClient.from('products').select('*').in('category_id', recentCats).limit(10); if (data) personalized = data; }
            const uniqueProducts = Array.from(new Map([...(newest || []), ...(trending || []), ...personalized].map(p => [p.id, p])).values());
            const lang = localStorage.getItem('nascart-lang') || 'en';
            productContainer.innerHTML = `<h2 data-lang-key="forYou">${translations[lang]['forYou']}</h2><div class="product-grid" id="product-grid"></div>`;
            renderProductGrid(uniqueProducts, document.getElementById('product-grid'));
        } catch (e) { productContainer.innerHTML = `<h2>Discover</h2><p>Could not load products: ${e.message}</p>`; }
    }
    async function loadCategoryPage(categoryId) {
        const grid = document.getElementById('category-product-grid');
        const title = document.getElementById('category-page-title');
        grid.innerHTML = createPlaceholders(8, 'product'); title.textContent = 'Loading...';
        try {
            const { data: categoryData, error: catError } = await supabaseClient.from('categories').select('name').eq('id', categoryId).single();
            if(catError) throw catError;
            title.textContent = `Products in ${categoryData.name}`;
            const { data: productsData, error: prodError } = await supabaseClient.from('products').select('*').eq('category_id', categoryId);
            if(prodError) throw prodError;
            renderProductGrid(productsData, grid);
        } catch(e) { title.textContent = 'Error'; grid.innerHTML = '<p>Could not load products for this category.</p>'; }
    }
    async function loadProductPage(id) { try { const { data, error } = await supabaseClient.from('products').select('*, categories(name)').eq('id', id).single(); if (error || !data) { window.location.hash = '#home'; return; } renderProductPage(data); fetchSuggestedProducts(data.category_id, data.id); logViewedProduct(data); supabaseClient.rpc('increment_view_count', { product_id_to_inc: id }); } catch (e) { console.error(e); window.location.hash = '#home'; } }
    async function fetchSuggestedProducts(categoryId, currentProductId) { const suggestionsGrid = document.getElementById('suggestions-grid'); suggestionsGrid.innerHTML = createPlaceholders(4, 'product'); try { const { data } = await supabaseClient.from('products').select('*').eq('category_id', categoryId).neq('id', currentProductId).limit(6); if (data) renderProductGrid(data, suggestionsGrid); else suggestionsGrid.innerHTML = ''; } catch(e) { suggestionsGrid.innerHTML = ''; } }
    async function performLiveSearch(term) { if (term.length < 2) { searchResultsContainer.innerHTML = ''; return; } const { data } = await supabaseClient.from('products').select('id, name, images').ilike('name', `%${term}%`).limit(5); if (data) { searchResultsContainer.innerHTML = data.map(p => `<div class="search-result-item" onclick="location.hash='#/product/${p.id}'; searchResultsContainer.innerHTML=''; searchInput.value='';"><img src="${p.images[0]}" alt="${p.name}"><span>${p.name}</span></div>`).join(''); } }
    
    function renderProductGrid(products, container) { if (!products || products.length === 0) { container.innerHTML = '<p>No products found.</p>'; return; } container.innerHTML = products.map(p => { if (!p.images || p.images.length === 0) return ''; return `<div class="product-card" onclick="location.hash='#/product/${p.id}'"><div class="product-image-wrapper"><img src="${p.images[0]}" alt="${p.name}" loading="lazy"></div><div class="product-info"><p class="product-name">${p.name}</p><p class="product-price">${formatPrice(p.price)}</p></div></div>`; }).join(''); }
    function renderProductPage(product) {
        document.getElementById('product-page-title').textContent = product.name;
        document.getElementById('product-page-price').textContent = formatPrice(product.price);
        document.getElementById('product-page-description').innerHTML = product.description ? product.description.replace(/\n/g, '<br>') : 'No description available.';
        document.getElementById('product-page-buy-btn').href = product.affiliate_link || '#';
        const sliderWrapper = document.getElementById('image-slider-wrapper');
        sliderWrapper.innerHTML = product.images.map(img => `<div class="slider-image-container"><img src="${img}" alt="${product.name}" class="slider-image"></div>`).join('');
        document.getElementById('product-thumbnails').innerHTML = product.images.map((img, index) => `<img src="${img}" alt="Thumbnail ${index+1}" class="${index === 0 ? 'active' : ''}" onclick="updateSliderFromThumbnail(${index})">`).join('');
        setupImageSliderAndZoom();
        renderFakeReviews();
    }
    function renderFakeReviews() { const reviewsContainer = document.getElementById('fake-reviews-container'); const reviews = [{ name: "Aarav Sharma", rating: 5, comment: "Absolutely fantastic! The quality is top-notch." }, { name: "Diya Patel", rating: 4, comment: "Good value for money. It does the job well." }, { name: "Rohan Gupta", rating: 5, comment: "Super fast delivery and a great product!" }]; reviewsContainer.innerHTML = reviews.map(r => `<div class="review-card"><div class="review-header"><strong>${r.name}</strong><span class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span></div><p>${r.comment}</p></div>`).join(''); }
    function initBannerSlider(slideCount) { if (slideCount <= 1) return; let currentSlide = 0; setInterval(() => { currentSlide = (currentSlide + 1) % slideCount; document.getElementById('banner-wrapper').style.transform = `translateX(-${currentSlide * 100}%)`; }, 4000); }
    
    function setupImageSliderAndZoom() {
        const wrapper = document.getElementById('image-slider-wrapper');
        const slides = wrapper.querySelectorAll('.slider-image-container');
        const prevBtn = document.getElementById('prev-image-btn');
        const nextBtn = document.getElementById('next-image-btn');
        let currentIndex = 0;

        const goToSlide = (index) => {
            wrapper.style.transform = `translateX(-${index * 100}%)`;
            document.querySelectorAll('.thumbnails img').forEach((t, i) => t.classList.toggle('active', i === index));
            currentIndex = index;
        };

        prevBtn.onclick = () => goToSlide(currentIndex > 0 ? currentIndex - 1 : slides.length - 1);
        nextBtn.onclick = () => goToSlide(currentIndex < slides.length - 1 ? currentIndex + 1 : 0);

        window.updateSliderFromThumbnail = (index) => goToSlide(index);
        
        slides.forEach(slide => {
            const img = slide.querySelector('.slider-image');
            let scale = 1, panning = false, pointX = 0, pointY = 0, start = { x: 0, y: 0 };
            const setTransform = () => { img.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`; }
            img.addEventListener('mousedown', e => { if (scale > 1) { e.preventDefault(); panning = true; start = { x: e.clientX - pointX, y: e.clientY - pointY }; } });
            img.addEventListener('mouseup', () => { panning = false; });
            img.addEventListener('mousemove', e => { if (!panning) return; e.preventDefault(); pointX = (e.clientX - start.x); pointY = (e.clientY - start.y); setTransform(); });
            img.addEventListener('wheel', e => { e.preventDefault(); const xs = (e.clientX - img.offsetLeft - pointX) / scale, ys = (e.clientY - img.offsetTop - pointY) / scale; const delta = -e.deltaY; (delta > 0) ? (scale *= 1.2) : (scale /= 1.2); scale = Math.min(Math.max(1, scale), 4); pointX = e.clientX - img.offsetLeft - xs * scale; pointY = e.clientY - img.offsetTop - ys * scale; if (scale === 1) { pointX = 0; pointY = 0; } setTransform(); });
            img.addEventListener('dblclick', () => { scale = scale > 1 ? 1 : 2; pointX = 0; pointY = 0; setTransform(); });
        });
    }

    function setupEventListeners() {
        menuBtn.addEventListener('click', openNav);
        backBtn.addEventListener('click', () => window.history.back());
        document.getElementById('close-btn').addEventListener('click', closeNav);
        const themeToggle = document.getElementById('theme-toggle');
        themeToggle.checked = localStorage.getItem('nascart-theme') === 'dark';
        themeToggle.addEventListener('change', () => applyTheme(themeToggle.checked ? 'dark' : 'light'));
        document.getElementById('language-selector').addEventListener('change', (e) => setLanguage(e.target.value));
        let searchTimeout; searchInput.addEventListener('input', () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => performLiveSearch(searchInput.value), 300); });
        document.addEventListener('click', (e) => { if (e.target.id !== 'home-search-input') searchResultsContainer.innerHTML = ''; });
    }

    window.addEventListener('hashchange', handleRouteChange);
    const savedTheme = localStorage.getItem('nascart-theme') || 'light';
    const savedLang = localStorage.getItem('nascart-lang') || 'en';
    document.getElementById('language-selector').value = savedLang;
    applyTheme(savedTheme);
    setLanguage(savedLang);
    setupEventListeners();
    handleRouteChange();
    if (window.location.hash === '' || window.location.hash === '#home') {
        loadHomepageContent();
    }
});
