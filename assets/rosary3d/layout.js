/* layout.js — 묵주 3D 의 순수 계산(three.js·DOM 없이 Node 에서도 돈다). 테스트: tools/church_web/rosary3d.test.mjs
   - 묵주 구조(5단 59알): 십자가 · 큰 알 · 작은 알 3 · 큰 알(1단 주님의 기도) · 메달 · [작은 알 10 (+ 다음 단 큰 알)] × 5 → 메달.
   - 기도 스텝(lib/domain/rosary_sequence.dart 의 73 스텝) → 경로 위치(소수). 알에 대응하지 않는 기도(영광송·구원의 기도)는
     알 사이 '체인 위' 소수 위치로만 표현하고 알을 더하지 않는다. Dart 쪽 lib/rosary3d/rosary_bead_map.dart 와 같은 규칙.
   - C안(손안의 묵주): 현재 위치를 앞에 두고 원호(손가락에 걸친 모양)로 늘어놓는다. 위 = 다음 알(아래로 당기면 다음).
   - A안(전체 보기): 바닥 천 위에 놓인 실제 묵주 모양(고리 + 꼬리)으로 펼친다.
   RosaryLayout = { NODE, nodes, nodeCount, stepPos, STEP_COUNT, arcLengths, sAt, cLayout, aLayout, beadIndexOfNode } */
