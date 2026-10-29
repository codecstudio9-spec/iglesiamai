/**
 * "Palabra de hoy": daily Bible passages (Reina-Valera 1960) with a short
 * explanation and a personal message. The selection changes every day and
 * can be personalized with the visitor's name and how they feel today.
 */

export type Mood =
  | "ansiedad"
  | "tristeza"
  | "cansancio"
  | "miedo"
  | "soledad"
  | "direccion"
  | "gratitud"

export const moods: { id: Mood; label: string }[] = [
  { id: "ansiedad", label: "Con ansiedad" },
  { id: "tristeza", label: "Con tristeza" },
  { id: "cansancio", label: "Con cansancio" },
  { id: "miedo", label: "Con miedo" },
  { id: "soledad", label: "En soledad" },
  { id: "direccion", label: "Buscando dirección" },
  { id: "gratitud", label: "Con gratitud" },
]

export type Word = {
  ref: string
  text: string
  moods: Mood[]
  explanation: string
  message: string
}

export const words: Word[] = [
  {
    ref: "Sofonías 3:17",
    text: "Jehová está en medio de ti, poderoso, él salvará; se gozará sobre ti con alegría, callará de amor, se regocijará sobre ti con cánticos.",
    moods: ["tristeza", "soledad", "gratitud"],
    explanation: "Sofonías habla a un pueblo que había fallado, y aun así Dios no se presenta como un juez lejano, sino como alguien que se alegra y canta sobre los suyos. El amor de Dios no es tolerancia: es deleite.",
    message: "Hoy no eres una carga para Dios. Él se alegra de ti, aun en los días en que a ti te cuesta verlo. Deja que Su amor te calle las voces que te acusan.",
  },
  {
    ref: "Lamentaciones 3:22-23",
    text: "Por la misericordia de Jehová no hemos sido consumidos, porque nunca decayeron sus misericordias. Nuevas son cada mañana; grande es tu fidelidad.",
    moods: ["tristeza", "cansancio"],
    explanation: "Jeremías escribe en medio de las ruinas de Jerusalén. En el centro de un libro de lamento aparece esta declaración: la fidelidad de Dios no se agotó, se renueva cada mañana.",
    message: "Lo de ayer no tiene la última palabra sobre tu hoy. Esta mañana hay misericordia nueva para ti, hecha a la medida de lo que vas a vivir.",
  },
  {
    ref: "Habacuc 3:17-18",
    text: "Aunque la higuera no florezca, ni en las vides haya frutos, aunque falte el producto del olivo, y los labrados no den mantenimiento, y las ovejas sean quitadas de la majada, y no haya vacas en los corrales; con todo, yo me alegraré en Jehová, y me gozaré en el Dios de mi salvación.",
    moods: ["tristeza", "ansiedad", "gratitud"],
    explanation: "Habacuc enumera todo lo que podía faltar en la economía de su tiempo, y luego decide alegrarse en Dios. Su gozo no depende de las circunstancias, sino de Quién es Dios.",
    message: "Quizás algo no está floreciendo como esperabas. Hoy puedes elegir, como Habacuc, poner tu alegría en Aquel que no cambia, aunque todo lo demás cambie.",
  },
  {
    ref: "Isaías 43:2",
    text: "Cuando pases por las aguas, yo estaré contigo; y si por los ríos, no te anegarán. Cuando pases por el fuego, no te quemarás, ni la llama arderá en ti.",
    moods: ["miedo", "ansiedad"],
    explanation: "Dios no promete que no habrá aguas ni fuego; promete que no pasaremos por ellos solos. La palabra clave es \"cuando\": la prueba llega, pero Su presencia también.",
    message: "Lo que estás atravesando no te va a ahogar. Dios ya está dentro de esa situación, esperándote para caminar contigo hasta el otro lado.",
  },
  {
    ref: "Nahúm 1:7",
    text: "Jehová es bueno, fortaleza en el día de la angustia; y conoce a los que en él confían.",
    moods: ["ansiedad", "miedo"],
    explanation: "En un libro que anuncia juicio sobre Nínive, Nahúm se detiene para recordar el carácter de Dios: es bueno, es refugio y conoce personalmente a quienes confían en Él.",
    message: "Dios no solo sabe lo que te pasa; te conoce a ti. Tu nombre, tu historia y tu angustia de hoy están delante de un Dios bueno.",
  },
  {
    ref: "1 Samuel 30:6",
    text: "Y David se angustió mucho, porque el pueblo hablaba de apedrearle… mas David se fortaleció en Jehová su Dios.",
    moods: ["cansancio", "soledad", "tristeza"],
    explanation: "David lo había perdido todo y hasta sus hombres estaban en su contra. Nadie lo animó, así que él buscó fuerzas directamente en Dios. Después de ese momento vino la restauración.",
    message: "Hay días en que nadie te dirá \"tú puedes\". Hoy puedes hacer lo que hizo David: hablar con Dios, recordar quién es Él y levantarte con Sus fuerzas.",
  },
  {
    ref: "Salmos 34:18",
    text: "Cercano está Jehová a los quebrantados de corazón; y salva a los contritos de espíritu.",
    moods: ["tristeza"],
    explanation: "El salmista asegura que el dolor no aleja a Dios; al contrario, lo acerca. Él no espera a que estemos bien para acercarse.",
    message: "Si hoy tu corazón está roto, Dios no está lejos. Está más cerca de lo que imaginas. Puedes decirle exactamente cómo te sientes.",
  },
  {
    ref: "Isaías 40:29, 31",
    text: "Él da esfuerzo al cansado, y multiplica las fuerzas al que no tiene ningunas… pero los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como las águilas; correrán, y no se cansarán; caminarán, y no se fatigarán.",
    moods: ["cansancio"],
    explanation: "Isaías contrasta la fuerza humana, que se agota, con la de Dios, que se multiplica en quien espera en Él. Esperar en Dios no es pasividad: es depender activamente de Su fuerza.",
    message: "No tienes que fingir que puedes con todo. Dios da fuerzas precisamente a quien ya no tiene. Hoy entrégale tu cansancio y recibe Sus fuerzas nuevas.",
  },
  {
    ref: "Isaías 41:10",
    text: "No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo; siempre te ayudaré, siempre te sustentaré con la diestra de mi justicia.",
    moods: ["miedo"],
    explanation: "Cada orden (\"no temas\", \"no desmayes\") viene acompañada de una razón: Dios está contigo, Dios es tu Dios, Dios te ayuda. La valentía nace de Su presencia.",
    message: "El miedo te dice que enfrentas esto sin nadie. Dios te dice: \"Yo estoy contigo\". Hoy camina sostenido por Su mano.",
  },
  {
    ref: "Deuteronomio 31:8",
    text: "Y Jehová va delante de ti; él estará contigo, no te dejará, ni te desamparará; no temas ni te intimides.",
    moods: ["miedo", "soledad", "direccion"],
    explanation: "Moisés anima a Josué antes de entrar a una tierra nueva. Dios no solo acompaña: va delante, preparando el camino.",
    message: "Donde vas hoy, Dios ya llegó primero. No entras a lo desconocido sin Él.",
  },
  {
    ref: "Josué 1:9",
    text: "Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas.",
    moods: ["miedo", "direccion"],
    explanation: "Josué recibe una tarea enorme. Dios no le promete que será fácil, sino que no estará solo en ningún lugar al que vaya.",
    message: "La valentía no es ausencia de miedo, es avanzar sabiendo que Dios va contigo. Da hoy ese paso que has estado posponiendo.",
  },
  {
    ref: "Salmos 121:1-2",
    text: "Alzaré mis ojos a los montes; ¿De dónde vendrá mi socorro? Mi socorro viene de Jehová, que hizo los cielos y la tierra.",
    moods: ["ansiedad", "miedo"],
    explanation: "Este salmo lo cantaban los peregrinos camino a Jerusalén. Ante el camino difícil, levantaban la mirada y recordaban que su ayuda venía del Creador.",
    message: "Levanta hoy la mirada. El mismo Dios que hizo los cielos se interesa por tu situación concreta.",
  },
  {
    ref: "Proverbios 3:5-6",
    text: "Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia. Reconócelo en todos tus caminos, y él enderezará tus veredas.",
    moods: ["direccion"],
    explanation: "Salomón invita a confiar en Dios con todo el corazón, no solo en parte. Reconocerlo en cada área de la vida es la clave para que Él dirija el camino.",
    message: "No tienes que tener todas las respuestas hoy. Invita a Dios a cada decisión, por pequeña que sea, y confía en que Él enderezará lo que está torcido.",
  },
  {
    ref: "Mateo 11:28",
    text: "Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.",
    moods: ["cansancio", "ansiedad"],
    explanation: "Jesús no pide a los cansados que primero se arreglen. Los invita a venir tal como están, y promete descanso para el alma.",
    message: "Jesús te invita hoy, con todo lo que llevas encima. No necesitas fuerzas para ir a Él; Él es quien te las da.",
  },
  {
    ref: "Filipenses 4:6-7",
    text: "Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias. Y la paz de Dios, que sobrepasa todo entendimiento, guardará vuestros corazones y vuestros pensamientos en Cristo Jesús.",
    moods: ["ansiedad"],
    explanation: "Pablo escribe desde la cárcel. Su receta para la ansiedad es convertir cada preocupación en oración y agradecimiento. El resultado es una paz que guarda la mente como un centinela.",
    message: "Haz hoy una lista de lo que te preocupa y conviértela en oración. Dale gracias a Dios por lo que ya ha hecho, y deja que Su paz cuide tus pensamientos.",
  },
  {
    ref: "Romanos 8:28",
    text: "Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien, esto es, a los que conforme a su propósito son llamados.",
    moods: ["tristeza", "direccion"],
    explanation: "Pablo no dice que todas las cosas son buenas, sino que Dios las hace obrar para bien en la vida de quienes lo aman. Nada se desperdicia en Sus manos.",
    message: "Aun lo que hoy no entiendes puede ser parte de algo bueno que Dios está tejiendo. Confía en el Tejedor, aunque todavía no veas el diseño.",
  },
  {
    ref: "2 Corintios 12:9",
    text: "Y me ha dicho: Bástate mi gracia; porque mi poder se perfecciona en la debilidad. Por tanto, de buena gana me gloriaré más bien en mis debilidades, para que repose sobre mí el poder de Cristo.",
    moods: ["cansancio", "tristeza"],
    explanation: "Pablo pidió tres veces ser librado de un sufrimiento. Dios no se lo quitó, pero le dio algo mejor: gracia suficiente y Su poder actuando en medio de la debilidad.",
    message: "Tu debilidad no espanta a Dios; es el lugar donde Su poder se nota más. Hoy Su gracia te alcanza.",
  },
  {
    ref: "Éxodo 14:14",
    text: "Jehová peleará por vosotros, y vosotros estaréis tranquilos.",
    moods: ["ansiedad", "miedo"],
    explanation: "Israel estaba atrapado entre el mar y el ejército egipcio. Dios les pide calma porque la batalla le pertenece a Él. Poco después abrió el mar.",
    message: "Hay batallas que no te toca pelear a ti. Hoy descansa en que Dios está peleando por ti.",
  },
  {
    ref: "Miqueas 7:8",
    text: "Tú, enemiga mía, no te alegres de mí, porque aunque caí, me levantaré; aunque more en tinieblas, Jehová será mi luz.",
    moods: ["tristeza", "cansancio"],
    explanation: "Miqueas reconoce la caída, pero declara que no es el final. En medio de la oscuridad, Dios mismo es su luz.",
    message: "Caer no te define; levantarte con Dios sí. Hoy puedes declarar: \"Me levantaré\".",
  },
  {
    ref: "Salmos 30:5",
    text: "Porque un momento será su ira, pero su favor dura toda la vida. Por la noche durará el lloro, y a la mañana vendrá la alegría.",
    moods: ["tristeza"],
    explanation: "David contrasta lo pasajero con lo permanente: el llanto tiene una noche, pero el favor de Dios es para toda la vida.",
    message: "Esta noche no es para siempre. Dios tiene preparada una mañana para ti.",
  },
  {
    ref: "Jeremías 29:11",
    text: "Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis.",
    moods: ["direccion", "ansiedad"],
    explanation: "Estas palabras fueron dichas a un pueblo en el exilio, que debía esperar setenta años. Los planes de Dios son buenos, aunque requieran paciencia.",
    message: "Dios piensa en ti, y Sus pensamientos son de paz. Si hoy estás en temporada de espera, no estás olvidado.",
  },
  {
    ref: "Jeremías 33:3",
    text: "Clama a mí, y yo te responderé, y te enseñaré cosas grandes y ocultas que tú no conoces.",
    moods: ["direccion"],
    explanation: "Jeremías recibe esta palabra estando preso. Dios lo invita a orar y le promete revelación más allá de lo que él podía ver.",
    message: "Hoy Dios te invita a una conversación. Pregúntale, clama, y prepárate para escuchar.",
  },
  {
    ref: "Salmos 37:5",
    text: "Encomienda a Jehová tu camino, y confía en él; y él hará.",
    moods: ["direccion", "ansiedad"],
    explanation: "\"Encomendar\" es como quitarse una carga y ponerla en otras manos. La promesa final es breve y poderosa: \"y él hará\".",
    message: "Entrega hoy ese proyecto, esa decisión o esa persona en manos de Dios. Él hará lo que tú no puedes.",
  },
  {
    ref: "Salmos 37:23-24",
    text: "Por Jehová son ordenados los pasos del hombre, y él aprueba su camino. Cuando el hombre cayere, no quedará postrado, porque Jehová sostiene su mano.",
    moods: ["direccion", "tristeza"],
    explanation: "David, ya anciano, testifica que Dios guía los pasos y sostiene la mano aun cuando tropezamos.",
    message: "Tu tropiezo no es el final del camino. Dios no te suelta la mano.",
  },
  {
    ref: "Hebreos 4:16",
    text: "Acerquémonos, pues, confiadamente al trono de la gracia, para alcanzar misericordia y hallar gracia para el oportuno socorro.",
    moods: ["miedo", "tristeza", "ansiedad"],
    explanation: "Porque Jesús entiende nuestras debilidades, podemos acercarnos a Dios con confianza, no con temor. Allí encontramos ayuda justo a tiempo.",
    message: "No tienes que esconderte de Dios. Hoy puedes acercarte con confianza y recibir la ayuda que necesitas.",
  },
  {
    ref: "1 Pedro 5:7",
    text: "echando toda vuestra ansiedad sobre él, porque él tiene cuidado de vosotros.",
    moods: ["ansiedad"],
    explanation: "Pedro usa un verbo que significa lanzar con fuerza. La razón para hacerlo es simple: Dios cuida de nosotros.",
    message: "Lanza hoy sobre Dios lo que te quita el sueño. Él te cuida a ti.",
  },
  {
    ref: "Juan 14:27",
    text: "La paz os dejo, mi paz os doy; yo no os la doy como el mundo la da. No se turbe vuestro corazón, ni tenga miedo.",
    moods: ["miedo", "ansiedad"],
    explanation: "Jesús dice estas palabras la noche antes de la cruz. Su paz no depende de que todo esté bien; es Su propia paz compartida con nosotros.",
    message: "Jesús te ofrece hoy Su paz, no una paz frágil. Recíbela y deja que calme tu corazón.",
  },
  {
    ref: "Juan 16:33",
    text: "Estas cosas os he hablado para que en mí tengáis paz. En el mundo tendréis aflicción; pero confiad, yo he vencido al mundo.",
    moods: ["miedo", "cansancio"],
    explanation: "Jesús es honesto: habrá aflicción. Pero también es claro: Él ya venció. La paz está \"en Él\", no en la ausencia de problemas.",
    message: "No te sorprendas por las dificultades, pero tampoco te rindas ante ellas. Estás del lado de Quien ya venció.",
  },
  {
    ref: "Salmos 91:1-2",
    text: "El que habita al abrigo del Altísimo morará bajo la sombra del Omnipotente. Diré yo a Jehová: Esperanza mía, y castillo mío; mi Dios, en quien confiaré.",
    moods: ["miedo"],
    explanation: "El salmo describe a Dios como un refugio y un castillo. La protección es para quien \"habita\" con Él, no para quien solo lo visita de vez en cuando.",
    message: "Haz de Dios tu casa, no solo tu emergencia. Hoy puedes descansar bajo Su sombra.",
  },
  {
    ref: "Isaías 54:10",
    text: "Porque los montes se moverán, y los collados temblarán, pero no se apartará de ti mi misericordia, ni el pacto de mi paz se quebrantará, dijo Jehová, el que tiene misericordia de ti.",
    moods: ["soledad", "tristeza"],
    explanation: "Dios compara Su amor con lo más estable que conocían: las montañas. Aun si ellas se movieran, Su misericordia no se apartaría.",
    message: "Las personas pueden irse y las cosas pueden cambiar, pero el amor de Dios por ti no se va a mover.",
  },
  {
    ref: "Salmos 147:3",
    text: "Él sana a los quebrantados de corazón, y venda sus heridas.",
    moods: ["tristeza"],
    explanation: "El mismo Dios que cuenta las estrellas (versículo 4) se inclina a vendar heridas. Su grandeza no le impide ser tierno.",
    message: "Dios conoce cada herida que llevas. Hoy puedes permitirle que te sane.",
  },
  {
    ref: "Isaías 26:3",
    text: "Tú guardarás en completa paz a aquel cuyo pensamiento en ti persevera; porque en ti ha confiado.",
    moods: ["ansiedad"],
    explanation: "La paz completa está conectada con dónde ponemos los pensamientos. Perseverar en Dios es volver a Él una y otra vez.",
    message: "Cada vez que la preocupación aparezca hoy, vuelve tu pensamiento a Dios. Ahí está tu paz.",
  },
  {
    ref: "Gálatas 6:9",
    text: "No nos cansemos, pues, de hacer bien; porque a su tiempo segaremos, si no desmayamos.",
    moods: ["cansancio"],
    explanation: "Pablo anima a quienes siembran sin ver resultados todavía. La cosecha tiene su tiempo.",
    message: "Lo bueno que estás haciendo no es en vano. No te rindas: tu cosecha viene.",
  },
  {
    ref: "Filipenses 1:6",
    text: "estando persuadido de esto, que el que comenzó en vosotros la buena obra, la perfeccionará hasta el día de Jesucristo;",
    moods: ["direccion", "cansancio"],
    explanation: "Pablo confía en que Dios termina lo que empieza. La obra en nuestra vida no depende solo de nuestro esfuerzo.",
    message: "Dios no ha terminado contigo. Lo que Él empezó en tu vida, lo va a completar.",
  },
  {
    ref: "Salmos 16:11",
    text: "Me mostrarás la senda de la vida; en tu presencia hay plenitud de gozo; delicias a tu diestra para siempre.",
    moods: ["gratitud", "direccion"],
    explanation: "David encuentra en la presencia de Dios no solo dirección, sino gozo completo. El camino y la alegría vienen juntos.",
    message: "Busca hoy un momento a solas con Dios. En Su presencia hay una alegría que nada más te puede dar.",
  },
  {
    ref: "Salmos 27:1",
    text: "Jehová es mi luz y mi salvación; ¿de quién temeré? Jehová es la fortaleza de mi vida; ¿de quién he de atemorizarme?",
    moods: ["miedo"],
    explanation: "David responde a sus miedos con preguntas que llevan a la confianza. Si Dios es luz, salvación y fortaleza, el miedo pierde su fuerza.",
    message: "Mira hoy tus miedos a la luz de quién es Dios. Son más pequeños de lo que parecen.",
  },
  {
    ref: "Génesis 50:20",
    text: "Vosotros pensasteis mal contra mí, mas Dios lo encaminó a bien, para hacer lo que vemos hoy, para mantener en vida a mucho pueblo.",
    moods: ["tristeza", "direccion"],
    explanation: "José fue traicionado por sus hermanos y pasó años de injusticia. Al final reconoce que Dios usó todo para salvar a muchos.",
    message: "Lo que otros hicieron para mal, Dios puede usarlo para bien. Tu historia todavía se está escribiendo.",
  },
  {
    ref: "Éxodo 33:14",
    text: "Y él dijo: Mi presencia irá contigo, y te daré descanso.",
    moods: ["cansancio", "soledad"],
    explanation: "Moisés no quería avanzar sin Dios. La respuesta divina une dos regalos: compañía y descanso.",
    message: "Hoy no caminas sin compañía, y no tienes que cargar todo. La presencia de Dios va contigo y te da descanso.",
  },
  {
    ref: "Números 6:24-26",
    text: "Jehová te bendiga, y te guarde; Jehová haga resplandecer su rostro sobre ti, y tenga de ti misericordia; Jehová alce sobre ti su rostro, y ponga en ti paz.",
    moods: ["gratitud"],
    explanation: "Esta es la bendición que Dios mandó a los sacerdotes pronunciar sobre Su pueblo. Habla de protección, favor y paz.",
    message: "Recibe hoy esta bendición como dicha para ti: Dios te guarda, te mira con favor y pone paz en tu vida.",
  },
  {
    ref: "Salmos 139:13-14",
    text: "Porque tú formaste mis entrañas; tú me hiciste en el vientre de mi madre. Te alabaré; porque formidables, maravillosas son tus obras; estoy maravillado, y mi alma lo sabe muy bien.",
    moods: ["soledad", "gratitud", "tristeza"],
    explanation: "David se maravilla de que Dios lo formó con cuidado desde antes de nacer. Su valor no depende de lo que otros digan.",
    message: "No eres un accidente. Dios te formó con intención y con amor. Hoy mírate como Él te mira.",
  },
  {
    ref: "Salmos 32:8",
    text: "Te haré entender, y te enseñaré el camino en que debes andar; sobre ti fijaré mis ojos.",
    moods: ["direccion"],
    explanation: "Dios promete instrucción personal y atención constante. No solo da un mapa: nos acompaña con la mirada.",
    message: "Si hoy no sabes qué camino tomar, pide dirección. Dios tiene Sus ojos puestos en ti.",
  },
  {
    ref: "Salmos 55:22",
    text: "Echa sobre Jehová tu carga, y él te sustentará; no dejará para siempre caído al justo.",
    moods: ["cansancio", "ansiedad"],
    explanation: "David escribe este salmo herido por la traición de un amigo. Su conclusión es entregar la carga a Dios, que sí sostiene.",
    message: "Hay cargas que no fueron hechas para tus hombros. Entrégaselas hoy a Dios.",
  },
  {
    ref: "Isaías 58:11",
    text: "Jehová te pastoreará siempre, y en las sequías saciará tu alma, y dará vigor a tus huesos; y serás como huerto de riego, y como manantial de aguas, cuyas aguas nunca faltan.",
    moods: ["cansancio", "gratitud"],
    explanation: "En tiempos de sequía, Dios promete ser la fuente que nunca se agota. Quien es saciado por Él se convierte en manantial para otros.",
    message: "Aunque estés en temporada seca, Dios puede refrescar tu alma hoy y convertirte en bendición para otros.",
  },
  {
    ref: "Joel 2:25",
    text: "Y os restituiré los años que comió la oruga, el saltón, el revoltón y la langosta, mi gran ejército que envié contra vosotros.",
    moods: ["tristeza", "gratitud"],
    explanation: "Joel describe una plaga que lo había destruido todo. Dios promete algo sorprendente: restituir incluso el tiempo perdido.",
    message: "Dios es experto en restaurar. Lo que sientes que perdiste, Él puede devolverlo de maneras que no imaginas.",
  },
  {
    ref: "Zacarías 4:6",
    text: "…No con ejército, ni con fuerza, sino con mi Espíritu, ha dicho Jehová de los ejércitos.",
    moods: ["cansancio", "direccion"],
    explanation: "Zorobabel debía reconstruir el templo con pocos recursos. Dios le recuerda que la obra avanzará por Su Espíritu, no por capacidad humana.",
    message: "Lo que tienes delante no depende solo de tus fuerzas. Pídele hoy al Espíritu Santo que obre a través de ti.",
  },
  {
    ref: "Habacuc 2:3",
    text: "Aunque la visión tardará aún por un tiempo, mas se apresura hacia el fin, y no mentirá; aunque tardare, espéralo, porque sin duda vendrá, no tardará.",
    moods: ["direccion", "cansancio"],
    explanation: "Habacuc esperaba una respuesta de Dios. La respuesta llegó con una lección: las promesas de Dios tienen un tiempo exacto.",
    message: "Si lo que Dios te prometió parece tardar, no lo sueltes. Va a llegar en el momento justo.",
  },
  {
    ref: "Juan 15:5",
    text: "Yo soy la vid, vosotros los pámpanos; el que permanece en mí, y yo en él, éste lleva mucho fruto; porque separados de mí nada podéis hacer.",
    moods: ["direccion", "cansancio"],
    explanation: "Jesús usa la imagen de una vid: la rama no se esfuerza por dar fruto, simplemente permanece unida. El fruto es consecuencia de la conexión.",
    message: "Hoy no te enfoques tanto en producir, sino en permanecer cerca de Jesús. El fruto llegará.",
  },
  {
    ref: "Romanos 15:13",
    text: "Y el Dios de esperanza os llene de todo gozo y paz en el creer, para que abundéis en esperanza por el poder del Espíritu Santo.",
    moods: ["tristeza", "gratitud"],
    explanation: "Pablo llama a Dios \"el Dios de esperanza\". El gozo y la paz llegan al creer, y el resultado es una esperanza que se desborda.",
    message: "Que hoy tu corazón se llene de esperanza. No por lo que ves, sino por Quien está contigo.",
  },
  {
    ref: "2 Timoteo 1:7",
    text: "Porque no nos ha dado Dios espíritu de cobardía, sino de poder, de amor y de dominio propio.",
    moods: ["miedo"],
    explanation: "Pablo anima a Timoteo, un joven líder tímido. El temor no viene de Dios; Él nos da poder, amor y una mente sobria.",
    message: "El miedo que sientes no viene de Dios. Hoy puedes actuar con el poder y el amor que Él te dio.",
  },
  {
    ref: "Santiago 1:5",
    text: "Y si alguno de vosotros tiene falta de sabiduría, pídala a Dios, el cual da a todos abundantemente y sin reproche, y le será dada.",
    moods: ["direccion"],
    explanation: "Santiago asegura que Dios da sabiduría con generosidad y sin regañar a quien pide. Pedir dirección no es debilidad.",
    message: "Si hoy tienes una decisión difícil, pídele sabiduría a Dios. Él te la dará con generosidad.",
  },
  {
    ref: "Lamentaciones 3:25-26",
    text: "Bueno es Jehová a los que en él esperan, al alma que le busca. Bueno es esperar en silencio la salvación de Jehová.",
    moods: ["ansiedad", "direccion"],
    explanation: "En medio del dolor, Jeremías descubre que esperar en Dios, aun en silencio, es algo bueno.",
    message: "La espera no es tiempo perdido cuando esperas en Dios. Búscalo hoy con calma.",
  },
  {
    ref: "Romanos 8:38-39",
    text: "Por lo cual estoy seguro de que ni la muerte, ni la vida, ni ángeles, ni principados, ni potestades, ni lo presente, ni lo por venir, ni lo alto, ni lo profundo, ni ninguna otra cosa creada nos podrá separar del amor de Dios, que es en Cristo Jesús Señor nuestro.",
    moods: ["soledad", "miedo"],
    explanation: "Pablo enumera todo lo que podría amenazarnos y concluye que nada puede separarnos del amor de Dios en Cristo.",
    message: "No hay nada en tu pasado, presente o futuro que pueda separarte del amor de Dios. Absolutamente nada.",
  },
  {
    ref: "Efesios 3:20",
    text: "Y a Aquel que es poderoso para hacer todas las cosas mucho más abundantemente de lo que pedimos o entendemos, según el poder que actúa en nosotros,",
    moods: ["gratitud", "direccion"],
    explanation: "Pablo termina una oración reconociendo que Dios puede hacer mucho más de lo que somos capaces de pedir o imaginar.",
    message: "Atrévete hoy a soñar con Dios. Él puede hacer más de lo que te atreves a pedir.",
  },
  {
    ref: "Salmos 103:2-4",
    text: "Bendice, alma mía, a Jehová, y no olvides ninguno de sus beneficios. Él es quien perdona todas tus iniquidades, el que sana todas tus dolencias; el que rescata del hoyo tu vida, el que te corona de favores y misericordias;",
    moods: ["gratitud"],
    explanation: "David se habla a sí mismo para no olvidar lo que Dios ha hecho: perdón, sanidad, rescate y favor.",
    message: "Tómate hoy un momento para recordar lo que Dios ha hecho por ti. La gratitud cambia la manera de ver el día.",
  },
  {
    ref: "Salmos 4:8",
    text: "En paz me acostaré, y asimismo dormiré; porque solo tú, Jehová, me haces vivir confiado.",
    moods: ["ansiedad", "miedo"],
    explanation: "David escribe en medio de problemas y aun así puede dormir en paz. Su seguridad no está en las circunstancias, sino en Dios.",
    message: "Esta noche puedes descansar. Dios está despierto cuidando de ti.",
  },
  {
    ref: "Mateo 6:34",
    text: "Así que, no os afanéis por el día de mañana, porque el día de mañana traerá su afán. Basta a cada día su propio mal.",
    moods: ["ansiedad"],
    explanation: "Jesús nos invita a vivir un día a la vez, confiando en el Padre que alimenta a las aves y viste los lirios.",
    message: "Hoy enfócate solo en hoy. Mañana Dios seguirá siendo fiel.",
  },
  {
    ref: "Salmos 62:8",
    text: "Esperad en él en todo tiempo, oh pueblos; derramad delante de él vuestro corazón; Dios es nuestro refugio.",
    moods: ["soledad", "tristeza"],
    explanation: "El salmista invita a \"derramar\" el corazón: decirle a Dios todo, sin filtros. Él es refugio seguro para lo que sentimos.",
    message: "Habla hoy con Dios sin guardarte nada. Él puede recibir todo lo que hay en tu corazón.",
  },
  {
    ref: "Isaías 49:15-16",
    text: "¿Se olvidará la mujer de lo que dio a luz, para dejar de compadecerse del hijo de su vientre? Aunque olvide ella, yo nunca me olvidaré de ti. He aquí que en las palmas de las manos te tengo esculpida;",
    moods: ["soledad", "tristeza"],
    explanation: "Dios usa la imagen del amor de una madre, y dice que Su amor es aún más fiel. Tiene a Su pueblo grabado en Sus manos.",
    message: "Aunque sientas que todos te olvidaron, Dios no. Tu nombre está grabado en Sus manos.",
  },
  {
    ref: "Salmos 68:5-6",
    text: "Padre de huérfanos y defensor de viudas es Dios en su santa morada. Dios hace habitar en familia a los desamparados;",
    moods: ["soledad"],
    explanation: "Dios se presenta como Padre y defensor de los más vulnerables. Su plan es dar familia a quien se siente solo.",
    message: "Dios quiere darte una familia. En MAI hay personas dispuestas a caminar contigo.",
  },
  {
    ref: "2 Crónicas 20:15",
    text: "…No temáis ni os amedrentéis delante de esta multitud tan grande, porque no es vuestra la guerra, sino de Dios.",
    moods: ["miedo", "ansiedad"],
    explanation: "El rey Josafat enfrentaba tres ejércitos. Dios le responde que la batalla le pertenece a Él. Israel ganó adorando.",
    message: "Lo que parece demasiado grande para ti no lo es para Dios. Hoy adora en lugar de preocuparte.",
  },
  {
    ref: "Salmos 118:24",
    text: "Este es el día que hizo Jehová; nos gozaremos y alegraremos en él.",
    moods: ["gratitud"],
    explanation: "Cada día es un regalo hecho por Dios. El salmista decide alegrarse en él antes de saber qué traerá.",
    message: "Hoy es un regalo. Encuentra al menos tres razones para dar gracias.",
  },
  {
    ref: "1 Tesalonicenses 5:16-18",
    text: "Estad siempre gozosos. Orad sin cesar. Dad gracias en todo, porque esta es la voluntad de Dios para con vosotros en Cristo Jesús.",
    moods: ["gratitud", "direccion"],
    explanation: "Pablo resume la voluntad de Dios en tres hábitos: gozo, oración constante y gratitud en todo.",
    message: "Si te preguntas cuál es la voluntad de Dios para hoy, empieza aquí: alégrate, ora y da gracias.",
  },
  {
    ref: "Rut 2:12",
    text: "Jehová recompense tu obra, y tu remuneración sea cumplida de parte de Jehová Dios de Israel, bajo cuyas alas has venido a refugiarte.",
    moods: ["cansancio", "gratitud", "soledad"],
    explanation: "Booz bendice a Rut, una extranjera que trabajaba duro para cuidar a su suegra. Dios ve el esfuerzo silencioso de quienes se refugian en Él.",
    message: "Dios ve tu esfuerzo, aun el que nadie más nota. Bajo Sus alas hay refugio para ti.",
  },
  {
    ref: "Isaías 30:21",
    text: "Entonces tus oídos oirán a tus espaldas palabra que diga: Este es el camino, andad por él; y no echéis a la mano derecha, ni tampoco torzáis a la mano izquierda.",
    moods: ["direccion"],
    explanation: "Dios promete una voz que guía en el momento de decidir. Él no deja a Sus hijos sin dirección.",
    message: "Mantén tu corazón atento hoy. Dios te mostrará el camino en el momento justo.",
  },
]

