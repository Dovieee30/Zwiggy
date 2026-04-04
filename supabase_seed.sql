-- ═══════════════════════════════════════════════════
-- SwiggyX — Supabase Schema + Seed Data
-- Run this entire file in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════

-- ── 1. Tables ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS restaurants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  cuisine_type  TEXT,
  image_url     TEXT,
  rating        NUMERIC(3,1) DEFAULT 4.2,
  delivery_time TEXT DEFAULT '30-40 min',
  min_order     INTEGER DEFAULT 200,
  offer_text    TEXT DEFAULT '40% OFF UPTO ₹80',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id  UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT,
  price          INTEGER NOT NULL,
  category       TEXT,
  is_veg         BOOLEAN DEFAULT TRUE,
  image_url      TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id  UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  items_json     TEXT,
  total          INTEGER,
  status         TEXT DEFAULT 'confirmed',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidence_vault (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_url        TEXT,
  gps_lat          NUMERIC(10,6),
  gps_lng          NUMERIC(10,6),
  duration_seconds INTEGER DEFAULT 0,
  trigger_type     TEXT DEFAULT 'triple_tap',
  aggression_level TEXT DEFAULT 'recorded',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sos_contacts (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  phone     TEXT,
  email     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. RLS Policies ─────────────────────────────────

ALTER TABLE restaurants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_contacts   ENABLE ROW LEVEL SECURITY;

-- Anyone can read restaurants + menu items (public catalog)
CREATE POLICY "Public read restaurants"
  ON restaurants FOR SELECT USING (true);

CREATE POLICY "Public read menu_items"
  ON menu_items FOR SELECT USING (true);

-- Orders: users see and insert only their own
CREATE POLICY "Users own orders"
  ON orders FOR ALL USING (auth.uid() = user_id);

-- Evidence vault: users see and modify only their own
CREATE POLICY "Users own evidence"
  ON evidence_vault FOR ALL USING (auth.uid() = user_id);

-- SOS contacts: users see and modify only their own
CREATE POLICY "Users own contacts"
  ON sos_contacts FOR ALL USING (auth.uid() = user_id);

-- ── 3. Restaurant Seed Data ─────────────────────────

INSERT INTO restaurants (id, name, cuisine_type, image_url, rating, delivery_time, min_order, offer_text) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  'Behrouz Biryani',
  'Biryani, Mughlai',
  'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&h=300&fit=crop&auto=format',
  4.5, '35-45 min', 299,
  '40% OFF UPTO ₹120'
),
(
  '22222222-2222-2222-2222-222222222222',
  'Pizza Hut',
  'Pizza, Italian',
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=300&fit=crop&auto=format',
  4.2, '25-35 min', 199,
  'Buy 1 Get 1 Free'
),
(
  '33333333-3333-3333-3333-333333333333',
  'McDonald''s',
  'Burgers, American',
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=300&fit=crop&auto=format',
  4.3, '20-30 min', 149,
  '30% OFF Orders ₹299+'
),
(
  '44444444-4444-4444-4444-444444444444',
  'Mainland China',
  'Chinese, Pan Asian',
  'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&h=300&fit=crop&auto=format',
  4.4, '40-50 min', 399,
  'Free Dessert Above ₹599'
),
(
  '55555555-5555-5555-5555-555555555555',
  'Sweets & Co.',
  'Desserts, Sweets',
  'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&h=300&fit=crop&auto=format',
  4.6, '20-25 min', 99,
  '20% OFF First Order'
);

-- ── 4. Menu Items Seed Data ─────────────────────────

-- Behrouz Biryani
INSERT INTO menu_items (restaurant_id, name, description, price, category, is_veg, image_url) VALUES
('11111111-1111-1111-1111-111111111111', 'Chicken Seekh Kebab', 'Minced chicken with aromatic spices, grilled in tandoor. Served with mint chutney.', 249, 'Starters', false, 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=200&h=200&fit=crop&auto=format'),
('11111111-1111-1111-1111-111111111111', 'Paneer Tikka', 'Juicy paneer cubes marinated in yogurt and spices, grilled to perfection.', 199, 'Starters', true, 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=200&h=200&fit=crop&auto=format'),
('11111111-1111-1111-1111-111111111111', 'Dum Chicken Biryani', 'Slow-cooked basmati rice with tender chicken, saffron and 25 secret spices.', 349, 'Biryani', false, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200&h=200&fit=crop&auto=format'),
('11111111-1111-1111-1111-111111111111', 'Mutton Biryani', 'Succulent mutton pieces slow-cooked with aged basmati, caramelized onions.', 449, 'Biryani', false, 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=200&h=200&fit=crop&auto=format'),
('11111111-1111-1111-1111-111111111111', 'Veg Biryani', 'Seasonal vegetables and aromatic spices cooked dum-style with basmati rice.', 249, 'Biryani', true, 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=200&h=200&fit=crop&auto=format'),
('11111111-1111-1111-1111-111111111111', 'Phirni', 'Traditional rice pudding with pistachios and rose water, served chilled.', 99, 'Desserts', true, 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=200&h=200&fit=crop&auto=format'),
('11111111-1111-1111-1111-111111111111', 'Gulab Jamun', 'Soft milk-solid dumplings soaked in rose-flavored sugar syrup. Served warm.', 79, 'Desserts', true, 'https://images.unsplash.com/photo-1666195174085-8db0fe02e3e5?w=200&h=200&fit=crop&auto=format');

-- Pizza Hut
INSERT INTO menu_items (restaurant_id, name, description, price, category, is_veg, image_url) VALUES
('22222222-2222-2222-2222-222222222222', 'Garlic Bread', 'Crispy toasted bread with garlic butter, herbs and cheese.', 99, 'Starters', true, 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=200&h=200&fit=crop&auto=format'),
('22222222-2222-2222-2222-222222222222', 'Margherita Pizza', 'Classic tomato base with mozzarella and fresh basil. The original Italian pizza.', 299, 'Pizzas', true, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=200&h=200&fit=crop&auto=format'),
('22222222-2222-2222-2222-222222222222', 'BBQ Chicken Pizza', 'Smoky BBQ sauce, grilled chicken, caramelized onions and cheddar.', 399, 'Pizzas', false, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop&auto=format'),
('22222222-2222-2222-2222-222222222222', 'Paneer Makhani Pizza', 'Rich paneer in makhani sauce with bell peppers on a crispy base.', 349, 'Pizzas', true, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&h=200&fit=crop&auto=format'),
('22222222-2222-2222-2222-222222222222', 'Pepperoni Pizza', 'Classic pepperoni with generous mozzarella and tomato sauce.', 449, 'Pizzas', false, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=200&h=200&fit=crop&auto=format'),
('22222222-2222-2222-2222-222222222222', 'Chocolate Lava Cake', 'Warm chocolate cake with a molten center. Served with vanilla ice cream.', 149, 'Desserts', true, 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=200&h=200&fit=crop&auto=format');

-- McDonald's
INSERT INTO menu_items (restaurant_id, name, description, price, category, is_veg, image_url) VALUES
('33333333-3333-3333-3333-333333333333', 'McAloo Tikki', 'Crispy spiced potato burger with onions, tomato and special sauce.', 99, 'Burgers', true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop&auto=format'),
('33333333-3333-3333-3333-333333333333', 'McSpicy Paneer', 'Hot and crispy paneer patty with jalapenos and peri peri mayo.', 149, 'Burgers', true, 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=200&h=200&fit=crop&auto=format'),
('33333333-3333-3333-3333-333333333333', 'McSpicy Chicken', 'Crispy spiced chicken with crunchy lettuce and tangy sauce.', 169, 'Burgers', false, 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=200&h=200&fit=crop&auto=format'),
('33333333-3333-3333-3333-333333333333', 'French Fries (Large)', 'Golden crispy fries seasoned with sea salt. Classic and irresistible.', 129, 'Sides', true, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=200&h=200&fit=crop&auto=format'),
('33333333-3333-3333-3333-333333333333', 'Veg McCrispy Wrap', 'Crispy veggies in a soft tortilla with chipotle mayo and fresh lettuce.', 139, 'Wraps', true, 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=200&h=200&fit=crop&auto=format'),
('33333333-3333-3333-3333-333333333333', 'McFlurry Oreo', 'Creamy soft serve swirled with crushed Oreo cookies.', 109, 'Desserts', true, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=200&h=200&fit=crop&auto=format'),
('33333333-3333-3333-3333-333333333333', 'Chicken McNuggets (6pc)', 'Tender chicken pieces in a golden crispy coating. Served with dip.', 149, 'Sides', false, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=200&h=200&fit=crop&auto=format');

-- Mainland China
INSERT INTO menu_items (restaurant_id, name, description, price, category, is_veg, image_url) VALUES
('44444444-4444-4444-4444-444444444444', 'Veg Spring Rolls', 'Crispy golden rolls stuffed with cabbage, carrots and glass noodles.', 179, 'Starters', true, 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=200&h=200&fit=crop&auto=format'),
('44444444-4444-4444-4444-444444444444', 'Chicken Dim Sum (4pc)', 'Steamed dumplings with juicy chicken and ginger filling.', 229, 'Starters', false, 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=200&h=200&fit=crop&auto=format'),
('44444444-4444-4444-4444-444444444444', 'Wok-Tossed Chicken', 'Tender chicken with bell peppers in a spicy Sichuan sauce.', 369, 'Mains', false, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=200&h=200&fit=crop&auto=format'),
('44444444-4444-4444-4444-444444444444', 'Paneer in Black Bean', 'Silky paneer cubes in savory black bean sauce with scallions.', 319, 'Mains', true, 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=200&h=200&fit=crop&auto=format'),
('44444444-4444-4444-4444-444444444444', 'Egg Fried Rice', 'Wok-tossed basmati rice with eggs, vegetables and soy sauce.', 249, 'Mains', false, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=200&h=200&fit=crop&auto=format'),
('44444444-4444-4444-4444-444444444444', 'Veg Hakka Noodles', 'Soft noodles stir-fried with crispy vegetables in dark soy.', 229, 'Mains', true, 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=200&h=200&fit=crop&auto=format'),
('44444444-4444-4444-4444-444444444444', 'Baked Honey Banana', 'Caramelized banana with honey, sesame and vanilla ice cream.', 179, 'Desserts', true, 'https://images.unsplash.com/photo-1571047547870-a9c0df3fa16e?w=200&h=200&fit=crop&auto=format');

-- Sweets & Co.
INSERT INTO menu_items (restaurant_id, name, description, price, category, is_veg, image_url) VALUES
('55555555-5555-5555-5555-555555555555', 'Kaju Katli', 'Premium cashew fudge with silver leaf. A festive Indian classic.', 149, 'Indian Sweets', true, 'https://images.unsplash.com/photo-1666195174085-8db0fe02e3e5?w=200&h=200&fit=crop&auto=format'),
('55555555-5555-5555-5555-555555555555', 'Rasgulla', 'Soft spongy cottage cheese balls soaked in light sugar syrup.', 89, 'Indian Sweets', true, 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=200&h=200&fit=crop&auto=format'),
('55555555-5555-5555-5555-555555555555', 'Tiramisu', 'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone cream.', 199, 'Western Desserts', true, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=200&h=200&fit=crop&auto=format'),
('55555555-5555-5555-5555-555555555555', 'Chocolate Truffle Cake', 'Rich dark chocolate ganache layered cake. Decadent and indulgent.', 229, 'Cakes', true, 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=200&h=200&fit=crop&auto=format'),
('55555555-5555-5555-5555-555555555555', 'Kulfi Falooda', 'Traditional pistachio kulfi with falooda noodles, rose syrup and basil seeds.', 129, 'Indian Sweets', true, 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=200&h=200&fit=crop&auto=format'),
('55555555-5555-5555-5555-555555555555', 'Mango Cheesecake', 'Creamy no-bake cheesecake with real Alphonso mango topping.', 249, 'Cakes', true, 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=200&h=200&fit=crop&auto=format');
