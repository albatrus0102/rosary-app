import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/app/settings.dart';
import 'package:rosary_app/church/avatar/avatar_config.dart';
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

  test('out-of-range stored avatar is clamped', () async {
    SharedPreferences.setMockInitialValues({
      'church_avatar': '{"skin":9,"style":9,"hair":99,"outfit":99,"name":99}',
    });
    final s = await AppSettings.load();
    expect(
      s.churchAvatar,
      const AvatarConfig(skin: 3, style: 3, hair: 9, outfit: 11, name: 39),
    );
  });
}