(function (root) {
  'use strict';
  var NODE = { CROSS: 'cross', BIG: 'big', SMALL: 'small', MEDAL: 'medal' };

  // 경로 순서의 노드 목록. 마지막 노드(61)는 고리를 돌아 다시 만나는 같은 메달(마침 성호경 자리)이다.
  function buildNodes() {
    var n = [{ kind: NODE.CROSS }, { kind: NODE.BIG }];
    for (var i = 0; i < 3; i++) n.push({ kind: NODE.SMALL });
    n.push({ kind: NODE.BIG, decade: 1 });          // 5: 1단 주님의 기도
    n.push({ kind: NODE.MEDAL });                    // 6
    for (var d = 1; d <= 5; d++) {
      for (var k = 1; k <= 10; k++) n.push({ kind: NODE.SMALL, decade: d, n: k });
      if (d < 5) n.push({ kind: NODE.BIG, decade: d + 1 });
    }
    n.push({ kind: NODE.MEDAL, again: true });       // 61
    return n;
  }
  var nodes = buildNodes();
  var STEP_COUNT = 73;

  function bigNode(d) { return d === 1 ? 5 : 17 + (d - 2) * 11; }
  function smallNode(d, n) { return (d === 1 ? 6 : bigNode(d)) + n; }

  // 스텝 인덱스(0..72) → 경로 위치. 0·1 성호경·사도신경 = 십자가, 2 주님의 기도, 3..5 성모송, 6 영광송(체인 위),
  // 단마다 13 스텝(주님의 기도, 성모송 10, 영광송·구원의 기도는 10번째 알 다음 체인 위), 72 마침 = 메달.
  function stepPos(step) {
    if (step <= 1) return 0;
    if (step === 2) return 1;
    if (step <= 5) return step - 1;
    if (step === 6) return 4.5;
    if (step >= 72) return 61;
    var d = Math.floor((step - 7) / 13) + 1, r = (step - 7) % 13;
    if (r === 0) return bigNode(d);
    if (r <= 10) return smallNode(d, r);
    return smallNode(d, 10) + (r === 11 ? 0.35 : 0.65);
  }

  // 노드 → 실물 알 번호(0..58, 경로 순서). 십자가·메달은 -1.
  var beadIndexOfNode = (function () {
    var out = [], b = 0;
    for (var i = 0; i < nodes.length; i++) out.push(nodes[i].kind === NODE.BIG || nodes[i].kind === NODE.SMALL ? b++ : -1);
    return out;
  })();

  // 노드 크기(지름, 작은 알 = 1 단위)와 간격으로 누적 길이 표를 만든다. dims = { small, big, cross, medal, gap }
  function nodeSize(kind, dims) { return kind === NODE.SMALL ? dims.small : kind === NODE.BIG ? dims.big : kind === NODE.CROSS ? dims.cross : dims.medal; }
  function arcLengths(dims) {
    var s = [0], i;
    for (i = 1; i < nodes.length; i++) s.push(s[i - 1] + nodeSize(nodes[i - 1].kind, dims) / 2 + dims.gap + nodeSize(nodes[i].kind, dims) / 2);
    return s;
  }
  function sAt(s, p) {
    if (p <= 0) return s[0] + p * (s[1] - s[0]);
    var last = s.length - 1;
    if (p >= last) return s[last] + (p - last) * (s[last] - s[last - 1]);
    var i = Math.floor(p), f = p - i;
    return s[i] + (s[i + 1] - s[i]) * f;
  }

  // C안: 원호 배치. 반환 [{x,y,z,theta,visible,scale}] (노드 순서). opt = { R, front, thetaMax, focusScale, hand }
  //  - 위(+y)가 앞으로 올 알. 반지름 R 의 원호 꼭대기(현재 위치)가 카메라 쪽(z=front)으로 가장 튀어나온다.
  //  - focusScale: 현재 위치에서 멀어질수록 조금씩 작아지는 비율(사진의 원근을 거든다, 0 이면 끔).
  function cLayout(s, p, opt) {
    var sp = sAt(s, p), out = [], R = opt.R, tm = opt.thetaMax, fs = opt.focusScale || 0;
    for (var i = 0; i < s.length; i++) {
      var th = (s[i] - sp) / R;
      var vis = Math.abs(th) <= tm;
      var a = Math.min(Math.abs(th), Math.PI / 2);
      out.push({ x: opt.hand || 0, y: R * Math.sin(th), z: opt.front - R * (1 - Math.cos(th)), theta: th, visible: vis, scale: 1 - fs * (a / (Math.PI / 2)) });
    }
    return out;
  }

  // A안: 바닥에 놓인 전체 묵주. 고리(노드 6..61)를 둘레 길이에 맞춘 물방울형 닫힌 곡선에, 꼬리(5..0)를 아래로 늘어뜨린다.
  // 반환 { pts:[{x,y,tx,ty}] (노드 순서, t = 경로 진행 방향 단위 접선), bounds:{minX,maxX,minY,maxY} }
  function aLayout(s, dims) {
    var loopLen = s[61] - s[6];
    // 메달(바닥점) 기준 물방울형 곡선 c(t), t∈[0,2π). 메달 위치에서 t=0.
    function curve(t) {
      var w = 1 + 0.035 * Math.sin(3 * t + 0.7) + 0.025 * Math.sin(5 * t + 2.1) - 0.035 * Math.sin(0.7) - 0.025 * Math.sin(2.1);
      var x = 0.9 * Math.sin(t) * (1 - 0.18 * Math.cos(t)) * w;
      var y = (1 - Math.cos(t)) * 1.06 * w;
      return [x, y];
    }
    var M = 720, tbl = [0], prev = curve(0), i;
    for (i = 1; i <= M; i++) { var c = curve(2 * Math.PI * i / M); tbl.push(tbl[i - 1] + Math.hypot(c[0] - prev[0], c[1] - prev[1])); prev = c; }
    var scale = loopLen / tbl[M];
    function atLen(L) { // 곡선 길이 L(원래 척도) 의 점
      var lo = 0, hi = M;
      while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (tbl[mid] < L) lo = mid; else hi = mid; }
      var f = (L - tbl[lo]) / Math.max(1e-9, tbl[hi] - tbl[lo]);
      var t = 2 * Math.PI * (lo + f) / M;
      return curve(t);
    }
    var pts = new Array(s.length);
    for (i = 6; i <= 61; i++) {
      var L = (s[i] - s[6]) / scale, q = atLen(L);
      pts[i] = { x: q[0] * scale, y: q[1] * scale };
    }
    // 꼬리: 메달에서 아래로, 살짝 휘게
    var medalHalf = dims.medal / 2;
    for (i = 5; i >= 0; i--) {
      var d = s[6] - s[i];
      pts[i] = { x: 0.55 * Math.sin(d * 0.16), y: -d };
    }
    pts[0].y -= (dims.cross - dims.small) * 0.0; // 십자가는 노드 중심 그대로(고리 위치가 위 끝이 되게 모델에서 맞춘다)
    var b = { minX: 1e9, maxX: -1e9, minY: 1e9, maxY: -1e9 };
    for (i = 0; i < pts.length; i++) {
      var a = pts[Math.max(0, i - 1)], z = pts[Math.min(pts.length - 1, i + 1)];
      if (i === 61) { a = pts[60]; z = { x: pts[61].x + (pts[61].x - pts[60].x), y: pts[61].y + (pts[61].y - pts[60].y) }; }
      if (i === 6) { a = pts[5]; z = pts[7]; }
      var tx = z.x - a.x, ty = z.y - a.y, l = Math.hypot(tx, ty) || 1;
      pts[i].tx = tx / l; pts[i].ty = ty / l;
      var r = i === 0 ? dims.cross / 2 : nodeSize(nodes[i].kind, dims) / 2;
      b.minX = Math.min(b.minX, pts[i].x - r); b.maxX = Math.max(b.maxX, pts[i].x + r);
      b.minY = Math.min(b.minY, pts[i].y - r); b.maxY = Math.max(b.maxY, pts[i].y + r);
    }
    b.minY = Math.min(b.minY, pts[0].y - dims.cross * 0.75);
    void medalHalf;
    return { pts: pts, bounds: b };
  }

  var API = { NODE: NODE, nodes: nodes, nodeCount: nodes.length, STEP_COUNT: STEP_COUNT, stepPos: stepPos, bigNode: bigNode, smallNode: smallNode,
    beadIndexOfNode: beadIndexOfNode, arcLengths: arcLengths, sAt: sAt, cLayout: cLayout, aLayout: aLayout, nodeSize: nodeSize };
  root.RosaryLayout = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : this);
