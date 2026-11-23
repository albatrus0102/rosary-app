/* prayers.js — 만든 파일(손대지 마세요): node web_demo/gen_prayers.mjs. 묵주기도 기도문·신비를 확인된 출처에서 글자 그대로 옮겼다.
   ko = lib/domain/prayer_data.dart · en = prayer-usccb · it = prayer-cei · es = prayer-cee · pt = prayer-cnbb (docs/legal/church_permission/package/<id>/texts.md);
   en·pt 신비 묶음 이름 = prayer-lev(Compendium). skipped·pending = 확인된 본문이 없어 이름과 안내만 보이는 기도. weekday = getDay()(0=일) → 신비(0 환희 · 1 빛 · 2 고통 · 3 영광). */
(function (root) { root.DemoPrayers = {
 "ko": {
  "prayers": {
   "sign": {
    "t": "성호경",
    "x": "성부와 성자와 성령의 이름으로.\n아멘."
   },
   "creed": {
    "t": "사도신경",
    "x": "전능하신 천주 성부\n천지의 창조주를 저는 믿나이다.\n그 외아들 우리 주 예수 그리스도님\n성령으로 인하여 동정 마리아께 잉태되어 나시고\n본시오 빌라도 통치 아래서 고난을 받으시고\n십자가에 못 박혀 돌아가시고 묻히셨으며\n저승에 가시어 사흗날에 죽은 이들 가운데서 부활하시고\n하늘에 올라 전능하신 천주 성부 오른편에 앉으시며\n그리로부터 산 이와 죽은 이를 심판하러 오시리라 믿나이다.\n성령을 믿으며\n거룩하고 보편된 교회와 모든 성인의 통공을 믿으며\n죄의 용서와 육신의 부활을 믿으며\n영원한 삶을 믿나이다.\n아멘."
   },
   "our": {
    "t": "주님의 기도",
    "x": "하늘에 계신 우리 아버지,\n아버지의 이름이 거룩히 빛나시며\n아버지의 나라가 오시며\n아버지의 뜻이 하늘에서와 같이\n땅에서도 이루어지소서!\n오늘 저희에게 일용할 양식을 주시고\n저희에게 잘못한 이를 저희가 용서하오니\n저희 죄를 용서하시고\n저희를 유혹에 빠지지 않게 하시고\n악에서 구하소서.\n아멘."
   },
   "hail": {
    "t": "성모송",
    "x": "은총이 가득하신 마리아님, 기뻐하소서!\n주님께서 함께 계시니 여인 중에 복되시며\n태중의 아들 예수님 또한 복되시나이다.\n천주의 성모 마리아님,\n이제와 저희 죽을 때에\n저희 죄인을 위하여 빌어 주소서.\n아멘."
   },
   "glory": {
    "t": "영광송",
    "x": "영광이 성부와 성자와 성령께\n처음과 같이\n이제와 항상 영원히.\n아멘."
   },
   "fatima": {
    "t": "구원을 비는 기도",
    "x": "예수님, 저희 죄를 용서하시며\n저희를 지옥 불에서 구하시고\n연옥 영혼을 돌보시며\n가장 버림받은 영혼을 돌보소서."
   }
  },
  "sets": {
   "joyful": {
    "name": "환희의 신비",
    "m": [
     {
      "t": "환희의 신비 1단",
      "med": "마리아께서 예수님을 잉태하심을 묵상합시다."
     },
     {
      "t": "환희의 신비 2단",
      "med": "마리아께서 엘리사벳을 찾아보심을 묵상합시다."
     },
     {
      "t": "환희의 신비 3단",
      "med": "마리아께서 예수님을 낳으심을 묵상합시다."
     },
     {
      "t": "환희의 신비 4단",
      "med": "마리아께서 예수님을 성전에 바치심을 묵상합시다."
     },
     {
      "t": "환희의 신비 5단",
      "med": "마리아께서 잃으셨던 예수님을 성전에서 찾으심을 묵상합시다."
     }
    ]
   },
   "luminous": {
    "name": "빛의 신비",
    "m": [
     {
      "t": "빛의 신비 1단",
      "med": "예수님께서 세례 받으심을 묵상합시다."
     },
     {
      "t": "빛의 신비 2단",
      "med": "예수님께서 카나에서 첫 기적을 행하심을 묵상합시다."
     },
     {
      "t": "빛의 신비 3단",
      "med": "예수님께서 하느님 나라를 선포하심을 묵상합시다."
     },
     {
      "t": "빛의 신비 4단",
      "med": "예수님께서 거룩하게 변모하심을 묵상합시다."
     },
     {
      "t": "빛의 신비 5단",
      "med": "예수님께서 성체성사를 세우심을 묵상합시다."
     }
    ]
   },
   "sorrowful": {
    "name": "고통의 신비",
    "m": [
     {
      "t": "고통의 신비 1단",
      "med": "예수님께서 우리를 위하여 피땀 흘리심을 묵상합시다."
     },
     {
      "t": "고통의 신비 2단",
      "med": "예수님께서 우리를 위하여 매 맞으심을 묵상합시다."
     },
     {
      "t": "고통의 신비 3단",
      "med": "예수님께서 우리를 위하여 가시관 쓰심을 묵상합시다."
     },
     {
      "t": "고통의 신비 4단",
      "med": "예수님께서 우리를 위하여 십자가 지심을 묵상합시다."
     },
     {
      "t": "고통의 신비 5단",
      "med": "예수님께서 우리를 위하여 십자가에 못 박혀 돌아가심을 묵상합시다."
     }
    ]
   },
   "glorious": {
    "name": "영광의 신비",
    "m": [
     {
      "t": "영광의 신비 1단",
      "med": "예수님께서 부활하심을 묵상합시다."
     },
     {
      "t": "영광의 신비 2단",
      "med": "예수님께서 승천하심을 묵상합시다."
     },
     {
      "t": "영광의 신비 3단",
      "med": "예수님께서 성령을 보내심을 묵상합시다."
     },
     {
      "t": "영광의 신비 4단",
      "med": "예수님께서 마리아를 하늘에 불러올리심을 묵상합시다."
     },
     {
      "t": "영광의 신비 5단",
      "med": "예수님께서 마리아께 천상 모후의 관을 씌우심을 묵상합시다."
     }
    ]
   }
  }
 },
 "weekday": [
  3,
  0,
  2,
  3,
  1,
  2,
  0
 ],
 "skipped": {
  "it": [
   "fatima"
  ],
  "es": [
   "fatima"
  ],
  "pt": [
   "fatima"
  ]
 },
 "en": {
  "prayers": {
   "sign": {
    "t": "The Sign of the Cross",
    "x": "In the name of the Father, and of the Son, and of the Holy Spirit. Amen."
   },
   "creed": {
    "t": "The Apostles’ Creed",
    "x": "I believe in God,\nthe Father almighty,\nCreator of heaven and earth,\nand in Jesus Christ, his only Son, our Lord,\nwho was conceived by the Holy Spirit,\nborn of the Virgin Mary,\nsuffered under Pontius Pilate,\nwas crucified, died and was buried;\nhe descended into hell;\non the third day he rose again from the dead;\nhe ascended into heaven,\nand is seated at the right hand of God the Father almighty;\nfrom there he will come to judge the living and the dead.\nI believe in the Holy Spirit,\nthe holy catholic Church,\nthe communion of saints,\nthe forgiveness of sins,\nthe resurrection of the body,\nand life everlasting.\nAmen."
   },
   "our": {
    "t": "The Our Father",
    "x": "Our Father, who art in heaven,\nhallowed be thy name;\nthy kingdom come;\nthy will be done on earth as it is in heaven.\nGive us this day our daily bread;\nand forgive us our trespasses\nas we forgive those who trespass\nagainst us;\nand lead us not into temptation,\nbut deliver us from evil.\nAmen"
   },
   "hail": {
    "t": "The Hail Mary",
    "x": "Hail Mary, full of grace, the Lord is with you;\nblessed are you among women,\nand blessed is the fruit of your womb, Jesus.\nHoly Mary, Mother of God,\npray for us sinners\nnow and at the hour of our death.\nAmen."
   },
   "glory": {
    "t": "The Glory Be",
    "x": "Glory be to the Father, the Son, and the Holy Spirit;\nas it was in the beginning, is now, and ever shall be,\nworld without end.\nAmen."
   },
   "fatima": {
    "t": "The Fatima prayer",
    "x": "O my Jesus, forgive us our sins, save us from the fires of hell; lead all souls to Heaven, especially those who have most need of your mercy."
   }
  },
  "sets": {
   "joyful": {
    "name": "The Joyful Mysteries",
    "m": [
     {
      "t": "The Annunciation"
     },
     {
      "t": "The Visitation"
     },
     {
      "t": "The Nativity"
     },
     {
      "t": "The Presentation in the Temple"
     },
     {
      "t": "The Finding in the Temple"
     }
    ]
   },
   "luminous": {
    "name": "The Mysteries of Light",
    "m": [
     {
      "t": "The Baptism of Christ in the Jordan"
     },
     {
      "t": "The Wedding Feast at Cana"
     },
     {
      "t": "Jesus' Proclamation of the Coming of the Kingdom of God"
     },
     {
      "t": "The Transfiguration"
     },
     {
      "t": "The Institution of the Eucharist"
     }
    ]
   },
   "sorrowful": {
    "name": "The Sorrowful Mysteries",
    "m": [
     {
      "t": "The Agony in the Garden"
     },
     {
      "t": "The Scourging at the Pillar"
     },
     {
      "t": "The Crowning with Thorns"
     },
     {
      "t": "The Carrying of the Cross"
     },
     {
      "t": "The Crucifixion and Death"
     }
    ]
   },
   "glorious": {
    "name": "The Glorious Mysteries",
    "m": [
     {
      "t": "The Resurrection"
     },
     {
      "t": "The Ascension"
     },
     {
      "t": "The Descent of the Holy Spirit"
     },
     {
      "t": "The Assumption"
     },
     {
      "t": "The Coronation of Mary"
     }
    ]
   }
  }
 },
 "it": {
  "prayers": {
   "sign": {
    "t": "Segno della Croce",
    "x": "Nel nome del Padre\ne del Figlio\ne dello Spirito Santo. Amen."
   },
   "creed": {
    "t": "Simbolo degli Apostoli",
    "x": "Io credo in Dio, Padre onnipotente, Creatore del cielo e della terra.\nE in Gesù Cristo, Suo unico Figlio, nostro Signore, il quale fu concepito di Spirito Santo nacque da Maria Vergine, patì sotto Ponzio Pilato, fu crocifisso, mori e fu sepolto; discese agli inferi; il terzo giorno risuscitò da morte; salì al cielo, siede alla destra di Dio Padre onnipotente: di là verrà a giudicare i vivi e i morti.\nCredo nello Spirito Santo,\nla santa Chiesa cattolica,\nla comunione dei santi,\nla remissione dei peccati,\nla risurrezione della carne,\nla vita eterna.."
   },
   "our": {
    "t": "Padre nostro",
    "x": "Padre nostro, che sei nei cieli,\nsia santificato il tuo nome,\nvenga il tuo regno,\nsia fatta la tua volontà,\ncome in cielo così in terra.\nDacci oggi il nostro pane quotidiano,\ne rimetti a noi i nostri debiti\ncome anche noi li rimettiamo ai nostri debitori,\ne non abbandonarci alla tentazione,\nma liberaci dal male."
   },
   "hail": {
    "t": "Ave Maria",
    "x": "Ave, o Maria, piena di grazia,\nil Signore è con te.\nTu sei benedetta fra le donne\ne benedetto è il frutto del tuo seno,\nGesù.\nSanta Maria, Madre di Dio,\nprega per noi peccatori,\nadesso e nell'ora della nostra morte.\nAmen."
   },
   "glory": {
    "t": "Gloria al Padre",
    "x": "Gloria al Padre\ne al Figlio\ne allo Spirito Santo.\nCome era nel principio,\nora e sempre,\nnei secoli dei secoli. Amen."
   },
   "fatima": {
    "t": "Preghiera di Fatima",
    "pending": true
   }
  },
  "sets": {
   "joyful": {
    "name": "Misteri della gioia",
    "m": [
     {
      "t": "L'annuncio dell' Angelo a Maria."
     },
     {
      "t": "La visita di Maria a Elisabetta."
     },
     {
      "t": "La nascita di Gesù a Betlemme."
     },
     {
      "t": "La presentazione di Gesù al Tempio."
     },
     {
      "t": "Il ritrovamento di Gesù nel Tempio."
     }
    ]
   },
   "luminous": {
    "name": "Misteri della luce",
    "m": [
     {
      "t": "Il battesimo di Gesù al Giordano."
     },
     {
      "t": "L'auto-rivelazione di Gesù\nalle nozze di Cana."
     },
     {
      "t": "L'annuncio del Regno di Dio\ncon l'invito alla conversione."
     },
     {
      "t": "La trasfigurazione di Gesù\nsul Tabor."
     },
     {
      "t": "L'istituzione dell'Eucaristia."
     }
    ]
   },
   "sorrowful": {
    "name": "Misteri del dolore",
    "m": [
     {
      "t": "Gesù nell'orto degli ulivi."
     },
     {
      "t": "Gesù flagellato alla colonna."
     },
     {
      "t": "Gesù è coronato di spine."
     },
     {
      "t": "Gesù sale al Calvario."
     },
     {
      "t": "Gesù muore in Croce."
     }
    ]
   },
   "glorious": {
    "name": "Misteri della gloria",
    "m": [
     {
      "t": "Gesù risorge da morte."
     },
     {
      "t": "Gesù ascende al cielo."
     },
     {
      "t": "La discesa dello Spirito Santo."
     },
     {
      "t": "L'assunzione di Maria al cielo."
     },
     {
      "t": "Maria, Regina del cielo e della terra."
     }
    ]
   }
  }
 },
 "es": {
  "prayers": {
   "sign": {
    "t": "Señal de la Cruz",
    "x": "En el nombre del Padre\ny del Hijo\ny del Espíritu Santo. Amén."
   },
   "creed": {
    "t": "Símbolo de los Apóstoles",
    "x": "Creo en Dios, Padre Todopoderoso,\nCreador del cielo y de la tierra.\nCreo en Jesucristo, su único Hijo,\nNuestro Señor,\nQue fue concebido por obra y gracia del Espíritu Santo, nació de Santa María Virgen, padeció bajo el poder de Poncio Pilato,\nfue crucificado, muerto y sepultado, descendió a los infiernos, al tercer día resucitó de entre los muertos, subió a los cielos y está sentado a la derecha de Dios, Padre todopoderoso. Desde allí ha de venir\na juzgar a vivos y muertos.\nCreo en el Espíritu Santo,\nla santa Iglesia católica,\nla comunión de los santos,\nel perdón de los pecados,\nla resurrección de la carne\ny la vida eterna.\nAmén."
   },
   "our": {
    "t": "Padre nuestro",
    "x": "Padre nuestro que estás en el cielo,\nsantificado sea tu Nombre;\nvenga a nosotros tu Reino;\nhágase tu voluntad\nen la tierra como en el cielo.\nDanos hoy\nnuestro pan de cada día;\nperdona nuestras ofensas,\ncomo también nosotros perdonamos\na los que nos ofenden;\nno nos dejes caer en la tentación,\ny líbranos del mal. Amén."
   },
   "hail": {
    "t": "Avemaría",
    "x": "Dios te salve, María,\nllena eres de gracia;\nel Señor es contigo.\nBendita Tú eres\nentre todas las mujeres,\ny bendito es el fruto de tu vientre, Jesús.\nSanta María, Madre de Dios,\nruega por nosotros, pecadores,\nahora y en la hora de nuestra muerte. Amén"
   },
   "glory": {
    "t": "Gloria al Padre",
    "x": "Gloria al Padre\ny al Hijo\ny al Espíritu Santo.\nComo era en el principio,\nahora y siempre,\npor los siglos de los siglos. Amén."
   },
   "fatima": {
    "t": "Oración de Fátima",
    "pending": true
   }
  },
  "sets": {
   "joyful": {
    "name": "Misterios gozosos",
    "m": [
     {
      "t": "La encarnación del Hijo de Dios."
     },
     {
      "t": "La visitación de Nuestra Señora a su prima Santa Isabel."
     },
     {
      "t": "El nacimiento del Hijo de Dios."
     },
     {
      "t": "La Presentación de Jesús en el templo."
     },
     {
      "t": "El Niño Jesús perdido y hallado en el templo."
     }
    ]
   },
   "luminous": {
    "name": "Misterios luminosos",
    "m": [
     {
      "t": "El Bautismo de Jesús en el Jordán."
     },
     {
      "t": "La autorrevelación de Jesús en las bodas de Caná."
     },
     {
      "t": "El anuncio del Reino de Dios invitando a la conversión."
     },
     {
      "t": "La Transfiguración."
     },
     {
      "t": "La Institución de la Eucaristía."
     }
    ]
   },
   "sorrowful": {
    "name": "Misterios dolorosos",
    "m": [
     {
      "t": "La Oración de Jesús en el Huerto."
     },
     {
      "t": "La Flagelación del Señor."
     },
     {
      "t": "La Coronación de espinas."
     },
     {
      "t": "Jesús con la Cruz a cuestas camino del Calvario."
     },
     {
      "t": "La Crucifixión y Muerte de Nuestro Señor."
     }
    ]
   },
   "glorious": {
    "name": "Misterios gloriosos",
    "m": [
     {
      "t": "La Resurrección del Hijo de Dios."
     },
     {
      "t": "La Ascensión del Señor a los Cielos."
     },
     {
      "t": "La Venida del Espíritu Santo sobre los Apóstoles."
     },
     {
      "t": "La Asunción de Nuestra Señora a los Cielos."
     },
     {
      "t": "La Coronación de la Santísima Virgen como Reina de Cielos y Tierra."
     }
    ]
   }
  }
 },
 "pt": {
  "prayers": {
   "sign": {
    "t": "Sinal da Cruz",
    "x": "Em nome do Pai e do Filho\ne do Espírito Santo. Ámen."
   },
   "creed": {
    "t": "Creio (Símbolo dos Apóstolos)",
    "x": "Creio em Deus Pai Todo-Poderoso, criador do céu e da terra, e em Jesus Cristo, Seu único Filho Nosso Senhor, que foi concebido pelo poder do Espírito Santo, nasceu da Virgem Maria, padeceu sob Pôncio Pilatos, foi crucificado, morto e sepultado; desceu à mansão dos mortos, ressuscitou ao terceiro dia, subiu aos céus, está sentado à direita de Deus Pai Todo-Poderoso, donde há de vir a julgar os vivos e mortos. Creio no Espírito Santo, na Santa Igreja Católica, na comunhão dos santos, na remissão dos pecados, na ressurreição da carne e na vida eterna. Amém."
   },
   "our": {
    "t": "Pai-Nosso",
    "x": "Pai nosso que estais nos céus, santificado seja o Vosso nome, venha a nós o Vosso reino, seja feita a Vossa vontade, assim na terra como no céu. O pão nosso de cada dia nos dai hoje e perdoai-nos as nossas ofensas, assim como nós perdoamos a quem nos tem ofendido. Não nos deixeis cair em tentação, mas nos livrai do mal. Amém."
   },
   "hail": {
    "t": "Ave-Maria",
    "x": "Ave-Maria, cheia de graça! O Senhor é convosco e bendita sois vós entre as mulheres. Bendito é o Fruto do vosso ventre, Jesus. Santa Maria Mãe de Deus, rogai por nós, os pecadores, agora e na hora de nossa morte. Amém."
   },
   "glory": {
    "t": "Glória ao Pai",
    "x": "Glória ao Pai, ao Filho e ao Espírito Santo. Assim como era no princípio, agora e sempre, e por todos os séculos dos séculos. Amém."
   },
   "fatima": {
    "t": "Oração de Fátima",
    "pending": true
   }
  },
  "sets": {
   "joyful": {
    "name": "Mistérios Gozosos",
    "m": [
     {
      "t": "Anunciação do anjo a Maria"
     },
     {
      "t": "Visitação de Maria a Santa Isabel"
     },
     {
      "t": "Nascimento do Menino Deus"
     },
     {
      "t": "Apresentação de Jesus no Templo"
     },
     {
      "t": "Perda e encontro de Jesus"
     }
    ]
   },
   "sorrowful": {
    "name": "Mistérios Dolorosos",
    "m": [
     {
      "t": "Oração e agonia de Jesus no Getsémani"
     },
     {
      "t": "Flagelação de Cristo"
     },
     {
      "t": "A coroação de espinhos"
     },
     {
      "t": "A subida ao Calvário"
     },
     {
      "t": "A morte na cruz"
     }
    ]
   },
   "glorious": {
    "name": "Mistérios Gloriosos",
    "m": [
     {
      "t": "Ressurreição do Senhor"
     },
     {
      "t": "A ascensão de Jesus"
     },
     {
      "t": "Pentecostes – A vinda do Espírito sobre Maria e os apóstolos"
     },
     {
      "t": "Maria assunta aos céus"
     },
     {
      "t": "Maria coroada Rainha dos anjos e dos santos"
     }
    ]
   },
   "luminous": {
    "name": "Mistérios da Luz",
    "m": [
     {
      "t": "Batismo de Jesus no Jordão"
     },
     {
      "t": "Milagre de Jesus nas bodas de Caná"
     },
     {
      "t": "Anúncio do Reino de Deus com um convite à conversão"
     },
     {
      "t": "Transfiguração do Senhor"
     },
     {
      "t": "Instituição da Eucaristia"
     }
    ]
   }
  }
 }
}; if (typeof module !== 'undefined' && module.exports) module.exports = root.DemoPrayers; })(typeof window !== 'undefined' ? window : globalThis);
