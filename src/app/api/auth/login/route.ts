import { NextRequest, NextResponse } from 'next/server';
import { generateToken, setAuthCookie, DIAS_SESION_RECORDADA, DIAS_SESION_NORMAL } from '@/lib/auth';
import { validarBody } from '@/lib/validacion';
import { loginSchema } from '@/lib/schemas/auth';
import { autenticar } from '@/services/autenticacion';
import {
  claveIntento, ipDeRequest, estaBloqueado, registrarFallo, limpiarIntentos, VENTANA_BLOQUEO_MINUTOS,
} from '@/services/limiteLogin';

export async function POST(request: NextRequest) {
  try {
    const validacion = await validarBody(request, loginSchema);
    if (!validacion.ok) return validacion.response;
    const { email, password, recordarme } = validacion.data;

    const clave = claveIntento(email, ipDeRequest(request));
    if (await estaBloqueado(clave)) {
      return NextResponse.json(
        { error: `Demasiados intentos fallidos. Espera ${VENTANA_BLOQUEO_MINUTOS} minutos e inténtalo de nuevo.` },
        { status: 429 }
      );
    }

    const user = await autenticar(email, password);
    if (!user) {
      await registrarFallo(clave);
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }
    await limpiarIntentos(clave);

    const diasSesion = recordarme === false ? DIAS_SESION_NORMAL : DIAS_SESION_RECORDADA;
    const token = generateToken(
      { id: user.id, email: user.email, nombre: user.nombre, apellido: user.apellido },
      diasSesion
    );
    await setAuthCookie(token, diasSesion);

    return NextResponse.json({ success: true, user, redirectUrl: '/dashboard' });
  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 });
  }
}
