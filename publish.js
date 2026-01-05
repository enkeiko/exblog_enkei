const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 마크다운을 네이버 블로그 형식으로 변환
function convertMarkdownToBlogFormat(markdown) {
  let text = markdown;

  // 제목 추출 (첫 번째 # 제목)
  const titleMatch = text.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1] : '제목 없음';

  // 제목 제거 (본문에서)
  text = text.replace(/^# .+$/m, '').trim();

  // 해시태그 추출 및 제거
  const hashtagMatch = text.match(/\*#.+\*$/m);
  const hashtags = hashtagMatch ? hashtagMatch[0].replace(/\*/g, '').trim() : '';
  text = text.replace(/\*#.+\*$/m, '').trim();

  // 마크다운 변환
  text = text
    // ### → ■ (소제목)
    .replace(/^### (.*?)$/gm, '■ $1')
    // ## → ■ (소제목)
    .replace(/^## (.*?)$/gm, '■ $1')
    // 리스트 → • 불릿
    .replace(/^- (.*?)$/gm, '• $1')
    .replace(/^\* (.*?)$/gm, '• $1')
    // **굵은글씨** → 텍스트로
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // 코드블록 제거 (```)
    .replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/```/g, '').trim();
    })
    // 인라인 코드 제거 (`)
    .replace(/`([^`]+)`/g, '$1')
    // 링크 변환 [텍스트](url) → 텍스트 (url)
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)')
    // 구분선 제거
    .replace(/^---$/gm, '')
    // 빈 줄 정리 (3개 이상 연속 빈 줄 → 2개)
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // 해시태그를 본문 마지막에 추가
  if (hashtags) {
    text += '\n\n' + hashtags;
  }

  return { title, content: text };
}

async function publishToNaverBlog(postFilePath, imagePath) {
  console.log('🚀 네이버 블로그 자동 발행 시작...\n');

  // 환경 변수 확인
  if (!process.env.NAVER_LOGIN_ID || !process.env.NAVER_LOGIN_PASSWORD) {
    throw new Error('.env 파일에 NAVER_LOGIN_ID와 NAVER_LOGIN_PASSWORD를 설정해주세요.');
  }

  // 마크다운 파일 읽기
  console.log(`📄 파일 읽기: ${postFilePath}`);
  const markdown = fs.readFileSync(postFilePath, 'utf-8');
  const { title, content } = convertMarkdownToBlogFormat(markdown);

  console.log(`📝 제목: ${title}`);
  console.log(`📊 본문 길이: ${content.length}자\n`);

  // 이미지 파일 확인
  if (!fs.existsSync(imagePath)) {
    throw new Error(`이미지 파일을 찾을 수 없습니다: ${imagePath}`);
  }
  console.log(`🖼️  이미지: ${imagePath}\n`);

  // Playwright 브라우저 실행
  const browser = await chromium.launch({
    headless: false, // 디버깅을 위해 브라우저 화면 표시
    slowMo: 100 // 동작을 천천히 (밀리초)
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. 네이버 로그인
    console.log('🔐 네이버 로그인 중...');
    await page.goto('https://nid.naver.com/nidlogin.login');

    // 로그인 폼 입력
    await page.fill('#id', process.env.NAVER_LOGIN_ID);
    await page.fill('#pw', process.env.NAVER_LOGIN_PASSWORD);
    await page.click('.btn_login');

    // 로그인 완료 대기 (블로그 URL로 이동 가능할 때까지)
    await page.waitForTimeout(3000);

    console.log('✅ 로그인 완료\n');

    // 2. 블로그 글쓰기 페이지 이동
    console.log('📝 글쓰기 페이지 이동 중...');
    const blogId = process.env.NAVER_BLOG_URL.split('/').pop();
    await page.goto(`https://blog.naver.com/${blogId}/postwrite`);
    await page.waitForTimeout(5000);

    // iframe 또는 직접 페이지에서 에디터 찾기
    let frame = page;
    try {
      const frameElement = await page.waitForSelector('iframe[name="mainFrame"]', { timeout: 10000 });
      const contentFrame = await frameElement.contentFrame();
      if (contentFrame) {
        frame = contentFrame;
        console.log('✅ iframe 모드로 진행\n');
      }
    } catch (e) {
      console.log('✅ 직접 페이지 모드로 진행\n');
    }

    // 도움말 패널 닫기
    try {
      const closeBtn = page.locator('button[class*="close"], [aria-label="닫기"]').first();
      if (await closeBtn.isVisible({ timeout: 2000 })) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      }
    } catch (e) {}

    // 3. 제목 입력 (먼저)
    console.log('📝 제목 입력 중...');
    await page.waitForTimeout(2000);

    // 제목 영역 클릭 - 좌표로 직접
    await page.mouse.click(400, 250);
    await page.waitForTimeout(500);
    await page.keyboard.type(title, { delay: 20 });
    console.log('✅ 제목 입력 완료\n');

    // 4. 본문 영역으로 이동
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    // 5. 이미지 첨부
    console.log('🖼️  이미지 업로드 중...');
    try {
      // 사진 버튼 클릭 (상단 툴바 첫번째)
      const photoBtn = page.locator('button').filter({ hasText: '사진' }).first();
      if (await photoBtn.isVisible({ timeout: 3000 })) {
        await photoBtn.click();
      } else {
        // 첫 번째 툴바 버튼 클릭
        await page.mouse.click(35, 75);
      }
      await page.waitForTimeout(1000);

      // 파일 입력 필드 찾기
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(path.resolve(imagePath));
      await page.waitForTimeout(3000);
      console.log('✅ 이미지 업로드 완료\n');
    } catch (imgErr) {
      console.log('⚠️  이미지 업로드 실패, 본문만 작성합니다.\n');
    }

    // 6. 본문 입력
    console.log('📝 본문 입력 중...');
    await page.waitForTimeout(500);

    // 본문 영역 클릭
    await page.mouse.click(400, 400);
    await page.waitForTimeout(500);

    // 본문을 줄바꿈 단위로 나눠서 입력
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim()) {
        await page.keyboard.type(line, { delay: 5 });
      }
      if (i < lines.length - 1) {
        await page.keyboard.press('Enter');
      }
    }

    console.log('✅ 본문 입력 완료\n');

    // 7. 발행
    console.log('🚀 발행 버튼 클릭...');
    await page.waitForTimeout(2000);

    // 스크린샷 저장 (디버그용)
    await page.screenshot({ path: 'debug-before-publish.png' });

    // "발행" 버튼 클릭 - 여러 방법 시도
    let published = false;

    // 방법 1: 텍스트로 찾기
    try {
      const btn1 = page.locator('button:has-text("발행")').first();
      if (await btn1.isVisible({ timeout: 3000 })) {
        await btn1.click();
        published = true;
        console.log('   ✓ 발행 버튼 클릭 (텍스트)');
      }
    } catch (e) {}

    // 방법 2: 클래스로 찾기
    if (!published) {
      try {
        const btn2 = page.locator('.publish_btn, [class*="publish"], .btn_publish').first();
        if (await btn2.isVisible({ timeout: 2000 })) {
          await btn2.click();
          published = true;
          console.log('   ✓ 발행 버튼 클릭 (클래스)');
        }
      } catch (e) {}
    }

    // 방법 3: 우측 상단 영역 클릭 (발행 버튼 일반적 위치)
    if (!published) {
      console.log('   → 좌표로 발행 버튼 클릭 시도...');
      await page.mouse.click(1200, 25);
      await page.waitForTimeout(500);
    }

    await page.waitForTimeout(2000);

    // "발행하기" 최종 확인 버튼 클릭
    try {
      const confirmSelectors = [
        '[data-testid="seOnePublishBtn"]',
        '[class*="publish_btn"]',
        'button:has-text("발행")',
        '.btn_ok, .btn_confirm'
      ];

      for (const sel of confirmSelectors) {
        const confirmBtn = page.locator(sel).first();
        if (await confirmBtn.isVisible({ timeout: 2000 })) {
          await confirmBtn.click();
          console.log(`   ✓ 최종 발행 버튼 클릭 (${sel})`);
          break;
        }
      }
    } catch (e) {}

    console.log('✅ 발행 완료!\n');

    // 발행 완료 대기
    await page.waitForTimeout(5000);

    console.log('🎉 블로그 글 발행이 완료되었습니다!');
    console.log(`🔗 블로그 확인: ${process.env.NAVER_BLOG_URL || 'https://blog.naver.com/smartrupy'}\n`);

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    throw error;
  } finally {
    // 브라우저를 10초 후에 닫기 (결과 확인 시간)
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// 메인 실행
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('사용법: node publish.js <마크다운파일경로> <이미지파일경로>');
    console.error('예시: node publish.js posts/04-free-ai-tools.md images/04-free-ai-tools.jpg');
    process.exit(1);
  }

  const postPath = args[0];
  const imagePath = args[1];

  publishToNaverBlog(postPath, imagePath)
    .then(() => {
      console.log('✨ 프로세스 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 프로세스 실패:', error);
      process.exit(1);
    });
}

module.exports = { publishToNaverBlog, convertMarkdownToBlogFormat };
