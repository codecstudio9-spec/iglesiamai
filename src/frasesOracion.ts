/**
 * Banco de frases de "Ora aquí". El algoritmo (src/lib/prayerCompose.ts) arma
 * con ellas una respuesta cercana sin gastar IA: saludo + lo que siente +
 * quién está involucrado + una verdad de Dios + un paso pequeño para hoy.
 *
 * Para añadir frases basta con agregar líneas a cualquier lista.
 * Marcadores que el algoritmo reemplaza:
 *   {nombre}    el nombre de la persona (si no lo dio, se quita solo)
 *   {quien}     a quién menciona: "tu hijo Andrés", "tu mamá"...
 *   {situacion} lo concreto que vive: "esa entrevista", "esa deuda"...
 *
 * Voz: cada frase se graba una vez con Luján (npx tsx scripts/elevenlabs.mjs algoritmo).
 * En el audio el nombre se omite, {quien} se dice "esa persona" y {situacion}
 * "esta situación". Si cambias o agregas una frase, vuelve a correr ese comando.
 * No escribas versículos aquí: salen del catálogo verificado (versiculos.ts).
 */

export const aperturas = {
  manana: [
    "Qué bueno que empiezas el día hablando con Dios, {nombre}.",
    "{nombre}, antes de que el día te lleve, aquí estás con Él. Eso ya es un paso hermoso.",
    "Buenos días, {nombre}. Dios ya estaba esperando este momento contigo.",
  ],
  tarde: [
    "{nombre}, gracias por hacer una pausa en medio del día para venir a Dios.",
    "Qué bueno que te detienes un momento, {nombre}. Dios no tiene prisa contigo.",
    "{nombre}, en medio de todo lo que tienes hoy, Dios te recibe tal como llegas.",
  ],
  noche: [
    "{nombre}, qué bueno que terminas el día en las manos de Dios.",
    "Antes de descansar, {nombre}, dejas esto delante de Dios. Él te escucha.",
    "{nombre}, a esta hora, cuando todo se calla, Dios sigue despierto por ti.",
  ],
  siempre: [
    "{nombre}, gracias por abrir tu corazón. Lo que escribiste no cayó en el vacío: Dios lo leyó primero.",
    "Te leímos con cariño, {nombre}. No estás hablando solo al aire: Dios está aquí.",
    "{nombre}, qué valiente es decirle a Dios lo que de verdad pasa por dentro.",
  ],
}

/** Lo que la persona siente, detectado por palabras. La primera que aparezca gana. */
export const emociones: { id: string; claves: string[]; validar: string[] }[] = [
  {
    id: "miedo",
    claves: ["miedo", "temor", "asust", "panico", "nervios", "terror", "me da miedo"],
    validar: [
      "Sentir miedo no te hace débil; te hace humano. Y Dios no se aleja de los que tienen miedo, se acerca.",
      "El miedo grita fuerte, pero no tiene la última palabra. La tiene Dios.",
    ],
  },
  {
    id: "tristeza",
    claves: ["triste", "llor", "lagrima", "deprimid", "depresion", "vacio", "dolor", "me duele", "destroz", "roto", "rota"],
    validar: [
      "Se nota que te duele, y está bien que llores delante de Dios. Él no te pide que estés bien para venir.",
      "Esa tristeza es real, y Dios no la minimiza. Él guarda cada una de tus lágrimas.",
    ],
  },
  {
    id: "rabia",
    claves: ["rabia", "ira", "enojo", "enojad", "furia", "odio", "resentid", "me traicion", "injust"],
    validar: [
      "Lo que sientes es fuerte, y Dios puede recibirlo. Es mejor decírselo a Él que guardarlo por dentro.",
      "Tienes razones para sentirte herido. Dios no te juzga por lo que sientes: quiere sanar lo que te hirió.",
    ],
  },
  {
    id: "culpa",
    claves: ["culpa", "verguenza", "arrepent", "pequ", "falle", "me equivoque", "perdoname", "lo arruine"],
    validar: [
      "Que te pese lo que pasó muestra un corazón sensible. Dios no te recibe con reproches, sino con brazos abiertos.",
      "No tienes que esconderte de Dios. Él ya lo sabe todo, y aun así te llama por tu nombre.",
    ],
  },
  {
    id: "cansancio",
    claves: ["cansad", "agotad", "no puedo mas", "sin fuerzas", "harto", "harta", "rendir", "ya no aguanto", "desanim"],
    validar: [
      "Llevas mucho encima, y se nota. Aquí puedes soltar el peso un momento: no tienes que ser fuerte delante de Dios.",
      "Cuando ya no te quedan fuerzas, Dios no te pide más. Te ofrece las suyas.",
    ],
  },
  {
    id: "confusion",
    claves: ["no se que hacer", "confundid", "perdid", "no entiendo", "decidir", "decision", "no se si"],
    validar: [
      "No saber qué hacer es incómodo, pero es un buen lugar para empezar a escuchar a Dios.",
      "Está bien no tener todas las respuestas hoy. Dios no te pide claridad, te pide confianza.",
    ],
  },
  {
    id: "soledad",
    claves: ["solo", "sola", "nadie me", "abandon", "rechaz", "nadie entiende", "aislad"],
    validar: [
      "Sentirte solo duele mucho. Pero en este momento hay Alguien sentado contigo, y no se va a ir.",
      "Puede que nadie haya notado lo que cargas, pero Dios sí lo ve. Para Él no eres invisible.",
    ],
  },
  {
    id: "alegria",
    claves: ["gracias", "agradec", "feliz", "alegr", "bendicion", "bendijo", "milagro", "lo logre", "respondio"],
    validar: [
      "¡Qué alegría leerte! Agradecer es una de las oraciones que más honra a Dios.",
      "Esto merece celebrarse delante de Dios. Él se goza contigo.",
    ],
  },
]

