/**
 * 소상공인 AI 마케팅 시리즈 - 자동 발행 + 알림 스크립트
 *
 * 사용법:
 * 1. 최초 설정: node auto-publish-with-notify.js setup
 * 2. 로그인 세션 저장: node auto-publish-with-notify.js login
 * 3. 즉시 발행: node auto-publish-with-notify.js publish 1
 * 4. 스케줄러 시작: node auto-publish-with-notify.js schedule
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const fetch = require('node-fetch');
const { exec } = require('child_process');

// .env 파일 로드
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// 설정 파일 경로
const CONFIG_PATH = path.join(__dirname, 'config.json');

// 기본 설정 (.env에서 로드)
let CONFIG = {
  blogUrl: process.env.NAVER_BLOG_URL || 'https://blog.naver.com/enkeiko',
  blogId: process.env.NAVER_BLOG_URL?.split('/').pop() || 'enkeiko',
  loginId: process.env.NAVER_LOGIN_ID,
  loginPw: process.env.NAVER_LOGIN_PASSWORD,
  userDataDir: path.join(__dirname, '.browser-data'),
  telegram: {
    enabled: false,
    botToken: '',
    chatId: ''
  }
};

// 설정 로드
function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    const saved = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    CONFIG = { ...CONFIG, ...saved };
  }
}

// 설정 저장
function saveConfig() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(CONFIG, null, 2), 'utf-8');
}

// 발행 일정 (1일 1개, 오늘부터 시작)
const today = new Date();
const SCHEDULE = [];
for (let i = 0; i < 10; i++) {
  const date = new Date(today);
  date.setDate(today.getDate() + i);
  SCHEDULE.push({
    month: date.getMonth() + 1,
    day: date.getDate(),
    episode: i + 1
  });
}

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

// ================= 알림 시스템 =================

// Windows 토스트 알림
function showWindowsNotification(title, message) {
  const script = `
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
    $template = @"
    <toast>
      <visual>
        <binding template="ToastText02">
          <text id="1">${title.replace(/"/g, "'")}</text>
          <text id="2">${message.replace(/"/g, "'")}</text>
        </binding>
      </visual>
    </toast>
"@
    $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
    $xml.LoadXml($template)
    $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("BlogPublisher").Show($toast)
  `;

  exec(`powershell -command "${script.replace(/\n/g, ' ')}"`, (err) => {
    if (err) console.log('Windows 알림 전송 실패 (무시해도 됨)');
  });
}

// Telegram 알림
async function sendTelegramNotification(message) {
  if (!CONFIG.telegram.enabled || !CONFIG.telegram.botToken || !CONFIG.telegram.chatId) {
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${CONFIG.telegram.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CONFIG.telegram.chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const result = await response.json();
    return result.ok;
  } catch (error) {
    console.log('Telegram 알림 실패:', error.message);
    return false;
  }
}

// 통합 알림 전송
async function sendNotification(title, message, postUrl = '') {
  const fullMessage = postUrl
    ? `${message}\n\n📎 포스팅 주소:\n${postUrl}`
    : message;

  // Windows 알림
  showWindowsNotification(title, message);

  // Telegram 알림
  const telegramMessage = `<b>${title}</b>\n\n${fullMessage}`;
  await sendTelegramNotification(telegramMessage);

  console.log(`\n📢 알림 전송 완료!`);
}

// ================= 마크다운 변환 =================

function convertMarkdown(markdown) {
  let content = markdown;

  const titleMatch = content.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1] : '제목 없음';

  content = content
    .replace(/^# .+\n/m, '')
    .replace(/^> (.+)$/gm, '$1')
    .replace(/^## ■/gm, '■')
    .replace(/^## /gm, '■ ')
    .replace(/^### /gm, '▶ ')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/```[\w]*\n([\s\S]*?)```/g, '$1')
    .replace(/^- /gm, '• ')
    .replace(/^\* /gm, '• ')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { title, content };
}

// ================= 자동 로그인 =================

async function autoLogin(page) {
  console.log('🔐 자동 로그인 시도 중...');

  if (!CONFIG.loginId || !CONFIG.loginPw) {
    console.log('❌ .env 파일에 로그인 정보가 없습니다.');
    return false;
  }

  await page.goto('https://nid.naver.com/nidlogin.login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 이미 로그인되어 있는지 확인
  if (!page.url().includes('nidlogin')) {
    console.log('✅ 이미 로그인되어 있습니다.');
    return true;
  }

  try {
    // 클립보드 + Ctrl+V 방식으로 입력 (네이버 봇 감지 우회)
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // ID 입력 (클립보드 사용)
    const idInput = page.locator('#id');
    await idInput.click();
    await page.waitForTimeout(500);

    // PowerShell로 클립보드에 ID 복사 (특수문자 안전)
    const idEscaped = CONFIG.loginId.replace(/'/g, "''");
    await execAsync(`powershell -command "Set-Clipboard -Value '${idEscaped}'"`, { shell: 'cmd.exe' });
    await page.waitForTimeout(200);

    // Ctrl+V로 붙여넣기
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(500);

    // PW 입력
    const pwInput = page.locator('#pw');
    await pwInput.click();
    await page.waitForTimeout(500);

    // PowerShell로 클립보드에 PW 복사 (특수문자 안전)
    const pwEscaped = CONFIG.loginPw.replace(/'/g, "''");
    await execAsync(`powershell -command "Set-Clipboard -Value '${pwEscaped}'"`, { shell: 'cmd.exe' });
    await page.waitForTimeout(200);

    // Ctrl+V로 붙여넣기
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(500);

    // 로그인 버튼 클릭
    const loginBtn = page.locator('#log\\.login');
    await loginBtn.click();

    // 로그인 완료 대기
    await page.waitForTimeout(3000);

    // 로그인 성공 확인 (최대 180초 대기)
    console.log('⏳ 로그인 대기 중... (최대 3분)');
    console.log('   캡차가 있으면 직접 입력해주세요.');

    for (let i = 0; i < 180; i++) {
      await page.waitForTimeout(1000);
      const currentUrl = page.url();

      if (currentUrl.includes('naver.com') && !currentUrl.includes('nidlogin')) {
        console.log('✅ 로그인 성공!');
        return true;
      }

      // 30초마다 상태 표시
      if (i > 0 && i % 30 === 0) {
        console.log(`   ... ${i}초 경과, 대기 중...`);
      }
    }

    // 최종 확인
    const finalUrl = page.url();
    if (finalUrl.includes('naver.com') && !finalUrl.includes('nidlogin')) {
      console.log('✅ 로그인 성공!');
      return true;
    }

    console.log('❌ 로그인 시간 초과 (3분)');
    return false;
  } catch (error) {
    console.log(`❌ 로그인 오류: ${error.message}`);
    return false;
  }
}

async function saveLoginSession() {
  console.log('🔐 로그인 세션 저장 모드...\n');

  const browser = await chromium.launchPersistentContext(CONFIG.userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();

  // 자동 로그인 시도
  const success = await autoLogin(page);

  if (success) {
    await page.waitForTimeout(2000);
    await browser.close();
    console.log('✅ 세션이 저장되었습니다!');
  } else {
    await browser.close();
    console.log('❌ 로그인 실패. 다시 시도해주세요.');
  }
}

// ================= 자동 발행 =================

async function autoPublish(episodeNum) {
  const episode = EPISODES[episodeNum];
  if (!episode) {
    console.log(`❌ 에피소드 ${episodeNum}을 찾을 수 없습니다.`);
    return { success: false, postUrl: '' };
  }

  const filePath = path.join(__dirname, episode.file);
  const imagePath = path.join(__dirname, 'images', episode.image);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ 파일을 찾을 수 없습니다: ${filePath}`);
    return { success: false, postUrl: '' };
  }

  console.log(`\n📝 ${episodeNum}회차 자동 발행 시작...`);

  const markdown = fs.readFileSync(filePath, 'utf-8');
  const { title, content } = convertMarkdown(markdown);

  console.log(`📌 제목: ${title}`);

  let browser;
  try {
    browser = await chromium.launchPersistentContext(CONFIG.userDataDir, {
      headless: false,
      viewport: { width: 1280, height: 900 },
    });
  } catch (e) {
    console.log('❌ 브라우저 세션이 없습니다. 먼저 로그인하세요:');
    console.log('   node auto-publish-with-notify.js login');
    return { success: false, postUrl: '' };
  }

  const page = await browser.newPage();
  let postUrl = '';

  try {
    const writeUrl = `${CONFIG.blogUrl}/postwrite`;
    console.log(`🌐 ${writeUrl} 이동 중...`);
    await page.goto(writeUrl, { waitUntil: 'networkidle', timeout: 30000 });

    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    if (currentUrl.includes('nidlogin')) {
      console.log('🔐 로그인이 필요합니다. 자동 로그인 시도...');
      const loginSuccess = await autoLogin(page);
      if (!loginSuccess) {
        await browser.close();
        return { success: false, postUrl: '' };
      }
      // 로그인 후 다시 글쓰기 페이지로 이동
      await page.goto(writeUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
    }

    console.log('📄 에디터 로딩 대기...');
    await page.waitForTimeout(3000);

    // 도움말 패널이 열려있으면 닫기
    try {
      const helpCloseBtn = page.locator('button[class*="close"], .btn_close, [aria-label="닫기"]').first();
      if (await helpCloseBtn.isVisible({ timeout: 2000 })) {
        await helpCloseBtn.click();
        console.log('📌 도움말 패널 닫기');
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      // 도움말이 없으면 무시
    }

    // 1. 제목 입력 (다양한 셀렉터 시도)
    console.log('✏️ 제목 입력 중...');

    // 제목 영역 클릭 - 여러 셀렉터 시도
    const titleSelectors = [
      'div.se-title-text',
      'span.se-placeholder',
      'div[data-placeholder="제목"]',
      '.se-documentTitle .se-text-paragraph',
      'p.se-text-paragraph'
    ];

    let titleClicked = false;
    for (const selector of titleSelectors) {
      try {
        const titleArea = page.locator(selector).first();
        if (await titleArea.isVisible({ timeout: 2000 })) {
          await titleArea.click();
          titleClicked = true;
          console.log(`   ✓ 제목 영역 클릭 성공 (${selector})`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!titleClicked) {
      // 직접 좌표로 클릭 시도 (제목 영역 위치)
      console.log('   → 좌표로 클릭 시도...');
      await page.mouse.click(400, 250);
    }

    await page.waitForTimeout(500);
    await page.keyboard.type(title, { delay: 30 });

    // 2. 본문 영역으로 이동
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    // 3. 이미지 업로드
    if (fs.existsSync(imagePath)) {
      console.log('🖼️ 이미지 업로드 중...');
      try {
        // 사진 버튼 찾기 (여러 셀렉터 시도)
        const photoBtnSelectors = [
          'button[aria-label="사진"]',
          'button:has-text("사진")',
          '[data-name="image"]',
          '.se-toolbar button:first-child'
        ];

        let photoClicked = false;
        for (const selector of photoBtnSelectors) {
          try {
            const photoBtn = page.locator(selector).first();
            if (await photoBtn.isVisible({ timeout: 2000 })) {
              await photoBtn.click();
              photoClicked = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }

        if (photoClicked) {
          await page.waitForTimeout(1000);
          const fileInput = page.locator('input[type="file"]').first();
          await fileInput.setInputFiles(imagePath);
          await page.waitForTimeout(3000);
          console.log('✅ 이미지 업로드 완료');
        }
      } catch (imgError) {
        console.log('⚠️ 이미지 업로드 실패, 본문만 작성합니다.');
      }
    }

    // 4. 본문 입력
    console.log('✏️ 본문 입력 중...');
    await page.waitForTimeout(1000);

    // 본문 영역 클릭 시도
    const contentSelectors = [
      'div.se-component-content',
      'p.se-text-paragraph:not(.se-title-text *)',
      '.se-content',
      '[data-placeholder*="일상을 기록"]'
    ];

    let contentClicked = false;
    for (const selector of contentSelectors) {
      try {
        const contentArea = page.locator(selector).first();
        if (await contentArea.isVisible({ timeout: 2000 })) {
          await contentArea.click();
          contentClicked = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!contentClicked) {
      // 본문 영역 좌표로 클릭
      await page.mouse.click(400, 400);
    }

    await page.waitForTimeout(500);

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      await page.keyboard.type(lines[i], { delay: 5 });
      if (i < lines.length - 1) {
        await page.keyboard.press('Enter');
      }
      if (i % 100 === 0 && i > 0) {
        await page.waitForTimeout(500);
      }
    }

    console.log('✅ 본문 입력 완료');

    // 5. 발행
    console.log('📤 발행 버튼 클릭...');
    await page.waitForTimeout(2000);

    // 발행 버튼 찾기
    const publishSelectors = [
      'button:has-text("발행")',
      '[data-testid="seOnePublishBtn"]',
      '.publish_btn',
      'button.se-publish-btn'
    ];

    for (const selector of publishSelectors) {
      try {
        const publishBtn = page.locator(selector).first();
        if (await publishBtn.isVisible({ timeout: 2000 })) {
          await publishBtn.click();
          console.log('   ✓ 발행 버튼 클릭');
          break;
        }
      } catch (e) {
        continue;
      }
    }

    await page.waitForTimeout(2000);

    // 최종 발행 확인 버튼
    try {
      const confirmSelectors = [
        '[class*="publish_btn"]',
        '[data-testid="seOnePublishBtn"]',
        'button:has-text("발행")',
        '.btn_confirm'
      ];

      for (const selector of confirmSelectors) {
        const confirmBtn = page.locator(selector).first();
        if (await confirmBtn.isVisible({ timeout: 2000 })) {
          await confirmBtn.click();
          break;
        }
      }
    } catch (e) {
      // 확인 버튼 없으면 무시
    }

    // 발행 완료 대기 및 URL 추출
    await page.waitForTimeout(5000);

    // 발행 후 URL 추출 시도
    try {
      const newUrl = page.url();
      if (newUrl.includes('/postwrite')) {
        // 아직 글쓰기 페이지면 블로그 메인으로 이동해서 최신글 URL 가져오기
        await page.goto(CONFIG.blogUrl, { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        const mainFrame = page.frameLocator('iframe[name="mainFrame"]');
        const firstPost = mainFrame.locator('.post-title a, .pcol2 a').first();
        if (await firstPost.isVisible()) {
          postUrl = await firstPost.getAttribute('href');
          if (postUrl && !postUrl.startsWith('http')) {
            postUrl = `https://blog.naver.com${postUrl}`;
          }
        }
      } else {
        postUrl = newUrl;
      }
    } catch (urlError) {
      // URL 추출 실패해도 발행은 성공
      postUrl = `${CONFIG.blogUrl}`;
    }

    console.log(`\n🎉 ${episodeNum}회차 발행 완료!`);
    if (postUrl) {
      console.log(`📎 포스팅 주소: ${postUrl}`);
    }

    // 발행 로그 저장
    const logPath = path.join(__dirname, 'publish-log.txt');
    const logEntry = `${new Date().toISOString()} - ${episodeNum}회차 발행 완료: ${title}\n  URL: ${postUrl}\n`;
    fs.appendFileSync(logPath, logEntry);

    await browser.close();
    return { success: true, postUrl, title };

  } catch (error) {
    console.log(`❌ 발행 중 오류 발생: ${error.message}`);

    const screenshotPath = path.join(__dirname, `error-ep${episodeNum}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`   스크린샷 저장: ${screenshotPath}`);

    await browser.close();
    return { success: false, postUrl: '' };
  }
}

// ================= 발행 + 알림 =================

async function publishWithNotification(episodeNum) {
  const result = await autoPublish(episodeNum);

  if (result.success) {
    await sendNotification(
      '📢 블로그 발행 완료!',
      `${episodeNum}회차 "${result.title}" 발행되었습니다.`,
      result.postUrl
    );
  } else {
    await sendNotification(
      '❌ 블로그 발행 실패',
      `${episodeNum}회차 발행 중 오류가 발생했습니다. 확인이 필요합니다.`
    );
  }

  return result;
}

// ================= 스케줄러 =================

function getTodayEpisode() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const scheduled = SCHEDULE.find(s => s.month === month && s.day === day);
  return scheduled ? scheduled.episode : null;
}

function startScheduler() {
  loadConfig();

  console.log('📅 자동 발행 스케줄러 시작!');
  console.log('⏰ 매일 오전 9시에 자동 발행합니다.\n');

  console.log('발행 일정:');
  SCHEDULE.forEach(s => {
    console.log(`  - ${s.month}/${s.day}: ${s.episode}회차`);
  });
  console.log('');

  if (CONFIG.telegram.enabled) {
    console.log('✅ Telegram 알림 활성화됨');
  } else {
    console.log('⚠️ Telegram 알림 비활성화 (Windows 알림만 사용)');
  }
  console.log('');

  // 매일 오전 9시에 실행
  cron.schedule('0 9 * * *', async () => {
    const episode = getTodayEpisode();
    if (episode) {
      console.log(`\n🎉 오늘은 ${episode}회차 발행일입니다!`);
      await publishWithNotification(episode);
    } else {
      console.log(`\n📭 오늘은 발행 예정인 글이 없습니다.`);
    }
  });

  console.log('✅ 스케줄러가 실행 중입니다. (Ctrl+C로 종료)');
}

// ================= 설정 =================

async function setupTelegram() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (q) => new Promise(resolve => rl.question(q, resolve));

  console.log('\n📱 Telegram 알림 설정\n');
  console.log('Telegram Bot 만드는 방법:');
  console.log('1. Telegram에서 @BotFather 검색');
  console.log('2. /newbot 명령어로 봇 생성');
  console.log('3. 봇 토큰 복사\n');
  console.log('Chat ID 확인 방법:');
  console.log('1. 생성한 봇에게 아무 메시지 전송');
  console.log('2. https://api.telegram.org/bot<TOKEN>/getUpdates 접속');
  console.log('3. "chat":{"id": 뒤의 숫자가 Chat ID\n');

  const token = await question('Bot Token을 입력하세요: ');
  const chatId = await question('Chat ID를 입력하세요: ');

  CONFIG.telegram = {
    enabled: true,
    botToken: token.trim(),
    chatId: chatId.trim()
  };

  saveConfig();

  console.log('\n테스트 메시지 전송 중...');
  const success = await sendTelegramNotification('🎉 블로그 자동발행 알림 설정 완료!\n\n이제 발행 시 알림을 받을 수 있습니다.');

  if (success) {
    console.log('✅ 설정 완료! Telegram으로 알림이 전송됩니다.');
  } else {
    console.log('❌ 테스트 실패. 토큰과 Chat ID를 확인해주세요.');
  }

  rl.close();
}

// ================= 메인 =================

const args = process.argv.slice(2);
const command = args[0];

loadConfig();

(async () => {
  switch (command) {
    case 'login':
      await saveLoginSession();
      break;

    case 'publish':
      const ep = parseInt(args[1]);
      if (!ep || ep < 1 || ep > 10) {
        console.log('사용법: node auto-publish-with-notify.js publish [1-10]');
        break;
      }
      await publishWithNotification(ep);
      break;

    case 'schedule':
      startScheduler();
      break;

    case 'setup':
      await setupTelegram();
      break;

    case 'test':
      const testEp = getTodayEpisode();
      if (testEp) {
        console.log(`오늘 발행 예정: ${testEp}회차`);
      } else {
        console.log('오늘 발행 예정인 글이 없습니다.');
      }
      console.log('\n전체 일정:');
      SCHEDULE.forEach(s => console.log(`  ${s.month}/${s.day}: ${s.episode}회차`));
      break;

    case 'notify-test':
      console.log('알림 테스트 전송 중...');
      await sendNotification(
        '🔔 테스트 알림',
        '블로그 자동발행 알림 테스트입니다.',
        'https://blog.naver.com/smartrupy'
      );
      break;

    default:
      console.log(`
소상공인 AI 마케팅 시리즈 - 자동 발행 + 알림 스크립트

사용법:
  node auto-publish-with-notify.js setup       # Telegram 알림 설정
  node auto-publish-with-notify.js login       # 로그인 세션 저장
  node auto-publish-with-notify.js publish 1   # 1회차 즉시 발행
  node auto-publish-with-notify.js schedule    # 스케줄러 시작
  node auto-publish-with-notify.js test        # 오늘 발행할 글 확인
  node auto-publish-with-notify.js notify-test # 알림 테스트

발행 일정:
${SCHEDULE.map(s => `  ${s.month}/${s.day}: ${s.episode}회차`).join('\n')}
      `);
  }
})();
