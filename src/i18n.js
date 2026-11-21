/** Idiomas de la interfaz: español (original), inglés y portugués. Si falta una traducción, se usa el español. */
export const LANGS = ['es', 'en', 'pt'];
const STORE = 'diario-lang';

const MESES = {
  es: ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  pt: ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'],
};
const DIAS = {
  es: ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'],
  en: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  pt: ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'],
};
const INICIALES = { es: ['L','M','M','J','V','S','D'], en: ['M','T','W','T','F','S','S'], pt: ['S','T','Q','Q','S','S','D'] };

const S = {
  es: {
    'site': 'Diario de dibujo',
    'meta.desc': 'Obra generativa: un ejercicio de dibujo nuevo cada día, con moodboard, referencias y temporizador.',
    'logo.sub': 'de dibujo',
    'nav.hoy': 'Hoy', 'nav.diario': 'Diario', 'nav.instalacion': 'Instalación',
    'lang.group': 'Idioma',
    'copy': 'Copiar {hex}', 'copied': '¡Copiado!',
    'cal.prev': 'Mes anterior', 'cal.next': 'Mes siguiente', 'cal.trabajo': 'Con trabajo subido',
    'mi.trabajo': 'Mi trabajo',
    'manifiesto': 'Un ejercicio nuevo cada día: frase, misión, moodboard y referencias. Hoy hay <strong>{n}</strong> días publicados.',
    'home.vacio.h': 'Sin días publicados', 'home.vacio.p': 'Cuando haya un estudio, aparece acá.',
    'home.lead': 'Este diario nace como una intersección entre aprendizaje, arte, archivo y reflexión. Busca recuperar y conservar la educación tradicional, mezclando los valores de creación antiguos con las nuevas tecnologías. Armado por Kathonejo a partir de libros, PDFs y recopilaciones propias.',
    'home.extra1': 'Cada día se genera un nuevo ejercicio, con su paleta limitada, para practicar bajo un timer pomodoro. Además cuenta con una instalación para disfrutar en gran pantalla, de forma individual o grupal, donde se construye una obra en conjunto y el programa la exhibe.',
    'home.extra2': 'Las frases que acompañan cada día vienen de Operadores Mágicos, una investigación de Kathonejo sobre figuras de la antropología, la filosofía y la magia que estudiaron el quehacer artístico, a partir del <em>Pequeño tratado sobre arte y magia</em> de Claudia Rodríguez-Ponga Linares.',
    'home.mantra': 'Cada día, una nueva página del diario de dibujo.',
    'foot': 'Kathonejo',
    'contact.h': 'Contacto',
    'contact.redes': 'Redes',
    'contact.cosmovision': 'Cosmovisión',
    'bunny.m1': 'Hoy una hoja, sin pedirle que sea perfecta.',
    'bunny.m2': 'Empieza por la mancha. La forma llega después.',
    'bunny.m3': 'Un rato corto, todos los días, ya es práctica.',
    'bunny.m4': 'No hace falta un dibujo terminado. Hace falta empezar.',
    'bunny.q1': 'Investigar es dar cuerpo al deseo.',
    'bunny.q2': 'El artista es el vínculo de vínculos.',
    'bunny.q3': 'La magia, dicen las brujas, es un arte.',
    'bunny.q4': 'Podemos viajar por el mundo sin salir del lugar.',
    'moodboard.alt': 'Moodboard: {tema}',
    'ultimo': 'Último día · {fecha}',
    'mision': 'Misión del día',
    'ir.dia': 'Ir al día →', 'ver.diario': 'Ver el diario',
    'diario.h': 'Diario',
    'diario.p': 'Cada día, una nueva página.<br>Cada página es una nueva invitación a crear, porque el arte tradicional no teme a experimentar con la tecnología',
    'diario.cuenta': '{n} días · desde {fecha}',
    'calendario': 'Calendario', 'todos': 'Todos los días',
    'dia.no.h': 'Este día no existe', 'dia.no.p': 'No hay estudio para {f}.', 'volver.inicio': 'Volver al inicio',
    'moodboard': 'Moodboard', 'pag': 'Pág. {p}',
    'borrar.confirm': '¿Borrar este trabajo?',
    'focus': 'Modo focus', 'subir': 'Subir mi trabajo',
    'foto1': 'Foto 1 · Moodboard',
    'paleta': 'Paleta del día', 'paleta.hint': 'Tocá un color para copiar su código.',
    'datos': 'Datos',
    'ref.alt': 'Referencia: {libro}, pág. {p}', 'credito.pag': ', pág. {p}',
    'mi.trabajo.alt': 'Mi trabajo del {f}', 'borrar': 'Borrar',
    'sin.trabajo': 'Todavía no subiste tu dibujo de este día.',
    // temporizador
    't.drag': 'Arrastrar (doble clic: volver a su lugar)', 't.drag.aria': 'Arrastrar temporizador', 't.min': 'Minimizar temporizador',
    't.lbl': 'Sesión de dibujo', 't.iniciar': 'Iniciar', 't.pausar': 'Pausar', 't.seguir': 'Seguir', 't.reiniciar': 'Reiniciar',
    't.fin': 'Sesión terminada', 't.fin.notif': '¡Sesión terminada!', 't.fin.body': 'Buen trabajo. Soltá el lápiz y mirá tu dibujo de lejos.',
    // focus
    'f.salir': 'Salir (Esc)', 'f.fs': '⛶ Pantalla completa', 'f.fs.salir': '⛶ Salir de pantalla completa', 'f.prev': 'Anterior', 'f.next': 'Siguiente',
    // subir trabajo
    'up.codigo': 'Código para subir trabajos:', 'up.incorrecto': 'Código incorrecto.',
    'up.foto': 'Elegí una foto (jpg, png o webp)', 'up.nota': 'Nota (opcional)', 'up.placeholder': '¿Qué aprendiste hoy?',
    'up.autor': 'Autor/a', 'up.autor.ph': 'Tu nombre', 'up.red': 'Red (opcional)', 'up.red.ph': '@usuario o https://…', 'por': 'por',
    'up.publico': 'Tu dibujo queda público en el álbum del día, con tu nombre y tu red.',
    // estudio (dibujar en pantalla)
    'es.abrir': "Dibujar en pantalla",
    'es.titulo': "Dibujar en pantalla",
    'es.ref': "Referencia",
    'es.cerrar': "Cerrar",
    'es.lienzo': "Lienzo de dibujo",
    'es.materiales': "Materiales",
    'es.tam': "Tamaño",
    'es.opac': "Opacidad",
    'es.pigmento': "Color del material",
    'es.color': "Otro color",
    'es.papel': "Papel",
    'es.papel.blanco': "Blanco",
    'es.papel.entonado': "Entonado",
    'es.rehacer': "Rehacer",
    'es.limpiar': "Limpiar",
    'es.limpiar.confirm': "¿Borrar todo el dibujo?",
    'es.descargar': "Descargar",
    'es.archivo': "Subir un archivo",
    'es.subir': "Subir al álbum",
    'es.salir.confirm': "¿Cerrar sin subir ni descargar? Tu dibujo se pierde.",
    'es.tu.dibujo': "Tu dibujo",
    'es.vacio': "Dibujá algo primero.",
    'es.m.grafito': "Grafito",
    'es.m.carbon': "Carbón",
    'es.m.sanguina': "Sanguina",
    'es.m.tiza': "Tiza blanca",
    'es.m.acuarelable': "Lápiz acuarelable",
    'es.m.pluma': "Pluma",
    'es.m.pincel': "Pincel y tinta",
    'es.m.seco': "Pincel seco",
    'es.m.aguada': "Aguada",
    'es.m.humedo': "Húmedo sobre húmedo",
    'es.m.goma': "Goma",
    'es.m.moldeable': "Goma moldeable",
    'es.m.difumino': "Difumino",
    'album': 'Álbum del día', 'album.subir': 'Subir tu dibujo al álbum', 'album.vacio': 'Todavía nadie subió su dibujo a este álbum. ¡Subí el tuyo!', 'album.alt': 'Dibujo de {a} del {f}', 'album.n': '{n} en el álbum',
    'up.cancelar': 'Cancelar', 'up.subir': 'Subir', 'up.preparando': 'Preparando imagen…', 'up.subiendo': 'Subiendo…', 'up.listo': '¡Listo!', 'up.error': 'No se pudo subir: ',
    // instalación
    'i.title': 'Instalación · Diario de dibujo', 'i.vacio': 'Todavía no hay un día publicado',
    'i.por': 'Instalación',
    'i.paso1': 'Mirá el tema y el moodboard', 'i.paso2': 'Dibujá durante 3 minutos', 'i.paso3': 'Entregá: el conejo te comenta y tu dibujo se suma al mural',
    'i.referencia': 'Referencia', 'i.dibujar': 'Dibujar', 'i.ver.mural': 'Ver el mural',
    'i.hint': 'Tenés {n} minutos. Cuando termines, tu dibujo entra al mural.',
    'i.side.mood': 'Moodboard · tocá para ver la referencia', 'i.side.ref': 'Referencia · tocá para ver el moodboard',
    'i.herramientas': 'Herramientas', 'i.grosor': 'Grosor',
    'i.fondo': 'Pintar fondo', 'i.deshacer': 'Deshacer', 'i.borrar.todo': 'Borrar todo', 'i.entregar': 'Entregar',
    'i.nada': 'No hay dibujo todavía', 'i.volver': 'Volver',
    'i.guardando': 'Guardando tu dibujo…', 'i.guardando.p': 'Un segundo, el conejo lo mira con cariño.',
    'i.mirar.fb': 'Qué lindo. Gracias por dibujar.', 'i.no.guardar': 'No se pudo guardar',
    'i.uy': 'Uy, no se pudo guardar', 'i.reintentar': 'Probar de nuevo',
    'i.tu.dibujo': 'Tu dibujo', 'i.ponderacion': 'Ponderación', 'i.otro': 'Otro dibujo',
    'i.volvemos': 'Volvemos al inicio en <strong id="inst-cd">{n}</strong> s',
    'm.title': 'Mural · Instalación', 'm.eyebrow': 'Composición colectiva', 'm.h': 'El mural', 'm.hoy': 'Hoy',
    'm.cargando': 'Cargando…', 'm.cerrar': 'Cerrar', 'm.dibujo': 'Dibujo',
    'm.n.uno': '{n} dibujo · {fecha}', 'm.n.otros': '{n} dibujos · {fecha}', 'm.total': '{n} dibujos en total',
    'm.vacio': 'Todavía no hay dibujos. Sé la primera persona en dejar uno.', 'm.error': 'No se pudo cargar el mural',
    // herramientas, grosores y colores de reserva
    'tool.grafito': 'Grafito', 'tool.tinta': 'Tinta', 'tool.acuarela': 'Acuarela', 'tool.carbonilla': 'Carbonilla', 'tool.goma': 'Goma',
    'sz.xs': 'Fino', 'sz.s': 'Chico', 'sz.m': 'Medio', 'sz.l': 'Grande', 'sz.xl': 'Grueso',
  },
  en: {
    'site': 'Drawing Diary',
    'meta.desc': 'Generative artwork: a new drawing exercise every day, with a moodboard, references and a timer.',
    'logo.sub': 'drawing diary',
    'nav.hoy': 'Today', 'nav.diario': 'Diary', 'nav.instalacion': 'Installation',
    'lang.group': 'Language',
    'copy': 'Copy {hex}', 'copied': 'Copied!',
    'cal.prev': 'Previous month', 'cal.next': 'Next month', 'cal.trabajo': 'Work uploaded',
    'mi.trabajo': 'My work',
    'manifiesto': 'A new exercise every day: quote, mission, moodboard and references. So far there are <strong>{n}</strong> days published.',
    'home.vacio.h': 'No days published yet', 'home.vacio.p': 'When there is a study, it will show up here.',
    'home.lead': 'This diary was born as an intersection of learning, art, archive and reflection. It seeks to recover and preserve traditional art education, blending the old values of making with new technologies. Put together by Kathonejo from books, PDFs and her own collections.',
    'home.extra1': 'Every day a new exercise is generated, with its own limited palette, to practice under a pomodoro timer. It also includes an installation to enjoy on a big screen, alone or in a group, where a collective work is built and the program exhibits it.',
    'home.extra2': 'The quotes that accompany each day come from Operadores Mágicos (Magical Operators), Kathonejo’s research into figures from anthropology, philosophy and magic who studied artistic practice, based on <em>Pequeño tratado sobre arte y magia</em> (A Short Treatise on Art and Magic) by Claudia Rodríguez-Ponga Linares.',
    'home.mantra': 'Every day, a new page of the drawing diary.',
    'foot': 'Kathonejo',
    'contact.h': 'Contact',
    'contact.redes': 'Social',
    'contact.cosmovision': 'Cosmovisión',
    'bunny.m1': 'One sheet today, without asking it to be perfect.',
    'bunny.m2': 'Start with the blot. Form comes after.',
    'bunny.m3': 'A short while, every day, is already practice.',
    'bunny.m4': 'It does not have to be finished. It has to begin.',
    'bunny.q1': 'To research is to give body to desire.',
    'bunny.q2': 'The artist is the bond of bonds.',
    'bunny.q3': 'Magic, the witches say, is an art.',
    'bunny.q4': 'We can travel the world without leaving our place.',
    'moodboard.alt': 'Moodboard: {tema}',
    'ultimo': 'Latest day · {fecha}',
    'mision': 'Mission of the day',
    'ir.dia': 'Go to the day →', 'ver.diario': 'See the diary',
    'diario.h': 'Diary',
    'diario.p': 'Every day, a new page.<br>Every page is a new invitation to create, because traditional art is not afraid to experiment with technology',
    'diario.cuenta': '{n} days · since {fecha}',
    'calendario': 'Calendar', 'todos': 'All days',
    'dia.no.h': 'This day does not exist', 'dia.no.p': 'There is no study for {f}.', 'volver.inicio': 'Back to home',
    'moodboard': 'Moodboard', 'pag': 'p. {p}',
    'borrar.confirm': 'Delete this work?',
    'focus': 'Focus mode', 'subir': 'Upload my work',
    'foto1': 'Image 1 · Moodboard',
    'paleta': 'Palette of the day', 'paleta.hint': 'Tap a color to copy its code.',
    'datos': 'Notes',
    'ref.alt': 'Reference: {libro}, p. {p}', 'credito.pag': ', p. {p}',
    'mi.trabajo.alt': 'My work from {f}', 'borrar': 'Delete',
    'sin.trabajo': 'You haven’t uploaded your drawing for this day yet.',
    't.drag': 'Drag (double-click: put it back)', 't.drag.aria': 'Drag timer', 't.min': 'Minimize timer',
    't.lbl': 'Drawing session', 't.iniciar': 'Start', 't.pausar': 'Pause', 't.seguir': 'Resume', 't.reiniciar': 'Reset',
    't.fin': 'Session over', 't.fin.notif': 'Session over!', 't.fin.body': 'Good work. Put the pencil down and look at your drawing from a distance.',
    'f.salir': 'Exit (Esc)', 'f.fs': '⛶ Full screen', 'f.fs.salir': '⛶ Exit full screen', 'f.prev': 'Previous', 'f.next': 'Next',
    'up.codigo': 'Code to upload work:', 'up.incorrecto': 'Wrong code.',
    'up.foto': 'Choose a photo (jpg, png or webp)', 'up.nota': 'Note (optional)', 'up.placeholder': 'What did you learn today?',
    'up.autor': 'Author', 'up.autor.ph': 'Your name', 'up.red': 'Social link (optional)', 'up.red.ph': '@username or https://…', 'por': 'by',
    'up.publico': 'Your drawing will be public in the album of the day, with your name and social link.',
    // estudio (dibujar en pantalla)
    'es.abrir': "Draw on screen",
    'es.titulo': "Draw on screen",
    'es.ref': "Reference",
    'es.cerrar': "Close",
    'es.lienzo': "Drawing canvas",
    'es.materiales': "Materials",
    'es.tam': "Size",
    'es.opac': "Opacity",
    'es.pigmento': "Material color",
    'es.color': "Other color",
    'es.papel': "Paper",
    'es.papel.blanco': "White",
    'es.papel.entonado': "Toned",
    'es.rehacer': "Redo",
    'es.limpiar': "Clear",
    'es.limpiar.confirm': "Erase the whole drawing?",
    'es.descargar': "Download",
    'es.archivo': "Upload a file",
    'es.subir': "Add to the album",
    'es.salir.confirm': "Close without uploading or downloading? Your drawing will be lost.",
    'es.tu.dibujo': "Your drawing",
    'es.vacio': "Draw something first.",
    'es.m.grafito': "Graphite",
    'es.m.carbon': "Charcoal",
    'es.m.sanguina': "Sanguine",
    'es.m.tiza': "White chalk",
    'es.m.acuarelable': "Watercolor pencil",
    'es.m.pluma': "Ink pen",
    'es.m.pincel': "Ink brush",
    'es.m.seco': "Dry brush",
    'es.m.aguada': "Wash",
    'es.m.humedo': "Wet-on-wet",
    'es.m.goma': "Eraser",
    'es.m.moldeable': "Kneaded eraser",
    'es.m.difumino': "Blending stump",
    'album': 'Album of the day', 'album.subir': 'Add your drawing to the album', 'album.vacio': 'No one has added a drawing to this album yet. Add yours!', 'album.alt': 'Drawing by {a} from {f}', 'album.n': '{n} in the album',
    'up.cancelar': 'Cancel', 'up.subir': 'Upload', 'up.preparando': 'Preparing image…', 'up.subiendo': 'Uploading…', 'up.listo': 'Done!', 'up.error': 'Could not upload: ',
    'i.title': 'Installation · Drawing Diary', 'i.vacio': 'No day has been published yet',
    'i.por': 'Installation',
    'i.paso1': 'Look at the theme and the moodboard', 'i.paso2': 'Draw for 3 minutes', 'i.paso3': 'Submit: the bunny comments on it and your drawing joins the mural',
    'i.referencia': 'Reference', 'i.dibujar': 'Draw', 'i.ver.mural': 'See the mural',
    'i.hint': 'You have {n} minutes. When you finish, your drawing goes into the mural.',
    'i.side.mood': 'Moodboard · tap to see the reference', 'i.side.ref': 'Reference · tap to see the moodboard',
    'i.herramientas': 'Tools', 'i.grosor': 'Thickness',
    'i.fondo': 'Paint background', 'i.deshacer': 'Undo', 'i.borrar.todo': 'Clear all', 'i.entregar': 'Submit',
    'i.nada': 'There is no drawing yet', 'i.volver': 'Back',
    'i.guardando': 'Saving your drawing…', 'i.guardando.p': 'Just a second, the bunny is looking at it fondly.',
    'i.mirar.fb': 'How lovely. Thanks for drawing.', 'i.no.guardar': 'Could not save',
    'i.uy': 'Oops, it could not be saved', 'i.reintentar': 'Try again',
    'i.tu.dibujo': 'Your drawing', 'i.ponderacion': 'Rating', 'i.otro': 'Another drawing',
    'i.volvemos': 'Back to the start in <strong id="inst-cd">{n}</strong> s',
    'm.title': 'Mural · Installation', 'm.eyebrow': 'Collective composition', 'm.h': 'The mural', 'm.hoy': 'Today',
    'm.cargando': 'Loading…', 'm.cerrar': 'Close', 'm.dibujo': 'Drawing',
    'm.n.uno': '{n} drawing · {fecha}', 'm.n.otros': '{n} drawings · {fecha}', 'm.total': '{n} drawings in total',
    'm.vacio': 'No drawings yet. Be the first person to leave one.', 'm.error': 'Could not load the mural',
    'tool.grafito': 'Graphite', 'tool.tinta': 'Ink', 'tool.acuarela': 'Watercolor', 'tool.carbonilla': 'Charcoal', 'tool.goma': 'Eraser',
    'sz.xs': 'Fine', 'sz.s': 'Small', 'sz.m': 'Medium', 'sz.l': 'Large', 'sz.xl': 'Thick',
  },
  pt: {
    'site': 'Diário de desenho',
    'meta.desc': 'Obra generativa: um exercício de desenho novo a cada dia, com moodboard, referências e temporizador.',
    'logo.sub': 'de desenho',
    'nav.hoy': 'Hoje', 'nav.diario': 'Diário', 'nav.instalacion': 'Instalação',
    'lang.group': 'Idioma',
    'copy': 'Copiar {hex}', 'copied': 'Copiado!',
    'cal.prev': 'Mês anterior', 'cal.next': 'Próximo mês', 'cal.trabajo': 'Com trabalho enviado',
    'mi.trabajo': 'Meu trabalho',
    'manifiesto': 'Um exercício novo a cada dia: frase, missão, moodboard e referências. Hoje há <strong>{n}</strong> dias publicados.',
    'home.vacio.h': 'Nenhum dia publicado', 'home.vacio.p': 'Quando houver um estudo, ele aparece aqui.',
    'home.lead': 'Este diário nasce como uma interseção entre aprendizagem, arte, arquivo e reflexão. Busca recuperar e preservar a educação tradicional, misturando os valores antigos de criação com as novas tecnologias. Montado por Kathonejo a partir de livros, PDFs e compilações próprias.',
    'home.extra1': 'A cada dia é gerado um novo exercício, com sua paleta limitada, para praticar com um timer pomodoro. Além disso, conta com uma instalação para aproveitar em tela grande, de forma individual ou em grupo, onde se constrói uma obra coletiva que o programa exibe.',
    'home.extra2': 'As frases que acompanham cada dia vêm de Operadores Mágicos, uma pesquisa de Kathonejo sobre figuras da antropologia, da filosofia e da magia que estudaram o fazer artístico, a partir do <em>Pequeño tratado sobre arte y magia</em> (Pequeno tratado sobre arte e magia) de Claudia Rodríguez-Ponga Linares.',
    'home.mantra': 'Cada dia, uma nova página do diário de desenho.',
    'foot': 'Kathonejo',
    'contact.h': 'Contato',
    'contact.redes': 'Redes',
    'contact.cosmovision': 'Cosmovisión',
    'bunny.m1': 'Uma folha hoje, sem pedir que seja perfeita.',
    'bunny.m2': 'Comece pela mancha. A forma chega depois.',
    'bunny.m3': 'Um pouco, todos os dias, já é prática.',
    'bunny.m4': 'Não precisa estar pronto. Precisa começar.',
    'bunny.q1': 'Pesquisar é dar corpo ao desejo.',
    'bunny.q2': 'O artista é o vínculo dos vínculos.',
    'bunny.q3': 'A magia, dizem as bruxas, é uma arte.',
    'bunny.q4': 'Podemos viajar pelo mundo sem sair do lugar.',
    'moodboard.alt': 'Moodboard: {tema}',
    'ultimo': 'Último dia · {fecha}',
    'mision': 'Missão do dia',
    'ir.dia': 'Ir para o dia →', 'ver.diario': 'Ver o diário',
    'diario.h': 'Diário',
    'diario.p': 'Cada dia, uma nova página.<br>Cada página é um novo convite para criar, porque a arte tradicional não tem medo de experimentar com a tecnologia',
    'diario.cuenta': '{n} dias · desde {fecha}',
    'calendario': 'Calendário', 'todos': 'Todos os dias',
    'dia.no.h': 'Este dia não existe', 'dia.no.p': 'Não há estudo para {f}.', 'volver.inicio': 'Voltar ao início',
    'moodboard': 'Moodboard', 'pag': 'Pág. {p}',
    'borrar.confirm': 'Apagar este trabalho?',
    'focus': 'Modo foco', 'subir': 'Enviar meu trabalho',
    'foto1': 'Foto 1 · Moodboard',
    'paleta': 'Paleta do dia', 'paleta.hint': 'Toque em uma cor para copiar o código.',
    'datos': 'Notas',
    'ref.alt': 'Referência: {libro}, pág. {p}', 'credito.pag': ', pág. {p}',
    'mi.trabajo.alt': 'Meu trabalho de {f}', 'borrar': 'Apagar',
    'sin.trabajo': 'Você ainda não enviou seu desenho deste dia.',
    't.drag': 'Arrastar (clique duplo: voltar ao lugar)', 't.drag.aria': 'Arrastar temporizador', 't.min': 'Minimizar temporizador',
    't.lbl': 'Sessão de desenho', 't.iniciar': 'Iniciar', 't.pausar': 'Pausar', 't.seguir': 'Continuar', 't.reiniciar': 'Reiniciar',
    't.fin': 'Sessão encerrada', 't.fin.notif': 'Sessão encerrada!', 't.fin.body': 'Bom trabalho. Solte o lápis e olhe seu desenho de longe.',
    'f.salir': 'Sair (Esc)', 'f.fs': '⛶ Tela cheia', 'f.fs.salir': '⛶ Sair da tela cheia', 'f.prev': 'Anterior', 'f.next': 'Próximo',
    'up.codigo': 'Código para enviar trabalhos:', 'up.incorrecto': 'Código incorreto.',
    'up.foto': 'Escolha uma foto (jpg, png ou webp)', 'up.nota': 'Nota (opcional)', 'up.placeholder': 'O que você aprendeu hoje?',
    'up.autor': 'Autor/a', 'up.autor.ph': 'Seu nome', 'up.red': 'Rede (opcional)', 'up.red.ph': '@usuário ou https://…', 'por': 'por',
    'up.publico': 'Seu desenho fica público no álbum do dia, com seu nome e sua rede.',
    // estudio (dibujar en pantalla)
    'es.abrir': "Desenhar na tela",
    'es.titulo': "Desenhar na tela",
    'es.ref': "Referência",
    'es.cerrar': "Fechar",
    'es.lienzo': "Tela de desenho",
    'es.materiales': "Materiais",
    'es.tam': "Tamanho",
    'es.opac': "Opacidade",
    'es.pigmento': "Cor do material",
    'es.color': "Outra cor",
    'es.papel': "Papel",
    'es.papel.blanco': "Branco",
    'es.papel.entonado': "Tonalizado",
    'es.rehacer': "Refazer",
    'es.limpiar': "Limpar",
    'es.limpiar.confirm': "Apagar todo o desenho?",
    'es.descargar': "Baixar",
    'es.archivo': "Enviar um arquivo",
    'es.subir': "Enviar ao álbum",
    'es.salir.confirm': "Fechar sem enviar nem baixar? Seu desenho será perdido.",
    'es.tu.dibujo': "Seu desenho",
    'es.vacio': "Desenhe algo primeiro.",
    'es.m.grafito': "Grafite",
    'es.m.carbon': "Carvão",
    'es.m.sanguina': "Sanguínea",
    'es.m.tiza': "Giz branco",
    'es.m.acuarelable': "Lápis aquarelável",
    'es.m.pluma': "Pena",
    'es.m.pincel': "Pincel e nanquim",
    'es.m.seco': "Pincel seco",
    'es.m.aguada': "Aguada",
    'es.m.humedo': "Úmido sobre úmido",
    'es.m.goma': "Borracha",
    'es.m.moldeable': "Borracha limpa-tipos",
    'es.m.difumino': "Esfuminho",
    'album': 'Álbum do dia', 'album.subir': 'Enviar seu desenho ao álbum', 'album.vacio': 'Ninguém enviou um desenho para este álbum ainda. Envie o seu!', 'album.alt': 'Desenho de {a} de {f}', 'album.n': '{n} no álbum',
    'up.cancelar': 'Cancelar', 'up.subir': 'Enviar', 'up.preparando': 'Preparando imagem…', 'up.subiendo': 'Enviando…', 'up.listo': 'Pronto!', 'up.error': 'Não foi possível enviar: ',
    'i.title': 'Instalação · Diário de desenho', 'i.vacio': 'Ainda não há um dia publicado',
    'i.por': 'Instalação',
    'i.paso1': 'Olhe o tema e o moodboard', 'i.paso2': 'Desenhe durante 3 minutos', 'i.paso3': 'Entregue: o coelho comenta e seu desenho entra no mural',
    'i.referencia': 'Referência', 'i.dibujar': 'Desenhar', 'i.ver.mural': 'Ver o mural',
    'i.hint': 'Você tem {n} minutos. Quando terminar, seu desenho entra no mural.',
    'i.side.mood': 'Moodboard · toque para ver a referência', 'i.side.ref': 'Referência · toque para ver o moodboard',
    'i.herramientas': 'Ferramentas', 'i.grosor': 'Espessura',
    'i.fondo': 'Pintar fundo', 'i.deshacer': 'Desfazer', 'i.borrar.todo': 'Apagar tudo', 'i.entregar': 'Entregar',
    'i.nada': 'Ainda não há desenho', 'i.volver': 'Voltar',
    'i.guardando': 'Salvando seu desenho…', 'i.guardando.p': 'Um segundo, o coelho está olhando com carinho.',
    'i.mirar.fb': 'Que lindo. Obrigado por desenhar.', 'i.no.guardar': 'Não foi possível salvar',
    'i.uy': 'Ops, não foi possível salvar', 'i.reintentar': 'Tentar de novo',
    'i.tu.dibujo': 'Seu desenho', 'i.ponderacion': 'Avaliação', 'i.otro': 'Outro desenho',
    'i.volvemos': 'Voltamos ao início em <strong id="inst-cd">{n}</strong> s',
    'm.title': 'Mural · Instalação', 'm.eyebrow': 'Composição coletiva', 'm.h': 'O mural', 'm.hoy': 'Hoje',
    'm.cargando': 'Carregando…', 'm.cerrar': 'Fechar', 'm.dibujo': 'Desenho',
    'm.n.uno': '{n} desenho · {fecha}', 'm.n.otros': '{n} desenhos · {fecha}', 'm.total': '{n} desenhos no total',
    'm.vacio': 'Ainda não há desenhos. Seja a primeira pessoa a deixar um.', 'm.error': 'Não foi possível carregar o mural',
    'tool.grafito': 'Grafite', 'tool.tinta': 'Nanquim', 'tool.acuarela': 'Aquarela', 'tool.carbonilla': 'Carvão', 'tool.goma': 'Borracha',
    'sz.xs': 'Fino', 'sz.s': 'Pequeno', 'sz.m': 'Médio', 'sz.l': 'Grande', 'sz.xl': 'Grosso',
  },
};

