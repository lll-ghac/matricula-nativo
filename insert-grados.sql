INSERT INTO grados (codigo, nombre, nivel_educativo_id, orden, activo) VALUES
  ('PK', 'Pre-Kinder', 1, 1, TRUE),
  ('K', 'Kinder', 1, 2, TRUE),
  ('1', '1° Básico', 2, 3, TRUE),
  ('2', '2° Básico', 2, 4, TRUE),
  ('3', '3° Básico', 2, 5, TRUE),
  ('4', '4° Básico', 2, 6, TRUE),
  ('5', '5° Básico', 2, 7, TRUE),
  ('6', '6° Básico', 2, 8, TRUE),
  ('7', '7° Básico', 2, 9, TRUE),
  ('8', '8° Básico', 2, 10, TRUE),
  ('PIE-1', 'PIE 1°', 3, 11, TRUE),
  ('PIE-2', 'PIE 2°', 3, 12, TRUE),
  ('PIE-3', 'PIE 3°', 3, 13, TRUE),
  ('PIE-4', 'PIE 4°', 3, 14, TRUE),
  ('PIE-5', 'PIE 5°', 3, 15, TRUE),
  ('PIE-6', 'PIE 6°', 3, 16, TRUE)
ON CONFLICT (codigo) DO NOTHING;
