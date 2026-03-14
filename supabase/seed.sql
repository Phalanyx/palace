-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('palace-documents', 'palace-documents', false),
  ('palace-models', 'palace-models', true)
ON CONFLICT (id) DO NOTHING;