/** Cuando menciona a alguien ("mi hijo", "mi mamá..."). */
export const quien = [
  "Dios ama a {quien} todavía más que tú, y no le quita los ojos de encima.",
  "Hoy no oras solo por ti: traes a {quien} delante de Dios, y Él escucha a quien intercede.",
  "Pones a {quien} en las mejores manos que existen.",
]

/** Situaciones concretas que conviene nombrar con delicadeza. */
export const situaciones: { claves: string[]; nombre: string }[] = [
  { claves: ["entrevista"], nombre: "esa entrevista" },
  { claves: ["examen", "parcial", "prueba del colegio", "icfes"], nombre: "ese examen" },
  { claves: ["deuda", "debo plata", "debo dinero"], nombre: "esa deuda" },
  { claves: ["arriendo"], nombre: "el arriendo" },
  { claves: ["sin trabajo", "desemple", "me echaron", "me despidieron", "busco trabajo", "buscando trabajo"], nombre: "la búsqueda de trabajo" },
  { claves: ["trabajo", "empleo", "jefe"], nombre: "lo que vives en el trabajo" },
  { claves: ["cirugia", "operacion", "me van a operar", "lo van a operar", "la van a operar"], nombre: "esa cirugía" },
  { claves: ["resultado", "diagnostic", "biopsia", "exámenes medicos", "examenes medicos"], nombre: "esos resultados" },
  { claves: ["cancer", "tumor", "quimio"], nombre: "esa enfermedad" },
  { claves: ["hospital", "clinica", "uci"], nombre: "esos días de hospital" },
  { claves: ["divorcio", "separacion", "nos separamos", "me dejo", "terminamos"], nombre: "esa ruptura" },
  { claves: ["embaraz", "bebe en camino"], nombre: "ese embarazo" },
  { claves: ["fallec", "murio", "partio", "perdi a"], nombre: "esa partida" },
  { claves: ["viaje", "viajar", "me voy del pais"], nombre: "ese viaje" },
  { claves: ["visa", "tramite", "papeles"], nombre: "ese trámite" },
  { claves: ["demanda", "juicio", "abogado", "proceso legal"], nombre: "ese proceso" },
  { claves: ["mudanza", "trasteo", "me mudo"], nombre: "esa mudanza" },
  { claves: ["universidad", "estudio", "estudios", "tesis"], nombre: "tus estudios" },
  { claves: ["negocio", "emprend"], nombre: "tu negocio" },
]

export const situacion = [
  "Dios sabe exactamente lo que significa {situacion} para ti, con cada detalle.",
  "Nada de {situacion} se le escapa a Dios; Él ya está ahí antes que tú.",
  "Pon {situacion} en sus manos: a Él no le queda grande.",
]

