-- PostgreSQL database dump - listo para pegar en pgAdmin Query Tool (Railway)
-- Eliminadas líneas \restrict y \unrestrict que Query Tool no ejecuta.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
SET default_tablespace = '';
SET default_table_access_method = heap;

CREATE TABLE public.chat_notificacion_email (
    destinatario_id integer NOT NULL,
    remitente_id integer NOT NULL,
    enviado_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.chat_notificacion_email IS 'Última vez que se envió al destinatario un correo avisando que el remitente le escribió (para limitar frecuencia)';

CREATE TABLE public.citas (
    id integer NOT NULL,
    paciente_id integer,
    psicologo_id integer,
    fecha date NOT NULL,
    hora time without time zone NOT NULL,
    estado character varying(20) DEFAULT 'pendiente'::character varying,
    link_sesion text,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    notas text,
    paciente_entro_at timestamp with time zone,
    psicologo_entro_at timestamp with time zone,
    recordatorio_enviado_at timestamp with time zone
);
COMMENT ON COLUMN public.citas.paciente_entro_at IS 'Momento en que el paciente entró a la sala de video';
COMMENT ON COLUMN public.citas.psicologo_entro_at IS 'Momento en que el psicólogo entró a la sala de video';
COMMENT ON COLUMN public.citas.recordatorio_enviado_at IS 'Momento en que se envió el correo de recordatorio 30 min antes de la cita';

CREATE SEQUENCE public.citas_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.citas_id_seq OWNED BY public.citas.id;

CREATE TABLE public.diplomados (
    id integer NOT NULL,
    area character varying(120) NOT NULL,
    titulo character varying(255) NOT NULL,
    fecha_inicio character varying(100) DEFAULT ''::character varying NOT NULL,
    descripcion_corta text DEFAULT ''::text NOT NULL,
    descripcion_larga text DEFAULT ''::text NOT NULL,
    url_imagen character varying(500) DEFAULT ''::character varying NOT NULL,
    mensaje_whatsapp character varying(500) DEFAULT NULL::character varying,
    orden integer DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE SEQUENCE public.diplomados_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.diplomados_id_seq OWNED BY public.diplomados.id;

CREATE TABLE public.vacaciones (
    id integer CONSTRAINT disponibilidad_especifica_id_not_null NOT NULL,
    psicologo_id integer,
    fecha_inicio date,
    fecha_fin date,
    motivo text
);
CREATE SEQUENCE public.disponibilidad_especifica_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.disponibilidad_especifica_id_seq OWNED BY public.vacaciones.id;

CREATE TABLE public.horario_laboral (
    id integer CONSTRAINT disponibilidad_id_not_null NOT NULL,
    psicologo_id integer,
    dia_semana integer,
    hora_inicio time without time zone CONSTRAINT disponibilidad_hora_inicio_not_null NOT NULL,
    hora_fin time without time zone CONSTRAINT disponibilidad_hora_fin_not_null NOT NULL
);
CREATE SEQUENCE public.disponibilidad_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.disponibilidad_id_seq OWNED BY public.horario_laboral.id;

CREATE TABLE public.documentos_psicologo (
    id integer NOT NULL,
    psicologo_id integer NOT NULL,
    titulo character varying(255) DEFAULT 'Nuevo documento'::character varying NOT NULL,
    contenido text DEFAULT ''::text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tipo character varying(20) DEFAULT 'texto'::character varying,
    ruta_archivo character varying(500),
    orden integer DEFAULT 0
);
COMMENT ON COLUMN public.documentos_psicologo.tipo IS 'texto | word | pdf';
COMMENT ON COLUMN public.documentos_psicologo.ruta_archivo IS 'Ruta relativa del archivo subido (Word/PDF)';
COMMENT ON COLUMN public.documentos_psicologo.orden IS 'Orden de visualización; menor = primero';
CREATE SEQUENCE public.documentos_psicologo_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.documentos_psicologo_id_seq OWNED BY public.documentos_psicologo.id;

CREATE TABLE public.encuestas_satisfaccion (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    rol character varying(20) NOT NULL,
    valoracion character varying(10),
    comentario text,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE SEQUENCE public.encuestas_satisfaccion_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.encuestas_satisfaccion_id_seq OWNED BY public.encuestas_satisfaccion.id;

CREATE TABLE public.mensajes (
    id integer NOT NULL,
    remitente_id integer,
    destinatario_id integer,
    contenido text NOT NULL,
    leido boolean DEFAULT false,
    fecha_envio timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ruta_adjunto character varying(500),
    nombre_adjunto character varying(255)
);
COMMENT ON COLUMN public.mensajes.ruta_adjunto IS 'Ruta del archivo PDF adjunto (solo PDF en chat)';
COMMENT ON COLUMN public.mensajes.nombre_adjunto IS 'Nombre original del archivo';
CREATE SEQUENCE public.mensajes_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.mensajes_id_seq OWNED BY public.mensajes.id;

CREATE TABLE public.opiniones (
    id integer NOT NULL,
    psicologo_id integer,
    paciente_id integer,
    comentario text NOT NULL,
    estrellas integer,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT opiniones_estrellas_check CHECK (((estrellas >= 1) AND (estrellas <= 5)))
);
CREATE SEQUENCE public.opiniones_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.opiniones_id_seq OWNED BY public.opiniones.id;

CREATE TABLE public.psicologos (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    especialidad character varying(100),
    imagen_url text,
    rating numeric(2,1) DEFAULT 5.0,
    problemas_principales text[],
    total_resenas integer DEFAULT 0,
    cedula character varying(20),
    pais_origen character varying(50),
    email character varying(255),
    biografia text,
    usuario_id integer,
    servicios text[],
    precio_terapia_individual numeric(10,2),
    precio_terapia_pareja numeric(10,2),
    precio_asesoria_crianza numeric(10,2),
    precio_terapia_individual_usd numeric(10,2),
    precio_terapia_pareja_usd numeric(10,2),
    precio_asesoria_crianza_usd numeric(10,2),
    zoho_join_link text,
    zoho_start_link text
);
COMMENT ON COLUMN public.psicologos.precio_terapia_individual IS 'Precio en MXN por sesión de terapia individual';
COMMENT ON COLUMN public.psicologos.precio_terapia_pareja IS 'Precio en MXN por sesión de terapia de parejas';
COMMENT ON COLUMN public.psicologos.precio_asesoria_crianza IS 'Precio en MXN por sesión de asesoría de crianza';
COMMENT ON COLUMN public.psicologos.precio_terapia_individual_usd IS 'Precio en USD por sesión de terapia individual';
COMMENT ON COLUMN public.psicologos.precio_terapia_pareja_usd IS 'Precio en USD por sesión de terapia de parejas';
COMMENT ON COLUMN public.psicologos.precio_asesoria_crianza_usd IS 'Precio en USD por sesión de asesoría de crianza';
CREATE SEQUENCE public.psicologos_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.psicologos_id_seq OWNED BY public.psicologos.id;

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password text NOT NULL,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    rol character varying(20) DEFAULT 'paciente'::character varying,
    telefono character varying(20),
    acepto_terminos boolean DEFAULT false,
    acepto_publicidad boolean DEFAULT false,
    email_verificado boolean DEFAULT false,
    token_verificacion character varying(255),
    token_verificacion_expira timestamp without time zone,
    token_reset_password character varying(255),
    token_reset_expira timestamp without time zone,
    veces_inicio_sesion integer DEFAULT 0,
    encuesta_satisfaccion_mostrada boolean DEFAULT false
);
CREATE SEQUENCE public.usuarios_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;

CREATE VIEW public.vista_psicologos AS
 SELECT p.id AS psicologo_id_tabla, u.id AS usuario_id, u.nombre, u.email, p.especialidad
 FROM public.psicologos p JOIN public.usuarios u ON (p.usuario_id = u.id);

ALTER TABLE ONLY public.citas ALTER COLUMN id SET DEFAULT nextval('public.citas_id_seq'::regclass);
ALTER TABLE ONLY public.diplomados ALTER COLUMN id SET DEFAULT nextval('public.diplomados_id_seq'::regclass);
ALTER TABLE ONLY public.documentos_psicologo ALTER COLUMN id SET DEFAULT nextval('public.documentos_psicologo_id_seq'::regclass);
ALTER TABLE ONLY public.encuestas_satisfaccion ALTER COLUMN id SET DEFAULT nextval('public.encuestas_satisfaccion_id_seq'::regclass);
ALTER TABLE ONLY public.horario_laboral ALTER COLUMN id SET DEFAULT nextval('public.disponibilidad_id_seq'::regclass);
ALTER TABLE ONLY public.mensajes ALTER COLUMN id SET DEFAULT nextval('public.mensajes_id_seq'::regclass);
ALTER TABLE ONLY public.opiniones ALTER COLUMN id SET DEFAULT nextval('public.opiniones_id_seq'::regclass);
ALTER TABLE ONLY public.psicologos ALTER COLUMN id SET DEFAULT nextval('public.psicologos_id_seq'::regclass);
ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);
ALTER TABLE ONLY public.vacaciones ALTER COLUMN id SET DEFAULT nextval('public.disponibilidad_especifica_id_seq'::regclass);

INSERT INTO public.chat_notificacion_email (destinatario_id, remitente_id, enviado_at) VALUES (8, 13, '2026-02-04 14:23:56.807867-06');

INSERT INTO public.citas (id, paciente_id, psicologo_id, fecha, hora, estado, link_sesion, creado_en, notas, paciente_entro_at, psicologo_entro_at, recordatorio_enviado_at) VALUES (5, NULL, 1, '2026-01-29', '10:00:00', 'realizada', NULL, '2026-01-29 19:57:37.115245', NULL, NULL, NULL, NULL);
INSERT INTO public.citas (id, paciente_id, psicologo_id, fecha, hora, estado, link_sesion, creado_en, notas, paciente_entro_at, psicologo_entro_at, recordatorio_enviado_at) VALUES (7, NULL, 1, '2026-01-29', '10:00:00', 'realizada', '/sesion-prueba', '2026-01-29 20:53:37.627369', NULL, NULL, NULL, NULL);
INSERT INTO public.citas (id, paciente_id, psicologo_id, fecha, hora, estado, link_sesion, creado_en, notas, paciente_entro_at, psicologo_entro_at, recordatorio_enviado_at) VALUES (8, 1, 1, '2026-01-29', '10:00:00', 'realizada', '/sesion-prueba', '2026-01-29 20:55:30.952924', NULL, NULL, NULL, NULL);
INSERT INTO public.citas (id, paciente_id, psicologo_id, fecha, hora, estado, link_sesion, creado_en, notas, paciente_entro_at, psicologo_entro_at, recordatorio_enviado_at) VALUES (19, 1, 1, '2026-02-18', '14:00:00', 'realizada', '/perfil?sala=sesion-1-1', '2026-02-03 20:11:37.001156', NULL, '2026-02-03 20:13:12.810945-06', '2026-02-03 20:11:49.53114-06', NULL);
INSERT INTO public.citas (id, paciente_id, psicologo_id, fecha, hora, estado, link_sesion, creado_en, notas, paciente_entro_at, psicologo_entro_at, recordatorio_enviado_at) VALUES (20, 1, 1, '2026-03-19', '18:00:00', 'pendiente', '/perfil?sala=sesion-1-1', '2026-02-03 23:55:32.031553', NULL, NULL, NULL, NULL);
INSERT INTO public.citas (id, paciente_id, psicologo_id, fecha, hora, estado, link_sesion, creado_en, notas, paciente_entro_at, psicologo_entro_at, recordatorio_enviado_at) VALUES (21, 1, 1, '2026-02-20', '16:00:00', 'pendiente', '/perfil?sala=sesion-1-1', '2026-02-04 13:24:08.56005', NULL, NULL, NULL, NULL);
INSERT INTO public.citas (id, paciente_id, psicologo_id, fecha, hora, estado, link_sesion, creado_en, notas, paciente_entro_at, psicologo_entro_at, recordatorio_enviado_at) VALUES (6, 1, 1, '2026-01-29', '10:00:00', 'realizada', NULL, '2026-01-29 19:58:09.02119', 'Hola test de nota 2

Quiero modificar mi nota 2 para que sea nota 3', NULL, NULL, NULL);
INSERT INTO public.citas (id, paciente_id, psicologo_id, fecha, hora, estado, link_sesion, creado_en, notas, paciente_entro_at, psicologo_entro_at, recordatorio_enviado_at) VALUES (9, 1, 1, '2026-03-06', '11:00:00', 'cancelada', '/perfil?sala=sesion-1-1', '2026-01-31 00:05:42.060825', 'test de notas que no se copien', NULL, NULL, NULL);
INSERT INTO public.citas (id, paciente_id, psicologo_id, fecha, hora, estado, link_sesion, creado_en, notas, paciente_entro_at, psicologo_entro_at, recordatorio_enviado_at) VALUES (4, 1, 1, '2026-01-30', '10:00:00', 'no realizada', 'https://meet.jit.si/psicologosenred-sesion-elena-ramos-1', '2026-01-29 13:31:14.758423', NULL, NULL, NULL, NULL);
INSERT INTO public.citas (id, paciente_id, psicologo_id, fecha, hora, estado, link_sesion, creado_en, notas, paciente_entro_at, psicologo_entro_at, recordatorio_enviado_at) VALUES (1, 1, 1, '2026-02-01', '12:00:00', 'no realizada', NULL, '2026-01-28 07:56:07.960613', NULL, NULL, NULL, NULL);
INSERT INTO public.citas (id, paciente_id, psicologo_id, fecha, hora, estado, link_sesion, creado_en, notas, paciente_entro_at, psicologo_entro_at, recordatorio_enviado_at) VALUES (2, 1, 1, '2026-02-01', '08:00:00', 'no realizada', NULL, '2026-01-28 07:58:55.45702', 'Hola quiero guardar esta nota', NULL, NULL, NULL);
INSERT INTO public.citas (id, paciente_id, psicologo_id, fecha, hora, estado, link_sesion, creado_en, notas, paciente_entro_at, psicologo_entro_at, recordatorio_enviado_at) VALUES (3, 1, 1, '2026-02-01', '12:00:00', 'no realizada', 'https://meet.jit.si/psicologosenred-sesion-elena-ramos-1', '2026-01-29 09:56:06.823196', 'Hola quiero guardar esta nota', NULL, NULL, NULL);
INSERT INTO public.citas (id, paciente_id, psicologo_id, fecha, hora, estado, link_sesion, creado_en, notas, paciente_entro_at, psicologo_entro_at, recordatorio_enviado_at) VALUES (22, 8, 7, '2026-02-13', '12:00:00', 'pendiente', '/perfil?sala=sesion-8-7', '2026-02-04 13:39:01.891759', NULL, '2026-02-04 13:39:49.61936-06', NULL, NULL);
INSERT INTO public.citas (id, paciente_id, psicologo_id, fecha, hora, estado, link_sesion, creado_en, notas, paciente_entro_at, psicologo_entro_at, recordatorio_enviado_at) VALUES (12, 1, 1, '2026-02-05', '11:00:00', 'cancelada', '/perfil?sala=sesion-1-1', '2026-02-01 00:40:11.246109', NULL, NULL, NULL, NULL);
INSERT INTO public.citas (id, paciente_id, psicologo_id, fecha, hora, estado, link_sesion, creado_en, notas, paciente_entro_at, psicologo_entro_at, recordatorio_enviado_at) VALUES (13, 1, 1, '2026-02-17', '17:00:00', 'cancelada', '/perfil?sala=sesion-1-1', '2026-02-01 17:52:56.865946', NULL, NULL, NULL, NULL);
INSERT INTO public.citas (id, paciente_id, psicologo_id, fecha, hora, estado, link_sesion, creado_en, notas, paciente_entro_at, psicologo_entro_at, recordatorio_enviado_at) VALUES (10, 1, 1, '2026-03-20', '17:35:00', 'cancelada', '/perfil?sala=sesion-1-1', '2026-01-31 14:35:58.509377', NULL, NULL, NULL, NULL);
INSERT INTO public.citas (id, paciente_id, psicologo_id, fecha, hora, estado, link_sesion, creado_en, notas, paciente_entro_at, psicologo_entro_at, recordatorio_enviado_at) VALUES (11, 1, 1, '2026-02-03', '14:00:00', 'no realizada', '/perfil?sala=sesion-1-1', '2026-01-31 14:53:39.065556', 'fwefojfowjefojweofjwefwf', NULL, NULL, NULL);
INSERT INTO public.citas (id, paciente_id, psicologo_id, fecha, hora, estado, link_sesion, creado_en, notas, paciente_entro_at, psicologo_entro_at, recordatorio_enviado_at) VALUES (14, 1, 1, '2026-02-20', '10:00:00', 'cancelada', '/perfil?sala=sesion-1-1', '2026-02-03 19:01:50.237793', NULL, NULL, NULL, NULL);
INSERT INTO public.citas (id, paciente_id, psicologo_id, fecha, hora, estado, link_sesion, creado_en, notas, paciente_entro_at, psicologo_entro_at, recordatorio_enviado_at) VALUES (15, 1, 1, '2026-02-23', '13:00:00', 'cancelada', '/perfil?sala=sesion-1-1', '2026-02-03 19:03:09.296558', NULL, NULL, NULL, NULL);
INSERT INTO public.citas (id, paciente_id, psicologo_id, fecha, hora, estado, link_sesion, creado_en, notas, paciente_entro_at, psicologo_entro_at, recordatorio_enviado_at) VALUES (16, 1, 1, '2026-03-13', '12:00:00', 'cancelada', '/perfil?sala=sesion-1-1', '2026-02-03 19:16:05.681286', NULL, NULL, NULL, NULL);
INSERT INTO public.citas (id, paciente_id, psicologo_id, fecha, hora, estado, link_sesion, creado_en, notas, paciente_entro_at, psicologo_entro_at, recordatorio_enviado_at) VALUES (17, 1, 1, '2026-03-12', '15:00:00', 'cancelada', '/perfil?sala=sesion-1-1', '2026-02-03 19:59:00.20859', NULL, NULL, NULL, NULL);
INSERT INTO public.citas (id, paciente_id, psicologo_id, fecha, hora, estado, link_sesion, creado_en, notas, paciente_entro_at, psicologo_entro_at, recordatorio_enviado_at) VALUES (18, 1, 1, '2026-03-20', '12:00:00', 'cancelada', '/perfil?sala=sesion-1-1', '2026-02-03 20:01:57.763816', NULL, NULL, NULL, NULL);

INSERT INTO public.diplomados (id, area, titulo, fecha_inicio, descripcion_corta, descripcion_larga, url_imagen, mensaje_whatsapp, orden, activo, created_at) VALUES (1, 'Diplmado Virtual', 'Estructuras Clínicas', '17 de Abril, 2026', 'Psicosis, Neurosis y Perversión.', '<p>Entender el síntoma es solo el principio; el verdadero reto profesional radica en comprender la estructura que lo sostiene. Este <strong>Diplomado en Estructuras Clínicas: Neurosis, Psicosis y Perversión</strong> te ofrece, en tan solo 4 meses y de forma 100% en línea, las herramientas analíticas para distinguir la posición subjetiva de cada paciente y diseñar estrategias de intervención precisas y efectivas.</p><p>A través de un recorrido fluido por los mecanismos de represión, forclusión y renegamiento, dejarás atrás las etiquetas superficiales para dominar un diagnóstico diferencial profundo. Es la oportunidad ideal para fortalecer tu criterio clínico y responder con mayor solvencia a los desafíos del consultorio actual.</p>', '/images/estructuras_clinicas.jpeg', 'Hola! Deseo más información del Diplomado en Estructuras Clínicas (Neurosis, Psicosis y Perversión)', 0, true, '2026-02-04 00:17:23.576376-06');
INSERT INTO public.diplomados (id, area, titulo, fecha_inicio, descripcion_corta, descripcion_larga, url_imagen, mensaje_whatsapp, orden, activo, created_at) VALUES (2, 'Curso Virtual', 'Clínica del Trauma', '25 de Febrero, 2026', 'De la repetición a la elaboración', '<p>El trauma es una de las huellas más complejas en la vida de un sujeto, manifestándose donde las palabras no alcanzan. Este curso especializado te brinda las herramientas críticas para identificar el impacto de las experiencias abrumadoras y desarrollar estrategias de intervención efectivas frente a la disociación y la desregulación emocional.</p><p>Aprenderás a mirar más allá del suceso para centrarte en la respuesta psíquica y biológica, profesionalizando tu escucha para acompañar procesos de estabilización con mayor seguridad y ética. Fortalece tu práctica clínica y adquiere los recursos necesarios para abordar uno de los mayores desafíos de la salud mental actual.</p>', '/images/clinica_del_trauma.jpeg', 'Hola! Deseo más información del curso Clínica del Trauma', 1, true, '2026-02-04 00:22:15.187876-06');
INSERT INTO public.diplomados (id, area, titulo, fecha_inicio, descripcion_corta, descripcion_larga, url_imagen, mensaje_whatsapp, orden, activo, created_at) VALUES (3, 'Curso Virtual', 'Enuresis y Encopresis', '25 de Marzo, 2026', 'Intervención desde la terapia del juego', '<p>Este curso te proporciona las herramientas clínicas para abordar los trastornos de la eliminación desde una perspectiva integral, combinando la comprensión emocional con estrategias lúdicas de intervención.</p><p>Aprenderás a diferenciar las causas psicógenas de estos síntomas y a diseñar sesiones de juego que faciliten la expresión de conflictos subyacentes, ayudando al niño a recuperar el control y la confianza. Profesionaliza tu práctica con recursos creativos y efectivos para acompañar a las familias en este proceso de forma respetuosa y profunda.</p>', '/images/enuresis_encopresis.jpeg', 'Hola! Deseo más información del curso Enuresis y Encopresis', 2, true, '2026-02-04 00:26:20.373321-06');

INSERT INTO public.documentos_psicologo (id, psicologo_id, titulo, contenido, created_at, updated_at, tipo, ruta_archivo, orden) VALUES (3, 1, 'Lucy', 'hoa lucy', '2026-02-02 19:42:44.120472', '2026-02-02 19:42:50.96223', 'texto', NULL, 0);
INSERT INTO public.documentos_psicologo (id, psicologo_id, titulo, contenido, created_at, updated_at, tipo, ruta_archivo, orden) VALUES (2, 1, 'Denise', 'heermosa', '2026-01-31 14:40:42.071789', '2026-01-31 14:40:52.891305', 'texto', NULL, 1);

INSERT INTO public.usuarios (id, nombre, email, password, fecha_registro, rol, telefono, acepto_terminos, acepto_publicidad, email_verificado, token_verificacion, token_verificacion_expira, token_reset_password, token_reset_expira, veces_inicio_sesion, encuesta_satisfaccion_mostrada) VALUES (1, 'Alejandro', 'balam.secretario@gmail.com', '$2b$10$HpfoTZv6fixR/TuauWQTfO6J31I2Wc0FwNa5zb1zSBlaf/hcDJh7G', '2026-01-28 00:06:17.045382', 'paciente', '5555555555', false, false, true, NULL, NULL, NULL, NULL, 6, true);
INSERT INTO public.usuarios (id, nombre, email, password, fecha_registro, rol, telefono, acepto_terminos, acepto_publicidad, email_verificado, token_verificacion, token_verificacion_expira, token_reset_password, token_reset_expira, veces_inicio_sesion, encuesta_satisfaccion_mostrada) VALUES (2, 'alejandro', 'balam.secretari@gmail.com', '$2b$10$DSphB1ntk/4UZpTXemm0aO5fzi/BkETlSzcRijSiaN2/s5sDpfYxq', '2026-01-28 00:08:59.290865', 'paciente', NULL, false, false, true, NULL, NULL, NULL, NULL, 0, false);
INSERT INTO public.usuarios (id, nombre, email, password, fecha_registro, rol, telefono, acepto_terminos, acepto_publicidad, email_verificado, token_verificacion, token_verificacion_expira, token_reset_password, token_reset_expira, veces_inicio_sesion, encuesta_satisfaccion_mostrada) VALUES (4, 'alejandro', 'balam.secretario+@gmail.com', '$2b$10$uYykqmrdK7ha9LmYJfosZ.yeZeoTEZ3.mDFXTkEcCBd/l1XU4ygqG', '2026-01-28 02:07:31.166401', 'psicologo', NULL, false, false, true, NULL, NULL, NULL, NULL, 0, false);
INSERT INTO public.usuarios (id, nombre, email, password, fecha_registro, rol, telefono, acepto_terminos, acepto_publicidad, email_verificado, token_verificacion, token_verificacion_expira, token_reset_password, token_reset_expira, veces_inicio_sesion, encuesta_satisfaccion_mostrada) VALUES (7, 'Carla Pedraza', 'carlypp98@gmail.com', '$2b$10$8dN9G5NdNB0Dvhbrpue45uBSamrSH.v/NbRONBokM9uRI.wNr.Awu', '2026-01-28 10:54:49.019211', 'paciente', NULL, false, false, true, NULL, NULL, NULL, NULL, 0, false);
INSERT INTO public.usuarios (id, nombre, email, password, fecha_registro, rol, telefono, acepto_terminos, acepto_publicidad, email_verificado, token_verificacion, token_verificacion_expira, token_reset_password, token_reset_expira, veces_inicio_sesion, encuesta_satisfaccion_mostrada) VALUES (9, 'Alejandro Mota', 'contacto@psicologosenred.com', '$2b$10$KAwof4giaY098ZsThkNZW.rhHMAVnHndQ0AtikytSAORMTx23i8we', '2026-01-31 22:41:56.011541', 'admin', NULL, true, false, true, NULL, NULL, NULL, NULL, 0, false);
INSERT INTO public.usuarios (id, nombre, email, password, fecha_registro, rol, telefono, acepto_terminos, acepto_publicidad, email_verificado, token_verificacion, token_verificacion_expira, token_reset_password, token_reset_expira, veces_inicio_sesion, encuesta_satisfaccion_mostrada) VALUES (10, 'Alejandra Azuara', 'alejandra.azuara@psicologosenred.com', '$2b$10$woSTv2yFkj9qOvT/ZYu3reAmgneOzvyyFF26bj8NpMoNZW9kjzY0i', '2026-02-03 11:14:57.174445', 'psicologo', NULL, true, false, true, NULL, NULL, NULL, NULL, 0, false);
INSERT INTO public.usuarios (id, nombre, email, password, fecha_registro, rol, telefono, acepto_terminos, acepto_publicidad, email_verificado, token_verificacion, token_verificacion_expira, token_reset_password, token_reset_expira, veces_inicio_sesion, encuesta_satisfaccion_mostrada) VALUES (11, 'Juan Manuel Leon Torres', 'juan.leon@psicologosenred.com', '$2b$10$c807d5mY/uH1xu9LYCvSNO2hSiUH4vtI5Op8L0EGCPcuWXK1ZYhYi', '2026-02-03 14:05:56.754342', 'psicologo', NULL, true, false, true, NULL, NULL, NULL, NULL, 0, false);
INSERT INTO public.usuarios (id, nombre, email, password, fecha_registro, rol, telefono, acepto_terminos, acepto_publicidad, email_verificado, token_verificacion, token_verificacion_expira, token_reset_password, token_reset_expira, veces_inicio_sesion, encuesta_satisfaccion_mostrada) VALUES (12, 'Magali Garcia Pacheco', 'magali.garcia@psicologosenred.com', '$2b$10$c807d5mY/uH1xu9LYCvSNO2hSiUH4vtI5Op8L0EGCPcuWXK1ZYhYi', '2026-02-03 14:30:48.466915', 'psicologo', NULL, true, false, true, NULL, NULL, NULL, NULL, 0, false);
INSERT INTO public.usuarios (id, nombre, email, password, fecha_registro, rol, telefono, acepto_terminos, acepto_publicidad, email_verificado, token_verificacion, token_verificacion_expira, token_reset_password, token_reset_expira, veces_inicio_sesion, encuesta_satisfaccion_mostrada) VALUES (13, 'Iztaccihuatl Ramirez Cortes', 'iztaccihuatl.ramirez@psicologosenred.com', '$2b$10$c807d5mY/uH1xu9LYCvSNO2hSiUH4vtI5Op8L0EGCPcuWXK1ZYhYi', '2026-02-03 17:59:50.415819', 'psicologo', NULL, true, false, true, NULL, NULL, NULL, NULL, 0, false);
INSERT INTO public.usuarios (id, nombre, email, password, fecha_registro, rol, telefono, acepto_terminos, acepto_publicidad, email_verificado, token_verificacion, token_verificacion_expira, token_reset_password, token_reset_expira, veces_inicio_sesion, encuesta_satisfaccion_mostrada) VALUES (15, 'Jose Javier Flores Armas', 'jose.flores@psicologosenred.com', '$2b$10$c807d5mY/uH1xu9LYCvSNO2hSiUH4vtI5Op8L0EGCPcuWXK1ZYhYi', '2026-02-03 18:34:50.728407', 'psicologo', NULL, true, false, true, NULL, NULL, NULL, NULL, 0, false);
INSERT INTO public.usuarios (id, nombre, email, password, fecha_registro, rol, telefono, acepto_terminos, acepto_publicidad, email_verificado, token_verificacion, token_verificacion_expira, token_reset_password, token_reset_expira, veces_inicio_sesion, encuesta_satisfaccion_mostrada) VALUES (16, 'Sarahi Monserrat Diaz Lopez', 'sarahi.diaz@psicologosenred.com', '$2b$10$c807d5mY/uH1xu9LYCvSNO2hSiUH4vtI5Op8L0EGCPcuWXK1ZYhYi', '2026-02-03 18:39:16.995998', 'psicologo', NULL, true, false, true, NULL, NULL, NULL, NULL, 0, false);
INSERT INTO public.usuarios (id, nombre, email, password, fecha_registro, rol, telefono, acepto_terminos, acepto_publicidad, email_verificado, token_verificacion, token_verificacion_expira, token_reset_password, token_reset_expira, veces_inicio_sesion, encuesta_satisfaccion_mostrada) VALUES (6, 'Lucy Contreras', 'lucy.contreras@psicologosenred.com', '$2b$10$yxSOkjNT.aL93S8wd5E00Omj1GPOWOi/YwsAvrPdkHV08hKo1R0y2', '2026-01-28 08:02:56.688041', 'psicologo', NULL, false, false, true, NULL, NULL, NULL, NULL, 0, false);
INSERT INTO public.usuarios (id, nombre, email, password, fecha_registro, rol, telefono, acepto_terminos, acepto_publicidad, email_verificado, token_verificacion, token_verificacion_expira, token_reset_password, token_reset_expira, veces_inicio_sesion, encuesta_satisfaccion_mostrada) VALUES (8, 'Denise De la O', 'delaodd@gmail.com', '$2b$10$AVIPsgXoZaxnjdtCoLEiE.mSMKWVyLELjfZqZu/WiYeUYUDq4huBO', '2026-01-31 21:08:16.246704', 'paciente', NULL, false, false, true, NULL, NULL, NULL, NULL, 0, false);
INSERT INTO public.usuarios (id, nombre, email, password, fecha_registro, rol, telefono, acepto_terminos, acepto_publicidad, email_verificado, token_verificacion, token_verificacion_expira, token_reset_password, token_reset_expira, veces_inicio_sesion, encuesta_satisfaccion_mostrada) VALUES (14, 'Anahí Mérida González', 'anahi.gonzalez@psicologosenred.com', '$2b$10$c807d5mY/uH1xu9LYCvSNO2hSiUH4vtI5Op8L0EGCPcuWXK1ZYhYi', '2026-02-03 18:14:28.825367', 'psicologo', NULL, true, false, true, NULL, NULL, NULL, NULL, 0, false);

INSERT INTO public.encuestas_satisfaccion (id, usuario_id, rol, valoracion, comentario, fecha) VALUES (1, 1, 'paciente', '5', 'Increíble plataforma, me cambió la vida, no sabia a donde acudir y psicólogos en red me guío muy bien a recuperar mi salud mental. Muy contento', '2026-02-04 17:26:16.245931');

INSERT INTO public.horario_laboral (id, psicologo_id, dia_semana, hora_inicio, hora_fin) VALUES (6, 1, 1, '09:00:00', '20:00:00');
INSERT INTO public.horario_laboral (id, psicologo_id, dia_semana, hora_inicio, hora_fin) VALUES (7, 1, 2, '09:00:00', '20:00:00');
INSERT INTO public.horario_laboral (id, psicologo_id, dia_semana, hora_inicio, hora_fin) VALUES (8, 1, 3, '09:00:00', '20:00:00');
INSERT INTO public.horario_laboral (id, psicologo_id, dia_semana, hora_inicio, hora_fin) VALUES (9, 1, 4, '09:00:00', '20:00:00');
INSERT INTO public.horario_laboral (id, psicologo_id, dia_semana, hora_inicio, hora_fin) VALUES (10, 1, 5, '09:00:00', '20:00:00');
INSERT INTO public.horario_laboral (id, psicologo_id, dia_semana, hora_inicio, hora_fin) VALUES (11, 7, 1, '09:00:00', '18:00:00');
INSERT INTO public.horario_laboral (id, psicologo_id, dia_semana, hora_inicio, hora_fin) VALUES (12, 7, 2, '09:00:00', '18:00:00');
INSERT INTO public.horario_laboral (id, psicologo_id, dia_semana, hora_inicio, hora_fin) VALUES (13, 7, 3, '09:00:00', '18:00:00');
INSERT INTO public.horario_laboral (id, psicologo_id, dia_semana, hora_inicio, hora_fin) VALUES (14, 7, 4, '09:00:00', '18:00:00');
INSERT INTO public.horario_laboral (id, psicologo_id, dia_semana, hora_inicio, hora_fin) VALUES (15, 7, 5, '09:00:00', '18:00:00');

INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (2, 6, NULL, 'Hola', false, '2026-01-29 14:33:48.858669', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (3, 1, 1, 'hola', false, '2026-01-29 14:34:49.498874', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (4, 6, NULL, 'hola', false, '2026-01-29 14:43:25.74128', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (5, 6, NULL, 'hola', false, '2026-01-29 14:47:50.392406', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (6, 1, 1, 'hola', false, '2026-01-29 14:57:31.113914', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (7, 1, 1, 'hola', false, '2026-01-29 15:45:02.699036', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (9, 6, 1, 'ededed', false, '2026-01-30 14:10:47.685359', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (10, 6, 1, 'hola', false, '2026-01-30 14:13:14.208498', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (11, 1, 1, 'hola', false, '2026-01-30 14:13:26.70864', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (12, 6, 1, 'hola paciente', false, '2026-01-30 14:19:07.582001', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (13, 1, 1, 'hola doctora', false, '2026-01-30 14:23:30.189142', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (14, 1, 1, 'hola doctora', false, '2026-01-30 14:26:33.279514', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (15, 1, 1, 'qwerty', false, '2026-01-30 14:30:53.850688', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (16, 6, 1, 'qwerty', false, '2026-01-30 14:31:15.250803', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (17, 1, 1, 'soy balam', false, '2026-01-30 14:39:33.588351', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (18, 6, 1, 'hola', false, '2026-01-30 14:47:30.182837', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (19, 1, 1, 'soy balam 2', false, '2026-01-30 14:57:35.310766', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (20, 1, 1, 'prueba 2', false, '2026-01-30 21:54:32.454084', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (21, 6, 1, 'prueba 3', false, '2026-01-30 21:55:18.639604', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (22, 1, 1, 'hola', false, '2026-01-30 21:58:39.794136', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (23, 1, 1, 'werwe', false, '2026-01-30 21:59:00.673049', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (24, 1, 1, 'we', false, '2026-01-30 22:00:53.157576', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (25, 6, 1, 'we', false, '2026-01-30 22:01:06.307631', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (26, 1, 6, 'hola', false, '2026-01-30 22:16:20.772311', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (27, 6, 1, 'hola', false, '2026-01-30 22:16:28.77551', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (28, 1, 6, 'Hola Lucy', false, '2026-01-30 23:02:11.337971', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (29, 6, 1, 'Hola Balam', false, '2026-01-30 23:02:34.321516', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (30, 1, 6, 'hola no voy a poder hoy', false, '2026-01-31 00:01:10.368841', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (31, 6, 1, '[PDF adjunto]', false, '2026-02-03 13:30:02.177253', 'chat/6/1770147002176-Agenda_del_Congreso_2.0..pdf', 'Agenda del Congreso 2.0..pdf');
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (32, 8, 13, 'hola', false, '2026-02-04 13:42:10.580239', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (33, 8, 13, 'Hola Iztac', false, '2026-02-04 13:54:31.848853', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (34, 8, 13, 'hgjhgjhg', false, '2026-02-04 13:54:39.912432', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (35, 13, 8, 'Hola Den que gusto!', false, '2026-02-04 13:55:06.867723', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (36, 13, 8, 'Hola vieja amiga', false, '2026-02-04 14:23:55.492156', NULL, NULL);
INSERT INTO public.mensajes (id, remitente_id, destinatario_id, contenido, leido, fecha_envio, ruta_adjunto, nombre_adjunto) VALUES (37, 13, 8, 'te extraño', false, '2026-02-04 14:25:00.460009', NULL, NULL);

INSERT INTO public.psicologos (id, nombre, especialidad, imagen_url, rating, problemas_principales, total_resenas, cedula, pais_origen, email, biografia, usuario_id, servicios, precio_terapia_individual, precio_terapia_pareja, precio_asesoria_crianza, precio_terapia_individual_usd, precio_terapia_pareja_usd, precio_asesoria_crianza_usd, zoho_join_link, zoho_start_link) VALUES (9, 'Jose Javier Flores Armas', 'Psicoanálisis', NULL, 5.0, '{Asesinato,Abuso,Secuestro,Violación}', 0, '11921814', 'México', 'jose.flores@psicologosenred.com', 'Trabajaremos con un enfoque clínico psicoanalítico, en el cual exploraremos la manera en que tu historia infantil, tus vínculos más cercanos (padre, madre, hermanos(as), hijos (as), etc.) tus deseos, pensamientos, fantasías y angustias, han estructurado tus decisiones y construido tu historia, resolviendo dudas y conflictos que no te permiten entender la vida y disfrutarla a plenitud hoy.', 15, '{"Terapia Individual"}', 600.00, 900.00, 700.00, 55.00, 75.00, 65.00, NULL, NULL);
INSERT INTO public.psicologos (id, nombre, especialidad, imagen_url, rating, problemas_principales, total_resenas, cedula, pais_origen, email, biografia, usuario_id, servicios, precio_terapia_individual, precio_terapia_pareja, precio_asesoria_crianza, precio_terapia_individual_usd, precio_terapia_pareja_usd, precio_asesoria_crianza_usd, zoho_join_link, zoho_start_link) VALUES (10, 'Sarahi Monserrat Diaz Lopez', 'Cognitivo Conductual', '/images/monserrat_diaz.jpeg', 5.0, '{Ansiedad,Autoestima,"Dependencia emocional","Problemas de sueño","Violencia a la mujer"}', 0, '11921814', 'México', 'sarahi.diaz@psicologosenred.com', 'Psicóloga egresada del IPN con diversos cursos enfocados en salud mental y emocional. Como profesionista del ámbito clínico enfocada en adultos y adultos mayores, me interesa crear un espacio de confianza para el trabajo y proceso personal de cada individuo. Trabajo de la mano con cada paciente para transitar desde el diagnóstico hasta las metas deseadas por medio de la escucha, empatía, confianza, evaluación pertinente y la aplicación de técnicas necesarias para lograr los cambios y/o mejoras de cada persona validando sus vivencias y cada uno de sus aprendizajes.', 16, '{"Terapia Individual"}', 600.00, 900.00, 700.00, 55.00, 75.00, 65.00, NULL, NULL);
INSERT INTO public.psicologos (id, nombre, especialidad, imagen_url, rating, problemas_principales, total_resenas, cedula, pais_origen, email, biografia, usuario_id, servicios, precio_terapia_individual, precio_terapia_pareja, precio_asesoria_crianza, precio_terapia_individual_usd, precio_terapia_pareja_usd, precio_asesoria_crianza_usd, zoho_join_link, zoho_start_link) VALUES (1, 'Lucy Contreras', 'Cognitivo Conductual', '/images/lucy.jpeg', 5.0, '{Depresión,Crianza,Ansiedad,Autoestima,Duelo}', 0, '12524632', 'México', 'lucy.contreras@psicologosenred.com', 'Psicóloga con más de 10 años de experiencia clínica dedicada al bienestar emocional de las familias. Fundadora de Psicólogos en Red, Lucy se ha especializado en el enfoque Cognitivo-Conductual, ayudando a cientos de padres a establecer vínculos sanos y herramientas de crianza consciente. Su pasión es democratizar el acceso a la salud mental de alta calidad.', 6, '{"Terapia Individual","Asesoría de Crianza"}', 600.00, 900.00, 700.00, 55.00, 75.00, 65.00, 'https://meet.zoho.com/fwnx-vuy-ufv', 'https://meet.zoho.com/fwnx-vuy-ufv');
INSERT INTO public.psicologos (id, nombre, especialidad, imagen_url, rating, problemas_principales, total_resenas, cedula, pais_origen, email, biografia, usuario_id, servicios, precio_terapia_individual, precio_terapia_pareja, precio_asesoria_crianza, precio_terapia_individual_usd, precio_terapia_pareja_usd, precio_asesoria_crianza_usd, zoho_join_link, zoho_start_link) VALUES (5, 'Juan Manuel Leon Torres', 'Cognitivo Conductual', NULL, 5.0, '{Ansiedad,Autoestima,"Estrés laboral","Habilidades sociales","Síndrome burnout"}', 0, '121132376', 'México', 'juan.leon@psicologosenred.com', 'Soy psicólogo clínico egresado de la Universidad Nacional Autónoma de México (UNAM), con experiencia en ámbito hospitalario e investigación clínica. Comprometido a una constante capacitación y actualización con la finalidad de emplear los mejores recursos a mi alcance para el bienestar psicosocial de mis pacientes.

Me he especializado en terapia cognitivo conductual en adolescentes y adultos, evaluación psicológica, diseño e impartición de talleres psicológicos, atención a comorbilidades psicológicas en pacientes con enfermedades crónico degenerativas, intervención en crisis, terapia de pareja, terapia de aceptación y compromiso, así como en el diseño e implementación de estrategias para el cumplimiento de NOM 035 de la Secretaría del Trabajo y Previsión Social (STPS).', 11, '{"Terapia Individual","Terapia de Pareja"}', 600.00, 900.00, 700.00, 55.00, 75.00, 65.00, NULL, NULL);
INSERT INTO public.psicologos (id, nombre, especialidad, imagen_url, rating, problemas_principales, total_resenas, cedula, pais_origen, email, biografia, usuario_id, servicios, precio_terapia_individual, precio_terapia_pareja, precio_asesoria_crianza, precio_terapia_individual_usd, precio_terapia_pareja_usd, precio_asesoria_crianza_usd, zoho_join_link, zoho_start_link) VALUES (4, 'Alejandra Azuara', 'Psicoanálisis', '/images/alejandra_con_fondo.jpeg', 5.0, '{Adicciones,Ansiedad,Divorcio,Duelo,Orientación}', 0, '10860690', 'México', 'alejandra.azuara@psicologosenred.com', 'Soy psicóloga egresada de la Universidad Iberoamericana, con experiencia en niños, adolescentes y adultos; Co-autora del libro Clínica infantil: familia, juegos y sexualidad. En el espacio terapéutico escucharás y entenderás tu historia para poder darle un nuevo sentido en un ambiente de calidez y respeto.

Cuento con especialidades en clínica infantil, terapia de juego, psicoterapia del arte y una maestría en psicoterapia psicoanalítica. A lo largo de mis estudios y carrera profesional me he enfocado en los temas de psicoterapia psicoanalítica para adultos, clínica infantil, terapia de juego, intervención en adolescentes por medio de psicoterapia del arte y escuela para padres.', 10, '{"Terapia Individual","Asesoría de Crianza"}', 600.00, 900.00, 700.00, 55.00, 75.00, 65.00, NULL, NULL);
INSERT INTO public.psicologos (id, nombre, especialidad, imagen_url, rating, problemas_principales, total_resenas, cedula, pais_origen, email, biografia, usuario_id, servicios, precio_terapia_individual, precio_terapia_pareja, precio_asesoria_crianza, precio_terapia_individual_usd, precio_terapia_pareja_usd, precio_asesoria_crianza_usd, zoho_join_link, zoho_start_link) VALUES (8, 'Anahí Mérida González', 'Psicoanálisis', NULL, 5.0, '{Ansiedad,"Autoestima y autoconcepto","Relaciones coodependientes","Violencia de género"}', 0, '12189114', 'México', 'anahi.gonzalez@psicologosenred.com', 'Licenciada en psicología con especialidad en psicología clínica, comprometida con la perspectiva de género, dedicada a estudiar, diagnosticar y tratar problemas o trastornos psicológicos, teniendo en cuenta las formas de relacionarse de los individuos, trabajando en su prevención, diagnóstico y rehabilitación.', 14, '{"Terapia Individual"}', 600.00, 900.00, 700.00, 55.00, 75.00, 65.00, NULL, NULL);
INSERT INTO public.psicologos (id, nombre, especialidad, imagen_url, rating, problemas_principales, total_resenas, cedula, pais_origen, email, biografia, usuario_id, servicios, precio_terapia_individual, precio_terapia_pareja, precio_asesoria_crianza, precio_terapia_individual_usd, precio_terapia_pareja_usd, precio_asesoria_crianza_usd, zoho_join_link, zoho_start_link) VALUES (7, 'Iztaccihuatl Ramirez Cortes', 'Psicoanálisis', NULL, 5.0, '{Ansiedad,"Autoestima y autoconcepto",Duelo,"Violencia de género"}', 0, '6416067', 'México', 'iztaccihuatl.ramirez@psicologosenred.com', 'Licenciada en psicología clínica con corte psicoanalítico, egresada de la Universidad Latinoamericana. Comprometida con el estudio del comportamiento humano y el acompañamiento para el autodescubrimiento, la aceptación y el emprendimiento del paciente.', 13, '{"Terapia Individual","Terapia de Pareja"}', 600.00, 900.00, 700.00, 55.00, 75.00, 65.00, NULL, NULL);
INSERT INTO public.psicologos (id, nombre, especialidad, imagen_url, rating, problemas_principales, total_resenas, cedula, pais_origen, email, biografia, usuario_id, servicios, precio_terapia_individual, precio_terapia_pareja, precio_asesoria_crianza, precio_terapia_individual_usd, precio_terapia_pareja_usd, precio_asesoria_crianza_usd, zoho_join_link, zoho_start_link) VALUES (6, 'Magali Garcia Pacheco', 'Humanista', NULL, 5.0, '{"Abuso sexual","Acoso Sexual","Educación Sexual",Miedos,"Separación conyugal"}', 0, '6587764', 'México', 'magali.garcia@psicologosenred.com', 'Soy psicóloga, Tanatóloga Existencial, Psicoterapeuta Humanista con enfoque Existencial Fenomenológico Logoterapia y Gestalt (con 17 años de experiencia) con certificación por el Instituto Peruano de Psicoterapia, Asociación Peruana de Análisis Existencial y Logoterapia Viktor Frankl (APAEL), Sánchez Bodas y Counseling así como por el Centro de Terapia Integrativa; Maestría en Educación Sexual y Sexología Clínica por CISES (en curso). El acompañamiento terapéutico desde este enfoque reside en tomar una postura en relación con el otro, de tal forma que analizamos las expresiones o actos concretos de la existencia a través de un análisis biográfico y preventivo con el fin de lograr una existencia más libre, responsable, significativa y trascendente en coexistencia con -los otros -.
El acompañamiento del duelo desde la mirada existencial está basado en la compatía, es decir, «no puedo sentir lo que tú sientes pero si puedo sentirte y reconocerte como otro que siente dolor ya que solo así podré acompañar, explorar y analizar tu propio dolor».
La experiencia del duelo no es algo que deba superarse o cerrarse sino que habita en nosotros ya que como seres en apertura constante cambia.
Acompañarte en el duelo responde a la pregunta; ¿Cómo vivir en la ausencia de los seres que amamos?¿Qué haces con ese dolor, vacío, miedo …?', 12, '{"Terapia Individual","Asesoría de Crianza"}', 600.00, 900.00, 700.00, 55.00, 75.00, 65.00, NULL, NULL);

INSERT INTO public.vacaciones (id, psicologo_id, fecha_inicio, fecha_fin, motivo) VALUES (4, 1, '2026-02-02', '2026-02-04', 'Vacaciones');
INSERT INTO public.vacaciones (id, psicologo_id, fecha_inicio, fecha_fin, motivo) VALUES (5, 1, '2026-02-24', '2026-02-28', 'Nada en particular');

SELECT pg_catalog.setval('public.citas_id_seq', 22, true);
SELECT pg_catalog.setval('public.diplomados_id_seq', 3, true);
SELECT pg_catalog.setval('public.disponibilidad_especifica_id_seq', 5, true);
SELECT pg_catalog.setval('public.disponibilidad_id_seq', 15, true);
SELECT pg_catalog.setval('public.documentos_psicologo_id_seq', 4, true);
SELECT pg_catalog.setval('public.encuestas_satisfaccion_id_seq', 1, true);
SELECT pg_catalog.setval('public.mensajes_id_seq', 37, true);
SELECT pg_catalog.setval('public.opiniones_id_seq', 3, true);
SELECT pg_catalog.setval('public.psicologos_id_seq', 10, true);
SELECT pg_catalog.setval('public.usuarios_id_seq', 16, true);

ALTER TABLE ONLY public.chat_notificacion_email ADD CONSTRAINT chat_notificacion_email_pkey PRIMARY KEY (destinatario_id, remitente_id);
ALTER TABLE ONLY public.citas ADD CONSTRAINT citas_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.diplomados ADD CONSTRAINT diplomados_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.vacaciones ADD CONSTRAINT disponibilidad_especifica_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.horario_laboral ADD CONSTRAINT disponibilidad_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.horario_laboral ADD CONSTRAINT disponibilidad_psicologo_id_dia_semana_hora_inicio_key UNIQUE (psicologo_id, dia_semana, hora_inicio);
ALTER TABLE ONLY public.documentos_psicologo ADD CONSTRAINT documentos_psicologo_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.encuestas_satisfaccion ADD CONSTRAINT encuestas_satisfaccion_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.mensajes ADD CONSTRAINT mensajes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.opiniones ADD CONSTRAINT opiniones_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.psicologos ADD CONSTRAINT psicologos_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.usuarios ADD CONSTRAINT usuarios_email_key UNIQUE (email);
ALTER TABLE ONLY public.usuarios ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);

CREATE INDEX idx_diplomados_activo_orden ON public.diplomados USING btree (activo, orden) WHERE (activo = true);

ALTER TABLE ONLY public.chat_notificacion_email ADD CONSTRAINT chat_notificacion_email_destinatario_id_fkey FOREIGN KEY (destinatario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.chat_notificacion_email ADD CONSTRAINT chat_notificacion_email_remitente_id_fkey FOREIGN KEY (remitente_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.citas ADD CONSTRAINT citas_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.usuarios(id);
ALTER TABLE ONLY public.citas ADD CONSTRAINT citas_psicologo_id_fkey FOREIGN KEY (psicologo_id) REFERENCES public.psicologos(id);
ALTER TABLE ONLY public.vacaciones ADD CONSTRAINT disponibilidad_especifica_psicologo_id_fkey FOREIGN KEY (psicologo_id) REFERENCES public.psicologos(id);
ALTER TABLE ONLY public.horario_laboral ADD CONSTRAINT disponibilidad_psicologo_id_fkey FOREIGN KEY (psicologo_id) REFERENCES public.psicologos(id);
ALTER TABLE ONLY public.documentos_psicologo ADD CONSTRAINT documentos_psicologo_psicologo_id_fkey FOREIGN KEY (psicologo_id) REFERENCES public.psicologos(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.encuestas_satisfaccion ADD CONSTRAINT encuestas_satisfaccion_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);
ALTER TABLE ONLY public.psicologos ADD CONSTRAINT fk_usuario_psicologo FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);
ALTER TABLE ONLY public.mensajes ADD CONSTRAINT mensajes_destinatario_id_fkey FOREIGN KEY (destinatario_id) REFERENCES public.usuarios(id);
ALTER TABLE ONLY public.mensajes ADD CONSTRAINT mensajes_remitente_id_fkey FOREIGN KEY (remitente_id) REFERENCES public.usuarios(id);
ALTER TABLE ONLY public.opiniones ADD CONSTRAINT opiniones_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.usuarios(id);
ALTER TABLE ONLY public.opiniones ADD CONSTRAINT opiniones_psicologo_id_fkey FOREIGN KEY (psicologo_id) REFERENCES public.psicologos(id);
