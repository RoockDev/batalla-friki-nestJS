import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
/**
 * He implementado el guard como AuthGuard('jwt') y no con el canActive que hicismos en clase
 * para probar, porque he estadp leyendo y buscando docu etc
 * que otra forma de hacerlo es asi y  Nest recomienda delegar autenticación en Passport Strategy porque
 *  Así  se evita repetir validación de token en cada guard y se centralizo la lógica JWT en JwtStrategy
 *  (ExtractJwt, secret, expiración y validate) como canActive lo puse en el otro ejercicio y así esta muy guay
 * tambien porque tengo yo todo el control, esta vez he querido probar a hacerlo así
 */