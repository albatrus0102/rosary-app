/* i18n.js — 웹 데모(web_demo)의 화면 문구. 언어: ko · it · en · es · pt (받는 분의 링크마다 하나).
   ko 는 앱(lib/church/church_catalog.dart, church_constants.dart)의 문구를 그대로 줄인 것이다.
   it · es · pt 는 기계가 초안을 쓴 번역이다(사람이 검수하지 않았다). 보내기 전에 원어민 확인이 필요하다. en 도 같은 초안이다.
   성당 이름·승인 주체 표는 앱 카탈로그의 modelNote 마지막 줄을 줄여 옮긴 것이다. */
(function (root) {
  'use strict';
  var LANGS = ['ko', 'it', 'en', 'es', 'pt'];

  var UI = {
    ko: {
      tagline: '로사리움(Rosarium) — 광고·결제 없는 무료 묵주기도 안드로이드 앱 · 이 화면은 웹 미리보기입니다',
      noteReal: '이 3D 성당({name})은 실제 모습과 같지 않은, 단순하게 본뜬 가상 모형입니다. 실제 미술 작품은 싣지 않았습니다. {approver}',
      noteFict: '이 3D 성당은 실제로 있는 어느 성당과도 같지 않은, 앱이 지어낸 가상의 본당입니다. 실제 미술 작품은 싣지 않았습니다. {approver}',
      langLabel: '언어',
      tour: '▶ 둘러보기', free: '직접 걸어 보기',
      loading: '불러오는 중… {p}%', building: '성당을 짓는 중입니다…', ready: '준비되었습니다',
      loadFail: '불러오지 못했습니다. 새로 고침해 주세요.',
      noWebgl: '이 브라우저에서는 3D 화면(WebGL)을 쓸 수 없습니다. 다른 브라우저로 열어 주세요.',
      altar: '제대 앞으로', candle: '초 켜기', sit: '앉아 기도', stand: '일어나기', cross: '성호', view: '시점',
      viewAuto: '자동', viewFp: '1인칭', viewTp: '뒤에서',
      stopTour: '■ 둘러보기 멈추기', tourHint: '아무 키나 화면을 누르면 직접 걸을 수 있어요', tourHintTouch: '화면을 누르면 직접 걸을 수 있어요',
      tourEnd: '둘러보기를 마쳤습니다. 이제 직접 걸어 보세요.',
      help: 'W A S D · 방향키로 걷기 · 끌어서 둘러보기 · 휠로 확대',
      helpTouch: '왼쪽 손잡이로 걷기 · 화면을 끌어서 둘러보기',
      quality: '화질', q_low: '낮음', q_mid: '보통', q_high: '높음',
      sound: '소리', walkFail: '그곳으로 가는 길을 찾지 못했어요',
      intentionTitle: '초를 켜는 지향', intentionNote: '정해진 문구 중에서 고릅니다.',
      candleFull: '닿는 곳의 초가 모두 켜져 있어요',
      foot: 'Rosarium은 광고·결제·후원이 없는 비상업 앱입니다.'
    },
    it: {
      tagline: 'Rosarium — app Android gratuita e non commerciale per la preghiera del Rosario · questa è un’anteprima web',
      noteReal: 'Questo modello 3D è una versione virtuale semplificata e non è uguale alla chiesa reale ({name}). Le opere d’arte reali non sono incluse. {approver}',
      noteFict: 'Questa chiesa 3D non è uguale a nessuna chiesa reale: è una parrocchia virtuale inventata dall’app. Le opere d’arte reali non sono incluse. {approver}',
      langLabel: 'Lingua',
      tour: '▶ Visita guidata', free: 'Esplora da solo',
      loading: 'Caricamento… {p}%', building: 'Costruzione della chiesa…', ready: 'Pronto',
      loadFail: 'Caricamento non riuscito. Ricarica la pagina.',
      noWebgl: 'Questo browser non supporta la grafica 3D (WebGL). Apri la pagina con un altro browser.',
      altar: 'All’altare', candle: 'Accendi una candela', sit: 'Siediti a pregare', stand: 'Alzati', cross: 'Segno della croce', view: 'Vista',
      viewAuto: 'Auto', viewFp: 'Prima persona', viewTp: 'Da dietro',
      stopTour: '■ Interrompi la visita', tourHint: 'Premi un tasto o tocca lo schermo per muoverti da solo', tourHintTouch: 'Tocca lo schermo per muoverti da solo',
      tourEnd: 'La visita è finita. Ora puoi camminare da solo.',
      help: 'W A S D o frecce per camminare · trascina per guardare · rotella per lo zoom',
      helpTouch: 'Joystick a sinistra per camminare · trascina lo schermo per guardare',
      quality: 'Qualità', q_low: 'Bassa', q_mid: 'Media', q_high: 'Alta',
      sound: 'Audio', walkFail: 'Non trovo la strada per arrivare lì',
      intentionTitle: 'Intenzione della candela', intentionNote: 'Si sceglie fra frasi già fissate.',
      candleFull: 'Tutte le candele a portata sono già accese',
      foot: 'Rosarium è un’app non commerciale: nessuna pubblicità, nessun pagamento, nessuna raccolta fondi.'
    },
    en: {
      tagline: 'Rosarium — free, non-commercial Android app for praying the Rosary · this is a web preview',
      noteReal: 'This is a simplified virtual model; it differs from the real {name}. Real artworks are not included. {approver}',
      noteFict: 'This 3D church is not like any real church: it is a fictional parish invented by the app. Real artworks are not included. {approver}',
      langLabel: 'Language',
      tour: '▶ Guided tour', free: 'Explore on your own',
      loading: 'Loading… {p}%', building: 'Building the church…', ready: 'Ready',
      loadFail: 'Loading failed. Please reload the page.',
      noWebgl: 'This browser cannot show 3D graphics (WebGL). Please open the page in another browser.',
      altar: 'Go to the altar', candle: 'Light a candle', sit: 'Sit and pray', stand: 'Stand up', cross: 'Sign of the cross', view: 'View',
      viewAuto: 'Auto', viewFp: 'First person', viewTp: 'From behind',
      stopTour: '■ Stop the tour', tourHint: 'Press any key or touch the screen to take control', tourHintTouch: 'Touch the screen to take control',
      tourEnd: 'The tour is over. Now explore on your own.',
      help: 'W A S D or arrows to walk · drag to look · wheel to zoom',
      helpTouch: 'Left stick to walk · drag the screen to look',
      quality: 'Quality', q_low: 'Low', q_mid: 'Medium', q_high: 'High',
      sound: 'Sound', walkFail: 'Could not find a way there',
      intentionTitle: 'Intention for the candle', intentionNote: 'Choose from fixed phrases.',
      candleFull: 'Every candle within reach is already lit',
      foot: 'Rosarium is a non-commercial app: no ads, no payments, no donations.'
    },
    es: {
      tagline: 'Rosarium — aplicación Android gratuita y sin fines comerciales para rezar el Rosario · esta es una vista previa web',
      noteReal: 'Este es un modelo virtual simplificado y no es igual a la iglesia real ({name}). No se incluyen obras de arte reales. {approver}',
      noteFict: 'Esta iglesia 3D no se parece a ninguna iglesia real: es una parroquia ficticia inventada por la aplicación. No se incluyen obras de arte reales. {approver}',
      langLabel: 'Idioma',
      tour: '▶ Visita guiada', free: 'Explorar por mi cuenta',
      loading: 'Cargando… {p}%', building: 'Construyendo la iglesia…', ready: 'Listo',
      loadFail: 'No se pudo cargar. Vuelve a cargar la página.',
      noWebgl: 'Este navegador no puede mostrar gráficos 3D (WebGL). Abre la página en otro navegador.',
      altar: 'Ir al altar', candle: 'Encender una vela', sit: 'Sentarse a rezar', stand: 'Levantarse', cross: 'Señal de la cruz', view: 'Vista',
      viewAuto: 'Auto', viewFp: 'Primera persona', viewTp: 'Desde atrás',
      stopTour: '■ Detener la visita', tourHint: 'Pulsa una tecla o toca la pantalla para tomar el control', tourHintTouch: 'Toca la pantalla para tomar el control',
      tourEnd: 'La visita ha terminado. Ahora explora por tu cuenta.',
      help: 'W A S D o flechas para caminar · arrastra para mirar · rueda para acercar',
      helpTouch: 'Palanca izquierda para caminar · arrastra la pantalla para mirar',
      quality: 'Calidad', q_low: 'Baja', q_mid: 'Media', q_high: 'Alta',
      sound: 'Sonido', walkFail: 'No se encontró camino hasta allí',
      intentionTitle: 'Intención de la vela', intentionNote: 'Se elige entre frases fijas.',
      candleFull: 'Todas las velas al alcance ya están encendidas',
      foot: 'Rosarium es una aplicación sin fines comerciales: sin anuncios, sin pagos, sin donaciones.'
    },
    pt: {
      tagline: 'Rosarium — aplicativo Android gratuito e não comercial para rezar o Rosário · esta é uma prévia na web',
      noteReal: 'Este é um modelo virtual simplificado e não é igual à igreja real ({name}). Obras de arte reais não estão incluídas. {approver}',
      noteFict: 'Esta igreja 3D não é igual a nenhuma igreja real: é uma paróquia fictícia inventada pelo aplicativo. Obras de arte reais não estão incluídas. {approver}',
      langLabel: 'Idioma',
      tour: '▶ Visita guiada', free: 'Explorar por conta própria',
      loading: 'Carregando… {p}%', building: 'Construindo a igreja…', ready: 'Pronto',
      loadFail: 'Não foi possível carregar. Recarregue a página.',
      noWebgl: 'Este navegador não consegue mostrar gráficos 3D (WebGL). Abra a página em outro navegador.',
      altar: 'Ir ao altar', candle: 'Acender uma vela', sit: 'Sentar e rezar', stand: 'Levantar', cross: 'Sinal da cruz', view: 'Vista',
      viewAuto: 'Auto', viewFp: 'Primeira pessoa', viewTp: 'Por trás',
      stopTour: '■ Parar a visita', tourHint: 'Pressione uma tecla ou toque na tela para assumir o controle', tourHintTouch: 'Toque na tela para assumir o controle',
      tourEnd: 'A visita terminou. Agora explore por conta própria.',
      help: 'W A S D ou setas para andar · arraste para olhar · roda para aproximar',
      helpTouch: 'Alavanca à esquerda para andar · arraste a tela para olhar',
      quality: 'Qualidade', q_low: 'Baixa', q_mid: 'Média', q_high: 'Alta',
      sound: 'Som', walkFail: 'Não foi possível encontrar o caminho até lá',
      intentionTitle: 'Intenção da vela', intentionNote: 'Escolhe-se entre frases fixas.',
      candleFull: 'Todas as velas ao alcance já estão acesas',
      foot: 'Rosarium é um aplicativo não comercial: sem anúncios, sem pagamentos, sem doações.'
    }
  };

  // 초 켜는 지향 8가지(앱 church_constants.dart candleIntentions 와 같은 순서). 글을 직접 쓰는 칸은 없다.
  var INTENTIONS = {
    ko: ['가족과 이웃을 위해', '아픈 이들을 위해', '세상의 평화를 위해', '돌아가신 이들을 위해', '감사의 마음으로', '시험과 일을 위해', '통회와 용서를 위해', '나라와 교회를 위해'],
    it: ['Per la famiglia e i vicini', 'Per i malati', 'Per la pace nel mondo', 'Per i defunti', 'In ringraziamento', 'Per lo studio e il lavoro', 'Per il pentimento e il perdono', 'Per il Paese e la Chiesa'],
    en: ['For family and neighbors', 'For the sick', 'For peace in the world', 'For the departed', 'In thanksgiving', 'For exams and work', 'For repentance and forgiveness', 'For the country and the Church'],
    es: ['Por la familia y los vecinos', 'Por los enfermos', 'Por la paz del mundo', 'Por los difuntos', 'En acción de gracias', 'Por los estudios y el trabajo', 'Por el arrepentimiento y el perdón', 'Por la patria y la Iglesia'],
    pt: ['Pela família e pelos vizinhos', 'Pelos doentes', 'Pela paz no mundo', 'Pelos falecidos', 'Em ação de graças', 'Pelos estudos e pelo trabalho', 'Pelo arrependimento e pelo perdão', 'Pelo país e pela Igreja']
  };

  // 둘러보기 기본 자막(video_plan.md 에 맞는 줄이 없거나 받는 분의 언어와 다를 때). 앱이 하는 일만 말한다.
  var CAPTIONS = {
    ko: {
      intro: '로사리움(Rosarium)이 단순하게 본뜬 가상 모형 안으로 들어갑니다.',
      walk: '입구에서 신랑을 따라 걸어 들어갑니다.',
      vault: '천장을 올려다봅니다. 실제 장식은 옮기지 않고 단순한 모양과 색 면으로 나타냈습니다.',
      altar: '경건함이 먼저입니다. 아바타는 제단 계단 앞에서 멈추고, 제단 안으로는 들어갈 수 없습니다.',
      cross: '성수대 앞에서 성호를 긋습니다. 기도하는 동작만 있고, 놀이나 싸움은 없습니다.',
      candle: '초를 켤 때 지향은 정해진 문구에서 고릅니다. 글을 직접 쓰거나 대화하는 기능은 없습니다.',
      sit: '자리에 앉아 묵주 기도를 바칩니다. 미사나 성사를 흉내 내는 기능은 없습니다.',
      outro: '둘러보기를 마칩니다. 이제 직접 걸어 보세요.'
    },
    it: {
      intro: 'Si entra in un modello virtuale semplificato creato da Rosarium.',
      walk: 'Si cammina dall’ingresso lungo la navata.',
      vault: 'Si guarda in alto verso la volta: le decorazioni reali non sono riprodotte, solo forme semplici e campiture di colore.',
      altar: 'La riverenza viene prima di tutto: l’avatar si ferma ai piedi dei gradini. Nel presbiterio non si entra.',
      cross: 'All’acquasantiera si fa il segno della croce. Solo gesti di preghiera: niente giochi, niente combattimenti.',
      candle: 'Si accende una candela scegliendo l’intenzione fra frasi già fissate: nessun testo libero, nessuna chat.',
      sit: 'Ci si siede e si prega il Rosario. Nessuna funzione imita la Messa o i Sacramenti.',
      outro: 'La visita è finita. Ora puoi camminare da solo.'
    },
    en: {
      intro: 'You are entering a simplified virtual model made by Rosarium.',
      walk: 'Walking in from the entrance along the nave.',
      vault: 'Looking up at the vault: real decorations are not reproduced, only simple shapes and blocks of colour.',
      altar: 'Reverence comes first: the avatar stops at the foot of the steps and cannot enter the sanctuary.',
      cross: 'At the holy water font, the sign of the cross. Only gestures of prayer: no games, no fighting.',
      candle: 'A candle is lit by choosing an intention from fixed phrases: no free text, no chat.',
      sit: 'Sitting down to pray the Rosary. No feature imitates the Mass or the Sacraments.',
      outro: 'The tour is over. Now explore on your own.'
    },
    es: {
      intro: 'Entras en un modelo virtual simplificado creado por Rosarium.',
      walk: 'Caminando desde la entrada por la nave.',
      vault: 'Mirando hacia la bóveda: no se reproducen las decoraciones reales, solo formas simples y planos de color.',
      altar: 'Primero la reverencia: el avatar se detiene al pie de las gradas y no puede entrar en el presbiterio.',
      cross: 'En la pila de agua bendita se hace la señal de la cruz. Solo gestos de oración: sin juegos ni peleas.',
      candle: 'Se enciende una vela eligiendo la intención entre frases fijas: sin texto libre y sin chat.',
      sit: 'Sentado, se reza el Rosario. Ninguna función imita la Misa ni los Sacramentos.',
      outro: 'La visita ha terminado. Ahora explora por tu cuenta.'
    },
    pt: {
      intro: 'Você entra em um modelo virtual simplificado criado pelo Rosarium.',
      walk: 'Caminhando da entrada pela nave.',
      vault: 'Olhando para a abóbada: as decorações reais não são reproduzidas, apenas formas simples e blocos de cor.',
      altar: 'A reverência vem primeiro: o avatar para ao pé dos degraus e não pode entrar no presbitério.',
      cross: 'Na pia de água benta faz-se o sinal da cruz. Apenas gestos de oração: sem jogos nem lutas.',
      candle: 'Acende-se uma vela escolhendo a intenção entre frases fixas: sem texto livre e sem chat.',
      sit: 'Sentado, reza-se o Rosário. Nenhuma função imita a Missa ou os Sacramentos.',
      outro: 'A visita terminou. Agora explore por conta própria.'
    }
  };

  // 장면 안 이름표(assets/church/markers.js 의 한국어 문구 -> 번역). 장면이 window.ChurchLabelMap 을 읽는다. ko 는 그대로.
  var LABELS = {
    it: { '촛불 봉헌': 'Candele', '제대 앞': 'Altare', '성수대': 'Acquasantiera', '성모상 앞': 'Statua della Madonna', '로마 백성의 구원 앞': 'Salus Populi Romani' },
    en: { '촛불 봉헌': 'Candles', '제대 앞': 'Altar', '성수대': 'Holy water', '성모상 앞': 'Statue of Mary', '로마 백성의 구원 앞': 'Salus Populi Romani' },
    es: { '촛불 봉헌': 'Velas', '제대 앞': 'Altar', '성수대': 'Agua bendita', '성모상 앞': 'Imagen de María', '로마 백성의 구원 앞': 'Salus Populi Romani' },
    pt: { '촛불 봉헌': 'Velas', '제대 앞': 'Altar', '성수대': 'Água benta', '성모상 앞': 'Imagem de Maria', '로마 백성의 구원 앞': 'Salus Populi Romani' }
  };

  // 성당 이름(앱 카탈로그 nameKo 와 각 언어의 통용 이름).
  var NAMES = {
    basic: { ko: '우리 본당', it: 'La nostra parrocchia', en: 'Our Parish', es: 'Nuestra parroquia', pt: 'Nossa paróquia' },
    stpeter: { ko: '성 베드로 대성전', it: 'Basilica di San Pietro', en: 'St. Peter’s Basilica', es: 'Basílica de San Pedro', pt: 'Basílica de São Pedro' },
    lateran: { ko: '라테라노 성 요한 대성전', it: 'Basilica di San Giovanni in Laterano', en: 'Basilica of St. John Lateran', es: 'Basílica de San Juan de Letrán', pt: 'Basílica de São João de Latrão' },
    maggiore: { ko: '성 마리아 마조레 대성전', it: 'Basilica di Santa Maria Maggiore', en: 'Basilica of St. Mary Major', es: 'Basílica de Santa María la Mayor', pt: 'Basílica de Santa Maria Maior' },
    stpaul: { ko: '성 밖의 성 바오로 대성전', it: 'Basilica di San Paolo fuori le Mura', en: 'Basilica of St. Paul Outside the Walls', es: 'Basílica de San Pablo Extramuros', pt: 'Basílica de São Paulo Fora dos Muros' },
    milan: { ko: '밀라노 대성당', it: 'Duomo di Milano', en: 'Milan Cathedral', es: 'Catedral de Milán', pt: 'Catedral de Milão' },
    florence: { ko: '피렌체 대성당', it: 'Cattedrale di Santa Maria del Fiore', en: 'Florence Cathedral', es: 'Catedral de Santa María del Fiore', pt: 'Catedral de Santa Maria del Fiore' },
    assisi: { ko: '아시시 성 프란치스코 대성당', it: 'Basilica di San Francesco d’Assisi', en: 'Basilica of St. Francis of Assisi', es: 'Basílica de San Francisco de Asís', pt: 'Basílica de São Francisco de Assis' },
    myeongdong: { ko: '명동대성당', it: 'Cattedrale di Myeongdong (Seul)', en: 'Myeongdong Cathedral (Seoul)', es: 'Catedral de Myeongdong (Seúl)', pt: 'Catedral de Myeongdong (Seul)' },
    danggogae: { ko: '당고개 순교성지', it: 'Santuario dei Martiri di Danggogae (Corea)', en: 'Danggogae Martyrs’ Shrine (Korea)', es: 'Santuario de los Mártires de Danggogae (Corea)', pt: 'Santuário dos Mártires de Danggogae (Coreia)' },
    yeouido: { ko: '여의도동성당', it: 'Chiesa di Yeouido-dong (Seul)', en: 'Yeouido-dong Church (Seoul)', es: 'Iglesia de Yeouido-dong (Seúl)', pt: 'Igreja de Yeouido-dong (Seul)' }
  };

  // 「○○가 만들거나 승인한 모형이 아닙니다」(앱 modelNote 마지막 줄).
  var APPROVER = {
    any: { ko: '어느 교회나 본당이 만들거나 승인한 모형이 아닙니다.', it: 'Non è un modello realizzato o approvato da alcuna Chiesa o parrocchia.', en: 'It was not made or approved by any church or parish.', es: 'No ha sido hecho ni aprobado por ninguna Iglesia ni parroquia.', pt: 'Não foi feito nem aprovado por nenhuma Igreja ou paróquia.' },
    pope: { ko: '교황청이나 대성전이 만들거나 승인한 모형이 아닙니다.', it: 'Non è un modello realizzato o approvato dalla Santa Sede o dalla basilica.', en: 'It was not made or approved by the Holy See or the basilica.', es: 'No ha sido hecho ni aprobado por la Santa Sede ni por la basílica.', pt: 'Não foi feito nem aprovado pela Santa Sé nem pela basílica.' },
    milan: { ko: '밀라노대교구나 대성당이 만들거나 승인한 모형이 아닙니다.', it: 'Non è un modello realizzato o approvato dall’Arcidiocesi di Milano o dal Duomo.', en: 'It was not made or approved by the Archdiocese of Milan or the cathedral.', es: 'No ha sido hecho ni aprobado por la Archidiócesis de Milán ni por la catedral.', pt: 'Não foi feito nem aprovado pela Arquidiocese de Milão nem pela catedral.' },
    florence: { ko: '피렌체대교구나 대성당이 만들거나 승인한 모형이 아닙니다.', it: 'Non è un modello realizzato o approvato dall’Arcidiocesi di Firenze o dalla cattedrale.', en: 'It was not made or approved by the Archdiocese of Florence or the cathedral.', es: 'No ha sido hecho ni aprobado por la Archidiócesis de Florencia ni por la catedral.', pt: 'Não foi feito nem aprovado pela Arquidiocese de Florença nem pela catedral.' },
    assisi: { ko: '대성당이나 이를 맡은 사크로 콘벤토가 만들거나 승인한 모형이 아닙니다.', it: 'Non è un modello realizzato o approvato dalla basilica o dal Sacro Convento che la custodisce.', en: 'It was not made or approved by the basilica or the Sacro Convento that cares for it.', es: 'No ha sido hecho ni aprobado por la basílica ni por el Sacro Convento que la custodia.', pt: 'Não foi feito nem aprovado pela basílica nem pelo Sacro Convento que a guarda.' },
    seoul: { ko: '서울대교구나 명동대성당이 만들거나 승인한 모형이 아닙니다.', it: 'Non è un modello realizzato o approvato dall’Arcidiocesi di Seul o dalla cattedrale di Myeongdong.', en: 'It was not made or approved by the Archdiocese of Seoul or Myeongdong Cathedral.', es: 'No ha sido hecho ni aprobado por la Archidiócesis de Seúl ni por la catedral de Myeongdong.', pt: 'Não foi feito nem aprovado pela Arquidiocese de Seul nem pela catedral de Myeongdong.' },
    shrine: { ko: '성지가 만들거나 승인한 모형이 아닙니다.', it: 'Non è un modello realizzato o approvato dal santuario.', en: 'It was not made or approved by the shrine.', es: 'No ha sido hecho ni aprobado por el santuario.', pt: 'Não foi feito nem aprovado pelo santuário.' },
    parish: { ko: '본당이 만들거나 승인한 모형이 아닙니다.', it: 'Non è un modello realizzato o approvato dalla parrocchia.', en: 'It was not made or approved by the parish.', es: 'No ha sido hecho ni aprobado por la parroquia.', pt: 'Não foi feito nem aprovado pela paróquia.' }
  };
  var CHURCH_APPROVER = { basic: 'any', stpeter: 'pope', lateran: 'pope', maggiore: 'pope', stpaul: 'pope', milan: 'milan', florence: 'florence', assisi: 'assisi', myeongdong: 'seoul', danggogae: 'shrine', yeouido: 'parish' };

  // 언어 이름(각자의 말로) · 주소의 ?lang= 덮어쓰기(올바른 값만; 아니면 페이지 기본 언어)
  var LANG_NAMES = { ko: '한국어', en: 'English', it: 'Italiano', es: 'Español', pt: 'Português' };
  function pickLang(search, pageLang) {
    var m = /[?&]lang=([a-z]{2})(?:&|#|$)/.exec(String(search || ''));
    return m && LANGS.indexOf(m[1]) >= 0 ? m[1] : (LANGS.indexOf(pageLang) >= 0 ? pageLang : 'en');
  }
  // 자막: 페이지가 {언어: {역할: 글}} 로 주면 그 언어 것, 없으면 빈 객체(i18n 기본 자막으로 채워진다). 예전 평평한 모양({역할: 글})도 받는다.
  function pickCaptions(caps, lang) {
    if (!caps || typeof caps !== 'object') return {};
    var any = false; LANGS.forEach(function (l) { if (caps[l] && typeof caps[l] === 'object') any = true; });
    return any ? (caps[lang] || {}) : caps;
  }

  root.DemoI18N = { langs: LANGS, langNames: LANG_NAMES, pickLang: pickLang, pickCaptions: pickCaptions, ui: UI, intentions: INTENTIONS, captions: CAPTIONS, names: NAMES, labels: LABELS, approver: APPROVER, churchApprover: CHURCH_APPROVER };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.DemoI18N;
})(typeof window !== 'undefined' ? window : globalThis);
