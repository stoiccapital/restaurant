-- Seed data for local dev
INSERT INTO owners (id, email, name, created_at) VALUES
  ('own_1', 'maria@trattoria.example', 'Maria Rossi', 1730000000),
  ('own_2', 'kenji@sakura.example', 'Kenji Tanaka', 1730000000),
  ('own_3', 'leyla@anatolia.example', 'Leyla Demir', 1730000000);

INSERT INTO restaurants (id, owner_id, name, slug, cuisine, address, city, phone, description, delivers, delivery_fee_cents, delivery_radius_km, pickup, image_url, created_at) VALUES
  ('res_1', 'own_1', 'Trattoria da Maria', 'trattoria-da-maria', 'Italian', 'Hauptstrasse 12', 'Munich', '+49 89 1234567', 'Family-run Neapolitan pizza and homemade pasta.', 1, 290, 5, 1, null, 1730000000),
  ('res_2', 'own_2', 'Sakura Ramen', 'sakura-ramen', 'Japanese', 'Leopoldstrasse 44', 'Munich', '+49 89 2345678', 'Hand-pulled ramen, tonkotsu simmered 18 hours.', 0, 0, 0, 1, null, 1730000000),
  ('res_3', 'own_3', 'Anatolia Grill', 'anatolia-grill', 'Turkish', 'Sonnenstrasse 7', 'Munich', '+49 89 3456789', 'Charcoal-grilled kebabs and fresh lahmacun.', 1, 190, 7, 1, null, 1730000000);

INSERT INTO offers (id, restaurant_id, name, description, price_cents, currency, category, image_url, available, created_at) VALUES
  ('off_1', 'res_1', 'Margherita', 'San Marzano tomato, fior di latte, basil.', 1090, 'EUR', 'Pizza', null, 1, 1730000000),
  ('off_2', 'res_1', 'Diavola', 'Spicy salami, chili, mozzarella.', 1290, 'EUR', 'Pizza', null, 1, 1730000000),
  ('off_3', 'res_1', 'Tagliatelle al Ragu', 'Hand-cut pasta, slow-cooked beef ragu.', 1390, 'EUR', 'Pasta', null, 1, 1730000000),
  ('off_4', 'res_2', 'Tonkotsu Ramen', 'Pork broth, chashu, soft egg, nori.', 1490, 'EUR', 'Ramen', null, 1, 1730000000),
  ('off_5', 'res_2', 'Shoyu Ramen', 'Soy-based clear broth, chicken, menma.', 1390, 'EUR', 'Ramen', null, 1, 1730000000),
  ('off_6', 'res_2', 'Gyoza (6 pc)', 'Pork and cabbage dumplings, pan-fried.', 690, 'EUR', 'Sides', null, 1, 1730000000),
  ('off_7', 'res_3', 'Adana Kebab Plate', 'Minced lamb, bulgur, grilled vegetables.', 1490, 'EUR', 'Grill', null, 1, 1730000000),
  ('off_8', 'res_3', 'Lahmacun', 'Thin flatbread, spiced minced lamb, herbs.', 590, 'EUR', 'Flatbread', null, 1, 1730000000),
  ('off_9', 'res_3', 'Baklava (3 pc)', 'Pistachio, honey syrup, filo pastry.', 490, 'EUR', 'Dessert', null, 1, 1730000000);
