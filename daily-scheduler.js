/**
 * 소상공인 AI 마케팅 시리즈 - 매일 자동 발행 스케줄러
 *
 * 사용법: node daily-scheduler.js
 * 매일 오전 9시에 다음 에피소드를 자동 발행합니다.
 */

const cron = require('node-cron');
const { publishToNaverBlog } = require('./publish.js');
const path = require('path');
const fs = require('fs');
const https = require('https');

// Telegram 설정
const TELEGRAM = {
  botToken: '8597110859:AAF9FjG-prDawpi6YlC95YUAQVRuOQIhh2w',
  chatId: '8290598824'
};

// Telegram 알림 전송
function sendTelegramNotification(message) {
  return new Promise((resolve) => {
    const url = `https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`;
    const data = JSON.stringify({
      chat_id: TELEGRAM.chatId,
      text: message
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(url, options, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.write(data);
    req.end();
  });
}

// 발행 상태 파일
const STATUS_FILE = path.join(__dirname, 'posts/special-small-business-marketing/publish-status.json');

// 에피소드 정보
const EPISODES = [
  { ep: 1, file: 'ep01-intro.md', image: 'ep01-intro.jpg' },
  { ep: 2, file: 'ep02-tools.md', image: 'ep02-tools.jpg' },
  { ep: 3, file: 'ep03-instagram.md', image: 'ep03-instagram.jpg' },
  { ep: 4, file: 'ep04-blog.md', image: 'ep04-blog.jpg' },
  { ep: 5, file: 'ep05-review.md', image: 'ep05-review.jpg' },
  { ep: 6, file: 'ep06-ads.md', image: 'ep06-ads.jpg' },
  { ep: 7, file: 'ep07-menu.md', image: 'ep07-menu.jpg' },
  { ep: 8, file: 'ep08-ideas.md', image: 'ep08-ideas.jpg' },
  { ep: 9, file: 'ep09-image.md', image: 'ep09-image.jpg' },
  { ep: 10, file: 'ep10-tips.md', image: 'ep10-tips.jpg' },
];

// 발행 상태 로드
function loadStatus() {
  if (fs.existsSync(STATUS_FILE)) {
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
  }
  return { lastPublished: 1, history: [] }; // 1회차는 이미 발행됨
}

// 발행 상태 저장
function saveStatus(status) {
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), 'utf-8');
}

// 다음 발행할 에피소드 가져오기
function getNextEpisode() {
  const status = loadStatus();
  const next = status.lastPublished + 1;
  return next <= 10 ? EPISODES.find(e => e.ep === next) : null;
}

// 에피소드 발행
async function publishEpisode(episode) {
  const basePath = 'posts/special-small-business-marketing';
  const mdPath = path.join(basePath, episode.file);
  const imgPath = path.join(basePath, 'images', episode.image);

  console.log(`\n${'='.repeat(50)}`);
  console.log(`📢 ${episode.ep}회차 자동 발행 시작!`);
  console.log(`${'='.repeat(50)}\n`);

  try {
    await publishToNaverBlog(mdPath, imgPath);

    // 성공 시 상태 업데이트
    const status = loadStatus();
    status.lastPublished = episode.ep;
    status.history.push({
      episode: episode.ep,
      date: new Date().toISOString(),
      success: true
    });
    saveStatus(status);

    console.log(`\n✅ ${episode.ep}회차 발행 완료!`);
    console.log(`   다음 발행: ${episode.ep < 10 ? `${episode.ep + 1}회차 (내일 오전 9시)` : '시리즈 완료!'}`);

    // Telegram 알림
    const blogUrl = 'https://blog.naver.com/enkeiko';
    await sendTelegramNotification(
      `[Blog Published] Episode ${episode.ep}/10\n\n` +
      `File: ${episode.file}\n` +
      `Blog: ${blogUrl}\n\n` +
      `Next: ${episode.ep < 10 ? `Episode ${episode.ep + 1} tomorrow 9AM` : 'Series Complete!'}`
    );

    return true;
  } catch (error) {
    console.error(`\n❌ ${episode.ep}회차 발행 실패:`, error.message);

    // 실패 기록
    const status = loadStatus();
    status.history.push({
      episode: episode.ep,
      date: new Date().toISOString(),
      success: false,
      error: error.message
    });
    saveStatus(status);

    // Telegram 실패 알림
    await sendTelegramNotification(
      `[Blog FAILED] Episode ${episode.ep}\n\n` +
      `Error: ${error.message}\n\n` +
      `Please check manually!`
    );

    return false;
  }
}

// 스케줄러 시작
function startScheduler() {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  소상공인 AI 마케팅 시리즈 - 자동 발행 스케줄러      ║
╠══════════════════════════════════════════════════════╣
║  ⏰ 매일 오전 9시에 자동 발행                        ║
║  📝 1회차 발행 완료, 나머지 9개 에피소드 대기 중     ║
╚══════════════════════════════════════════════════════╝
`);

  const status = loadStatus();
  console.log(`현재 상태: ${status.lastPublished}회차까지 발행 완료`);
  console.log(`남은 에피소드: ${10 - status.lastPublished}개\n`);

  // 남은 일정 표시
  console.log('예정된 발행 일정:');
  for (let i = status.lastPublished + 1; i <= 10; i++) {
    const daysFromNow = i - status.lastPublished;
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow - 1);
    console.log(`  - ${date.getMonth() + 1}/${date.getDate()}: ${i}회차`);
  }
  console.log('');

  // 매일 오전 9시에 실행
  cron.schedule('0 9 * * *', async () => {
    const episode = getNextEpisode();
    if (episode) {
      await publishEpisode(episode);
    } else {
      console.log('\n🎉 모든 에피소드 발행 완료! 시리즈가 끝났습니다.');
    }
  });

  console.log('✅ 스케줄러가 실행 중입니다.');
  console.log('   이 창을 닫지 마세요! (Ctrl+C로 종료)\n');
}

// 즉시 발행 (테스트용)
async function publishNow(epNum) {
  const episode = EPISODES.find(e => e.ep === epNum);
  if (!episode) {
    console.log(`❌ 에피소드 ${epNum}을 찾을 수 없습니다.`);
    return;
  }
  await publishEpisode(episode);
}

// 메인
const args = process.argv.slice(2);

if (args[0] === 'now' && args[1]) {
  // 즉시 발행: node daily-scheduler.js now 2
  publishNow(parseInt(args[1]));
} else if (args[0] === 'status') {
  // 상태 확인
  const status = loadStatus();
  console.log('발행 상태:', JSON.stringify(status, null, 2));
} else {
  // 스케줄러 시작
  startScheduler();
}
