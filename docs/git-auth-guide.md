# Git 인증 설정 가이드

이 가이드는 `git.nnotion.kr` Gitea 서버에서 Personal Access Token(PAT)을 발급받고, Windows/Mac에서 설정하는 방법을 안내합니다.

---

## 목차

1. [Personal Access Token 발급](#1-personal-access-token-발급)
2. [Windows 설정](#2-windows-설정)
3. [Mac 설정](#3-mac-설정)
4. [설정 확인](#4-설정-확인)
5. [문제 해결](#5-문제-해결)

---

## 1. Personal Access Token 발급

### 1.1 토큰 생성 페이지 접속

브라우저에서 아래 주소로 이동:

```
https://git.nnotion.kr/user/settings/applications
```

또는 웹에서 수동으로 이동:

```
우측 상단 프로필 아이콘 → Settings → Applications
```

### 1.2 토큰 생성

1. **Token Name** 입력: `my-blog-token` (원하는 이름)
2. **Select permissions** 설정:
   - ✅ `repository` → `Read and Write` 체크
3. **Generate Token** 버튼 클릭

### 1.3 토큰 복사 (중요!)

> ⚠️ **주의**: 토큰은 생성 직후 한 번만 표시됩니다!

- 생성된 토큰을 **즉시 복사**하여 안전한 곳에 저장
- 예시: `d262946c36480d23f57736dfe76b845706f513b0`

---

## 2. Windows 설정

### 방법 A: Git Bash 사용 (권장)

#### 2.1 Git Bash 열기

- 시작 메뉴 → `Git Bash` 검색 → 실행

#### 2.2 호스트별 인증 설정

```bash
# git.nnotion.kr 전용 credential 설정
git config --global credential.https://git.nnotion.kr.helper store

# 인증정보 저장
echo "https://사용자명:토큰@git.nnotion.kr" >> ~/.git-credentials
```

**예시** (사용자명: `jobdori`, 토큰: `abc123...`):

```bash
echo "https://jobdori:d262946c36480d23f57736dfe76b845706f513b0@git.nnotion.kr" >> ~/.git-credentials
```

### 방법 B: Windows Credential Manager 사용

#### 2.1 Credential Manager 열기

1. `Win + R` → `control` 입력 → 확인
2. `사용자 계정` → `자격 증명 관리자`
3. `Windows 자격 증명` 탭 클릭

#### 2.2 자격 증명 추가

1. `일반 자격 증명 추가` 클릭
2. 정보 입력:
   - **인터넷 또는 네트워크 주소**: `git:https://git.nnotion.kr`
   - **사용자 이름**: `사용자명` (예: `jobdori`)
   - **암호**: `발급받은 토큰`
3. `확인` 클릭

### 방법 C: 프로젝트 폴더에서 직접 설정

```bash
# 프로젝트 폴더로 이동
cd 프로젝트경로

# 원격 URL에 인증정보 포함
git remote set-url origin https://사용자명:토큰@git.nnotion.kr/Clauders/Ex1-my-blog.git
```

---

## 3. Mac 설정

### 방법 A: 터미널 사용 (권장)

#### 3.1 터미널 열기

- `Cmd + Space` → `터미널` 검색 → 실행

#### 3.2 호스트별 인증 설정

```bash
# git.nnotion.kr 전용 credential 설정
git config --global credential.https://git.nnotion.kr.helper store

# 인증정보 저장
echo "https://사용자명:토큰@git.nnotion.kr" >> ~/.git-credentials
```

**예시** (사용자명: `jobdori`, 토큰: `abc123...`):

```bash
echo "https://jobdori:d262946c36480d23f57736dfe76b845706f513b0@git.nnotion.kr" >> ~/.git-credentials
```

### 방법 B: macOS Keychain 사용

#### 3.1 Keychain 설정

```bash
# Keychain helper 설정
git config --global credential.helper osxkeychain
```

#### 3.2 첫 Push 시 인증

```bash
git push -u origin main
```

프롬프트가 나타나면:

```
Username: 사용자명
Password: 토큰 (비밀번호 아님!)
```

> Keychain에 자동 저장되어 이후 입력 불필요

### 방법 C: 프로젝트 폴더에서 직접 설정

```bash
# 프로젝트 폴더로 이동
cd ~/Desktop/my-blog

# 원격 URL에 인증정보 포함
git remote set-url origin https://사용자명:토큰@git.nnotion.kr/Clauders/Ex1-my-blog.git
```

---

## 4. 설정 확인

### 4.1 원격 저장소 확인

```bash
git remote -v
```

**정상 출력:**

```
origin  https://git.nnotion.kr/Clauders/Ex1-my-blog.git (fetch)
origin  https://git.nnotion.kr/Clauders/Ex1-my-blog.git (push)
```

### 4.2 Push 테스트

```bash
git push
```

**성공 메시지:**

```
Everything up-to-date
```

또는

```
To https://git.nnotion.kr/Clauders/Ex1-my-blog.git
   abc1234..def5678  main -> main
```

### 4.3 Credential 설정 확인

```bash
# 저장된 credential 확인
cat ~/.git-credentials
```

---

## 5. 문제 해결

### 문제: `Authentication failed`

**원인**: 토큰이 잘못되었거나 만료됨

**해결**:

```bash
# 기존 credential 삭제
git config --global --unset credential.helper

# Windows: Credential Manager에서 해당 항목 삭제
# Mac: Keychain Access에서 git.nnotion.kr 항목 삭제

# 다시 설정
git config --global credential.https://git.nnotion.kr.helper store
```

### 문제: 다른 Git 서버와 충돌

**원인**: 전역 credential이 모든 서버에 적용됨

**해결**: 호스트별 credential 분리

```bash
# git.nnotion.kr 전용
git config --global credential.https://git.nnotion.kr.helper store

# github.com 전용 (필요시)
git config --global credential.https://github.com.helper store
```

### 문제: `remote: Repository not found`

**원인**: 저장소 접근 권한 없음

**해결**:

1. 토큰 권한 확인 (`repository: Read and Write`)
2. 저장소 URL 확인
3. 조직 멤버 권한 확인

### 문제: 토큰을 잊어버림

**해결**: 새 토큰 발급

1. https://git.nnotion.kr/user/settings/applications 접속
2. 기존 토큰 삭제 (Revoke)
3. 새 토큰 생성
4. `~/.git-credentials` 파일 수정 또는 재설정

---

## 부록: 유용한 명령어

```bash
# Git 설정 전체 확인
git config --list

# 특정 설정 확인
git config --global credential.helper

# credential 파일 위치
# Windows: C:\Users\사용자명\.git-credentials
# Mac: ~/.git-credentials

# 원격 URL 변경
git remote set-url origin [새URL]

# 현재 브랜치 확인
git branch

# 푸시
git push -u origin main
```

---

## 요약

| 단계 | Windows | Mac |
|------|---------|-----|
| 1. 토큰 발급 | Gitea 웹에서 생성 | 동일 |
| 2. 터미널 열기 | Git Bash | 터미널 |
| 3. Credential 설정 | `credential.helper store` | 동일 또는 `osxkeychain` |
| 4. 인증정보 저장 | `~/.git-credentials` | 동일 |
| 5. Push 테스트 | `git push` | 동일 |

---

*문제가 있으면 이슈를 등록해주세요: https://git.nnotion.kr/Clauders/Ex1-my-blog/issues*
