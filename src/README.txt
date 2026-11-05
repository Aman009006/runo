RUNO storefront patch (mock data)

Files:
- App.js: new route switch; / is storefront, /product/:id is product detail, /cash is the existing POS app.
- CashApp.jsx: your existing App.js renamed without changing its contents.
- Storefront.jsx + Storefront.css: shop homepage, search, categories, hits, category banner, infinite loading and cart drawer.
- ProductPage.jsx: separate product details page with recommendations.
- ProductCard.jsx: reusable product card.
- mockProducts.js: mock product/category data.

Install steps:
1. Rename the current POS src/App.js to src/CashApp.jsx (keep its contents unchanged).
2. Copy the other files into the same src folder.
3. Replace src/App.js with the App.js from this patch.
4. Ensure lucide-react is already installed (the current app uses it).
5. In package.json set "homepage": "/" (or remove homepage if it was set to "/cash"; CRA public URL must be root for storefront assets).
6. Build and deploy the build folder to /var/www/runo.kg/html.
7. Configure Nginx SPA fallback for /, /product/... and /cash so those paths serve index.html. The existing POS is rendered at /cash by React.

Note: this patch uses only mock data. Checkout is a demo alert; it does not create real orders or connect to MoySklad.