/** Mensajes de error que manda el servidor (en español) → texto por idioma. */
const ERRORES = {
  'Código incorrecto': { en: 'Wrong code', pt: 'Código incorreto' },
  'Falta url o id': { en: 'Missing url or id', pt: 'Falta url ou id' },
  'Un toque más despacio: esperá un minutito.': { en: 'A little slower: wait a minute.', pt: 'Um pouco mais devagar: espere um minutinho.' },
  'Hoy el mural ya está lleno. Volvé mañana.': { en: 'The mural is full for today. Come back tomorrow.', pt: 'Hoje o mural já está cheio. Volte amanhã.' },
  'Imagen no válida': { en: 'Invalid image', pt: 'Imagem inválida' },
  'La imagen es demasiado grande o está vacía': { en: 'The image is too large or empty', pt: 'A imagem é grande demais ou está vazia' },
  'Demasiados trazos': { en: 'Too many strokes', pt: 'Traços demais' },
  'No se pudo guardar': { en: 'Could not save', pt: 'Não foi possível salvar' },
  'Falta el nombre': { en: 'Please add your name', pt: 'Falta o nome' },
  'Archivo no válido': { en: 'Invalid file', pt: 'Arquivo inválido' },
  'Ruta no válida': { en: 'Invalid path', pt: 'Caminho inválido' },
  'Datos no válidos': { en: 'Invalid data', pt: 'Dados inválidos' },
  'Fecha no válida': { en: 'Invalid date', pt: 'Data inválida' },
};
const COLORES = {
  'Negro': { en: 'Black', pt: 'Preto' }, 'Siena': { en: 'Sienna', pt: 'Siena' }, 'Azul': { en: 'Blue', pt: 'Azul' },
  'Rojo': { en: 'Red', pt: 'Vermelho' }, 'Verde': { en: 'Green', pt: 'Verde' }, 'Violeta': { en: 'Violet', pt: 'Violeta' },
};

