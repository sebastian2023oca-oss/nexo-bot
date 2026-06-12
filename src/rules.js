const rules = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid

        await sock.sendMessage(jid, {
            text: `📜 *Reglas de Nexo Bot*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*1. No hagas spam de comandos*

  ▸ Evita enviar muchos comandos seguidos o repetidos.
  ▸ El spam puede causar penalizaciones automáticas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*2. Respeta el tiempo entre comandos*

  ▸ Espera entre 1 y 3 segundos antes de usar otro comando.
  ▸ Esto ayuda a evitar bloqueos o baneos del bot en WhatsApp.
  ▸ El incumplimiento puede generar advertencias o sanciones.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*3. No abuses de errores o bugs*

  ▸ Aprovecharse de fallos del sistema para obtener ventajas está prohibido.
  ▸ Los usuarios que exploten errores podrán ser sancionados.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*4. No uses cuentas secundarias para obtener beneficios*

  ▸ Crear múltiples cuentas para conseguir recompensas extra no está permitido.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*5. Respeta a los demás usuarios*

  ▸ Evita insultos, acoso, amenazas o cualquier comportamiento tóxico.
  ▸ Mantén un ambiente agradable para todos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*6. No intentes dañar el funcionamiento del bot*

  ▸ Queda prohibido realizar acciones destinadas a sobrecargar, romper o afectar el sistema.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*7. Sigue las indicaciones del staff*

  ▸ Las decisiones de la administración tienen prioridad para mantener el orden y la estabilidad del servicio.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*8. Las sanciones son acumulativas*

  ▸ Advertencia → Suspensión temporal → Baneo permanente.
  ▸ La gravedad de la infracción puede alterar este proceso.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*9. El desconocimiento de las reglas no exime de su cumplimiento*

  ▸ Al utilizar Nexo Bot aceptas todas las normas establecidas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*10. Disfruta y juega limpio* 🎮

  ▸ Nexo Bot está diseñado para que todos tengan una experiencia justa y divertida.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        }, { quoted: mensaje })
    }
}

export default rules
