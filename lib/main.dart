import 'package:flutter/widgets.dart';

import 'app/app.dart';
import 'app/licenses.dart';
import 'app/settings.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final settings = await AppSettings.load();
  registerFontLicenses();
  runApp(RosaryApp(settings));
}
