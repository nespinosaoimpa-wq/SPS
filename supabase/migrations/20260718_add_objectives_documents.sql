-- Agregar la columna documents a la tabla objectives para soportar contratos de servicio y legajos en PDF.
-- Tipo: JSONB para almacenar arreglos de objetos [{id, name, type, url, date}]
ALTER TABLE public.objectives 
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.objectives.documents IS 'Documentos adjuntos del objetivo: [{id, name, type, url, date}]';