let current = 'es';
export const getLang = () => current;

/** Elige idioma: ?lang= > guardado > idiomas del navegador (es→es, pt→pt, en u otro→en) > español. */
export function detectLang({ search = '', stored = null, languages = [] } = {}) {
  const q = new URLSearchParams(search).get('lang');
  const norm = v => { const l = String(v || '').toLowerCase().slice(0, 2); return LANGS.includes(l) ? l : null; };
  if (norm(q)) return norm(q);
  if (norm(stored)) return norm(stored);
  const list = (languages || []).filter(Boolean);
  if (!list.length) return 'es';
  for (const l of list) {
    const c = String(l).toLowerCase();
    if (c.startsWith('es')) return 'es';
    if (c.startsWith('pt')) return 'pt';
    if (c.startsWith('en')) return 'en';
  }
  return 'en';
}

const fill = (s, vars) => vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
/** Texto de interfaz; si falta en el idioma actual, usa el español. */
export function t(key, vars, lang = current) {
  const s = S[lang]?.[key] ?? S.es[key] ?? key;
  return fill(s, vars);
}
export const tError = (msg, lang = current) => (lang !== 'es' && ERRORES[msg]?.[lang]) || msg;
export const tColor = (nom, lang = current) => (lang !== 'es' && COLORES[nom]?.[lang]) || nom;

