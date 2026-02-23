import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5050";

function getInitialFilters() {
  const params = new URLSearchParams(window.location.search);
  return {
    query: params.get("query") || "",
    category: params.get("category") || "",
    minPrice: params.get("minPrice") || "",
    maxPrice: params.get("maxPrice") || "",
    sort: params.get("sort") || "newest",
    page: Math.max(1, Number.parseInt(params.get("page") || "1", 10))
  };
}

function toCurrency(priceCents, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(priceCents / 100);
}

function buildSearchParams(filters) {
  const params = new URLSearchParams();
  if (filters.query) params.set("query", filters.query);
  if (filters.category) params.set("category", filters.category);
  if (filters.minPrice) params.set("minPrice", filters.minPrice);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params;
}

function App() {
  const [filters, setFilters] = useState(getInitialFilters);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const queryString = useMemo(() => buildSearchParams(filters).toString(), [filters]);

  useEffect(() => {
    const onPopState = () => {
      setFilters(getInitialFilters());
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const nextUrl = queryString ? `?${queryString}` : window.location.pathname;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (nextUrl !== currentUrl) {
      window.history.pushState({}, "", nextUrl);
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError("");

    fetch(`${API_BASE_URL}/api/products?${queryString}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || "Unable to load products");
        }
        return response.json();
      })
      .then((payload) => {
        setProducts(payload.items || []);
        setPagination(payload.pagination || { page: 1, totalPages: 1, total: 0 });
      })
      .catch((fetchError) => {
        if (fetchError.name !== "AbortError") {
          setError(fetchError.message);
          setProducts([]);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [queryString]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/products/categories`)
      .then((response) => response.json())
      .then((payload) => {
        setCategories(payload.items || []);
      })
      .catch(() => {
        setCategories([]);
      });
  }, []);

  function updateFilters(patch, resetPage = true) {
    setFilters((current) => ({
      ...current,
      ...patch,
      page: resetPage ? 1 : patch.page ?? current.page
    }));
  }

  function goToPage(page) {
    updateFilters({ page }, false);
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">MVP catalog experience</p>
        <h1>Find products fast and share exact search results by URL</h1>
        <p>
          Search, filter by category and price, and sort by price or newest items. This page maps directly to
          REQ-CAT and REQ-SRCH requirements.
        </p>
      </header>

      <section className="toolbar" aria-label="Catalog filters">
        <label>
          Search
          <input
            type="search"
            placeholder="Try: backpack"
            value={filters.query}
            onChange={(event) => updateFilters({ query: event.target.value })}
          />
        </label>

        <label>
          Category
          <select value={filters.category} onChange={(event) => updateFilters({ category: event.target.value })}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label>
          Min price ($)
          <input
            type="number"
            min="0"
            value={filters.minPrice}
            onChange={(event) => updateFilters({ minPrice: event.target.value })}
          />
        </label>

        <label>
          Max price ($)
          <input
            type="number"
            min="0"
            value={filters.maxPrice}
            onChange={(event) => updateFilters({ maxPrice: event.target.value })}
          />
        </label>

        <label>
          Sort
          <select value={filters.sort} onChange={(event) => updateFilters({ sort: event.target.value })}>
            <option value="newest">Newest</option>
            <option value="price_asc">Price low to high</option>
            <option value="price_desc">Price high to low</option>
          </select>
        </label>
      </section>

      <section className="results" aria-live="polite">
        {isLoading && <p className="state state-loading">Loading products...</p>}
        {!isLoading && error && <p className="state state-error">{error}</p>}
        {!isLoading && !error && products.length === 0 && <p className="state">No products found.</p>}

        {!isLoading && !error && products.length > 0 && (
          <>
            <p className="result-count">{pagination.total} items found</p>
            <div className="product-grid">
              {products.map((product) => (
                <article className="product-card" key={product.id}>
                  <img src={product.images?.[0]?.url} alt={product.images?.[0]?.alt || product.name} loading="lazy" />
                  <div>
                    <p className="product-category">{product.category}</p>
                    <h2>{product.name}</h2>
                    <p className="product-description">{product.description}</p>
                    <p className="product-price">{toCurrency(product.priceCents, product.currency)}</p>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <nav className="pagination" aria-label="Catalog pagination">
        <button type="button" onClick={() => goToPage(Math.max(1, filters.page - 1))} disabled={filters.page <= 1}>
          Previous
        </button>
        <span>
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <button
          type="button"
          onClick={() => goToPage(Math.min(pagination.totalPages, filters.page + 1))}
          disabled={filters.page >= pagination.totalPages}
        >
          Next
        </button>
      </nav>
    </main>
  );
}

export default App;