/** Una verdad de Dios para cada necesidad (ids de necesidades.json). */
export const verdades: Record<string, string[]> = {
  ansiedad: [
    "Dios tiene cuidado de ti, de verdad. No tienes que resolver el mañana hoy: Él ya está allá.",
    "Tu Padre conoce lo que necesitas antes de que se lo pidas. Puedes respirar.",
    "La paz de Dios no depende de que todo se arregle; llega aun en medio de lo que no entiendes.",
  ],
  fe: [
    "Dios no se ofende con tus dudas. Él sigue siendo fiel aunque tu fe sea pequeña como un grano de mostaza.",
    "Tu fe no se sostiene por lo que sientes, sino por quién es Él. Y Él no ha cambiado.",
    "Aunque te hayas alejado, el camino de vuelta siempre está abierto. Dios corre hacia el que regresa.",
  ],
  gratitud: [
    "Cada cosa buena que tienes viene de sus manos, y Él disfruta verte reconocerlo.",
    "Recordar lo que Dios ha hecho fortalece el corazón para lo que viene.",
    "Hasta aquí te ha ayudado Dios, y lo que empezó en ti lo va a terminar.",
  ],
  culpa: [
    "Cuando te arrepientes, Dios no solo perdona: limpia y vuelve a empezar contigo.",
    "En Cristo no hay condenación para ti. Tu error no es más grande que su gracia.",
    "Dios no te define por tu peor día. Te define como su hijo.",
  ],
  duelo: [
    "Dios está cerca de los que tienen el corazón quebrantado. Este dolor no lo cargas solo.",
    "Jesús lloró frente a la tumba de su amigo. Él entiende tu dolor desde adentro.",
    "El amor que sientes no se pierde. Dios guarda tus lágrimas y un día enjugará cada una.",
  ],
  enfermedad: [
    "Dios es tu sanador y tu sostén. Él está en la sala, en la camilla y en cada espera.",
    "Tu cuerpo puede estar débil, pero Dios es la fortaleza de tu corazón.",
    "Jesús tocó a los enfermos que nadie quería tocar. Hoy se acerca a ti con la misma compasión.",
  ],
  familia: [
    "Tu familia le importa a Dios más de lo que te importa a ti. Él trabaja aunque no lo veas.",
    "Lo que no puedes cambiar con tus fuerzas, Dios lo puede tocar con su amor.",
    "Dios es especialista en restaurar casas, relaciones y corazones que parecían perdidos.",
  ],
  direccion: [
    "Dios promete guiarte. No siempre muestra todo el camino, pero sí el siguiente paso.",
    "Si le pides sabiduría, Él te la da con gusto y sin reproches.",
    "Tus pasos están en sus manos. Cuando confías en Él, endereza tus veredas.",
  ],
  soledad: [
    "Dios te ve. Eres conocido, buscado y amado por Él, aunque otros no lo noten.",
    "Fuiste hecho con cuidado y propósito. Tu valor no depende de quién te acompaña hoy.",
    "Él prometió no dejarte ni desampararte. Esa promesa también es para hoy.",
  ],
  resentimiento: [
    "Perdonar no es decir que no dolió; es dejar que Dios cargue lo que tú ya no puedes.",
    "Dios es justo y ve lo que te hicieron. Puedes soltar la deuda en sus manos.",
    "Él puede sanar la herida para que deje de doler cada vez que la recuerdas.",
  ],
  cansancio: [
    "Jesús invita a los cansados a venir a Él. No para exigirte más, sino para darte descanso.",
    "Los que esperan en Dios renuevan sus fuerzas. Hoy puedes recibir de las suyas.",
    "Esta prueba no es el final de tu historia. Dios está obrando aun en el desierto.",
  ],
  conocer: [
    "Dios no está lejos. Te ha estado buscando, y hoy te encontró aquí.",
    "No tienes que arreglarte antes de venir a Jesús. Él te recibe tal como estás.",
    "El amor de Dios no se gana: se recibe. Y está abierto para ti hoy.",
  ],
  general: [
    "Dios se acerca a los que se acercan a Él. Este momento es suyo y tuyo.",
    "No hace falta tener palabras perfectas. Dios escucha el corazón.",
    "Él está más cerca de lo que imaginas, y se alegra de que hayas venido.",
  ],
}

