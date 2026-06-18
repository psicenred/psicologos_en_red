export function AvisoPrivacidadContent() {
  return (
    <>
      <div className="intro-texto">
        <p>
          <strong>Psicólogos en Red</strong> (en lo sucesivo &quot;Psicólogos en Red&quot;), en su
          carácter de Responsable, pone a su disposición el presente Aviso de Privacidad para
          informar sobre el tratamiento de sus datos personales.
        </p>
      </div>

      <h2>1. Datos Personales y Datos Sensibles</h2>
      <p>Para la operación del Marketplace y la gestión del expediente clínico, recabaremos:</p>
      <ul>
        <li>
          <strong>Datos Identificativos:</strong> Nombre, correo electrónico, edad y documentos de
          identidad (en caso de profesionales).
        </li>
        <li>
          <strong>Datos Patrimoniales:</strong> Información de pago procesada de forma externa y
          segura por <strong>Stripe</strong>.
        </li>
        <li>
          <strong>Datos Sensibles (Salud):</strong> Información sobre el estado de salud mental,
          diagnósticos, historial clínico y notas de evolución generadas durante las sesiones.
          Psicólogos en Red manifiesta que <strong>no graba ni almacena las sesiones de video</strong>
          , limitándose a proveer la infraestructura para la transmisión en tiempo real.
        </li>
      </ul>

      <h2>2. Finalidades del Tratamiento</h2>
      <p>Sus datos serán tratados para las siguientes finalidades:</p>

      <h3>A. Finalidades Necesarias (Relación Jurídica):</h3>
      <ul>
        <li>Gestionar el registro y perfiles de usuarios y profesionales.</li>
        <li>
          Almacenamiento y custodia del <strong>Expediente Clínico Digital</strong> dentro de la
          plataforma, conforme a la normativa sanitaria vigente en México.
        </li>
        <li>Procesamiento de pagos y gestión de facturación a través de Stripe.</li>
        <li>Validación de Títulos y Cédulas Profesionales de los especialistas.</li>
      </ul>

      <h3>B. Finalidades No Necesarias (Marketing):</h3>
      <ul>
        <li>
          Envío de boletines informativos (newsletters), promociones o publicidad de servicios
          relacionados con la salud mental. Usted podrá oponerse a estas finalidades en cualquier
          momento enviando un correo a <strong>contacto@psicologosenred.com</strong>.
        </li>
      </ul>

      <h2>3. Medidas de Seguridad y Almacenamiento</h2>
      <p>
        Dado que la información se almacena y procesa íntegramente en nuestro sitio web, hemos
        implementado:
      </p>
      <ul>
        <li>
          <strong>Protocolos de encriptación SSL/TLS</strong> para la transmisión de datos.
        </li>
        <li>
          <strong>Almacenamiento de expedientes clínicos</strong> con acceso restringido bajo
          credenciales de usuario.
        </li>
        <li>
          <strong>Periodo de Retención:</strong> Conservaremos sus datos personales por un periodo
          de <strong>1 año</strong> posterior a su última actividad en la plataforma, tras el cual se
          procederá a su cancelación y supresión definitiva, salvo obligaciones legales remanentes.
        </li>
      </ul>

      <h2>4. Transferencia de Datos</h2>
      <p>Sus datos personales podrán ser transferidos a:</p>
      <ul>
        <li>
          <strong>Profesionales de la Salud:</strong> Para que el psicólogo asignado pueda consultar
          su expediente y brindar la atención.
        </li>
        <li>
          <strong>Stripe:</strong> Exclusivamente para la gestión de cargos y reembolsos.
        </li>
        <li>
          <strong>Terceros proveedores de hosting:</strong> Quienes actúan como encargados del
          tratamiento bajo contratos de confidencialidad.
        </li>
      </ul>

      <h2>5. Derechos ARCO</h2>
      <p>
        Usted tiene derecho al <strong>Acceso, Rectificación, Cancelación u Oposición</strong> de sus
        datos. Para ejercerlos, debe enviar una solicitud a{' '}
        <strong>contacto@psicologosenred.com</strong> adjuntando una identificación oficial
        digitalizada y una descripción clara del derecho que desea ejercer. Responderemos en un
        plazo máximo de <strong>20 días hábiles</strong>.
      </p>

      <h2>6. Jurisdicción y Autoridad</h2>
      <p>
        Este aviso se rige por las leyes mexicanas. Si usted considera que su derecho a la
        protección de datos ha sido vulnerado, puede acudir ante el{' '}
        <strong>
          Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos
          Personales (INAI)
        </strong>
        .
      </p>

      <p className="fecha-actualizacion">Psicólogos en Red - Febrero 2026</p>
    </>
  );
}
