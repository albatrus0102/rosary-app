import '../../app/settings.dart';
import '../church_constants.dart';
import 'church_net.dart';
import 'solo_church_net.dart';
import 'web_socket_church_net.dart';

/// 서버 주소([ChurchConfig.serverUrl] 또는 [serverUrl])가 비어 있으면
/// [SoloChurchNet], 아니면 [WebSocketChurchNet]을 만든다.
ChurchNet createChurchNet(
  AppSettings settings, {
  String? serverUrl,
  ChurchChannelFactory? channelFactory,
  Future<String> Function()? clientIdProvider,
  DateTime Function()? clock,
}) {
  final url = (serverUrl ?? ChurchConfig.serverUrl).trim();
  if (url.isEmpty) return SoloChurchNet();
  return WebSocketChurchNet(
    serverUrl: url,
    avatarProvider: () => settings.churchAvatar,
    clientIdProvider: clientIdProvider,
    channelFactory: channelFactory,
    clock: clock,
  );
}
