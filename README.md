# 손평 스피드훈련

손해평가사 40~60대 수험생을 위한 문제팩 분리형 정적 웹앱입니다. GitHub Pages에 그대로 올릴 수 있고, 앱은 처음에 문제팩 목록만 불러온 뒤 사용자가 선택한 문제팩 데이터만 추가로 불러옵니다.

현재 공개판에는 `01팩 1~5강 기초용어·보험기초 120제`와 `02팩 6~10강 농작물재해보험·손해평가·벼맥류 계산 120제`가 연결되어 있습니다.

## 학습 레벨 구조

- 레벨 0 암기노트 먼저 보기: 처음 보는 용어를 PDF로 먼저 익힙니다.
- 레벨 1 노트 보고 풀기: 기초 단답 25제, 문항당 10초입니다.
- 레벨 2 기출 출제포인트 변형: 기출형 70제, 단답 15초 / OX 12초입니다.
- 레벨 3 예상·실전 훈련: 예상형 25제, 문항당 20초입니다.
- 오답 재도전: 저장된 오답만 다시 풀며, 문항당 25초입니다.

정확한 기출 회차·문항 번호는 Q-Net 원문 대조 완료 전까지 표시하지 않습니다. 현재 앱에서는 `기출형` 또는 `기출 출제포인트 변형`으로만 표시합니다.

## GitHub Pages 배포 방법

1. `sonpyeong-speed-app` 폴더의 파일을 GitHub 저장소에 올립니다.
2. 저장소의 `Settings > Pages`에서 배포 브랜치와 폴더를 선택합니다.
3. 이 폴더를 저장소 루트에 올렸다면 배포 URL은 `https://사용자명.github.io/저장소명/` 형태가 됩니다.
4. 하위 폴더로 올렸다면 `https://사용자명.github.io/저장소명/sonpyeong-speed-app/` 형태로 접속합니다.
5. `index.html`이 `data/manifest.json`을 불러오고, 선택한 문제팩의 파일만 다시 불러옵니다.

로컬에서 바로 파일을 더블클릭하면 브라우저 보안 정책 때문에 `fetch`가 막힐 수 있습니다. 로컬 확인은 간단한 서버로 실행하세요.

```bash
python -m http.server 8000
```

## 구글 사이트 iframe 삽입 방법

GitHub Pages 배포 URL을 구글 사이트의 `삽입 > URL`에 넣거나 iframe으로 삽입합니다.

```html
<iframe src="https://사용자명.github.io/저장소명/sonpyeong-speed-app/" width="100%" height="780" style="border:0;"></iframe>
```

모바일과 iframe에서 세로 스크롤이 자연스럽도록 단일 컬럼 반응형으로 구성했습니다.

## PDF 정리노트 교체 방법

1. 새 PDF 파일을 `downloads/` 폴더에 넣습니다.
2. 기존 파일을 교체하려면 파일명을 `sonpyeong_pack01_note.pdf`로 유지합니다.
3. 파일명을 바꾸는 경우 `data/manifest.json`의 `notePdf` 또는 `noteLinks` 값을 새 경로로 수정합니다.

현재 연결 경로:

```json
"notePdf": "downloads/sonpyeong_pack01_note.pdf"
```

`notePdf`는 PDF가 1개인 문제팩에 사용합니다. PDF가 여러 개인 문제팩은 `noteLinks` 배열에 버튼 문구와 파일 경로를 함께 적습니다. 값이 없으면 해당 문제팩에서는 노트 버튼을 숨길 수 있습니다.

## 새 문제팩 추가 방법

1. `data/q_06_10.json` 같은 새 문제 데이터 파일을 만듭니다.
2. 아래 스키마에 맞춰 `questions` 배열을 채웁니다.
3. `data/manifest.json`의 `packs` 배열에 새 문제팩 정보를 추가합니다.
4. PDF 노트가 있으면 `downloads/`에 넣고 `notePdf` 또는 `noteLinks` 필드를 함께 적습니다.

## manifest.json 예시

```json
{
  "id": "06-10",
  "title": "6~10강 핵심문제 120제",
  "file": "data/q_06_10.json",
  "description": "6~10강 핵심 개념과 계산형 기초 훈련",
  "questionCount": 120,
  "level": "기초",
  "free": true,
  "noteLinks": [
    {
      "label": "왕초보 워밍업 노트 보기",
      "file": "downloads/sonp_pack02_beginner_warmup_note_v1_final.pdf"
    }
  ]
}
```

## 문제 데이터 스키마

- `id`: 고유 문제 ID
- `pack`: 문제팩 번호
- `lesson`: 강의 번호
- `category`: 기초용어, 보험기초 등
- `type`: `short`, `ox`, `mcq`, `calc`, `case`
- `question`: 문제
- `answer`: 정답
- `aliases`: 허용 정답 목록
- `memoryTip`: 읽으면 외워지는 한 줄 암기팁
- `explanation`: 핵심 해설
- `trap`: 헷갈리는 포인트나 시험 함정
- `difficulty`: 하, 중, 상
- `timeLimit`: 제한시간 초 단위
- `level`: 1, 2, 3 학습 레벨
- `styleTag`: 기초, 기출형, 예상형

## localStorage 오답 저장 방식

오답은 브라우저 `localStorage`에 문제팩별로 저장합니다.

- key 형식: `sonpyeong_wrong_01-05`
- value 형식: 틀린 문제 ID 배열

정답을 맞히면 해당 문제 ID는 오답 목록에서 제거됩니다. 오답 재도전 모드는 이 ID 목록을 기준으로 문제를 다시 불러옵니다.

## 공개 테스트판 검수 체크리스트

- GitHub Pages에서 fetch 오류 없이 문제팩이 불러와지는가?
- 01팩과 02팩이 각각 120문제로 정상 로딩되는가?
- 레벨 0, 레벨 1, 레벨 2, 레벨 3, 오답 재도전이 작동하는가?
- 주관식 aliases 정답 처리가 되는가?
- 정답 후 핵심, 기억팁, 시험포인트가 각각 분리되어 표시되는가?
- PDF 정리노트 보기/다운로드 버튼이 정상 경로로 연결되는가?
- 모바일 360px 화면에서 입력창과 버튼이 잘 보이는가?
- 구글 사이트 iframe 삽입 시 세로 스크롤이 자연스러운가?
- 나중에 1200문제로 확장해도 첫 로딩이 무겁지 않은 구조인가?
