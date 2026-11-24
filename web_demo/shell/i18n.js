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
      buildSlow: '성당을 짓는 데 평소보다 오래 걸리고 있습니다. 조금 더 기다리거나 다시 시도해 주세요.', buildFail: '성당을 짓지 못했습니다. 다시 시도해 주세요.', glLost: '3D 화면(WebGL)이 멈췄습니다. 다시 시도해 주세요.', retry: '다시 시도',
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
      buildSlow: 'La costruzione della chiesa sta richiedendo più tempo del solito. Attendi ancora un po’ oppure riprova.', buildFail: 'Non è stato possibile costruire la chiesa. Riprova.', glLost: 'La grafica 3D (WebGL) si è interrotta. Riprova.', retry: 'Riprova',
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
      buildSlow: 'Building the church is taking longer than usual. Please wait a little longer or try again.', buildFail: 'The church could not be built. Please try again.', glLost: 'The 3D graphics (WebGL) stopped working. Please try again.', retry: 'Try again',
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
      buildSlow: 'La construcción de la iglesia está tardando más de lo habitual. Espera un poco más o vuelve a intentarlo.', buildFail: 'No se pudo construir la iglesia. Vuelve a intentarlo.', glLost: 'Los gráficos 3D (WebGL) dejaron de funcionar. Vuelve a intentarlo.', retry: 'Reintentar',
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
      buildSlow: 'A construção da igreja está demorando mais do que o normal. Aguarde um pouco mais ou tente novamente.', buildFail: 'Não foi possível construir a igreja. Tente novamente.', glLost: 'Os gráficos 3D (WebGL) pararam de funcionar. Tente novamente.', retry: 'Tentar novamente',
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

  // 앉은 자리 묵주기도(rosary.js) 문구. ko 는 앱(church_hud.dart ChurchSeatedBar · church_rosary_panel.dart)의 문구 그대로, 나머지는 기계 초안.
  // rPending 은 사용자가 정한 문구(2026-11-23): 공식 본문을 아직 받지 못한 기도의 자리.
  var ROSARY_UI = {
    ko: {
      rTitle: '묵주기도', rSeatedNote: '앉아 있어요. 묵주기도는 원할 때 시작해요.', rToday: '오늘의 신비: {name}', rSit: '앉아서', rKneel: '무릎 꿇고',
      rStart: '묵주기도 시작', rOn: '묵주기도 중', rPausedState: '묵주기도 · 쉬는 중', rDone: '기도를 마쳤습니다', rMore: '더보기', rPause: '잠깐 쉬기', rResume: '이어 기도', rEnd: '끝내기',
      rPrev: '이전', rNext: '다음', rTextOpen: '기도문 펼치기', rTextClose: '기도문 접기', rNextDecade: '다음 단으로 ›', rIntro: '서두', rClosing: '마침', rDecade: '{n}단', rClosingTitle: '마침 {t}',
      rFinished: '{name} 묵주기도를 모두 바쳤습니다. 평화를 빕니다.', rTextOnly: '이 웹 미리보기는 기도문을 글로만 보여 줍니다(소리 없음).', rSource: '기도문: 『가톨릭 기도서』(한국천주교주교회의).',
      rPending: '이 자리의 기도문은 공식 본문을 받는 대로 넣습니다.', tourEndRosary: '둘러보기를 마쳤습니다. 「다음」으로 기도를 이어 가거나 「일어나기」로 일어나 걸어 보세요.'
    },
    it: {
      rTitle: 'Rosario', rSeatedNote: 'Sei seduto. Inizia il Rosario quando vuoi.', rToday: 'Misteri del giorno: {name}', rSit: 'Seduto', rKneel: 'In ginocchio',
      rStart: 'Inizia il Rosario', rOn: 'Rosario in corso', rPausedState: 'Rosario · in pausa', rDone: 'Preghiera conclusa', rMore: 'Altro', rPause: 'Pausa', rResume: 'Riprendi la preghiera', rEnd: 'Termina',
      rPrev: 'Indietro', rNext: 'Avanti', rTextOpen: 'Mostra il testo', rTextClose: 'Nascondi il testo', rNextDecade: 'Decina successiva ›', rIntro: 'Inizio', rClosing: 'Conclusione', rDecade: 'Decina {n}', rClosingTitle: 'Conclusione: {t}',
      rFinished: 'Hai pregato tutto il Rosario ({name}). La pace sia con te.', rTextOnly: 'In questa anteprima web le preghiere sono mostrate solo come testo (senza audio).', rSource: 'Testi: Padre nostro nella formulazione oggi in uso (Ufficio Liturgico Nazionale, CEI). Gli altri testi ufficiali saranno inseriti appena li riceveremo.',
      rPending: 'Questa preghiera sarà inserita appena riceveremo il testo ufficiale.', tourEndRosary: 'La visita è finita. Tocca «Avanti» per continuare a pregare o «Alzati» per camminare di nuovo.'
    },
    en: {
      rTitle: 'Rosary', rSeatedNote: 'You are seated. Start the Rosary whenever you wish.', rToday: 'Mysteries of the day: {name}', rSit: 'Sitting', rKneel: 'Kneeling',
      rStart: 'Start the Rosary', rOn: 'Praying the Rosary', rPausedState: 'Rosary · paused', rDone: 'Prayer finished', rMore: 'More', rPause: 'Pause', rResume: 'Continue praying', rEnd: 'End',
      rPrev: 'Previous', rNext: 'Next', rTextOpen: 'Show prayer text', rTextClose: 'Hide prayer text', rNextDecade: 'Next decade ›', rIntro: 'Opening', rClosing: 'Closing', rDecade: 'Decade {n}', rClosingTitle: 'Closing: {t}',
      rFinished: 'You have prayed the whole Rosary ({name}). Peace be with you.', rTextOnly: 'In this web preview the prayers are shown as text only (no audio).', rSource: 'Texts: as published on usccb.org (USCCB).',
      rPending: 'This prayer will be added as soon as we receive the official text.', tourEndRosary: 'The tour is over. Tap “Next” to keep praying, or “Stand up” to walk again.'
    },
    es: {
      rTitle: 'Rosario', rSeatedNote: 'Estás sentado. Empieza el Rosario cuando quieras.', rToday: 'Misterios del día: {name}', rSit: 'Sentado', rKneel: 'De rodillas',
      rStart: 'Empezar el Rosario', rOn: 'Rezando el Rosario', rPausedState: 'Rosario · en pausa', rDone: 'Oración terminada', rMore: 'Más', rPause: 'Pausa', rResume: 'Seguir rezando', rEnd: 'Terminar',
      rPrev: 'Anterior', rNext: 'Siguiente', rTextOpen: 'Mostrar el texto', rTextClose: 'Ocultar el texto', rNextDecade: 'Siguiente decena ›', rIntro: 'Inicio', rClosing: 'Final', rDecade: 'Decena {n}', rClosingTitle: 'Final: {t}',
      rFinished: 'Has rezado todo el Rosario ({name}). La paz esté contigo.', rTextOnly: 'En esta vista previa web las oraciones se muestran solo como texto (sin audio).', rSource: 'Los textos oficiales se añadirán en cuanto los recibamos.',
      rPending: 'Esta oración se añadirá en cuanto recibamos el texto oficial.', tourEndRosary: 'La visita ha terminado. Toca «Siguiente» para seguir rezando o «Levantarse» para volver a caminar.'
    },
    pt: {
      rTitle: 'Rosário', rSeatedNote: 'Você está sentado. Comece o Rosário quando quiser.', rToday: 'Mistérios do dia: {name}', rSit: 'Sentado', rKneel: 'De joelhos',
      rStart: 'Começar o Rosário', rOn: 'Rezando o Rosário', rPausedState: 'Rosário · em pausa', rDone: 'Oração concluída', rMore: 'Mais', rPause: 'Pausa', rResume: 'Continuar rezando', rEnd: 'Encerrar',
      rPrev: 'Anterior', rNext: 'Próximo', rTextOpen: 'Mostrar o texto', rTextClose: 'Ocultar o texto', rNextDecade: 'Próxima dezena ›', rIntro: 'Início', rClosing: 'Final', rDecade: 'Dezena {n}', rClosingTitle: 'Final: {t}',
      rFinished: 'Você rezou o Rosário inteiro ({name}). A paz esteja com você.', rTextOnly: 'Nesta prévia na web as orações aparecem só como texto (sem áudio).', rSource: 'Textos: CNBB («Como rezar o Terço?»). Os demais textos oficiais serão incluídos assim que os recebermos.',
      rPending: 'Esta oração será incluída assim que recebermos o texto oficial.', tourEndRosary: 'A visita terminou. Toque em «Próximo» para continuar rezando ou «Levantar» para andar de novo.'
    }
  };
  LANGS.forEach(function (l) { for (var k in ROSARY_UI[l]) UI[l][k] = ROSARY_UI[l][k]; });

  // 십자가의 길(cross.js) 문구. ko 는 앱(church_cross.dart · stations_sheet.dart · stations_prayer_view.dart)의 문구 그대로, 나머지는 기계 초안.
  var STATIONS_UI = {
    ko: { sWay: '십자가의 길', sChip: '십자가의 길 {n}처 · {t}', sMeditate: '묵상하기', sTitle: '십자가의 길', sClose: '닫기', sLabel: '제{n}처', sImgAlt: '{label} 그림', sOpening: '시작 기도', sPrayer: '기도문', sMeditation: '묵상', sMedNote: '로사리움이 덧붙인 짧은 글(공식 기도문 아님)', sClosingTitle: '십자가의 길을 마치며', sClosingNote: '『가톨릭 기도서』의 십자가의 길은 제14처 기도로 끝납니다. 위 글은 로사리움이 덧붙인 마침 묵상이며 공식 기도문이 아닙니다.', sArt: '그림:', sArtCredit: '{artist}, {year}{photo}. {license}.', sDisclosure: '이 그림은 이 성당에 실제로 걸린 작품이 아니라 로사리움이 고른 대체 성화입니다.', sEnd: '마침', sBackTo: '{n}처로', sFinish: '순례 마치기', sEnding: '마치며', sNextStation: '다음 처로', sDone: '십자가의 길을 마쳤습니다' },
    it: { sWay: 'Via Crucis', sChip: 'Via Crucis · Stazione {n}', sMeditate: 'Medita', sTitle: 'Via Crucis', sClose: 'Chiudi', sLabel: 'Stazione {n}', sImgAlt: 'Immagine: {label}', sOpening: 'Preghiera iniziale', sPrayer: 'Preghiera', sMeditation: 'Meditazione', sMedNote: 'Breve testo aggiunto da Rosarium (non è una preghiera ufficiale)', sClosingTitle: 'Al termine della Via Crucis', sClosingNote: 'Nel libro di preghiere coreano la Via Crucis termina con la preghiera della XIV stazione.', sArt: 'Immagine:', sArtCredit: '{artist}, {year}{photo}. {license}.', sDisclosure: 'Questa immagine non è l’opera realmente presente in questa chiesa: è un’immagine sostitutiva scelta da Rosarium.', sEnd: 'Fine', sBackTo: 'Torna alla stazione {n}', sFinish: 'Concludi il pellegrinaggio', sEnding: 'Conclusione', sNextStation: 'Stazione successiva', sDone: 'Hai concluso la Via Crucis' },
    en: { sWay: 'Way of the Cross', sChip: 'Way of the Cross · Station {n}', sMeditate: 'Meditate', sTitle: 'Way of the Cross', sClose: 'Close', sLabel: 'Station {n}', sImgAlt: 'Image for {label}', sOpening: 'Opening prayer', sPrayer: 'Prayer', sMeditation: 'Meditation', sMedNote: 'A short text added by Rosarium (not an official prayer)', sClosingTitle: 'Ending the Way of the Cross', sClosingNote: 'In the Korean prayer book the Way of the Cross ends with the prayer of the 14th station.', sArt: 'Image:', sArtCredit: '{artist}, {year}{photo}. {license}.', sDisclosure: 'This image is not the work actually hanging in this church; it is a replacement chosen by Rosarium.', sEnd: 'End', sBackTo: 'Back to Station {n}', sFinish: 'Finish the pilgrimage', sEnding: 'Conclude', sNextStation: 'Next station', sDone: 'You have finished the Way of the Cross' },
    es: { sWay: 'Vía Crucis', sChip: 'Vía Crucis · Estación {n}', sMeditate: 'Meditar', sTitle: 'Vía Crucis', sClose: 'Cerrar', sLabel: 'Estación {n}', sImgAlt: 'Imagen: {label}', sOpening: 'Oración inicial', sPrayer: 'Oración', sMeditation: 'Meditación', sMedNote: 'Breve texto añadido por Rosarium (no es una oración oficial)', sClosingTitle: 'Al terminar el Vía Crucis', sClosingNote: 'En el devocionario coreano el Vía Crucis termina con la oración de la XIV estación.', sArt: 'Imagen:', sArtCredit: '{artist}, {year}{photo}. {license}.', sDisclosure: 'Esta imagen no es la obra que realmente está en esta iglesia: es una imagen sustitutiva elegida por Rosarium.', sEnd: 'Final', sBackTo: 'Volver a la estación {n}', sFinish: 'Terminar la peregrinación', sEnding: 'Concluir', sNextStation: 'Siguiente estación', sDone: 'Has terminado el Vía Crucis' },
    pt: { sWay: 'Via-Sacra', sChip: 'Via-Sacra · Estação {n}', sMeditate: 'Meditar', sTitle: 'Via-Sacra', sClose: 'Fechar', sLabel: 'Estação {n}', sImgAlt: 'Imagem: {label}', sOpening: 'Oração inicial', sPrayer: 'Oração', sMeditation: 'Meditação', sMedNote: 'Breve texto acrescentado pelo Rosarium (não é uma oração oficial)', sClosingTitle: 'Ao terminar a Via-Sacra', sClosingNote: 'No livro de orações coreano a Via-Sacra termina com a oração da XIV estação.', sArt: 'Imagem:', sArtCredit: '{artist}, {year}{photo}. {license}.', sDisclosure: 'Esta imagem não é a obra que de fato está nesta igreja: é uma imagem substituta escolhida pelo Rosarium.', sEnd: 'Fim', sBackTo: 'Voltar à estação {n}', sFinish: 'Concluir a peregrinação', sEnding: 'Concluir', sNextStation: 'Próxima estação', sDone: 'Você concluiu a Via-Sacra' }
  };
  LANGS.forEach(function (l) { for (var k in STATIONS_UI[l]) UI[l][k] = STATIONS_UI[l][k]; });

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

  // 둘러보기 끝의 묵주기도 자막(앉은 뒤). 앱이 하는 일만 말한다.
  var ROSARY_CAPTIONS = {
    ko: { rosStart: '자리에 앉아 「묵주기도 시작」을 누릅니다. 신비는 오늘 요일에 맞춰 정해집니다.', rosSign: '성호경으로 시작합니다. 기도문은 글로 보여 주고, 「다음」을 누를 때마다 묵주알이 한 알씩 넘어갑니다.', rosCreed: '사도신경 · 주님의 기도 · 성모송 세 번 · 영광송으로 서두를 바칩니다.', rosDecade: '각 단은 그 단의 신비를 묵상하며 주님의 기도, 성모송 열 번, 영광송, 구원을 비는 기도로 바칩니다.', rosHand: '이제 직접 「다음」으로 넘기거나 「다음 단으로」로 건너뛰어 보세요. 「일어나기」로 자리에서 일어납니다.' },
    it: { rosStart: 'Da seduti si tocca «Inizia il Rosario». I misteri seguono il giorno della settimana.', rosSign: 'Si comincia con il Segno della Croce. Le preghiere sono mostrate come testo e ogni «Avanti» fa scorrere il rosario di un grano.', rosCreed: 'L’inizio: il Simbolo degli Apostoli, il Padre nostro, tre Ave Maria e il Gloria al Padre.', rosDecade: 'Ogni decina: meditando il suo mistero, il Padre nostro, dieci Ave Maria, il Gloria al Padre e la preghiera di Fatima.', rosHand: 'Ora prova tu: «Avanti» per proseguire, «Decina successiva» per passare oltre, «Alzati» per lasciare il banco.' },
    en: { rosStart: 'Seated, you tap “Start the Rosary”. The mysteries follow the day of the week.', rosSign: 'It begins with the Sign of the Cross. The prayers are shown as text, and each “Next” moves the rosary on by one bead.', rosCreed: 'The opening: the Apostles’ Creed, the Our Father, three Hail Marys and the Glory Be.', rosDecade: 'Each decade: meditating on its mystery, the Our Father, ten Hail Marys, the Glory Be and the Fatima prayer.', rosHand: 'Now try it yourself: “Next” to go on, “Next decade” to skip ahead, “Stand up” to leave the pew.' },
    es: { rosStart: 'Sentado, se toca «Empezar el Rosario». Los misterios siguen el día de la semana.', rosSign: 'Se empieza con la señal de la cruz. Las oraciones se muestran como texto y cada «Siguiente» pasa una cuenta del rosario.', rosCreed: 'El inicio: el Símbolo de los Apóstoles, el Padre nuestro, tres avemarías y el Gloria al Padre.', rosDecade: 'Cada decena: meditando su misterio, el Padre nuestro, diez avemarías, el Gloria al Padre y la oración de Fátima.', rosHand: 'Ahora pruébalo tú: «Siguiente» para avanzar, «Siguiente decena» para saltar, «Levantarse» para dejar el banco.' },
    pt: { rosStart: 'Sentado, toca-se «Começar o Rosário». Os mistérios seguem o dia da semana.', rosSign: 'Começa-se com o sinal da cruz. As orações aparecem como texto e cada «Próximo» passa uma conta do terço.', rosCreed: 'O início: o Creio, o Pai-Nosso, três ave-marias e o Glória ao Pai.', rosDecade: 'Cada dezena: meditando o seu mistério, o Pai-Nosso, dez ave-marias, o Glória ao Pai e a oração de Fátima.', rosHand: 'Agora experimente: «Próximo» para seguir, «Próxima dezena» para avançar, «Levantar» para deixar o banco.' }
  };
  LANGS.forEach(function (l) { for (var k in ROSARY_CAPTIONS[l]) CAPTIONS[l][k] = ROSARY_CAPTIONS[l][k]; });

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