/** Un paso pequeño y concreto para hoy. */
export const pasos: Record<string, string[]> = {
  ansiedad: [
    "Hoy haz esto: nombra en voz baja cada preocupación y, después de cada una, di: «Esto te lo dejo a ti, Señor».",
    "Respira hondo tres veces y dile a Dios: «Hoy confío en ti con lo que no puedo controlar».",
    "Escribe en un papel lo que te preocupa y guárdalo: es tu forma de dejárselo a Dios.",
  ],
  fe: [
    "Hoy dile con sinceridad: «Señor, creo; ayúdame en lo que dudo». Es una oración que Dios honra.",
    "Lee el versículo de abajo despacio, dos veces, y quédate con una sola frase durante el día.",
    "Da un paso pequeño hacia Dios hoy: cinco minutos de silencio con Él, sin pedir nada.",
  ],
  gratitud: [
    "Hoy anota tres cosas por las que das gracias, y díselas a Dios una por una.",
    "Cuéntale a alguien lo que Dios hizo. La gratitud compartida se multiplica.",
    "Al terminar el día, dile a Dios «gracias» por una cosa concreta de hoy.",
  ],
  culpa: [
    "Díselo a Dios sin rodeos, como a un Padre. Luego recibe su perdón y no lo vuelvas a cargar.",
    "Si alguien salió herido, pide a Dios valor para dar un paso de reconciliación.",
    "Hoy repite: «Soy perdonado en Cristo». Créelo más que a la culpa.",
  ],
  duelo: [
    "Date permiso de llorar hoy. Dile a Dios lo que extrañas, con nombre propio.",
    "Busca a alguien de confianza y cuéntale cómo estás. No tienes que atravesar esto solo.",
    "Hoy pide a Dios solo fuerza para este día. Mañana Él dará la de mañana.",
  ],
  enfermedad: [
    "Pon tu mano donde duele, o sobre la foto de esa persona, y pide a Dios que la toque.",
    "Hoy agradece por cada médico, enfermera y medicina: Dios también obra a través de ellos.",
    "Escríbenos para que la iglesia ore contigo. No tienes que esperar esto solo.",
  ],
  familia: [
    "Hoy menciona a cada miembro de tu familia por su nombre delante de Dios.",
    "Haz un gesto pequeño de amor hoy: un mensaje, un abrazo, una palabra amable.",
    "Antes de hablar con {quien}, ora un minuto. Dios puede preparar el corazón de los dos.",
  ],
  direccion: [
    "Hoy no decidas con prisa. Dile a Dios: «Muéstrame el siguiente paso, solo uno».",
    "Escribe las opciones que tienes y ora por cada una. Fíjate en cuál te da paz.",
    "Busca el consejo de alguien maduro en la fe antes de decidir.",
  ],
  soledad: [
    "Hoy di en voz alta: «Dios me ve y me ama». Repítelo aunque no lo sientas todavía.",
    "Da un paso hacia otros: un mensaje a alguien, o una visita a la iglesia este domingo.",
    "Cuéntale a Dios tu día como se lo contarías a un amigo cercano.",
  ],
  resentimiento: [
    "Hoy di el nombre de quien te hirió y luego: «Señor, te lo entrego a ti».",
    "No tienes que sentir perdón para empezar a perdonar. Pídele a Dios que lo haga contigo.",
    "Escribe lo que te dolió y pídele a Dios que sane ese recuerdo.",
  ],
  cansancio: [
    "Hoy date permiso de descansar sin culpa. El descanso también es obediencia.",
    "Suelta una sola carga hoy: una cosa que no te toca llevar a ti.",
    "Pide a Dios fuerza solo para hoy. No para la semana: solo para hoy.",
  ],
  conocer: [
    "Si quieres, dile hoy a Jesús: «Quiero conocerte. Entra en mi vida». Él responde a esa oración.",
    "Lee el Evangelio de Juan, un capítulo por día. Es un buen lugar para empezar.",
    "Ven a visitarnos un domingo: nos encantaría conocerte y caminar contigo.",
  ],
  general: [
    "Quédate un minuto en silencio con Dios después de leer el versículo.",
    "Lleva contigo una frase del versículo y repítela durante el día.",
    "Termina diciéndole a Dios lo que tengas en el corazón, con tus propias palabras.",
  ],
}

