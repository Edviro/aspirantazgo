import { useJuego } from '../estado'
import { Boton } from '../componentes/Comunes'
import { RESPONSABLE as R } from '../../config'

function Privacidad() {
  return (
    <article>
      <h1>Política de privacidad</h1>
      <p className="meta">Última actualización: {R.actualizado}</p>
      <div className="resumen">
        <h2>En pocas palabras</h2>
        <ul>
          <li>A los niños <b>no les pedimos</b> nombre real, correo, teléfono, foto, ubicación ni voz.</li>
          <li>Solo guardamos un <b>nombre de jugador</b> (sin apellido), un <b>PIN cifrado</b>, el código del club, el personaje elegido y los puntajes.</li>
          <li><b>No hay chat</b>, ni mensajes entre jugadores, ni publicidad, ni compras, ni rastreadores de terceros.</li>
          <li>Los niños entran <b>solo a través de su club</b>, cuyo director obtiene antes la autorización de los padres.</li>
          <li>Cualquier padre o madre puede pedir que se <b>borren los datos</b> de su hijo cuando quiera.</li>
        </ul>
      </div>

      <h2>1. Quién es el responsable</h2>
      <p>{R.proyecto} es un proyecto educativo desarrollado por {R.nombre} ({R.ciudad}). Contacto para privacidad: <b>{R.correo}</b>.</p>

      <h2>2. Qué datos tratamos</h2>
      <h3>Conquistadores (menores de 16 años)</h3>
      <ul>
        <li>Código del club al que pertenecen.</li>
        <li>Nombre de jugador: solo el nombre o como le dicen en el club, nunca el apellido.</li>
        <li>PIN de 4 dígitos, guardado como <i>hash</i> irreversible (nadie puede leerlo, ni siquiera nosotros).</li>
        <li>Apariencia del personaje (tono de piel, peinado y color de pelo de un dibujo, no de una foto).</li>
        <li>Puntajes, tiempos de juego y fechas de los intentos (para el ranking y para evitar trampas).</li>
      </ul>
      <h3>Líderes y mayores de 16 años</h3>
      <ul>
        <li>Correo electrónico (solo para iniciar sesión con un enlace, sin contraseña).</li>
        <li>Nombre de jugador, rango (líder, Guía Mayor, Máster…) y puntajes.</li>
        <li>Si registran un club: nombre del club, ciudad, Campo, Unión y país.</li>
      </ul>
      <h3>Datos técnicos</h3>
      <p>Guardamos en el propio dispositivo un identificador de sesión para que no tengas que volver a entrar, tus preferencias de sonido y tus <b>medallas, parches y racha del reto del día</b>. Estos avances <b>no</b> se copian a nuestros servidores: si cambias de dispositivo o borras los datos del navegador, se pierden. Los puntajes, niveles superados y vidas sí se guardan en tu cuenta. No usamos cookies publicitarias ni herramientas de analítica de terceros.</p>

      <h2>3. Para qué los usamos</h2>
      <ul>
        <li>Hacer funcionar el juego y guardar tu progreso.</li>
        <li>Mostrar rankings: solo se ven el <b>nombre de jugador</b>, el nombre del club, la ciudad, el Campo y el país. Nunca datos de contacto.</li>
        <li>Proteger el juego: limitar intentos, bloquear accesos sospechosos y validar puntajes.</li>
      </ul>
      <p>No vendemos ni alquilamos datos. No los usamos para publicidad ni para crear perfiles comerciales. No tomamos decisiones automatizadas que afecten a nadie más allá del puntaje de un juego.</p>

      <h2>4. Consentimiento de los padres</h2>
      <p>Los menores solo pueden unirse con el código que les entrega el director de su club. Al registrar el club, el director se compromete a obtener antes la autorización firmada de los padres o tutores (ver «Para padres»). Este modelo busca cumplir con la Ley N.° 29733 de Perú y su Reglamento (D.S. 016-2024-JUS), que exigen el consentimiento de los padres para menores de 14 años, y con normas equivalentes de otros países como COPPA (Estados Unidos), el RGPD (Unión Europea), la LGPD y el ECA Digital (Brasil) y la PIPL (China).</p>
      <p>También existe un <b>modo práctica</b> sin cuenta: todo queda guardado solo en el dispositivo y no se envía nada a nuestros servidores.</p>

      <h2>5. Dónde se guardan</h2>
      <p>Los datos se alojan en Supabase (servidores en São Paulo, Brasil) y la web se sirve a través de una red de distribución de contenido. Esto implica una transferencia internacional de datos con proveedores que aplican cifrado en tránsito y en reposo.</p>

      <h2>6. Cuánto tiempo</h2>
      <p>Mientras la cuenta esté activa. Las cuentas sin actividad durante 24 meses se eliminan automáticamente. Los registros técnicos de intentos se borran a los 7 días.</p>

      <h2>7. Tus derechos</h2>
      <p>Puedes acceder, corregir, cancelar u oponerte al tratamiento de tus datos. Desde el juego puedes <b>borrar tu cuenta</b> en el menú, y el director del club puede eliminar a cualquier miembro. También puedes escribirnos a {R.correo}. Responderemos en los plazos que fija la ley. Si no estás conforme, puedes acudir a la autoridad de protección de datos de tu país (en Perú, la Autoridad Nacional de Protección de Datos Personales del MINJUSDH).</p>

      <h2>8. Seguridad</h2>
      <p>Usamos conexiones cifradas, PIN con hash, bloqueo tras varios intentos fallidos y reglas de acceso en la base de datos que impiden leer datos de otros jugadores.</p>

      <h2>9. Cambios</h2>
      <p>Si cambiamos esta política, lo avisaremos dentro del juego y, si el cambio afecta a menores, pediremos de nuevo la autorización cuando corresponda.</p>
    </article>
  )
}

