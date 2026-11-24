/* prayers.js — 만든 파일(손대지 마세요): node web_demo/gen_prayers.mjs. 묵주기도 기도문·신비를 확인된 출처에서 글자 그대로 옮겼다.
   ko = lib/domain/prayer_data.dart · en = prayer-usccb · it = prayer-cei · es = prayer-cee · pt = prayer-cnbb (docs/legal/church_permission/package/<id>/texts.md);
   교황청 출판국 출처 본문과 신비 묶음 이름은 싣지 않는다(2026-11-24 사용 허락 거절). skipped·pending = 확인된 본문이 없어 이름과 안내만 보이는 기도('myst' = 신비 20단 이름). weekday = getDay()(0=일) → 신비(0 환희 · 1 빛 · 2 고통 · 3 영광). */
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
  "en": [],
  "it": [
   "fatima",
   "sign",
   "creed",
   "hail",
   "glory",
   "myst"
  ],
  "es": [
   "fatima",
   "sign",
   "creed",
   "our",
   "hail",
   "glory",
   "myst"
  ],
  "pt": [
   "fatima",
   "sign"
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
    "name": "",
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
    "name": "",
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
    "name": "",
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
    "name": "",
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
    "pending": true
   },
   "creed": {
    "t": "Simbolo degli Apostoli",
    "pending": true
   },
   "our": {
    "t": "Padre nostro",
    "x": "Padre nostro, che sei nei cieli,\nsia santificato il tuo nome,\nvenga il tuo regno,\nsia fatta la tua volontà,\ncome in cielo così in terra.\nDacci oggi il nostro pane quotidiano,\ne rimetti a noi i nostri debiti\ncome anche noi li rimettiamo ai nostri debitori,\ne non abbandonarci alla tentazione,\nma liberaci dal male."
   },
   "hail": {
    "t": "Ave Maria",
    "pending": true
   },
   "glory": {
    "t": "Gloria al Padre",
    "pending": true
   },
   "fatima": {
    "t": "Preghiera di Fatima",
    "pending": true
   }
  },
  "sets": {
   "joyful": {
    "name": "",
    "m": [
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     }
    ]
   },
   "luminous": {
    "name": "",
    "m": [
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     }
    ]
   },
   "sorrowful": {
    "name": "",
    "m": [
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     }
    ]
   },
   "glorious": {
    "name": "",
    "m": [
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     }
    ]
   }
  }
 },
 "es": {
  "prayers": {
   "sign": {
    "t": "Señal de la Cruz",
    "pending": true
   },
   "creed": {
    "t": "Símbolo de los Apóstoles",
    "pending": true
   },
   "our": {
    "t": "Padre nuestro",
    "pending": true
   },
   "hail": {
    "t": "Avemaría",
    "pending": true
   },
   "glory": {
    "t": "Gloria al Padre",
    "pending": true
   },
   "fatima": {
    "t": "Oración de Fátima",
    "pending": true
   }
  },
  "sets": {
   "joyful": {
    "name": "",
    "m": [
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     }
    ]
   },
   "luminous": {
    "name": "",
    "m": [
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     }
    ]
   },
   "sorrowful": {
    "name": "",
    "m": [
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     }
    ]
   },
   "glorious": {
    "name": "",
    "m": [
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     },
     {
      "pending": true
     }
    ]
   }
  }
 },
 "pt": {
  "prayers": {
   "sign": {
    "t": "Sinal da Cruz",
    "pending": true
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
    "name": "",
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
    "name": "",
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
    "name": "",
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
    "name": "",
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
