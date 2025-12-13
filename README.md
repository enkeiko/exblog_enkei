# AI 활용법 블로그

일반인을 위한 AI 활용법 블로그 프로젝트입니다. AI를 처음 접하는 사람들이 쉽게 따라할 수 있도록 실용적인 가이드를 연재합니다.

## 블로그 주소

https://blog.naver.com/smartrupy

## 프로젝트 구조

```
/my-blog
├── README.md          # 프로젝트 안내 (이 파일)
├── CLAUDE.md          # AI 에이전트 지침
├── blog-plan.md       # 연재 계획
├── .env.example       # 환경변수 예시
├── .env               # 환경변수 (직접 생성 필요)
└── posts/             # 블로그 글 저장
    ├── 01-ai-intro.md
    ├── 02-chatgpt-start.md
    └── ...
```

## 시작하기

### 1. 프로젝트 클론

```bash
git clone https://git.nnotion.kr/Clauders/Ex1-my-blog.git
cd Ex1-my-blog
```

### 2. 환경변수 설정

`.env.example` 파일을 복사하여 `.env` 파일을 생성합니다:

```bash
cp .env.example .env
```

그런 다음 `.env` 파일을 열어 본인의 네이버 계정 정보를 입력합니다:

```bash
# .env 파일 편집
NAVER_BLOG_URL=https://blog.naver.com/your-blog-id
NAVER_LOGIN_ID=your-naver-id
NAVER_LOGIN_PASSWORD=your-password
```

> ⚠️ **주의**: `.env` 파일은 절대 Git에 커밋하지 마세요! (`.gitignore`에 이미 등록되어 있음)

### 3. Playwright 설치 (자동 발행 기능 사용 시)

```bash
npm install playwright
npx playwright install chromium
```

## 사용 방법

### Claude Code와 함께 사용

이 프로젝트는 [Claude Code](https://claude.com/claude-code)와 함께 사용하도록 설계되었습니다.

```bash
# 프로젝트 폴더에서 Claude Code 실행
claude
```

Claude Code에게 요청할 수 있는 작업:
- "다음 회차 블로그 글 작성해줘"
- "3회차 글을 네이버 블로그에 발행해줘"
- "blog-plan.md 보여줘"

### 수동으로 글 작성

1. `blog-plan.md`에서 작성할 회차 확인
2. `CLAUDE.md`의 글 구조 템플릿 참고
3. `posts/` 폴더에 마크다운 파일 생성

## 연재 계획

자세한 연재 계획은 `blog-plan.md` 파일을 참조하세요.

| 시리즈 | 주제 | 회차 |
|--------|------|------|
| 시리즈 1 | AI 입문편 | 1~5회 |
| 시리즈 2 | 일상 활용편 | 6~11회 |
| 시리즈 3 | 업무 활용편 | 12~16회 |

## 기여하기

1. 이 저장소를 Fork 합니다
2. 새 브랜치를 생성합니다 (`git checkout -b feature/new-post`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add new post'`)
4. 브랜치에 Push 합니다 (`git push origin feature/new-post`)
5. Pull Request를 생성합니다

## 라이선스

이 프로젝트의 콘텐츠는 개인 블로그용으로 작성되었습니다.
