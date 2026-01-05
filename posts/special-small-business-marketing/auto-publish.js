/**
 * 소상공인 AI 마케팅 시리즈 - 완전 자동 발행 스크립트
 *
 * 사용법:
 * 1. 첫 실행 시 로그인 필요: node auto-publish.js login
 * 2. 자동 발행: node auto-publish.js publish 1  (1회차 발행)
 * 3. 스케줄러: node auto-publish.js schedule
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// 설정
const CONFIG = {
  blogUrl: process.env.NAVER_BLOG_URL || 'https://blog.naver.com/enkeiko',
  loginId: process.env.NAVER_LOGIN_ID,
  loginPw: process.env.NAVER_LOGIN_PASSWORD,
  userDataDir: path.join(__dirname, '.browser-data'),
};

// 발행 일정 (1일 1개, 1/6부터 시작)
const SCHEDULE = [
  { month: 1, day: 6, episode: 1 },
  { month: 1, day: 7, episode: 2 },
  { month: 1, day: 8, episode: 3 },
  { month: 1, day: 9, episode: 4 },
  { month: 1, day: 10, episode: 5 },
  { month: 1, day: 11, episode: 6 },
  { month: 1, day: 12, episode: 7 },
  { month: 1, day: 13, episode: 8 },
  { month: 1, day: 14, episode: 9 },
  { month: 1, day: 15, episode: 10 },
];

// 에피소드 파일 매핑
const EPISODES = {
  1: { file: 'ep01-intro.md', image: 'ep01-intro.jpg' },
  2: { file: 'ep02-tools.md', image: 'ep02-tools.jpg' },
  3: { file: 'ep03-instagram.md', image: 'ep03-instagram.jpg' },
  4: { file: 'ep04-blog.md', image: 'ep04-blog.jpg' },
  5: { file: 'ep05-review.md', image: 'ep05-review.jpg' },
  6: { file: 'ep06-ads.md', image: 'ep06-ads.jpg' },
  7: { file: 'ep07-menu.md', image: 'ep07-menu.jpg' },
  8: { file: 'ep08-ideas.md', image: 'ep08-ideas.jpg' },
  9: { file: 'ep09-image.md', image: 'ep09-image.jpg' },
  10: { file: 'ep10-tips.md', image: 'ep10-tips.jpg' },
};

// 마크다운 -> 블로그 포맷 변환
function convertMarkdown(markdown) {
  let content = markdown;

  // 제목 추출
  const titleMatch = content.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1] : '제목 없음';

  // 해시태그 추출
  const hashtagMatch = content.match(/\*#[^*]+\*/);
  const hashtags = hashtagMatch ? hashtagMatch[0].replace(/\*/g, '') : '';

  // 마크다운 변환
  content = content
    .replace(/^# .+\n/m, '')  // 제목 제거
    .replace(/^> (.+)$/gm, '$1')  // 인용문
    .replace(/^## ■/gm, '■')  // 소제목 정리
    .replace(/^## /gm, '■ ')  // ## -> ■
    .replace(/^### /gm, '▶ ')  // ### -> ▶
    .replace(/\*\*(.+?)\*\*/g, '$1')  // 굵은 글씨
    .replace(/```[\w]*\n([\s\S]*?)```/g, '$1')  // 코드블록
    .replace(/^- /gm, '• ')  // 리스트
    .replace(/^\* /gm, '• ')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')  // 링크
    .replace(/\n{3,}/g, '\n\n')  // 여러 줄바꿈
    .trim();

  return { title, content, hashtags };
}

// 로그인 세션 저장 (최초 1회)
async function saveLoginSession() {
  console.log('🔐 로그인 세션 저장 모드...');
  console.log('브라우저가 열리면 네이버에 로그인해주세요.\n');

  const browser = await chromium.launchPersistentContext(CONFIG.userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();
  await page.goto('https://nid.naver.com/nidlogin.login');

  console.log('✅ 로그인 후 아무 키나 누르면 세션이 저장됩니다...');
  console.log('   (로그인 완료 후 이 창으로 돌아오세요)\n');

  // 사용자가 로그인할 때까지 대기
  await page.waitForURL('**/naver.com/**', { timeout: 300000 });

  console.log('✅ 로그인 감지! 세션 저장 중...');
  await page.waitForTimeout(3000);

  await browser.close();
  console.log('✅ 세션이 저장되었습니다. 이제 자동 발행이 가능합니다!');
}

// 자동 발행
async function autoPublish(episodeNum) {
  const episode = EPISODES[episodeNum];
  if (!episode) {
    console.log(`❌ 에피소드 ${episodeNum}을 찾을 수 없습니다.`);
    return false;
  }

  const filePath = path.join(__dirname, episode.file);
  const imagePath = path.join(__dirname, 'images', episode.image);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ 파일을 찾을 수 없습니다: ${filePath}`);
    return false;
  }

  console.log(`\n📝 ${episodeNum}회차 자동 발행 시작...`);

  // 마크다운 읽기 및 변환
  const markdown = fs.readFileSync(filePath, 'utf-8');
  const { title, content, hashtags } = convertMarkdown(markdown);

  console.log(`📌 제목: ${title}`);

  // 브라우저 실행 (저장된 세션 사용)
  let browser;
  try {
    browser = await chromium.launchPersistentContext(CONFIG.userDataDir, {
      headless: false,  // 발행 과정 확인용
      viewport: { width: 1280, height: 900 },
    });
  } catch (e) {
    console.log('❌ 브라우저 세션이 없습니다. 먼저 로그인하세요:');
    console.log('   node auto-publish.js login');
    return false;
  }

  const page = await browser.newPage();

  try {
    // 블로그 글쓰기 페이지로 이동
    const writeUrl = `${CONFIG.blogUrl}/postwrite`;
    console.log(`🌐 ${writeUrl} 이동 중...`);
    await page.goto(writeUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // 로그인 확인
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    if (currentUrl.includes('nidlogin')) {
      console.log('❌ 로그인이 필요합니다. 먼저 로그인하세요:');
      console.log('   node auto-publish.js login');
      await browser.close();
      return false;
    }

    // iframe 내부 접근
    console.log('📄 에디터 로딩 대기...');
    await page.waitForTimeout(3000);

    const frame = page.frameLocator('iframe[name="mainFrame"]');

    // 1. 제목 입력
    console.log('✏️ 제목 입력 중...');
    const titleArea = frame.locator('.se-title-text');
    await titleArea.click();
    await page.waitForTimeout(500);
    await page.keyboard.type(title, { delay: 30 });

    // 2. 본문 영역으로 이동
    console.log('✏️ 본문 입력 중...');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    // 3. 이미지 업로드 (있으면)
    if (fs.existsSync(imagePath)) {
      console.log('🖼️ 이미지 업로드 중...');
      try {
        // 사진 버튼 찾기
        const photoBtn = frame.locator('button:has-text("사진")').first();
        await photoBtn.click();
        await page.waitForTimeout(1000);

        // 파일 선택
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(imagePath);
        await page.waitForTimeout(3000);

        // 이미지 삽입 완료 대기
        console.log('✅ 이미지 업로드 완료');
      } catch (imgError) {
        console.log('⚠️ 이미지 업로드 실패, 본문만 작성합니다.');
      }
    }

    // 4. 본문 입력
    await page.waitForTimeout(1000);
    const contentArea = frame.locator('.se-component-content').first();
    await contentArea.click();
    await page.waitForTimeout(500);

    // 본문을 여러 줄로 나눠서 입력 (너무 길면 잘림)
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      await page.keyboard.type(lines[i], { delay: 5 });
      if (i < lines.length - 1) {
        await page.keyboard.press('Enter');
      }
      // 100줄마다 잠시 대기
      if (i % 100 === 0 && i > 0) {
        await page.waitForTimeout(500);
      }
    }

    console.log('✅ 본문 입력 완료');

    // 5. 발행
    console.log('📤 발행 버튼 클릭...');
    await page.waitForTimeout(2000);

    const publishBtn = frame.getByRole('button', { name: '발행' });
    await publishBtn.click();
    await page.waitForTimeout(2000);

    // 최종 발행 확인
    const finalPublishBtn = frame.locator('[class*="publish_btn"]').first();
    if (await finalPublishBtn.isVisible()) {
      await finalPublishBtn.click();
    } else {
      // 다른 발행 버튼 시도
      const altPublishBtn = frame.getByTestId('seOnePublishBtn');
      if (await altPublishBtn.isVisible()) {
        await altPublishBtn.click();
      }
    }

    await page.waitForTimeout(5000);
    console.log(`\n🎉 ${episodeNum}회차 발행 완료!`);

    // 발행 로그 저장
    const logPath = path.join(__dirname, 'publish-log.txt');
    const logEntry = `${new Date().toISOString()} - ${episodeNum}회차 발행 완료: ${title}\n`;
    fs.appendFileSync(logPath, logEntry);

    await browser.close();
    return true;

  } catch (error) {
    console.log(`❌ 발행 중 오류 발생: ${error.message}`);
    console.log('   수동으로 발행해주세요.');

    // 스크린샷 저장
    const screenshotPath = path.join(__dirname, `error-ep${episodeNum}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`   스크린샷 저장: ${screenshotPath}`);

    await browser.close();
    return false;
  }
}

// 오늘 발행할 에피소드 확인
function getTodayEpisode() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const scheduled = SCHEDULE.find(s => s.month === month && s.day === day);
  return scheduled ? scheduled.episode : null;
}

// 스케줄러 시작
function startScheduler() {
  console.log('📅 자동 발행 스케줄러 시작!');
  console.log('⏰ 매일 오전 9시에 자동 발행합니다.\n');

  console.log('발행 일정 (1일 1개):');
  SCHEDULE.forEach(s => {
    console.log(`  - ${s.month}/${s.day}: ${s.episode}회차`);
  });
  console.log('');

  // 매일 오전 9시에 실행
  cron.schedule('0 9 * * *', async () => {
    const episode = getTodayEpisode();
    if (episode) {
      console.log(`\n🎉 오늘은 ${episode}회차 발행일입니다!`);
      await autoPublish(episode);
    } else {
      console.log(`\n📭 오늘은 발행 예정인 글이 없습니다.`);
    }
  });

  console.log('✅ 스케줄러가 실행 중입니다. (Ctrl+C로 종료)');
  console.log('   컴퓨터를 켜놓으면 매일 오전 9시에 자동 발행됩니다.\n');
}

// 커맨드라인 처리
const args = process.argv.slice(2);
const command = args[0];

(async () => {
  switch (command) {
    case 'login':
      await saveLoginSession();
      break;

    case 'publish':
      const ep = parseInt(args[1]);
      if (!ep || ep < 1 || ep > 10) {
        console.log('사용법: node auto-publish.js publish [1-10]');
        break;
      }
      await autoPublish(ep);
      break;

    case 'schedule':
      startScheduler();
      break;

    case 'test':
      const testEp = getTodayEpisode();
      if (testEp) {
        console.log(`오늘 발행 예정: ${testEp}회차`);
      } else {
        console.log('오늘 발행 예정인 글이 없습니다.');
        console.log('\n전체 일정:');
        SCHEDULE.forEach(s => console.log(`  ${s.month}/${s.day}: ${s.episode}회차`));
      }
      break;

    default:
      console.log(`
소상공인 AI 마케팅 시리즈 - 자동 발행 스크립트

사용법:
  node auto-publish.js login      # 최초 1회: 로그인 세션 저장
  node auto-publish.js publish 1  # 1회차 즉시 발행
  node auto-publish.js schedule   # 자동 스케줄러 시작
  node auto-publish.js test       # 오늘 발행할 글 확인

발행 일정 (1일 1개):
${SCHEDULE.map(s => `  ${s.month}/${s.day}: ${s.episode}회차`).join('\n')}
      `);
  }
})();