function dayNumber(date = new Date()) {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  )
}

function hash(text: string) {
  let h = 0
  for (const ch of text.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

/** Today's passages: a main word (matching the mood if given) plus a companion verse. */
export function wordOfTheDay(mood?: Mood, name = "", offset = 0) {
  const day = dayNumber() + offset
  const pool = mood ? words.filter((w) => w.moods.includes(mood)) : words
  const main = pool[(day * 7 + hash(name)) % pool.length]
  const others = words.filter((w) => w !== main)
  const companion = others[(day * 13 + hash(name) + 5) % others.length]
  return { main, companion }
}

export function randomWord(exclude?: Word) {
  const pool = words.filter((w) => w !== exclude)
  const main = pool[Math.floor(Math.random() * pool.length)]
  const others = words.filter((w) => w !== main)
  return { main, companion: others[Math.floor(Math.random() * others.length)] }
}

export const moodIntro: Record<Mood, string> = {
  ansiedad: "Sabemos que hoy tu mente no descansa. Esta palabra es para traerte calma.",
  tristeza: "Si hoy tu corazón está pesado, esta palabra es un abrazo de Dios para ti.",
  cansancio: "Si hoy te sientes sin fuerzas, Dios tiene descanso y fuerzas nuevas para ti.",
  miedo: "Si hoy algo te da miedo, escucha lo que Dios te dice.",
  soledad: "Si hoy sientes soledad, recuerda que Dios está contigo y que tienes una familia en MAI.",
  direccion: "Si hoy buscas dirección, Dios quiere guiar tus pasos.",
  gratitud: "Qué bueno que hoy tu corazón está agradecido. Celebra con esta palabra.",
}
