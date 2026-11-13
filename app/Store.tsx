"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Heart,
  Leaf,
  Loader2,
  Minus,
  Package,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Trash2,
  Truck,
  X,
  LayoutGrid,
  Download,
  RotateCcw,
  Pencil,
  Box,
  CircleHelp,
} from "lucide-react";
import {
  money,
  type Product,
  type CartItem,
  type Order,
  type Transaction,
} from "./types";
type View = "Shop" | "Orders" | "Transactions" | "Manage catalog";
const date = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const defaultProduct = {
  name: "",
  category: "Decor",
  description: "",
  price: 0,
  stock: 0,
  image: "/images/vase.jpg",
  variants: ["Default"],
  attributes: {},
  badge: "",
  active: 1,
} as Product;
async function api(body?: unknown) {
  const response = await fetch("/api/store", {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json()) as {
    error?: string;
    products: Product[];
    orders: Order[];
    transactions: Transaction[];
    order: Order;
  };
  if (!response.ok)
    throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

function Modal({
  title,
  children,
  onClose,
  wide = false,
  drawer = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  drawer?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = setTimeout(
      () =>
        ref.current
          ?.querySelector<HTMLElement>("button,input,select,textarea,a")
          ?.focus(),
      0,
    );
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const els = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),select,textarea,a[href],[tabindex="0"]',
          ) || [],
        ).filter((el) => el.getClientRects().length);
        const first = els[0],
          last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className={"overlay " + (drawer ? "drawer-overlay" : "")}
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={"modal " + (wide ? "wide " : "") + (drawer ? "drawer" : "")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button
            className="icon-btn"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export default function Store() {
  const [products, setProducts] = useState<Product[]>([]),
    [orders, setOrders] = useState<Order[]>([]),
    [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [view, setView] = useState<View>("Shop"),
    [category, setCategory] = useState("All products"),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("featured");
  const [cart, setCart] = useState<CartItem[]>([]),
    [saved, setSaved] = useState<string[]>([]),
    [ready, setReady] = useState(false),
    [onlySaved, setOnlySaved] = useState(false),
    [showCart, setShowCart] = useState(false),
    [checkout, setCheckout] = useState(false),
    [filters, setFilters] = useState(false),
    [inStock, setInStock] = useState(false),
    [maxPrice, setMaxPrice] = useState(""),
    [detail, setDetail] = useState<Product | null>(null),
    [variant, setVariant] = useState(""),
    [edit, setEdit] = useState<Product | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [success, setSuccess] = useState<Order | null>(null),
    [orderDetail, setOrderDetail] = useState<Order | null>(null),
    [statusFilter, setStatusFilter] = useState("All"),
    [about, setAbout] = useState(false);
  const checkoutKey = useRef("");
  const reload = async () => {
    const d = await api();
    setProducts(d.products);
    setOrders(d.orders);
    setTransactions(d.transactions);
    setError("");
  };
  useEffect(() => {
    reload()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    try {
      const c = JSON.parse(localStorage.getItem("forma-bag") || "[]");
      const s = JSON.parse(localStorage.getItem("forma-saved") || "[]");
      if (Array.isArray(c))
        setCart(
          c.filter(
            (i) =>
              i &&
              typeof i.id === "string" &&
              typeof i.variant === "string" &&
              Number.isInteger(i.quantity) &&
              i.quantity > 0,
          ),
        );
      if (Array.isArray(s)) setSaved(s.filter((i) => typeof i === "string"));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem("forma-bag", JSON.stringify(cart));
        localStorage.setItem("forma-saved", JSON.stringify(saved));
      } catch {}
    }
  }, [cart, saved, ready]);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 4200);
      return () => clearTimeout(t);
    }
  }, [notice]);
  const categories = [
    "All products",
    ...new Set(products.filter((p) => p.active).map((p) => p.category)),
  ];
  const visible = useMemo(() => {
    const list = products.filter(
      (p) =>
        p.active &&
        (category === "All products" || p.category === category) &&
        (!onlySaved || saved.includes(p.id)) &&
        (!inStock || p.stock > 0) &&
        (!maxPrice || p.price <= Number(maxPrice) * 100) &&
        `${p.name} ${p.category} ${p.description} ${Object.values(p.attributes).join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
    return list.sort((a, b) =>
      sort === "price-asc"
        ? a.price - b.price
        : sort === "price-desc"
          ? b.price - a.price
          : sort === "newest"
            ? b.created.localeCompare(a.created)
            : a.name === "The Sunday Lounge Chair"
              ? -1
              : b.name === "The Sunday Lounge Chair"
                ? 1
                : 0,
    );
  }, [products, category, onlySaved, saved, inStock, maxPrice, query, sort]);
  const bag = cart.map((i) => ({
    ...i,
    product: products.find((p) => p.id === i.id),
  }));
  const subtotal = bag.reduce(
      (s, i) => s + (i.product?.price || 0) * i.quantity,
      0,
    ),
    shipping = subtotal >= 500000 ? 0 : 19900,
    count = cart.reduce((s, i) => s + i.quantity, 0);
  function navigate(v: View) {
    setView(v);
    setQuery("");
    setStatusFilter("All");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function add(p: Product, v = p.variants[0]) {
    const quantity = cart
      .filter((i) => i.id === p.id)
      .reduce((s, i) => s + i.quantity, 0);
    if (quantity >= p.stock) {
      setNotice("You have added all available stock.");
      return;
    }
    setCart((c) => {
      const found = c.find((i) => i.id === p.id && i.variant === v);
      return found
        ? c.map((i) => (i === found ? { ...i, quantity: i.quantity + 1 } : i))
        : [...c, { id: p.id, variant: v, quantity: 1 }];
    });
    setNotice(`${p.name} added to your bag`);
  }
  function changeQuantity(index: number, delta: number) {
    const i = bag[index];
    if (
      delta > 0 &&
      cart.filter((x) => x.id === i.id).reduce((s, x) => s + x.quantity, 0) >=
        (i.product?.stock || 0)
    ) {
      setNotice("No more stock available.");
      return;
    }
    setCart((c) =>
      c
        .map((x, n) =>
          n === index ? { ...x, quantity: x.quantity + delta } : x,
        )
        .filter((x) => x.quantity > 0),
    );
  }
  function toggleSaved(id: string) {
    setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  async function changeStatus(o: Order, status: string) {
    setBusy(true);
    try {
      await api({ action: "status", id: o.id, status });
      await reload();
      setOrderDetail(null);
      setNotice(`Order ${status.toLowerCase()}.`);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function placeOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const d = await api({
        action: "checkout",
        key: checkoutKey.current,
        items: cart,
        customer: f.get("customer"),
        email: f.get("email"),
        address: [
          f.get("address"),
          f.get("city"),
          f.get("state"),
          f.get("postal"),
          "India",
        ].join(", "),
        method: f.get("method"),
      });
      setSuccess(d.order);
      setCart([]);
      setCheckout(false);
      setShowCart(false);
      await reload();
    } catch (e) {
      setNotice((e as Error).message);
      await reload().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const attributes: Record<string, string> = {};
      String(f.get("attributes"))
        .split("\n")
        .filter((x) => x.trim())
        .forEach((line) => {
          const i = line.indexOf(":");
          if (i < 1) throw new Error("Write each attribute as Name: Value.");
          attributes[line.slice(0, i).trim()] = line.slice(i + 1).trim();
        });
      await api({
        action: "product",
        product: {
          ...edit,
          name: f.get("name"),
          category: f.get("category"),
          description: f.get("description"),
          price: Math.round(Number(f.get("price")) * 100),
          stock: Number(f.get("stock")),
          image: f.get("image"),
          variants: String(f.get("variants"))
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
          attributes,
          badge: f.get("badge"),
          active: f.get("active") ? 1 : 0,
        },
      });
      await reload();
      setEdit(null);
      setNotice("Product saved to your catalog.");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function exportTransactions() {
    const fields = [
      "Transaction ID",
      "Order ID",
      "Amount (INR)",
      "Method",
      "Status",
      "Date",
    ];
    const rows = transactions.map((t) => [
      t.id,
      t.order_id,
      t.amount / 100,
      t.method,
      t.status,
      t.created,
    ]);
    const csv = [fields, ...rows]
      .map((r) =>
        r.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "forma-transactions.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const transactionStatus = (s: string) =>
    s === "Simulated" || s === "Collected"
      ? "green"
      : s === "Pending"
        ? "amber"
        : "gray";
  return (
    <>
      <div className="announcement">
        <span>Good things, thoughtfully made.</span>
        <span>
          Complimentary shipping on orders over ₹5,000 <ArrowRight size={13} />
        </span>
        <span className="announcement-end">Made for everyday living</span>
      </div>
      <header className="header">
        <button
          className="wordmark"
          onClick={() => navigate("Shop")}
          aria-label="Forma home"
        >
          forma<span>®</span>
        </button>
        <nav aria-label="Main navigation">
          {(["Shop", "Orders", "Transactions"] as View[]).map((v) => (
            <button
              key={v}
              className={view === v ? "nav-active" : ""}
              onClick={() => navigate(v)}
            >
              {v}
            </button>
          ))}
          <button
            className={view === "Manage catalog" ? "nav-active" : ""}
            onClick={() => navigate("Manage catalog")}
          >
            Manage catalog <ArrowUpRight size={13} />
          </button>
        </nav>
        <div className="header-actions">
          <button
            className="icon-btn search-shortcut"
            aria-label="Search products"
            onClick={() => {
              navigate("Shop");
              setTimeout(
                () =>
                  document
                    .querySelector<HTMLInputElement>("#product-search")
                    ?.focus(),
                50,
              );
            }}
          >
            <Search size={20} />
          </button>
          <button
            className={"icon-btn " + (onlySaved ? "selected" : "")}
            aria-label="Saved products"
            onClick={() => {
              navigate("Shop");
              setOnlySaved(!onlySaved);
            }}
          >
            <Heart size={20} fill={onlySaved ? "currentColor" : "none"} />
            {saved.length > 0 && <i className="dot" />}
          </button>
          <span className="header-divider" />
          <button className="bag-button" onClick={() => setShowCart(true)}>
            <ShoppingBag size={19} />
            <span>Bag</span>
            <b>{count}</b>
          </button>
        </div>
      </header>
      <main>
        {view === "Shop" ? (
          <>
            <section className="hero">
              <div className="hero-copy">
                <div className="eyebrow">
                  <span className="small-line" /> THE CONSIDERED COLLECTION
                </div>
                <h1>
                  Less ordinary.
                  <br />
                  More <em>you.</em>
                </h1>
                <p>
                  Thoughtful pieces for the spaces you live in.
                  <br className="desktop-break" /> Designed to feel good. Made
                  to stay.
                </p>
                <button
                  className="primary"
                  onClick={() =>
                    document
                      .getElementById("collection")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Explore the collection <ArrowUpRight size={18} />
                </button>
                <div className="hero-note">
                  <span className="tiny-avatars">
                    <img src="/images/chair.jpg" alt="" />
                    <img src="/images/vase.jpg" alt="" />
                    <img src="/images/linen.jpg" alt="" />
                  </span>
                  <span>A little intention. A lot of possibility.</span>
                </div>
              </div>
              <div className="hero-image">
                <img
                  src="/images/hero.jpg"
                  alt="Warm, sunlit living room with natural textures and thoughtfully chosen furniture"
                  fetchPriority="high"
                />
                <div className="image-caption">
                  <span>THE ART OF EVERYDAY LIVING</span>
                  <button
                    onClick={() => {
                      setCategory("Furniture");
                      document
                        .getElementById("collection")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    aria-label="Explore furniture"
                  >
                    <ArrowUpRight size={21} />
                  </button>
                </div>
                <span className="image-index">01 — 04</span>
              </div>
            </section>
            <div className="benefits">
              <span>
                <Truck /> Thoughtfully delivered
              </span>
              <span>
                <Leaf /> Materials that matter
              </span>
              <span>
                <ShieldCheck /> A secure, simple checkout
              </span>
              <span>
                <RotateCcw /> Easy to love. Easy to return.
              </span>
            </div>
            <section id="collection" className="collection">
              <div className="section-intro">
                <div>
                  <div className="eyebrow muted">
                    FIND YOUR EVERYDAY FAVOURITES
                  </div>
                  <h2>
                    {onlySaved
                      ? "Your saved pieces"
                      : "Good things for your space"}
                    <span className="serif-dot">.</span>
                  </h2>
                  <p>
                    {onlySaved
                      ? "Keep the pieces you love close."
                      : "A considered edit of objects that make everyday a little better."}
                  </p>
                </div>
                <span className="collection-note">
                  Thoughtfully chosen.
                  <br />
                  Never too much.
                </span>
              </div>
              <div className="catalog-toolbar">
                <div className="category-tabs" aria-label="Product categories">
                  {categories.map((c) => (
                    <button
                      key={c}
                      className={c === category ? "active" : ""}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <button
                  className={
                    "filter-button " +
                    (filters || inStock || maxPrice ? "active" : "")
                  }
                  onClick={() => setFilters(!filters)}
                >
                  <SlidersHorizontal size={16} /> Filters{" "}
                  {(inStock || maxPrice) && <span className="filter-dot" />}
                </button>
              </div>
              {filters && (
                <div className="filter-panel">
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={inStock}
                      onChange={(e) => setInStock(e.target.checked)}
                    />{" "}
                    In stock only
                  </label>
                  <label>
                    Maximum price (₹)
                    <input
                      type="number"
                      min="0"
                      placeholder="No maximum"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                    />
                  </label>
                  <button
                    className="text-button"
                    onClick={() => {
                      setInStock(false);
                      setMaxPrice("");
                      setOnlySaved(false);
                      setCategory("All products");
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
              <div className="results-toolbar">
                <span>
                  {loading
                    ? "Gathering good things…"
                    : `${visible.length} thoughtfully chosen pieces`}
                  {onlySaved && (
                    <button
                      className="text-button"
                      onClick={() => setOnlySaved(false)}
                    >
                      {" "}
                      · Show all
                    </button>
                  )}
                </span>
                <div className="search-sort">
                  <label className="search-input">
                    <Search size={16} />
                    <input
                      id="product-search"
                      aria-label="Search products"
                      placeholder="Find something you love"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                      <button
                        aria-label="Clear search"
                        className="icon-btn"
                        onClick={() => setQuery("")}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </label>
                  <label className="sort-label">
                    Sort by:{" "}
                    <select
                      aria-label="Sort products"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="featured">Featured</option>
                      <option value="price-asc">Price: low to high</option>
                      <option value="price-desc">Price: high to low</option>
                      <option value="newest">Newest</option>
                    </select>
                  </label>
                </div>
              </div>
              {error ? (
                <div className="empty">
                  <CircleHelp size={34} />
                  <h3>Your store is almost ready</h3>
                  <p>{error}</p>
                  {/sign in/i.test(error) ? (
                    <a
                      className="primary"
                      href="/signin-with-chatgpt?return_to=/"
                      target="_top"
                    >
                      Sign in with ChatGPT <ArrowRight size={17} />
                    </a>
                  ) : (
                    <button
                      className="primary"
                      onClick={() => {
                        setLoading(true);
                        reload()
                          .catch((e) => setError(e.message))
                          .finally(() => setLoading(false));
                      }}
                    >
                      Try again
                    </button>
                  )}
                </div>
              ) : loading ? (
                <div className="product-grid">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div className="skeleton" key={i} />
                  ))}
                </div>
              ) : visible.length ? (
                <div className="product-grid">
                  {visible.map((p) => (
                    <article className="product-card" key={p.id}>
                      <div className="product-image">
                        <button
                          className="product-open"
                          onClick={() => {
                            setDetail(p);
                            setVariant(p.variants[0]);
                          }}
                          aria-label={`View ${p.name}`}
                        >
                          <img
                            src={p.image}
                            alt={p.name}
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.src = "/images/vase.jpg";
                            }}
                          />
                        </button>
                        {p.badge && (
                          <span
                            className={
                              "product-badge " +
                              (p.badge === "New arrival" ? "new" : "")
                            }
                          >
                            {p.badge}
                          </span>
                        )}
                        <button
                          className={
                            "save-product " +
                            (saved.includes(p.id) ? "is-saved" : "")
                          }
                          aria-label={`${saved.includes(p.id) ? "Unsave" : "Save"} ${p.name}`}
                          onClick={() => toggleSaved(p.id)}
                        >
                          <Heart
                            size={17}
                            fill={
                              saved.includes(p.id) ? "currentColor" : "none"
                            }
                          />
                        </button>
                        <button
                          className="quick-add"
                          disabled={!p.stock}
                          onClick={() => add(p)}
                        >
                          {p.stock ? (
                            <>
                              <Plus size={16} /> Add to bag
                            </>
                          ) : (
                            "Out of stock"
                          )}
                        </button>
                      </div>
                      <div className="product-meta">
                        <span>{p.category}</span>
                        <span>
                          {p.variants.length}{" "}
                          {p.variants.length === 1 ? "finish" : "finishes"}
                        </span>
                      </div>
                      <div className="product-title">
                        <button
                          onClick={() => {
                            setDetail(p);
                            setVariant(p.variants[0]);
                          }}
                        >
                          {p.name}
                        </button>
                        <span>{money(p.price)}</span>
                      </div>
                      <div
                        className="product-colors"
                        aria-label={`Available in ${p.variants.join(", ")}`}
                      >
                        {p.variants.slice(0, 4).map((v, i) => (
                          <span
                            key={v}
                            style={{
                              background: [
                                "#c5baa7",
                                "#7c8674",
                                "#b28b73",
                                "#e6dfd4",
                              ][i],
                            }}
                            title={v}
                          />
                        ))}
                        {p.stock < 10 && (
                          <small>
                            {p.stock ? `Only ${p.stock} left` : "Sold out"}
                          </small>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <Search size={32} />
                  <h3>A little more exploring?</h3>
                  <p>No pieces match these filters. Try a different search.</p>
                  <button
                    className="secondary"
                    onClick={() => {
                      setQuery("");
                      setCategory("All products");
                      setMaxPrice("");
                      setInStock(false);
                      setOnlySaved(false);
                    }}
                  >
                    Reset filters
                  </button>
                </div>
              )}
            </section>
            <section className="closing-banner">
              <span className="leaf-mark">
                <Leaf size={27} />
              </span>
              <div>
                <div className="eyebrow">FEWER, BETTER THINGS</div>
                <h2>Make room for what matters.</h2>
              </div>
              <p>
                Useful. Beautiful. A little unexpected.
                <br />
                That's the Forma way.
              </p>
              <button
                className="round-arrow"
                aria-label="About Forma"
                onClick={() => setAbout(true)}
              >
                <ArrowUpRight size={23} />
              </button>
            </section>
          </>
        ) : (
          <section className="workspace">
            <div className="workspace-title">
              <div>
                <div className="eyebrow muted">YOUR FORMA WORKSPACE</div>
                <h1>
                  {view === "Orders"
                    ? "Every order, in view."
                    : view === "Transactions"
                      ? "The details, accounted for."
                      : "A catalog that grows with you."}
                </h1>
                <p>
                  {view === "Orders"
                    ? "Track fulfilment, view order details, and keep things moving."
                    : view === "Transactions"
                      ? "A clear record of demo payments and cash on delivery."
                      : "Add new pieces, create categories, and make every detail your own."}
                </p>
              </div>
              {view === "Manage catalog" ? (
                <button
                  className="primary"
                  onClick={() => setEdit({ ...defaultProduct })}
                >
                  <Plus size={17} /> Add product
                </button>
              ) : view === "Transactions" ? (
                <button
                  className="secondary"
                  disabled={!transactions.length}
                  onClick={exportTransactions}
                >
                  <Download size={17} /> Export CSV
                </button>
              ) : (
                <button className="secondary" onClick={() => navigate("Shop")}>
                  Continue shopping <ArrowRight size={17} />
                </button>
              )}
            </div>
            {error && (
              <div className="error-banner">
                {error}{" "}
                <a href="/signin-with-chatgpt?return_to=/" target="_top">
                  Sign in
                </a>
              </div>
            )}
            <div className="stat-grid">
              {(view === "Orders"
                ? [
                    ["Total orders", orders.length],
                    [
                      "In progress",
                      orders.filter((o) =>
                        ["Processing", "Shipped"].includes(o.status),
                      ).length,
                    ],
                    [
                      "Delivered",
                      orders.filter((o) => o.status === "Delivered").length,
                    ],
                    [
                      "Order value",
                      money(
                        orders
                          .filter((o) => o.status !== "Cancelled")
                          .reduce((s, o) => s + o.total, 0),
                      ),
                    ],
                  ]
                : view === "Transactions"
                  ? [
                      [
                        "Demo payment value",
                        money(
                          transactions
                            .filter((t) => t.status === "Simulated")
                            .reduce((s, t) => s + t.amount, 0),
                        ),
                      ],
                      [
                        "Cash collected",
                        money(
                          transactions
                            .filter((t) => t.status === "Collected")
                            .reduce((s, t) => s + t.amount, 0),
                        ),
                      ],
                      [
                        "Awaiting cash",
                        money(
                          transactions
                            .filter((t) => t.status === "Pending")
                            .reduce((s, t) => s + t.amount, 0),
                        ),
                      ],
                      ["Transactions", transactions.length],
                    ]
                  : [
                      [
                        "Active products",
                        products.filter((p) => p.active).length,
                      ],
                      [
                        "Categories",
                        new Set(
                          products
                            .filter((p) => p.active)
                            .map((p) => p.category),
                        ).size,
                      ],
                      [
                        "Units in stock",
                        products
                          .filter((p) => p.active)
                          .reduce((s, p) => s + p.stock, 0),
                      ],
                      [
                        "Low stock",
                        products.filter((p) => p.active && p.stock < 10).length,
                      ],
                    ]
              ).map(([label, value]) => (
                <div className="stat" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="workspace-toolbar">
              <label className="search-input">
                <Search size={17} />
                <input
                  aria-label={`Search ${view}`}
                  placeholder={
                    view === "Manage catalog"
                      ? "Search name or category…"
                      : "Search ID, customer, or status…"
                  }
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              {view !== "Manage catalog" && (
                <select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  {(view === "Orders"
                    ? ["All", "Processing", "Shipped", "Delivered", "Cancelled"]
                    : [
                        "All",
                        "Simulated",
                        "Pending",
                        "Collected",
                        "Demo refunded",
                        "Cancelled",
                      ]
                  ).map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              )}
              <button
                className="icon-btn"
                aria-label="Refresh records"
                onClick={() =>
                  reload()
                    .then(() => setNotice("Records refreshed."))
                    .catch((e) => setNotice(e.message))
                }
              >
                <RotateCcw size={17} />
              </button>
            </div>
            {loading ? (
              <div className="empty">
                <Loader2 className="spin" /> Loading your workspace…
              </div>
            ) : view === "Orders" ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Total</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {orders
                      .filter(
                        (o) =>
                          (statusFilter === "All" ||
                            o.status === statusFilter) &&
                          `${o.id} ${o.customer} ${o.email} ${o.status}`
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                      )
                      .map((o) => (
                        <tr key={o.id}>
                          <td>
                            <b>{o.id}</b>
                            <small>
                              {o.items.reduce((s, i) => s + i.quantity, 0)}{" "}
                              items
                            </small>
                          </td>
                          <td>
                            {o.customer}
                            <small>{o.email}</small>
                          </td>
                          <td>{date(o.created)}</td>
                          <td>{money(o.total)}</td>
                          <td>{o.method}</td>
                          <td>
                            <span
                              className={
                                "status " +
                                (o.status === "Cancelled"
                                  ? "gray"
                                  : o.status === "Processing"
                                    ? "amber"
                                    : "green")
                              }
                            >
                              {o.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="text-button"
                              onClick={() => setOrderDetail(o)}
                            >
                              View <ArrowUpRight size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!orders.filter(
                  (o) =>
                    (statusFilter === "All" || o.status === statusFilter) &&
                    `${o.id} ${o.customer} ${o.email} ${o.status}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                ).length && (
                  <div className="empty">
                    <Package size={35} />
                    <h3>
                      {orders.length
                        ? "No matching orders"
                        : "Your first order starts here"}
                    </h3>
                    <p>
                      {orders.length
                        ? "Try another search or status."
                        : "Find a favourite and checkout to see it here."}
                    </p>
                    <button
                      className="secondary"
                      onClick={() => navigate("Shop")}
                    >
                      Explore the collection <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            ) : view === "Transactions" ? (
              <>
                <div className="info-note">
                  <ShieldCheck size={18} />
                  <span>
                    Demo payments are simulations. No money is charged. Cash on
                    delivery is marked collected when an order is delivered.
                  </span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Transaction</th>
                        <th>Order reference</th>
                        <th>Date</th>
                        <th>Method</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions
                        .filter(
                          (t) =>
                            (statusFilter === "All" ||
                              t.status === statusFilter) &&
                            `${t.id} ${t.order_id} ${t.method} ${t.status}`
                              .toLowerCase()
                              .includes(query.toLowerCase()),
                        )
                        .map((t) => (
                          <tr key={t.id}>
                            <td>
                              <b>{t.id}</b>
                            </td>
                            <td>
                              <button
                                className="text-button"
                                onClick={() =>
                                  setOrderDetail(
                                    orders.find((o) => o.id === t.order_id) ||
                                      null,
                                  )
                                }
                              >
                                {t.order_id}
                              </button>
                            </td>
                            <td>{date(t.created)}</td>
                            <td>{t.method}</td>
                            <td>{money(t.amount)}</td>
                            <td>
                              <span
                                className={
                                  "status " + transactionStatus(t.status)
                                }
                              >
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {!transactions.filter(
                    (t) =>
                      (statusFilter === "All" || t.status === statusFilter) &&
                      `${t.id} ${t.order_id} ${t.method} ${t.status}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                  ).length && (
                    <div className="empty">
                      <CreditCard size={35} />
                      <h3>No transactions to show</h3>
                      <p>Transaction records appear here after checkout.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Variants</th>
                      <th>Visibility</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {products
                      .filter((p) =>
                        `${p.name} ${p.category}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((p) => (
                        <tr key={p.id}>
                          <td>
                            <div className="table-product">
                              <img src={p.image} alt="" />
                              <b>{p.name}</b>
                            </div>
                          </td>
                          <td>{p.category}</td>
                          <td>{money(p.price)}</td>
                          <td>
                            <span className={p.stock < 10 ? "stock-low" : ""}>
                              {p.stock} units
                            </span>
                          </td>
                          <td>{p.variants.length}</td>
                          <td>
                            <span
                              className={
                                "status " + (p.active ? "green" : "gray")
                              }
                            >
                              {p.active ? "Active" : "Archived"}
                            </span>
                          </td>
                          <td>
                            <button
                              className="text-button"
                              onClick={() => setEdit(p)}
                            >
                              <Pencil size={14} /> Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!products.filter((p) =>
                  `${p.name} ${p.category}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                ).length && (
                  <div className="empty">
                    <Box size={35} />
                    <h3>No products found</h3>
                    <p>Try a different search, or add a new product.</p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </main>
      <footer>
        <div>
          <button className="wordmark" onClick={() => navigate("Shop")}>
            forma<span>®</span>
          </button>
          <p>Everyday, considered.</p>
        </div>
        <span>Objects for living. Room for you.</span>
        <div className="footer-links">
          <button onClick={() => setAbout(true)}>
            Our philosophy <ArrowUpRight size={13} />
          </button>
          <button onClick={() => navigate("Orders")}>
            Your orders <ArrowUpRight size={13} />
          </button>
          <small>© {new Date().getFullYear()} Forma</small>
        </div>
      </footer>
      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          <span>{notice}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {detail && (
        <Modal title="A closer look" onClose={() => setDetail(null)} wide>
          <div className="detail-grid">
            <img
              className="detail-image"
              src={detail.image}
              alt={detail.name}
            />
            <div className="detail-copy">
              <div className="eyebrow muted">{detail.category}</div>
              <h2>{detail.name}</h2>
              <strong className="detail-price">{money(detail.price)}</strong>
              <p>{detail.description}</p>
              <label className="field-label">Choose a finish</label>
              <div className="variant-options">
                {detail.variants.map((v) => (
                  <button
                    className={variant === v ? "active" : ""}
                    key={v}
                    onClick={() => setVariant(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <span className="availability">
                <i />
                {detail.stock
                  ? `${detail.stock} available, ready for your space`
                  : "Currently out of stock"}
              </span>
              <button
                className="primary full"
                disabled={!detail.stock}
                onClick={() => add(detail, variant)}
              >
                <ShoppingBag size={18} />{" "}
                {detail.stock ? "Add to bag" : "Out of stock"}{" "}
                <span>{money(detail.price)}</span>
              </button>
              <dl className="specs">
                {Object.entries(detail.attributes).map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Modal>
      )}
      {showCart && (
        <Modal
          title={`Your bag (${count})`}
          onClose={() => setShowCart(false)}
          drawer
        >
          {cart.length ? (
            <>
              <div className="shipping-note">
                <Truck size={19} />
                {subtotal >= 500000
                  ? "Lovely. Your order ships on us."
                  : `You’re ${money(500000 - subtotal)} away from complimentary shipping.`}
              </div>
              <div className="bag-items">
                {bag.map((i, index) => (
                  <div
                    className="bag-item"
                    key={JSON.stringify([i.id, i.variant])}
                  >
                    <img
                      src={i.product?.image || "/images/vase.jpg"}
                      alt={i.product?.name || "Unavailable product"}
                    />
                    <div>
                      <b>{i.product?.name || "Unavailable product"}</b>
                      <small>{i.variant}</small>
                      <span>{money(i.product?.price || 0)}</span>
                      <div className="quantity">
                        <button
                          aria-label={`Decrease ${i.product?.name} quantity`}
                          onClick={() => changeQuantity(index, -1)}
                        >
                          <Minus size={13} />
                        </button>
                        <span>{i.quantity}</span>
                        <button
                          aria-label={`Increase ${i.product?.name} quantity`}
                          onClick={() => changeQuantity(index, 1)}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      {(!i.product?.active ||
                        !i.product.variants.includes(i.variant) ||
                        cart
                          .filter((x) => x.id === i.id)
                          .reduce((s, x) => s + x.quantity, 0) >
                          i.product.stock) && (
                        <small className="stock-low">
                          Update or remove this item before checkout.
                        </small>
                      )}
                    </div>
                    <button
                      className="icon-btn"
                      aria-label={`Remove ${i.product?.name}`}
                      onClick={() =>
                        setCart((c) => c.filter((_, n) => n !== index))
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="bag-bottom">
                <div className="total-line">
                  <span>Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>
                <div className="total-line">
                  <span>Delivery</span>
                  <span>{shipping ? money(shipping) : "On us"}</span>
                </div>
                <div className="total-line grand">
                  <span>Total</span>
                  <strong>{money(subtotal + shipping)}</strong>
                </div>
                <button
                  className="primary full"
                  disabled={bag.some(
                    (i) =>
                      !i.product?.active ||
                      !i.product.variants.includes(i.variant) ||
                      cart
                        .filter((x) => x.id === i.id)
                        .reduce((s, x) => s + x.quantity, 0) > i.product.stock,
                  )}
                  onClick={() => {
                    checkoutKey.current = crypto.randomUUID();
                    setShowCart(false);
                    setCheckout(true);
                  }}
                >
                  Continue to checkout <ArrowRight size={18} />
                </button>
                <p className="secure-note">
                  <ShieldCheck size={14} /> Demo payments & cash on delivery
                </p>
              </div>
            </>
          ) : (
            <div className="empty">
              <ShoppingBag size={40} />
              <h3>A little room for something good.</h3>
              <p>Your bag is waiting for its first favourite.</p>
              <button
                className="primary"
                onClick={() => {
                  setShowCart(false);
                  navigate("Shop");
                }}
              >
                Explore the collection <ArrowRight size={16} />
              </button>
            </div>
          )}
        </Modal>
      )}
      {checkout && (
        <Modal
          title="A few details, then it’s yours."
          onClose={() => {
            if (!busy) setCheckout(false);
          }}
          wide
        >
          <form className="checkout-grid" onSubmit={placeOrder}>
            <div>
              <div className="form-section-title">
                <span>01</span> Delivery details
              </div>
              <div className="form-grid">
                <label>
                  Full name
                  <input
                    name="customer"
                    autoComplete="name"
                    required
                    maxLength={100}
                    placeholder="Your full name"
                  />
                </label>
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={180}
                    placeholder="you@example.com"
                  />
                </label>
                <label className="span-2">
                  Street address
                  <input
                    name="address"
                    autoComplete="street-address"
                    required
                    maxLength={400}
                    placeholder="House, street, and area"
                  />
                </label>
                <label>
                  City
                  <input
                    name="city"
                    autoComplete="address-level2"
                    required
                    maxLength={100}
                    placeholder="City"
                  />
                </label>
                <label>
                  State
                  <input
                    name="state"
                    autoComplete="address-level1"
                    required
                    maxLength={100}
                    placeholder="State"
                  />
                </label>
                <label>
                  PIN code
                  <input
                    name="postal"
                    autoComplete="postal-code"
                    required
                    pattern="[1-9][0-9]{5}"
                    maxLength={6}
                    inputMode="numeric"
                    placeholder="6-digit PIN"
                  />
                </label>
                <label>
                  Country
                  <input value="India" readOnly />
                </label>
              </div>
              <div className="form-section-title">
                <span>02</span> Payment method
              </div>
              <label className="payment-option">
                <input
                  type="radio"
                  name="method"
                  value="Demo payment"
                  defaultChecked
                />
                <CreditCard size={21} />
                <span>
                  <b>Demo payment</b>
                  <small>Simulate a successful payment. No card needed.</small>
                </span>
              </label>
              <label className="payment-option">
                <input type="radio" name="method" value="Cash on delivery" />
                <Truck size={21} />
                <span>
                  <b>Cash on delivery</b>
                  <small>Pay when your order arrives.</small>
                </span>
              </label>
            </div>
            <aside className="checkout-summary">
              <h3>Your good things</h3>
              {bag.map((i) => (
                <div
                  className="summary-item"
                  key={JSON.stringify([i.id, i.variant])}
                >
                  <img src={i.product?.image} alt="" />
                  <span>
                    {i.product?.name}
                    <small>
                      {i.variant} · Qty {i.quantity}
                    </small>
                  </span>
                  <b>{money((i.product?.price || 0) * i.quantity)}</b>
                </div>
              ))}
              <div className="total-line">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <div className="total-line">
                <span>Shipping</span>
                <span>{shipping ? money(shipping) : "Complimentary"}</span>
              </div>
              <div className="total-line grand">
                <span>Total</span>
                <strong>{money(subtotal + shipping)}</strong>
              </div>
              <button className="primary full" type="submit" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 size={18} className="spin" /> Placing order…
                  </>
                ) : (
                  <>
                    Place order <ArrowRight size={18} />
                  </>
                )}
              </button>
              <p className="secure-note">
                <ShieldCheck size={15} /> This store uses demo payments. No real
                money is charged online.
              </p>
            </aside>
          </form>
        </Modal>
      )}
      {success && (
        <Modal
          title="Good things are on their way."
          onClose={() => setSuccess(null)}
        >
          <div className="success-content">
            <div className="success-icon">
              <Check size={32} />
            </div>
            <div className="eyebrow muted">
              THANK YOU, {success.customer.split(" ")[0]}
            </div>
            <h2>
              Your space is about
              <br />
              to feel a little more you.
            </h2>
            <p>
              Order <b>{success.id}</b> is confirmed.
              <br />
              {success.method === "Demo payment"
                ? "Your payment was simulated. No money was charged."
                : "Payment is due on delivery."}
            </p>
            <div className="success-total">
              <span>Order total</span>
              <strong>{money(success.total)}</strong>
            </div>
            <button
              className="primary full"
              onClick={() => {
                setSuccess(null);
                navigate("Orders");
              }}
            >
              Track your order <ArrowRight size={18} />
            </button>
          </div>
        </Modal>
      )}
      {orderDetail && (
        <Modal
          title={`Order ${orderDetail.id}`}
          onClose={() => setOrderDetail(null)}
        >
          <div className="order-detail">
            <div className="order-detail-top">
              <span>{date(orderDetail.created)}</span>
              <span
                className={
                  "status " +
                  (orderDetail.status === "Cancelled" ? "gray" : "green")
                }
              >
                {orderDetail.status}
              </span>
            </div>
            {orderDetail.status !== "Cancelled" && (
              <div className="order-progress">
                {["Processing", "Shipped", "Delivered"].map((s, i) => (
                  <div
                    key={s}
                    className={
                      i <=
                      ["Processing", "Shipped", "Delivered"].indexOf(
                        orderDetail.status,
                      )
                        ? "done"
                        : ""
                    }
                  >
                    <span>
                      <Check size={13} />
                    </span>
                    {s}
                  </div>
                ))}
              </div>
            )}
            <h4>Delivery to</h4>
            <p>
              {orderDetail.customer}
              <br />
              {orderDetail.email}
              <br />
              {orderDetail.address}
            </p>
            {orderDetail.items.map((i, index) => (
              <div className="summary-item" key={index}>
                <img src={i.image} alt="" />
                <span>
                  {i.name}
                  <small>
                    {i.variant} · Qty {i.quantity}
                  </small>
                </span>
                <b>{money(i.price * i.quantity)}</b>
              </div>
            ))}
            <div className="total-line">
              <span>Subtotal</span>
              <span>{money(orderDetail.subtotal)}</span>
            </div>
            <div className="total-line">
              <span>Shipping</span>
              <span>
                {orderDetail.shipping
                  ? money(orderDetail.shipping)
                  : "Complimentary"}
              </span>
            </div>
            <div className="total-line grand">
              <span>Total</span>
              <strong>{money(orderDetail.total)}</strong>
            </div>
            <p className="payment-record">
              {orderDetail.method} ·{" "}
              {transactions.find((t) => t.order_id === orderDetail.id)?.status}
            </p>
            {orderDetail.status === "Processing" && (
              <div className="order-actions">
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => changeStatus(orderDetail, "Cancelled")}
                >
                  Cancel order
                </button>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => changeStatus(orderDetail, "Shipped")}
                >
                  Mark as shipped <Truck size={17} />
                </button>
              </div>
            )}
            {orderDetail.status === "Shipped" && (
              <button
                className="primary full"
                disabled={busy}
                onClick={() => changeStatus(orderDetail, "Delivered")}
              >
                Mark as delivered <CheckCircle2 size={17} />
              </button>
            )}
          </div>
        </Modal>
      )}
      {edit && (
        <Modal
          title={edit.id ? "Edit your piece" : "Add something good"}
          onClose={() => {
            if (!busy) setEdit(null);
          }}
          wide
        >
          <form className="product-form" onSubmit={saveProduct}>
            <div className="form-grid">
              <label>
                Product name
                <input
                  name="name"
                  defaultValue={edit.name}
                  required
                  maxLength={120}
                  placeholder="Give your product a name"
                />
              </label>
              <label>
                Category
                <input
                  name="category"
                  list="categories"
                  defaultValue={edit.category}
                  required
                  maxLength={60}
                />
                <datalist id="categories">
                  {categories.slice(1).map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
              <label className="span-2">
                Description
                <textarea
                  name="description"
                  defaultValue={edit.description}
                  required
                  maxLength={2000}
                  rows={3}
                  placeholder="What makes this piece special?"
                />
              </label>
              <label>
                Price (₹)
                <input
                  name="price"
                  type="number"
                  defaultValue={edit.price / 100 || ""}
                  min="1"
                  max="1000000"
                  step="0.01"
                  required
                />
              </label>
              <label>
                Stock quantity
                <input
                  name="stock"
                  type="number"
                  defaultValue={edit.stock}
                  min="0"
                  max="100000"
                  step="1"
                  required
                />
              </label>
              <label className="span-2">
                Image URL
                <input
                  name="image"
                  defaultValue={edit.image}
                  required
                  maxLength={1500}
                  placeholder="https://…"
                />
                <small>
                  Use an HTTPS image URL or an existing /images/ asset.
                </small>
              </label>
              <label className="span-2">
                Variants / finishes
                <input
                  name="variants"
                  defaultValue={edit.variants.join(", ")}
                  required
                  maxLength={1500}
                  placeholder="Natural oak, Walnut, Black"
                />
                <small>
                  Separate options with commas. Stock is shared across finishes.
                </small>
              </label>
              <label>
                Product label
                <input
                  name="badge"
                  defaultValue={edit.badge}
                  maxLength={50}
                  placeholder="e.g. New arrival"
                />
              </label>
              <label className="check-label visibility-label">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={!!edit.active}
                />{" "}
                Visible in the shop
              </label>
              <label className="span-2">
                Custom attributes
                <textarea
                  name="attributes"
                  defaultValue={Object.entries(edit.attributes)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join("\n")}
                  rows={4}
                  placeholder={
                    "Material: Solid oak\nDimensions: 40 × 40 cm\nCare: Wipe clean"
                  }
                />
                <small>
                  One attribute per line, written as Name: Value. Add any
                  details your catalog needs.
                </small>
              </label>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setEdit(null)}
              >
                Cancel
              </button>
              <button className="primary" disabled={busy} type="submit">
                {busy ? (
                  <Loader2 className="spin" size={17} />
                ) : (
                  <Check size={17} />
                )}{" "}
                Save product
              </button>
            </div>
          </form>
        </Modal>
      )}
      {about && (
        <Modal title="Everyday, considered." onClose={() => setAbout(false)}>
          <div className="about-content">
            <Leaf size={33} />
            <h2>
              Less noise.
              <br />
              More living.
            </h2>
            <p>
              Forma is a small collection of things that earn their place in
              your home. Useful shapes, tactile materials, and warm, quiet
              colours.
            </p>
            <p>
              This is your working demo store. Make it your own in Manage
              catalog: add products, define categories and finishes, and keep
              track of stock. Every checkout creates an order and a transaction
              record.
            </p>
            <p>
              Shipping is ₹199, or complimentary for orders of ₹5,000 and above.
              Payments are simulated, or recorded as cash on delivery. Order
              fulfilment is managed from your Orders workspace.
            </p>
            <button
              className="primary"
              onClick={() => {
                setAbout(false);
                navigate("Manage catalog");
              }}
            >
              Make it your own <ArrowUpRight size={17} />
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
