document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const SUPABASE_URL = 'https://arwpuyiwuvfvlggrjmdp.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyd3B1eWl3dXZmdmxnZ3JqbWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NTM0MTQsImV4cCI6MjA2OTMyOTQxNH0.J495r3gLQbVPMDCKYZRNIiCwAOuoawIbzbH2mzG6_q0';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- DOM ELEMENTS ---
    const mainView = document.getElementById('main-view');
    const productPageView = document.getElementById('product-page-view');
    const searchInput = document.getElementById('home-search-input');
    const searchResultsContainer = document.getElementById('live-search-results');
    const sidePanel = document.getElementById('side-panel');
    const footer = document.getElementById('footer');

    // --- LOCAL DATA (IndexedDB) ---
    let db;
    const request = indexedDB.open("NascartUserDB_v3", 1);
    request.onupgradeneeded = e => { const dbInstance = e.target.result; if (!dbInstance.objectStoreNames.contains('viewHistory')) { dbInstance.createObjectStore("viewHistory", { keyPath: "id" }); }};
    request.onsuccess = e => { db = e.target.result; };
    function logViewedProduct(product) { if (db) { const tx = db.transaction("viewHistory", "readwrite"); tx.objectStore("viewHistory").put({ id: product.id, categoryId: product.category_id }); } }
    function getRecentCategories() { return new Promise((resolve) => { if (!db) { resolve([]); return; } const tx = db.transaction("viewHistory", "readonly"); const store = tx.objectStore("viewHistory"); const req = store.getAll(); req.onsuccess = () => resolve([...new Set(req.result.map(item => item.categoryId).filter(Boolean))].slice(-5)); req.onerror = () => resolve([]); }); }

    // --- UI FUNCTIONS ---
    const openNav = () => sidePanel.style.width = "280px";
    const closeNav = () => sidePanel.style.width = "0";
    const applyTheme = (theme) => { document.body.className = theme; localStorage.setItem('nascart-theme', theme); };
    window.changeMainImage = (thumb) => { document.getElementById('main-product-image').src = thumb.src; document.querySelectorAll('.thumbnails img').forEach(t => t.classList.remove('active')); thumb.classList.add('active'); };

    // --- ROUTING ---
    function handleRouteChange() {
        const hash = window.location.hash || '#home';
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        if (hash.startsWith('#/product/')) {
            const productId = hash.split('/')[2];
            if (productId) {
                loadProductPage(productId);
                productPageView.classList.add('active');
                footer.style.display = 'none';
                window.scrollTo(0, 0);
            }
        } else {
            // Only load content if the main view isn't already populated
            if (!mainView.classList.contains('content-loaded')) {
                loadHomepageContent();
            }
            mainView.classList.add('active');
            footer.style.display = 'block';
        }
    }

    // --- DATA FETCHING & RENDERING ---
    function createPlaceholders(count, type) { let placeholderHtml = ''; if (type === 'product') { for (let i = 0; i < count; i++) placeholderHtml += '<div class="skeleton skeleton-product"></div>'; return `<div class="placeholder product-grid-placeholder">${placeholderHtml}</div>`; } if (type === 'category') { for (let i = 0; i < 4; i++) placeholderHtml += '<div class="skeleton skeleton-category"></div>'; return `<div class="placeholder category-placeholder-list">${placeholderHtml}</div>`; } return ''; }
    
    async function loadHomepageContent() {
        mainView.classList.add('content-loaded');
        fetchBanners(); 
        fetchCategories(); 
        fetchHomepageProducts();
    }

    async function fetchBanners() { const container = document.getElementById('banner-container'); try { const { data, error } = await supabaseClient.from('banners').select('images, target_url').order('created_at', { ascending: false }); if (error) throw error; let allBannersHtml = ''; data.forEach(banner => { if (banner.images && banner.images.length > 0) { banner.images.forEach(imgUrl => { allBannersHtml += `<div class="banner-slide"><a href="${banner.target_url || '#'}" target="_blank"><img src="${imgUrl}" alt="Banner"></a></div>`; }); } }); container.innerHTML = `<div id="banner-slider" class="banner-slider"><div id="banner-wrapper" class="banner-wrapper">${allBannersHtml}</div></div>`; if (allBannersHtml) { document.getElementById('banner-slider').style.display = 'block'; initBannerSlider(document.getElementById('banner-wrapper').children.length); } } catch (e) { console.error('Error fetching banners:', e.message); container.innerHTML = ''; } }
    async function fetchCategories() { const container = document.getElementById('categories-container'); try { const { data, error } = await supabaseClient.from('categories').select('*').order('name'); if (error) throw error; container.innerHTML = `<h2>Categories</h2><div id="category-list" class="category-list">${data.map(cat => `<div class="category-item" onclick="location.hash='#/category/${cat.id}'"><img src="${cat.image_url}" alt="${cat.name}"><p>${cat.name}</p></div>`).join('')}</div>`; } catch (e) { console.error('Error fetching categories:', e.message); container.innerHTML = ''; } }
    async function fetchHomepageProducts() {
        const productContainer = document.getElementById('products-container');
        try {
            const { data: newest } = await supabaseClient.from('products').select('*').order('created_at', { ascending: false }).limit(10);
            const { data: trending } = await supabaseClient.from('products').select('*').order('view_count', { ascending: false }).neq('view_count', 0).limit(10);
            const recentCats = await getRecentCategories(); let personalized = [];
            if (recentCats.length > 0) { const { data } = await supabaseClient.from('products').select('*').in('category_id', recentCats).limit(10); if (data) personalized = data; }
            const uniqueProducts = Array.from(new Map([...(newest || []), ...(trending || []), ...personalized].map(p => [p.id, p])).values());
            productContainer.innerHTML = `<h2>Discover</h2><div class="product-grid" id="product-grid"></div>`;
            renderProductGrid(uniqueProducts, document.getElementById('product-grid'));
        } catch (e) { productContainer.innerHTML = '<h2>Discover</h2><p>Could not load products.</p>'; }
    }
    async function loadProductPage(id) { try { const { data, error } = await supabaseClient.from('products').select('*, categories(name)').eq('id', id).single(); if (error || !data) { window.location.hash = '#home'; return; } renderProductPage(data); fetchSuggestedProducts(data.category_id, data.id); logViewedProduct(data); supabaseClient.rpc('increment_view_count', { product_id_to_inc: id }).then(); } catch (e) { console.error(e); window.location.hash = '#home'; } }
    async function fetchSuggestedProducts(categoryId, currentProductId) { const suggestionsGrid = document.getElementById('suggestions-grid'); suggestionsGrid.innerHTML = createPlaceholders(4, 'product'); try { const { data } = await supabaseClient.from('products').select('*').eq('category_id', categoryId).neq('id', currentProductId).limit(6); if (data) renderProductGrid(data, suggestionsGrid); else suggestionsGrid.innerHTML = ''; } catch(e) { suggestionsGrid.innerHTML = ''; } }
    async function performLiveSearch(term) { if (term.length < 2) { searchResultsContainer.innerHTML = ''; return; } const { data } = await supabaseClient.from('products').select('id, name, images').ilike('name', `%${term}%`).limit(5); if (data) { searchResultsContainer.innerHTML = data.map(p => `<div class="search-result-item" onclick="location.hash='#/product/${p.id}'; searchResultsContainer.innerHTML='';"><img src="${p.images[0]}"><span>${p.name}</span></div>`).join(''); } }
    
    function renderProductGrid(products, container) { if (!products || products.length === 0) { container.innerHTML = '<p>No products found.</p>'; return; } container.innerHTML = products.map(p => { if (!p.images || p.images.length === 0) return ''; return `<div class="product-card" onclick="location.hash='#/product/${p.id}'"><div class="product-image-wrapper"><img src="${p.images[0]}" alt="${p.name}" loading="lazy"></div><div class="product-info"><p class="product-name">${p.name}</p><p class="product-description-home">${p.description || ''}</p><p class="product-price">₹${p.price}</p></div></div>`; }).join(''); }
    function renderProductPage(product) {
        document.getElementById('product-page-title').textContent = product.name;
        document.getElementById('product-page-price').textContent = `₹${product.price}`;
        document.getElementById('product-page-description').innerHTML = product.description ? product.description.replace(/\n/g, '<br>') : 'No description available.';
        document.getElementById('product-page-buy-btn').href = product.affiliate_link || '#';
        document.getElementById('main-product-image').src = product.images[0];
        document.getElementById('product-thumbnails').innerHTML = product.images.map((img, index) => `<img src="${img}" class="${index === 0 ? 'active' : ''}" onclick="changeMainImage(this)">`).join('');
        renderFakeReviews();
    }
    function renderFakeReviews() { const reviewsContainer = document.getElementById('fake-reviews-container'); const reviews = [{ name: "Aarav Sharma", rating: 5, comment: "Absolutely fantastic! The quality is top-notch and it looks even better in person." }, { name: "Diya Patel", rating: 4, comment: "Good value for money. It does the job well." }, { name: "Rohan Gupta", rating: 5, comment: "Super fast delivery and a great product. Very happy!" }]; reviewsContainer.innerHTML = reviews.map(r => `<div class="review-card"><div class="review-header"><strong>${r.name}</strong><span class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span></div><p>${r.comment}</p></div>`).join(''); }
    function initBannerSlider(slideCount) { if (slideCount <= 1) return; let currentSlide = 0; setInterval(() => { currentSlide = (currentSlide + 1) % slideCount; document.getElementById('banner-wrapper').style.transform = `translateX(-${currentSlide * 100}%)`; }, 4000); }
    
    function setupEventListeners() {
        document.getElementById('menu-btn').addEventListener('click', openNav);
        document.getElementById('close-btn').addEventListener('click', closeNav);
        
        const themeToggle = document.getElementById('theme-toggle');
        themeToggle.checked = localStorage.getItem('nascart-theme') === 'dark';
        themeToggle.addEventListener('change', () => {
            applyTheme(themeToggle.checked ? 'dark' : 'light');
        });

        document.getElementById('clear-data-btn').addEventListener('click', (e) => { e.preventDefault(); if (db && confirm('Are you sure you want to clear your personalized recommendations and browsing history?')) { try { db.transaction("viewHistory", "readwrite").objectStore("viewHistory").clear(); alert("Browsing data has been cleared."); } catch (err) { alert("Could not clear data."); } } });
        
        let searchTimeout; 
        searchInput.addEventListener('input', () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => performLiveSearch(searchInput.value), 300); });
        document.addEventListener('click', (e) => { if (e.target.id !== 'home-search-input') searchResultsContainer.innerHTML = ''; });
    }

    window.addEventListener('hashchange', handleRouteChange);
    applyTheme(localStorage.getItem('nascart-theme') || 'light');
    setupEventListeners();
    handleRouteChange();
    if (window.location.hash === '' || window.location.hash === '#home') {
        loadHomepageContent();
    }
});
