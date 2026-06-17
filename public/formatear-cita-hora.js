/**
 * Formateo de fecha/hora de citas en la zona horaria del usuario (navegador).
 * Si la cita trae fecha_hora_utc (ISO), se usa para mostrar correctamente en cualquier uso horario.
 */
(function (global) {
    function getCitaDateTime(cita) {
        if (cita.fecha_hora_utc) {
            var d = new Date(cita.fecha_hora_utc);
            if (!isNaN(d.getTime())) return d;
        }
        var horaPart = (cita.hora || '00:00:00').toString().trim().substring(0, 5);
        var parts = horaPart.split(':');
        var fechaCita = new Date(cita.fecha + 'T12:00:00');
        if (isNaN(fechaCita.getTime())) return new Date(0);
        fechaCita.setHours(parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, 0, 0);
        return fechaCita;
    }

    function formatearFechaCita(cita, opts) {
        opts = opts || {};
        var d = getCitaDateTime(cita);
        if (isNaN(d.getTime())) return (cita.fecha || '') + ' ' + (cita.hora || '').toString().slice(0, 5);
        return d.toLocaleDateString(opts.locale || 'es-MX', opts.dateOptions || { weekday: 'long', day: 'numeric', month: 'long' });
    }

    function formatearHoraCita(cita) {
        var d = getCitaDateTime(cita);
        if (isNaN(d.getTime())) return (cita.hora || '').toString().trim().slice(0, 5);
        return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    }

    global.FormatearCitaHora = {
        getCitaDateTime: getCitaDateTime,
        formatearFechaCita: formatearFechaCita,
        formatearHoraCita: formatearHoraCita
    };
})(typeof window !== 'undefined' ? window : this);