const parse = f => { const [y,m,d] = f.split('-').map(Number); return new Date(y, m-1, d); };
/** Fecha larga: «jueves 19 de noviembre de 2026» / «Thursday, November 19, 2026» / «quinta-feira, 19 de novembro de 2026». */
export function fechaLarga(f, { anio = true, lang = current } = {}) {
  const d = parse(f), l = MESES[lang] ? lang : 'es';
  const dia = DIAS[l][d.getDay()], mes = MESES[l][d.getMonth()], n = d.getDate(), y = d.getFullYear();
  if (l === 'en') return `${dia}, ${mes} ${n}${anio ? `, ${y}` : ''}`;
  if (l === 'pt') return `${dia}, ${n} de ${mes}${anio ? ` de ${y}` : ''}`;
  return `${dia} ${n} de ${mes}${anio ? ` de ${y}` : ''}`;
}
export const nombreMes = (m, lang = current) => (MESES[lang] || MESES.es)[m];
export const iniciales = (lang = current) => INICIALES[lang] || INICIALES.es;

/** Devuelve el día con los textos en el idioma actual; lo que no esté traducido queda en español. */
export function localizarDia(d, lang = current) {
  if (!d || lang === 'es') return d;
  const tr = d.i18n?.[lang];
  if (!tr) return d;
  const out = { ...d, _es: d };
  if (tr.tema) out.tema = tr.tema;
  if (tr.mision) out.mision = tr.mision;
  if (d.frase && tr.frase) out.frase = { ...d.frase, ...Object.fromEntries(Object.entries(tr.frase).filter(([, v]) => v)) };
  if (tr.paleta && d.paleta) out.paleta = traducirPaleta(d.paleta, tr.paleta);
  if (Array.isArray(d.datos) && Array.isArray(tr.datos)) {
    out.datos = d.datos.map((x, i) => ({ ...x, ...Object.fromEntries(Object.entries(tr.datos[i] || {}).filter(([, v]) => v)) }));
  }
  return out;
}
function traducirPaleta(p, nombres) {
  const tn = n => (n && nombres[n]) || n;
  if (Array.isArray(p)) return p.map(c => (c && typeof c === 'object') ? { ...c, ...(c.nombre ? { nombre: tn(c.nombre) } : {}), ...(c.name ? { name: tn(c.name) } : {}) } : c);
  if (p && typeof p === 'object') return Object.fromEntries(Object.entries(p).map(([k, v]) => [tn(k), (v && typeof v === 'object' && v.nombre) ? { ...v, nombre: tn(v.nombre) } : v]));
  return p;
}
/** Tema de una entrada del índice en el idioma actual. */
export const temaIndice = (x, lang = current) => (lang !== 'es' && x?.i18n?.[lang]?.tema) || x?.tema;

