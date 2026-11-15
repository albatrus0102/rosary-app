import 'package:flutter/material.dart';

import '../app/settings.dart';
import '../app/track.dart';
import 'rosary_model.dart';
import 'rosary_prayer_view.dart';
import 'rosary_scene.dart';

/// 묵주 갤러리(T-81): 3D 로 돌려 보고(끌기) 확대(두 손가락)하며 감상하고, 고른 묵주를 기도 화면·전체 보기에서 그대로 쓴다.
/// 재질 분류 필터·즐겨찾기·사용 중 표시. 3D 는 기도 화면과 같은 페이지·같은 묵주 정의를 쓴다.
class RosaryGalleryScreen extends StatefulWidget {
  const RosaryGalleryScreen({super.key, required this.settings, this.scene});

  final AppSettings settings;

  /// 테스트용 주입.
  final RosaryScene? scene;

  @override
  State<RosaryGalleryScreen> createState() => _RosaryGalleryScreenState();
}

class _RosaryGalleryScreenState extends State<RosaryGalleryScreen> {
  late final RosaryScene _scene;
  late String _viewing;
  String _filter = '전체';
  double _yaw = 0, _pitch = 0, _zoom = 1, _zoom0 = 1;

  @override
  void initState() {
    super.initState();
    _viewing = widget.settings.rosaryId;
    _scene = widget.scene ?? RosaryScene.create();
    _scene.state
      ..['rosary'] = _viewing
      ..['view'] = 'a'
      ..['gallery'] = true
      ..['step'] = 0
      ..['theme'] = widget.settings.rosaryBackdrop.name;
    _scene.setFullView(true);
  }

  @override
  void dispose() {
    if (widget.scene == null) _scene.dispose();
    super.dispose();
  }

  void _show(String id) {
    setState(() => _viewing = id);
    _scene.setRosary(id);
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.settings;
    return Theme(
      data: rosaryTheme(s.rosaryBackdrop, s.prayerFont),
      child: Builder(
        builder: (context) {
          final theme = Theme.of(context);
          return ListenableBuilder(
            listenable: s,
            builder: (context, _) {
              final list = rosaryCatalog.where((r) {
                if (_filter == '전체') return true;
                if (_filter == '즐겨찾기') return s.rosaryFavorites.contains(r.id);
                return r.category == _filter;
              }).toList();
              final info = rosaryInfo(_viewing);
              final inUse = s.rosaryId == _viewing;
              final fav = s.rosaryFavorites.contains(_viewing);
              return Scaffold(
                backgroundColor: rosaryBackdropColor(s.rosaryBackdrop),
                appBar: AppBar(
                  backgroundColor: Colors.transparent,
                  title: const Text('묵주 갤러리'),
                  actions: [
                    IconButton(
                      key: const ValueKey('gallery-fav'),
                      tooltip: fav ? '즐겨찾기 해제' : '즐겨찾기',
                      isSelected: fav,
                      icon: const Icon(Icons.star_border),
                      selectedIcon: const Icon(Icons.star),
                      onPressed: () => s.toggleRosaryFavorite(_viewing),
                    ),
                  ],
                ),
                body: Column(
                  children: [
                    Expanded(
                      child: Semantics(
                        label: '${info.name} 3D 보기. 끌어서 돌리고 두 손가락으로 확대',
                        child: GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onScaleStart: (_) => _zoom0 = _zoom,
                          onScaleUpdate: (d) {
                            _yaw += d.focalPointDelta.dx * 0.01;
                            _pitch = (_pitch + d.focalPointDelta.dy * 0.006)
                                .clamp(-0.9, 0.9);
                            _zoom = (_zoom0 * d.scale).clamp(0.6, 3.5);
                            _scene.setOrbit(_yaw, _pitch, _zoom);
                          },
                          child: IgnorePointer(
                            child: ExcludeSemantics(
                              child: _scene.buildView(context),
                            ),
                          ),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 4),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              info.name,
                              style: theme.textTheme.titleLarge,
                            ),
                          ),
                          if (inUse)
                            Chip(
                              key: const ValueKey('gallery-in-use'),
                              avatar: const Icon(Icons.check, size: 16),
                              label: const Text('사용 중'),
                            ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Text(
                        info.description,
                        style: theme.textTheme.bodyMedium,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    SizedBox(
                      height: 56,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        children: [
                          for (final f in ['전체', ...rosaryCategories, '즐겨찾기'])
                            Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: ChoiceChip(
                                label: Text(f),
                                selected: _filter == f,
                                onSelected: (_) => setState(() => _filter = f),
                              ),
                            ),
                        ],
                      ),
                    ),
                    SizedBox(
                      height: 64,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        children: [
                          for (final r in list)
                            Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: FilterChip(
                                key: ValueKey('gallery-item-${r.id}'),
                                avatar: s.rosaryFavorites.contains(r.id)
                                    ? const Icon(Icons.star, size: 16)
                                    : null,
                                label: Text(r.name),
                                selected: r.id == _viewing,
                                onSelected: (_) => _show(r.id),
                              ),
                            ),
                        ],
                      ),
                    ),
                    SafeArea(
                      top: false,
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                        child: SizedBox(
                          width: double.infinity,
                          height: 56,
                          child: FilledButton(
                            key: const ValueKey('gallery-use'),
                            onPressed: inUse
                                ? null
                                : () {
                                    s.rosaryId = _viewing;
                                    Track.rosary(_viewing);
                                  },
                            child: Text(inUse ? '이 묵주로 기도하는 중' : '이 묵주로 기도하기'),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}
