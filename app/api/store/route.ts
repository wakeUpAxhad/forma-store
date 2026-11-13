import { env } from "cloudflare:workers";
import { seedProducts } from "../../seed";
export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const decode = (p: any) => ({
  ...p,
  variants: JSON.parse(p.variants),
  attributes: JSON.parse(p.attributes),
});
const decodeOrder = (p: any) => ({ ...p, items: JSON.parse(p.items) });
function context(req: Request) {
  const owner = req.headers.get("oai-authenticated-user-id");
  if (!owner) throw new Error("AUTH");
  if (!env.DB) throw new Error("Database unavailable");
  return { owner, db: env.DB };
}
function failure(e: unknown) {
  const m = e instanceof Error ? e.message : "Request failed";
  if (m === "AUTH")
    return json({ error: "Please sign in to use your store." }, 401);
  console.error(m);
  return json(
    {
      error: /CHECK constraint/.test(m)
        ? "Stock changed. Refresh your bag and try again."
        : /UNIQUE constraint/.test(m)
          ? "This request was already processed. Refresh to see your order."
          : m,
    },
    400,
  );
}
function str(v: unknown, max = 500) {
  if (typeof v !== "string" || !v.trim() || v.length > max)
    throw new Error("Please complete all required fields.");
  return v.trim();
}
export async function GET(req: Request) {
  try {
    const { db, owner } = context(req);
    const exists = await db
      .prepare("SELECT id FROM products WHERE owner=? LIMIT 1")
      .bind(owner)
      .first();
    if (!exists) {
      await db.batch(
        seedProducts.map((p) =>
          db
            .prepare(
              "INSERT OR IGNORE INTO products (id,owner,name,category,description,price,stock,image,variants,attributes,badge,active,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?)",
            )
            .bind(
              `${owner}:${p.id}`,
              owner,
              p.name,
              p.category,
              p.description,
              p.price,
              p.stock,
              p.image,
              JSON.stringify(p.variants),
              JSON.stringify(p.attributes),
              p.badge,
              new Date().toISOString(),
            ),
        ),
      );
    }
    const [ps, os, ts] = await Promise.all([
      db
        .prepare("SELECT * FROM products WHERE owner=? ORDER BY created,id")
        .bind(owner)
        .all(),
      db
        .prepare("SELECT * FROM orders WHERE owner=? ORDER BY created DESC")
        .bind(owner)
        .all(),
      db
        .prepare(
          "SELECT * FROM transactions WHERE owner=? ORDER BY created DESC",
        )
        .bind(owner)
        .all(),
    ]);
    return json({
      products: ps.results.map(decode),
      orders: os.results.map(decodeOrder),
      transactions: ts.results,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    const { db, owner } = context(req);
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin)
      throw new Error("Invalid request origin");
    const b: any = await req.json();
    if (b.action === "product") {
      const p = b.product;
      const name = str(p.name, 120),
        category = str(p.category, 60),
        description = str(p.description, 2000);
      if (
        !Number.isSafeInteger(p.price) ||
        p.price < 100 ||
        p.price > 100000000 ||
        !Number.isSafeInteger(p.stock) ||
        p.stock < 0 ||
        p.stock > 100000
      )
        throw new Error("Enter a valid price and stock quantity.");
      const image = str(p.image, 1500);
      if (!image.startsWith("/images/") && !/^https:\/\//i.test(image))
        throw new Error("Use an HTTPS image URL.");
      if (
        !Array.isArray(p.variants) ||
        p.variants.length < 1 ||
        p.variants.length > 30 ||
        p.variants.some(
          (v: unknown) =>
            typeof v !== "string" || !v.trim() || (v as string).length > 80,
        )
      )
        throw new Error("Add between 1 and 30 valid variants.");
      if (
        !p.attributes ||
        Array.isArray(p.attributes) ||
        typeof p.attributes !== "object" ||
        Object.keys(p.attributes).length > 30 ||
        Object.entries(p.attributes).some(
          ([k, v]) => k.length > 80 || typeof v !== "string" || v.length > 300,
        )
      )
        throw new Error("Invalid product attributes.");
      const id = p.id || crypto.randomUUID();
      if (
        p.id &&
        !(await db
          .prepare("SELECT id FROM products WHERE id=? AND owner=?")
          .bind(id, owner)
          .first())
      )
        throw new Error("Product not found.");
      await db
        .prepare(
          "INSERT INTO products (id,owner,name,category,description,price,stock,image,variants,attributes,badge,active,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category,description=excluded.description,price=excluded.price,stock=excluded.stock,image=excluded.image,variants=excluded.variants,attributes=excluded.attributes,badge=excluded.badge,active=excluded.active WHERE products.owner=excluded.owner",
        )
        .bind(
          id,
          owner,
          name,
          category,
          description,
          p.price,
          p.stock,
          image,
          JSON.stringify([...new Set(p.variants)]),
          JSON.stringify(p.attributes),
          String(p.badge || "").slice(0, 50),
          p.active === 0 ? 0 : 1,
          new Date().toISOString(),
        )
        .run();
      return json({ ok: true });
    }
    if (b.action === "checkout") {
      const key = str(b.key, 100);
      const previous = await db
        .prepare("SELECT * FROM orders WHERE owner=? AND request_key=?")
        .bind(owner, key)
        .first();
      if (previous) return json({ order: decodeOrder(previous) });
      if (!Array.isArray(b.items) || !b.items.length || b.items.length > 50)
        throw new Error("Add products to your bag.");
      const customer = str(b.customer, 100),
        email = str(b.email, 180),
        address = str(b.address, 1000);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error("Enter a valid email address.");
      if (!["Demo payment", "Cash on delivery"].includes(b.method))
        throw new Error("Choose a payment method.");
      const combined = new Map<string, any>();
      for (const i of b.items) {
        if (
          !Number.isSafeInteger(i.quantity) ||
          i.quantity < 1 ||
          i.quantity > 100 ||
          typeof i.id !== "string" ||
          typeof i.variant !== "string"
        )
          throw new Error("Invalid bag quantity.");
        const k = JSON.stringify([i.id, i.variant]);
        const prev = combined.get(k);
        combined.set(k, { ...i, quantity: i.quantity + (prev?.quantity || 0) });
      }
      const items = [];
      const quantities = new Map<string, number>();
      let subtotal = 0;
      for (const i of combined.values()) {
        const p: any = await db
          .prepare("SELECT * FROM products WHERE id=? AND owner=? AND active=1")
          .bind(i.id, owner)
          .first();
        if (!p || !JSON.parse(p.variants).includes(i.variant))
          throw new Error(
            "A product is no longer available. Please update your bag.",
          );
        const quantity = (quantities.get(i.id) || 0) + i.quantity;
        quantities.set(i.id, quantity);
        if (quantity > p.stock)
          throw new Error(`${p.name} has only ${p.stock} available.`);
        items.push({ ...i, name: p.name, price: p.price, image: p.image });
        subtotal += p.price * i.quantity;
      }
      const shipping = subtotal >= 500000 ? 0 : 19900,
        total = subtotal + shipping,
        id =
          "FM-" +
          crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase(),
        created = new Date().toISOString();
      const statements = [...quantities.entries()].map(([pid, q]) =>
        db
          .prepare("UPDATE products SET stock=stock-? WHERE id=? AND owner=?")
          .bind(q, pid, owner),
      );
      statements.push(
        db
          .prepare(
            "INSERT INTO orders (id,owner,request_key,customer,email,address,items,subtotal,shipping,total,method,status,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
          )
          .bind(
            id,
            owner,
            key,
            customer,
            email,
            address,
            JSON.stringify(items),
            subtotal,
            shipping,
            total,
            b.method,
            "Processing",
            created,
          ),
      );
      statements.push(
        db
          .prepare(
            "INSERT INTO transactions (id,owner,order_id,amount,method,status,created) VALUES (?,?,?,?,?,?,?)",
          )
          .bind(
            "TX-" + crypto.randomUUID().slice(0, 12).toUpperCase(),
            owner,
            id,
            total,
            b.method,
            b.method === "Demo payment" ? "Simulated" : "Pending",
            created,
          ),
      );
      try {
        await db.batch(statements);
      } catch (e) {
        const retried = await db
          .prepare("SELECT * FROM orders WHERE owner=? AND request_key=?")
          .bind(owner, key)
          .first();
        if (retried) return json({ order: decodeOrder(retried) });
        throw e;
      }
      return json({
        order: {
          id,
          customer,
          email,
          address,
          items,
          subtotal,
          shipping,
          total,
          method: b.method,
          status: "Processing",
          created,
        },
      });
    }
    if (b.action === "status") {
      const order: any = await db
        .prepare("SELECT * FROM orders WHERE id=? AND owner=?")
        .bind(b.id, owner)
        .first();
      if (!order) throw new Error("Order not found.");
      const allowed: Record<string, string[]> = {
        Processing: ["Shipped", "Cancelled"],
        Shipped: ["Delivered"],
        Delivered: [],
        Cancelled: [],
      };
      if (!allowed[order.status]?.includes(b.status))
        throw new Error("This order status cannot be changed.");
      const statements = [];
      if (b.status === "Cancelled") {
        for (const i of JSON.parse(order.items)) {
          statements.push(
            db
              .prepare(
                "UPDATE products SET stock=stock+? WHERE id=? AND owner=? AND EXISTS (SELECT 1 FROM orders WHERE id=? AND owner=? AND status='Processing')",
              )
              .bind(i.quantity, i.id, owner, order.id, owner),
          );
        }
        statements.push(
          db
            .prepare(
              "UPDATE transactions SET status=? WHERE order_id=? AND owner=? AND EXISTS (SELECT 1 FROM orders WHERE id=? AND status='Processing')",
            )
            .bind(
              order.method === "Demo payment" ? "Demo refunded" : "Cancelled",
              order.id,
              owner,
              order.id,
            ),
        );
      }
      if (b.status === "Delivered" && order.method === "Cash on delivery")
        statements.push(
          db
            .prepare(
              "UPDATE transactions SET status='Collected' WHERE order_id=? AND owner=? AND EXISTS (SELECT 1 FROM orders WHERE id=? AND status='Shipped')",
            )
            .bind(order.id, owner, order.id),
        );
      statements.push(
        db
          .prepare(
            "UPDATE orders SET status=? WHERE id=? AND owner=? AND status=?",
          )
          .bind(b.status, order.id, owner, order.status),
      );
      const result = await db.batch(statements);
      if (result.at(-1)?.meta.changes === 0)
        throw new Error("Order changed. Refresh and try again.");
      return json({ ok: true });
    }
    throw new Error("Unknown action.");
  } catch (e) {
    return failure(e);
  }
}
