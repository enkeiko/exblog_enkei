# 소상공인 AI 마케팅 시리즈 - 발행 가이드

## 발행 일정 (3일 간격)

| 회차 | 발행일 | 요일 | 파일 | 이미지 |
|:----:|:------:|:----:|------|--------|
| 1회 | 1/6 | 월 | ep01-intro.md | ep01-intro.jpg |
| 2회 | 1/9 | 목 | ep02-tools.md | ep02-tools.jpg |
| 3회 | 1/12 | 일 | ep03-instagram.md | ep03-instagram.jpg |
| 4회 | 1/15 | 수 | ep04-blog.md | ep04-blog.jpg |
| 5회 | 1/18 | 토 | ep05-review.md | ep05-review.jpg |
| 6회 | 1/21 | 화 | ep06-ads.md | ep06-ads.jpg |
| 7회 | 1/24 | 금 | ep07-menu.md | ep07-menu.jpg |
| 8회 | 1/27 | 월 | ep08-ideas.md | ep08-ideas.jpg |
| 9회 | 1/30 | 목 | ep09-image.md | ep09-image.jpg |
| 10회 | 2/2 | 일 | ep10-tips.md | ep10-tips.jpg |

---

## 발행 방법

### 방법 1: 즉시 발행 (추천)

```bash
# 원하는 회차 번호 입력
node scheduler.js now 1
```

또는 `publish-now.bat` 더블클릭

**결과:**
1. 변환된 글이 화면에 출력됨
2. `ready-to-publish-ep01.txt` 파일로 저장됨
3. 네이버 블로그 글쓰기 페이지 자동으로 열림

**이후 순서:**
1. 제목 복사 → 붙여넣기
2. 이미지 업로드 (`images/ep01-intro.jpg`)
3. 본문 복사 → 붙여넣기
4. 발행!

---

### 방법 2: 자동 스케줄러

매일 오전 9시에 자동으로 발행할 글이 있는지 확인합니다.

**설치:**
```bash
cd posts/special-small-business-marketing
npm install node-cron
```

**실행:**
```bash
node scheduler.js
```

또는 `start-scheduler.bat` 더블클릭

**동작:**
- 매일 오전 9시에 오늘 발행할 글이 있는지 확인
- 있으면 자동으로 변환 + 브라우저 열기
- 없으면 "오늘 발행 예정인 글이 없습니다" 메시지

---

### 방법 3: Windows 작업 스케줄러

컴퓨터가 켜져 있으면 자동으로 실행됩니다.

**설정 방법:**

1. Windows 검색에서 "작업 스케줄러" 검색
2. "기본 작업 만들기" 클릭
3. 이름: "네이버 블로그 발행 알림"
4. 트리거: 매일 / 오전 9:00
5. 동작: 프로그램 시작
   - 프로그램: `node`
   - 인수: `scheduler.js now 1` (회차 번호 변경 필요)
   - 시작 위치: `C:\Users\enkei\workspace\3-sandbox\Ex1-my-blog\posts\special-small-business-marketing`

---

## 발행 체크리스트

발행 전 확인:

- [ ] 제목에 키워드 포함? (소상공인, AI, 마케팅)
- [ ] 대표 이미지 업로드?
- [ ] 본문 첫 문장에 키워드?
- [ ] 해시태그 10개 이상?
- [ ] 커뮤니티 링크 포함?

---

## 커뮤니티 링크

👉 https://open.kakao.com/o/gYwrxqBg

---

## 문제 해결

### node-cron 설치 오류

```bash
npm install node-cron --save
```

### 한글 깨짐

```bash
chcp 65001
```

### 파일 찾을 수 없음

scheduler.js와 같은 폴더에서 실행해야 합니다.

```bash
cd posts/special-small-business-marketing
node scheduler.js now 1
```

---

*마지막 업데이트: 2025-01-05*
