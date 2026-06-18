import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const registroSchema = z.object({
  nombre: z.string().min(2, 'Nombre demasiado corto'),
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  telefono: z.string().optional(),
  acepto_terminos: z
    .boolean()
    .refine((v) => v === true, { message: 'Debes aceptar los términos' }),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegistroInput = z.infer<typeof registroSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
