INSERT INTO "category_groups" ("slug", "name", "sortOrder") VALUES
  ('home',    'עבודות בית', 0),
  ('events',  'אירועים',    1),
  ('care',    'טיפול',      2),
  ('general', 'כללי',       3),
  ('special', 'מיוחד',      4)
ON CONFLICT ("slug") DO NOTHING;