/** Por qué este versículo: se muestra debajo de la cita. */
export const porQue: Record<string, string[]> = {
  todas: [
    "Léelo despacio, como si Dios te lo dijera hoy a ti, {nombre}.",
    "Guárdalo en tu corazón hoy: Dios lo dejó escrito para momentos como el tuyo.",
    "Este versículo fue escogido pensando en lo que nos contaste.",
  ],
  ansiedad: ["Para una mente que no descansa: Dios te recuerda que Él sí está despierto."],
  duelo: ["Para un corazón roto: Dios no se aleja del que llora, se acerca."],
  culpa: ["Para quien carga culpa: esta es la voz de Dios, no la del reproche."],
  familia: ["Para los tuyos: es una promesa que puedes decir con el nombre de {quien}."],
  enfermedad: ["Para estos días de espera: Dios sostiene el cuerpo y el corazón."],
  cansancio: ["Para cuando ya no das más: Dios no te pide fuerza, te la da."],
  gratitud: ["Para celebrar: así le hablaban a Dios los que vieron su fidelidad."],
}

/** Oración escrita por lo que la persona entrega en un paso de "escribir". */
export const entrega = {
  apertura: [
    "Padre, recibe lo que {nombre} pone hoy en tus manos.",
    "Señor, aquí está {nombre}, entregándote lo que pesa en su corazón.",
    "Padre bueno, gracias porque escuchas a {nombre} en este momento.",
  ],
  aperturaQuien: [
    "Padre, {nombre} te presenta a {quien}. Tú conoces su vida mejor que nadie.",
    "Señor, ponemos a {quien} en tus manos, junto con el amor de {nombre}.",
  ],
  peticion: {
    ansiedad: ["Llena su mente de tu paz y enséñale a descansar en ti.", "Quita el afán y pon confianza donde hoy hay miedo."],
    fe: ["Fortalece su fe y hazte real en su vida otra vez.", "Rompe toda atadura y dale la libertad que solo tú das."],
    gratitud: ["Recibe su gratitud como una ofrenda agradable.", "Que nunca olvide tus beneficios."],
    culpa: ["Lava su corazón con tu perdón y dale un nuevo comienzo.", "Quita la vergüenza y vístele de tu gracia."],
    duelo: ["Consuela su corazón como solo tú puedes.", "Sé su refugio en este dolor y sostén cada día que viene."],
    enfermedad: ["Toca ese cuerpo con tu poder sanador y da sabiduría a los médicos.", "Sé fuerza en la debilidad y paz en cada espera."],
    familia: ["Obra en esa casa, sana las relaciones y guarda a cada uno.", "Toca el corazón de cada uno y acércalos a ti."],
    direccion: ["Dale sabiduría para decidir y paz para saber que vas delante.", "Abre las puertas correctas y cierra las que no convienen."],
    soledad: ["Recuérdale que no está solo y rodéale de personas que le amen.", "Muéstrale cuánto vale para ti."],
    resentimiento: ["Sana esa herida y dale la gracia para perdonar.", "Haz justicia tú, y libra su corazón de la amargura."],
    cansancio: ["Renueva sus fuerzas y dale descanso de verdad.", "Lleva tú la carga que ya no puede cargar."],
    conocer: ["Revélate a su vida y que pueda conocerte de verdad.", "Abre sus ojos para ver tu amor."],
    general: ["Que sienta tu presencia cerca hoy.", "Guarda su corazón y su día en tus manos."],
  } as Record<string, string[]>,
  cierre: ["En el nombre de Jesús. Amén.", "Confiamos en ti. En el nombre de Jesús, amén.", "Gracias porque ya escuchaste. Amén."],
}

/** Si menciona querer morir o hacerse daño: siempre primero el amor y la ayuda inmediata. */
export const crisis = [
  "{nombre}, gracias por decirlo. Lo que sientes es muy serio y tu vida vale muchísimo, para Dios y para nosotros. Por favor, no te quedes solo con esto: llama ahora a la Línea 106, alguien te va a escuchar con calma. Dios está contigo en este minuto, y nosotros también queremos acompañarte.",
]