/** Aplica el idioma: <html lang>, textos fijos del index.html y aviso al resto de la app. */
export function setLang(l, { store = true } = {}) {
  current = LANGS.includes(l) ? l : 'es';
  if (store) { try { localStorage.setItem(STORE, current); } catch {} }
  if (typeof document === 'undefined') return current;
  document.documentElement.lang = current;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.desc'));
  document.querySelectorAll('.lang-sw [data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === current)));
  document.dispatchEvent(new CustomEvent('langchange', { detail: current }));
  return current;
}

export function initLang() {
  let stored = null; try { stored = localStorage.getItem(STORE); } catch {}
  const l = detectLang({ search: location.search, stored, languages: navigator.languages?.length ? navigator.languages : [navigator.language] });
  const q = new URLSearchParams(location.search);
  const viaUrl = q.has('lang') && LANGS.includes(String(q.get('lang')).toLowerCase().slice(0, 2));
  if (q.has('lang')) { q.delete('lang'); const s = q.toString(); history.replaceState(history.state, '', location.pathname + (s ? `?${s}` : '') + location.hash); }
  current = l;
  // Solo se guarda si la persona eligió (o vino con ?lang=); si no, se sigue al navegador.
  setLang(l, { store: viaUrl || !!stored });
  document.addEventListener('click', e => {
    const b = e.target.closest('.lang-sw [data-lang]'); if (!b) return;
    e.preventDefault(); if (b.dataset.lang !== current) setLang(b.dataset.lang);
  });
  return l;
}

/** Selector ES / EN / PT (botones chicos, mismo estilo del menú). */
export const selectorHTML = (cls = '') => `<div class="lang-sw ${cls}" role="group" aria-label="${t('lang.group')}">${LANGS.map(l => `<button type="button" data-lang="${l}" lang="${l}" aria-pressed="${l === current}" title="${({ es: 'Español', en: 'English', pt: 'Português' })[l]}">${l.toUpperCase()}</button>`).join('')}</div>`;
