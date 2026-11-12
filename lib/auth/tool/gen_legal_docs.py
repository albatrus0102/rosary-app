#!/usr/bin/env python3
"""docs/legal/*.md 를 읽어 lib/auth/legal_docs.dart 를 만든다(문서가 원본).

사용: python3 lib/auth/tool/gen_legal_docs.py   (저장소 루트에서)
문구가 바뀌면 이 스크립트를 다시 돌리고, 필요하면 consentVersion도 올린다.
"""
import pathlib
import re

root = pathlib.Path(__file__).resolve().parents[3]
legal = root / 'docs' / 'legal'


def read(name):
    return (legal / name).read_text(encoding='utf-8').strip('\n')


def section(text, start_pat, end_pat):
    s = re.search(start_pat, text, re.M)
    e = re.search(end_pat, text[s.end():], re.M)
    end = s.end() + e.start() if e else len(text)
    return text[s.start():end].strip('\n')


consent = read('consent_texts.md')
privacy_consent = section(consent, r'^## 2\. `privacy`', r'^## 3\. `age14`')
age14 = section(consent, r'^## 3\. `age14`', r'^---$')

# 이 앱은 Apple 로그인을 제공하지 않는다. 원본 문서에 애플 로그인 언급이 남아 있으면
# 생성 시 지운다(원본이 고쳐지면 아무 일도 하지 않는다).
APPLE_FIXES = [
    ('카카오, 구글, 애플 또는 이메일', '카카오, 구글 또는 이메일'),
    ('카카오/구글/애플/이메일', '카카오/구글/이메일'),
    ('소셜 로그인(카카오·구글·애플)', '소셜 로그인(카카오·구글)'),
    (' — 애플은 가리기 주소일 수 있음', ''),
]


def strip_apple(text):
    for a, b in APPLE_FIXES:
        text = text.replace(a, b)
    return text


docs = {
    'legalTermsBody': read('terms_of_service.md'),
    'legalPrivacyBody': read('privacy_policy.md'),
    'legalPrivacyConsentBody': privacy_consent,
    'legalAge14Body': age14,
}

out = ['// 생성 파일: tool/gen_legal_docs.py 가 docs/legal/*.md 에서 만든다. 직접 고치지 말 것.',
       '// 초안이며 법률 검토가 필요하다(문서 첫머리의 안내 포함).', '']
for name, body in docs.items():
    body = strip_apple(body)
    assert "'''" not in body
    out.append(f"const String {name} = r'''")
    out.append(body)
    out.append("''';")
    out.append('')
(root / 'lib' / 'auth' / 'legal_docs.dart').write_text('\n'.join(out), encoding='utf-8')
print('wrote legal_docs.dart', {k: len(v) for k, v in docs.items()})
