-- Enlaces de Zoho Meeting por psicólogo
-- zoho_join_link: para que el paciente entre a la reunión
-- zoho_start_link: para que el psicólogo inicie/entre como anfitrión
ALTER TABLE psicologos ADD COLUMN IF NOT EXISTS zoho_join_link TEXT;
ALTER TABLE psicologos ADD COLUMN IF NOT EXISTS zoho_start_link TEXT;