function Terminos() {
  return (
    <article>
      <h1>Términos de uso</h1>
      <p className="meta">Última actualización: {R.actualizado}</p>
      <h2>1. Qué es Aspirantazgo</h2>
      <p>Un juego educativo y gratuito para aprender el programa de Conquistadores. No reemplaza al manual oficial ni a las indicaciones de tus líderes: ante cualquier diferencia, manda el manual vigente de tu División.</p>
      <h2>2. Relación con la organización</h2>
      <p>Aspirantazgo es una iniciativa independiente. Los emblemas e insignias del Club de Conquistadores pertenecen a sus titulares y se usan con fines educativos. Salvo que se indique lo contrario, este juego no es un producto oficial de la Iglesia Adventista del Séptimo Día ni de la División Sudamericana.</p>
      <h2>3. Quién puede jugar</h2>
      <ul>
        <li>Conquistadores a partir de 10 años, únicamente a través del código de su club y con la autorización de sus padres.</li>
        <li>Líderes y mayores de 16 años con su propio correo.</li>
        <li>Cualquiera puede usar el modo práctica sin cuenta.</li>
      </ul>
      <h2>4. Reglas de juego limpio</h2>
      <ul>
        <li>Usa solo tu nombre (sin apellido), respetuoso y sin teléfonos, correos ni enlaces.</li>
        <li>No intentes alterar puntajes, automatizar partidas ni entrar en cuentas ajenas.</li>
        <li>El director del club y el responsable del juego pueden eliminar nombres o cuentas que incumplan estas reglas.</li>
      </ul>
      <h2>5. Directores de club</h2>
      <p>Quien registra un club declara ser líder del mismo, se compromete a recoger y conservar la autorización firmada de los padres antes de entregar el código a cada menor, y a eliminar a un miembro cuando sus padres lo pidan.</p>
      <h2>6. Servicio y responsabilidad</h2>
      <p>El juego se ofrece «tal cual», sin garantía de disponibilidad continua. Podemos cambiar niveles, puntajes o rankings para mejorar el juego. En la medida que lo permita la ley, el responsable no responde por daños indirectos derivados del uso del juego.</p>
      <h2>7. Ley aplicable</h2>
      <p>Estos términos se rigen por las leyes de la República del Perú, sin perjuicio de los derechos que te otorguen las leyes de protección al consumidor y de datos de tu país.</p>
      <h2>8. Contacto</h2>
      <p>{R.correo}</p>
    </article>
  )
}

function Padres() {
  return (
    <article>
      <h1>Para padres y tutores</h1>
      <p>Aspirantazgo ayuda a los Conquistadores a aprender el uniforme, las clases y las especialidades jugando. Lo diseñamos para que tu hijo o hija pueda jugar <b>sin entregar datos personales</b>: solo su nombre (sin apellido) y un PIN.</p>
      <ul>
        <li>No hay chat ni forma de que otros jugadores le escriban.</li>
        <li>No hay publicidad, compras ni enlaces a otras webs.</li>
        <li>En los rankings solo aparece su nombre (sin apellido) y su club.</li>
        <li>Puedes pedir al director del club que borre su cuenta en cualquier momento, o escribir a {R.correo}.</li>
      </ul>
      <h2>Modelo de autorización</h2>
      <p className="ayuda">Directores: impriman esta hoja, háganla firmar y guárdenla en el archivo del club.</p>
      <div className="carta">
        <h3>AUTORIZACIÓN DE PADRE, MADRE O TUTOR</h3>
        <p>Yo, ______________________________________, con documento N.° ________________, padre / madre / tutor del Conquistador(a) ______________________________________, miembro del Club ______________________________,</p>
        <p><b>AUTORIZO</b> a que mi hijo(a) participe en el juego educativo «{R.proyecto}», usando el código de su club, un apodo que no sea su nombre real y un PIN. Declaro haber leído la Política de privacidad y entiendo que solo se tratan su apodo, el código del club, la apariencia de su personaje y sus puntajes, con fines educativos y de ranking, y que puedo pedir su eliminación en cualquier momento al director del club o a {R.correo}.</p>
        <p>Lugar y fecha: ______________________ &nbsp;&nbsp; Firma: ______________________</p>
      </div>
      <Boton tipo="azul" onClick={() => window.print()}>Imprimir autorización</Boton>
    </article>
  )
}

export default function Legal() {
  const { legalTab, verLegal, perfil, ir } = useJuego()
  return (
    <div className="pantalla legal">
      <header className="juego-cabeza">
        <button className="icono" onClick={() => ir(perfil ? 'mapa' : 'acceso')} aria-label="Volver">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="tabs legal-tabs" role="tablist">
          <button className={legalTab === 'privacidad' ? 'on' : ''} onClick={() => verLegal('privacidad')}>Privacidad</button>
          <button className={legalTab === 'terminos' ? 'on' : ''} onClick={() => verLegal('terminos')}>Términos</button>
          <button className={legalTab === 'padres' ? 'on' : ''} onClick={() => verLegal('padres')}>Para padres</button>
        </div>
      </header>
      <div className="legal-cuerpo">
        {legalTab === 'privacidad' && <Privacidad />}
        {legalTab === 'terminos' && <Terminos />}
        {legalTab === 'padres' && <Padres />}
      </div>
    </div>
  )
}
