import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/church/avatar/avatar_config.dart';
import 'package:rosary_app/church/church_constants.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test('church defaults', () async {
    SharedPreferences.setMockInitialValues({});
    final s = await AppSettings.load();
    expect(s.churchAvatar, AvatarConfig.defaultConfig);
    expect(s.churchAvatarChosen, isFalse);
    expect(s.churchAmbient, isTrue);
    expect(s.churchQuality, ChurchQuality.high);
    expect(s.churchId, 'basic');
  });

  test('church fields persist and notify', () async {
    SharedPreferences.setMockInitialValues({});
    final s = await AppSettings.load();
    var notified = 0;
    s.addListener(() => notified++);
    const avatar = AvatarConfig(
      gender: 1,
      skin: 2,
      style: 3,
      hair: 8,
      outfit: 1,
      name: 22,
    );
    s.churchAvatar = avatar;
    s.churchAvatarChosen = true;
    s.churchAmbient = false;
    s.churchQuality = ChurchQuality.low;
    s.churchId = 'stpeter';
    expect(notified, 5);
    // Same values do not notify again.
    s.churchAvatar = avatar;
    s.churchId = 'stpeter';
    expect(notified, 5);

    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getString('church_avatar'), avatar.toJsonString());
    expect(prefs.getBool('church_avatar_chosen'), isTrue);
    expect(prefs.getBool('church_ambient'), isFalse);
    expect(prefs.getString('church_quality'), 'low');
    expect(prefs.getString('church_id'), 'stpeter');

    final again = await AppSettings.load();
    expect(again.churchAvatar, avatar);
    expect(again.churchAvatarChosen, isTrue);
    expect(again.churchAmbient, isFalse);
    expect(again.churchQuality, ChurchQuality.low);
    expect(again.churchId, 'stpeter');
  });

  test('invalid stored values fall back to defaults', () async {
    SharedPreferences.setMockInitialValues({
      'church_avatar': 'not json',
      'church_quality': 'ultra',
      'church_id': 'atlantis',
    });
    final s = await AppSettings.load();
    expect(s.churchAvatar, AvatarConfig.defaultConfig);
    expect(s.churchQuality, ChurchQuality.high);
    expect(s.churchId, 'basic');
    s.churchId = 'nowhere';
    expect(s.churchId, 'basic');
  });

  test('out-of-range stored avatar is clamped (new format with g)', () async {
    SharedPreferences.setMockInitialValues({
      'church_avatar':
          '{"skin":9,"style":9,"hair":99,"outfit":99,"name":999,"g":1}',
    });
    final s = await AppSettings.load();
    expect(
      s.churchAvatar,
      AvatarConfig(
        gender: 1,
        skin: 3,
        style: 3,
        hair: 9,
        outfit: 11,
        name: maleBaptismalNames.length - 1,
      ),
    );
  });

  test('an avatar saved by an older version (no g) loads with a derived '
      'gender, the same baptismal name and a mapped hair style', () async {
    SharedPreferences.setMockInitialValues({
      'church_avatar': '{"skin":3,"style":3,"hair":9,"outfit":11,"name":39}',
      'church_avatar_chosen': true,
    });
    final s = await AppSettings.load();
    expect(s.churchAvatar.gender, avatarMale);
    expect(s.churchAvatar.nameText, '베네딕토');
    expect(s.churchAvatar.style, 2);
    expect([s.churchAvatar.skin, s.churchAvatar.hair], [3, 9]);
    expect(s.churchAvatarChosen, isTrue);
    // 다시 저장하면 새 형식(g 포함)으로 저장된다.
    s.churchAvatar = s.churchAvatar.copyWith(hair: 1);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getString('church_avatar'), contains('"g":1'));
  });
}
