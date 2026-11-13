import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/church/avatar/avatar_config.dart';
import 'package:rosary_app/church/church_constants.dart';
import 'package:rosary_app/church/net/church_net.dart';
import 'package:rosary_app/church/net/church_protocol.dart';
import 'package:rosary_app/church/net/client_id.dart';
import 'package:rosary_app/church/net/web_socket_church_net.dart';

// 옛 형식(g·nv 없음): name 7 = 옛 40개 목록의 클라라.
const _avatar = {'skin': 1, 'style': 0, 'hair': 3, 'outfit': 5, 'name': 7};

void main() {
  group('parseChurchEvent', () {
    test('welcome', () {
      final e = parseChurchEvent(
        jsonEncode({
          't': 'welcome',
          'you': 'me-id',
          'room': 'church-1',
          'n': 12,
          'peers': [
            {
              'id': 'p1',
              'avatar': _avatar,
              'x': 0,
              'z': 5,
              'r': 0,
              'st': 'w',
              'seat': null,
              'ms': -1,
            },
            {
              'id': 'p2',
              'avatar': _avatar,
              'x': -5.2,
              'z': 9.25,
              'r': 0.5,
              'st': 'p',
              'seat': 'L03-2',
              'ms': 2,
            },
            {'bogus': true},
          ],
          'seats': {'L03-2': 'p2'},
          'candles': [
            {'slot': 5, 'until': 1760000000000, 'intention': 3},
            {'slot': 'x'},
          ],
          'now': 1759999000000,
        }),
      );
      expect(e, isA<Welcome>());
      final w = e as Welcome;
      expect(w.you, 'me-id');
      expect(w.room, 'church-1');
      expect(w.n, 12);
      expect(w.peers, hasLength(2));
      expect(w.peers[0].id, 'p1');
      expect(
        w.peers[0].avatar,
        AvatarConfig(
          skin: 1,
          style: 0,
          hair: 3,
          outfit: 5,
          name: baptismalIndexOf('클라라'),
        ),
      );
      // 옛 형식(g 없음, name 7 = 클라라)은 통합 목록의 같은 이름으로 읽힌다.
      expect(w.peers[0].avatar.gender, avatarFemale);
      expect(w.peers[0].avatar.nameText, '클라라');
      expect(w.peers[0].seat, isNull);
      expect(w.peers[0].ms, -1);
      expect(w.peers[1].seat, 'L03-2');
      expect(w.peers[1].st, 'p');
      expect(w.peers[1].ms, 2);
      expect(w.peers[1].x, -5.2);
      expect(w.seats, {'L03-2': 'p2'});
      expect(w.candles, [
        const CandleInfo(slot: 5, until: 1760000000000, intention: 3),
      ]);
      expect(w.now, 1759999000000);
    });

    test('join, leave, snap', () {
      final j = parseChurchEvent(
        '{"t":"join","peer":{"id":"p9","avatar":{"skin":0,"style":1,"hair":2,"outfit":3,"name":4},"x":1,"z":2,"r":0,"st":"w","seat":null,"ms":-1},"n":13}',
      );
      expect(j, isA<Join>());
      expect((j as Join).peer.id, 'p9');
      // 옛 형식: style 1(단발) → 여성 단발(0), name 4 = 데레사
      expect(j.peer.avatar.style, 0);
      expect(j.peer.avatar.nameText, '데레사');
      expect(j.n, 13);

      // 옛 성별별 형식(g 있음, nv 없음): 옛 남성 목록 23 = 베네딕토.
      final j2 = parseChurchEvent(
        '{"t":"join","peer":{"id":"p10","avatar":{"skin":0,"style":3,"hair":2,"outfit":3,"name":23,"g":1},"x":1,"z":2},"n":14}',
      );
      final a2 = (j2 as Join).peer.avatar;
      expect(a2.gender, avatarMale);
      expect(a2.style, 3);
      expect(a2.nameText, '베네딕토');
      expect(a2.toJson()['g'], 1);

      // 지금 형식(nv 2): name 은 통합 목록 인덱스 그대로. 범위를 벗어나면 기본 이름.
      final j3 = parseChurchEvent(
        '{"t":"join","peer":{"id":"p11","avatar":{"skin":0,"style":3,"hair":2,"outfit":3,"name":3754,"g":1,"nv":2},"x":1,"z":2},"n":15}',
      );
      final a3 = (j3 as Join).peer.avatar;
      expect(a3.name, 3754);
      expect(a3.nameText, baptismalNames[3754]);
      expect(a3.toJson()['nv'], avatarNameVersion);
      final j4 = parseChurchEvent(
        '{"t":"join","peer":{"id":"p12","avatar":{"skin":0,"style":3,"hair":2,"outfit":3,"name":4095,"g":1,"nv":2},"x":1,"z":2},"n":16}',
      );
      expect((j4 as Join).peer.avatar.nameText, '마리아');

      final l = parseChurchEvent('{"t":"leave","id":"p9","n":12}');
      expect(l, isA<Leave>());
      expect((l as Leave).id, 'p9');
      expect(l.n, 12);

      final s = parseChurchEvent(
        '{"t":"snap","n":13,"p":[["a",1.2,8.4,0.3,"w"],["b",2,3,0,"s"],["bad"]]}',
      );
      expect(s, isA<Snap>());
      final snap = s as Snap;
      expect(snap.n, 13);
      expect(snap.list, hasLength(2));
      expect(snap.list[0], const SnapEntry('a', 1.2, 8.4, 0.3, 'w'));
      expect(snap.list[1].st, 's');
      expect(snap.list[0].toJson(), ['a', 1.2, 8.4, 0.3, 'w']);
    });

    test('seated, stood, seat_denied', () {
      final a = parseChurchEvent('{"t":"seated","id":"p","seat":"L03-2"}');
      expect(a, isA<Seated>());
      expect((a as Seated).id, 'p');
      expect(a.seat, 'L03-2');
      final b = parseChurchEvent('{"t":"stood","id":"p"}');
      expect((b as Stood).id, 'p');
      final c = parseChurchEvent(
        '{"t":"seat_denied","seat":"L03-2","reason":"taken"}',
      );
      expect(c, isA<SeatDenied>());
      expect((c as SeatDenied).seat, 'L03-2');
      expect(c.reason, 'taken');
    });

    test('praying, candle, emote, full', () {
      final p = parseChurchEvent('{"t":"praying","id":"p","on":true,"ms":2}');
      expect(p, isA<Praying>());
      expect((p as Praying).on, isTrue);
      expect(p.ms, 2);
      final c = parseChurchEvent(
        '{"t":"candle","slot":5,"until":1760001800000,"intention":3}',
      );
      expect(c, isA<Candle>());
      expect((c as Candle).slot, 5);
      expect(c.until, 1760001800000);
      expect(c.intention, 3);
      expect(
        c.info,
        const CandleInfo(slot: 5, until: 1760001800000, intention: 3),
      );
      final e = parseChurchEvent('{"t":"emote","id":"p","e":1}');
      expect(e, isA<Emote>());
      expect((e as Emote).e, 1);
      final f = parseChurchEvent('{"t":"full","next":"church-2"}');
      expect(f, isA<Full>());
      expect((f as Full).next, 'church-2');
      expect(
        (parseChurchEvent('{"t":"full","next":"stpeter-3"}') as Full).next,
        'stpeter-3',
      );
    });

    test('pong, error, unknown and malformed give null', () {
      for (final s in <Object?>[
        '{"t":"pong"}',
        '{"t":"error","code":"rate"}',
        '{"t":"nope"}',
        '{}',
        '[]',
        '42',
        'garbage',
        '',
        null,
        42,
        '{"t":"welcome"}',
        '{"t":"join","peer":{},"n":1}',
        '{"t":"snap","n":1}',
        '{"t":"seated","id":"p"}',
        '{"t":"praying","id":"p","on":"yes"}',
        '{"t":"candle","slot":1}',
        '{"t":"full","next":"???"}',
        '{"t":"full","next":"church-0"}',
      ]) {
        expect(parseChurchEvent(s), isNull, reason: '$s');
      }
    });

    test('accepts an already decoded map', () {
      expect(parseChurchEvent({'t': 'stood', 'id': 'x'}), isA<Stood>());
    });

    test('PeerInfo.toJson matches the web bridge shape', () {
      const p = PeerInfo(
        id: 'a',
        avatar: AvatarConfig.defaultConfig,
        x: 1,
        z: 2,
        r: 3,
        st: 's',
        seat: 'R00-0',
        ms: 1,
      );
      expect(p.toJson(), {
        'id': 'a',
        'avatar': AvatarConfig.defaultConfig.toJson(),
        'x': 1.0,
        'z': 2.0,
        'r': 3.0,
        'st': 's',
        'seat': 'R00-0',
        'ms': 1,
      });
    });
  });

  group('client messages', () {
    test('encode as in SPEC', () {
      expect(jsonDecode(helloMessage('id1', AvatarConfig.defaultConfig)), {
        't': 'hello',
        'id': 'id1',
        'v': 1,
        'avatar': AvatarConfig.defaultConfig.toJson(),
      });
      expect(jsonDecode(posMessage(1.234, 8.4, 0.31234, true)), {
        't': 'pos',
        'x': 1.23,
        'z': 8.4,
        'r': 0.312,
        'm': 1,
      });
      expect(jsonDecode(posMessage(1, 2, 3, false))['m'], 0);
      expect(jsonDecode(sitMessage('L03-2')), {'t': 'sit', 'seat': 'L03-2'});
      expect(jsonDecode(standMessage()), {'t': 'stand'});
      expect(jsonDecode(prayMessage(true, 2)), {
        't': 'pray',
        'on': true,
        'ms': 2,
      });
      expect(jsonDecode(candleMessage(5, 3)), {
        't': 'candle',
        'slot': 5,
        'intention': 3,
      });
      expect(jsonDecode(emoteMessage(1)), {'t': 'emote', 'e': 1});
      expect(jsonDecode(pingMessage()), {'t': 'ping'});
    });
  });

  group('buildChurchUri', () {
    test('normalizes serverUrl with or without /ws', () {
      for (final base in [
        'wss://host.example',
        'wss://host.example/',
        'wss://host.example/ws',
        'wss://host.example/ws/',
        ' wss://host.example/ws ',
      ]) {
        expect(
          buildChurchUri(base, 'stpeter-1').toString(),
          'wss://host.example/ws?room=stpeter-1&v=1',
          reason: base,
        );
      }
      expect(
        buildChurchUri('https://h.example:8443/x', 'basic-2').toString(),
        'wss://h.example:8443/x/ws?room=basic-2&v=1',
      );
      expect(
        buildChurchUri('ws://127.0.0.1:8787/ws', 'basic-1').toString(),
        'ws://127.0.0.1:8787/ws?room=basic-1&v=1',
      );
    });

    test('backoff schedule 1,2,4,8,16,30,30', () {
      expect(
        [for (var i = 0; i < 8; i++) defaultChurchBackoff(i).inSeconds],
        [1, 2, 4, 8, 16, 30, 30, 30],
      );
    });
  });

  group('client id', () {
    test('uuid v4 format and uniqueness', () {
      final a = generateUuidV4();
      final b = generateUuidV4();
      expect(isUuidV4(a), isTrue, reason: a);
      expect(a, isNot(b));
      expect(isUuidV4('nope'), isFalse);
    });
  });
}
