/**
 * 소상공인 AI 마케팅 시리즈 - 자동 스케줄러
 *
 * 사용법:
 * 1. npm install node-cron open
 * 2. node scheduler.js
 *
 * 매일 오전 9시에 발행할 글이 있는지 확인하고,
 * 있으면 변환된 글을 보여주고 네이버 블로그 글쓰기 페이지를 엽니다.
 */

const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 발행 일정 (월/일)
const SCHEDULE = [
  { month: 1, day: 6, episode: 1 },
  { month: 1, day: 9, episode: 2 },
  { month: 1, day: 12, episode: 3 },
  { month: 1, day: 15, episode: 4 },
  { month: 1, day: 18, episode: 5 },
  { month: 1, day: 21, episode: 6 },
  { month: 1, day: 24, episode: 7 },
  { month: 1, day: 27, episode: 8 },
  { month: 1, day: 30, episode: 9 },
  { month: 2, day: 2, episode: 10 },
];

// 에피소드 파일 매핑
const EPISODES = {
  1: 'ep01-intro.md',
  2: 'ep02-tools.md',
  3: 'ep03-instagram.md',
  4: 'ep04-blog.md',
  5: 'ep05-review.md',
  6: 'ep06-ads.md',
  7: 'ep07-menu.md',
  8: 'ep08-ideas.md',
  9: 'ep09-image.md',
  10: 'ep10-tips.md',
};

const IMAGES = {
  1: 'ep01-intro.jpg',
  2: 'ep02-tools.jpg',
  3: 'ep03-instagram.jpg',
  4: 'ep04-blog.jpg',
  5: 'ep05-review.jpg',
  6: 'ep06-ads.jpg',
  7: 'ep07-menu.jpg',
  8: 'ep08-ideas.jpg',
  9: 'ep09-image.jpg',
  10: 'ep10-tips.jpg',
};

// 네이버 블로그 URL (본인 블로그 ID로 변경)
const NAVER_BLOG_WRITE_URL = 'https://blog.naver.com/smartrupy/postwrite';

// 마크다운 -> 블로그 포맷 변환
function convertMarkdownToBlog(markdown) {
  let content = markdown;

  // 제목 추출
  const titleMatch = content.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1] : '제목 없음';

  // 마크다운 변환
  content = content
    // 제목 제거 (첫 번째 #)
    .replace(/^# .+\n/m, '')
    // 인용문 > 를 줄바꿈으로
    .replace(/^> (.+)$/gm, '\n$1\n')
    // ## 소제목을 ■로
    .replace(/^## (.+)$/gm, '\n■ $1\n')
    // ### 소제목을 ▶로
    .replace(/^### (.+)$/gm, '\n▶ $1\n')
    // **굵은글씨** 유지 (네이버에서 지원)
    .replace(/\*\*(.+?)\*\*/g, '$1')
    // 코드블록 정리
    .replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/```\w*\n?/g, '\n').trim();
    })
    // 리스트 정리
    .replace(/^- /gm, '• ')
    .replace(/^\* /gm, '• ')
    // 여러 줄바꿈 정리
    .replace(/\n{3,}/g, '\n\n');

  return { title, content: content.trim() };
}

// 오늘 발행할 에피소드 확인
function getTodayEpisode() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const scheduled = SCHEDULE.find(s => s.month === month && s.day === day);
  return scheduled ? scheduled.episode : null;
}

// 발행 준비
async function preparePublish(episodeNum) {
  const filename = EPISODES[episodeNum];
  const imagename = IMAGES[episodeNum];

  if (!filename) {
    console.log(`에피소드 ${episodeNum}을 찾을 수 없습니다.`);
    return;
  }

  const filePath = path.join(__dirname, filename);
  const imagePath = path.join(__dirname, 'images', imagename);

  if (!fs.existsSync(filePath)) {
    console.log(`파일을 찾을 수 없습니다: ${filePath}`);
    return;
  }

  // 마크다운 읽기 및 변환
  const markdown = fs.readFileSync(filePath, 'utf-8');
  const { title, content } = convertMarkdownToBlog(markdown);

  console.log('='.repeat(60));
  console.log(`📢 ${episodeNum}회차 발행 준비 완료!`);
  console.log('='.repeat(60));
  console.log(`\n📌 제목:\n${title}\n`);
  console.log('='.repeat(60));
  console.log('\n📝 본문 (아래 내용을 복사하세요):\n');
  console.log(content);
  console.log('\n' + '='.repeat(60));
  console.log(`\n🖼️ 이미지 경로:\n${imagePath}\n`);
  console.log('='.repeat(60));

  // 변환된 내용을 파일로 저장
  const outputPath = path.join(__dirname, `ready-to-publish-ep${episodeNum.toString().padStart(2, '0')}.txt`);
  fs.writeFileSync(outputPath, `제목: ${title}\n\n${content}`, 'utf-8');
  console.log(`\n✅ 파일로 저장됨: ${outputPath}`);

  // 네이버 블로그 글쓰기 페이지 열기
  const openCommand = process.platform === 'win32' ? 'start' : 'open';
  exec(`${openCommand} ${NAVER_BLOG_WRITE_URL}`);
  console.log(`\n🌐 네이버 블로그 글쓰기 페이지를 열었습니다.`);
  console.log(`\n📋 순서:`);
  console.log(`1. 제목 입력`);
  console.log(`2. 이미지 업로드 (${imagename})`);
  console.log(`3. 본문 붙여넣기`);
  console.log(`4. 발행!`);
}

// 즉시 실행 (테스트용)
function runNow(episodeNum) {
  console.log(`\n🚀 ${episodeNum}회차 즉시 발행 준비 시작...\n`);
  preparePublish(episodeNum);
}

// 스케줄러 시작
function startScheduler() {
  console.log('📅 소상공인 AI 마케팅 시리즈 스케줄러 시작!');
  console.log('⏰ 매일 오전 9시에 발행할 글이 있는지 확인합니다.\n');

  // 현재 일정 표시
  console.log('예정된 발행 일정:');
  SCHEDULE.forEach(s => {
    console.log(`  - ${s.month}/${s.day}: ${s.episode}회차`);
  });
  console.log('');

  // 매일 오전 9시에 실행 (cron: 분 시 일 월 요일)
  cron.schedule('0 9 * * *', () => {
    const episode = getTodayEpisode();
    if (episode) {
      console.log(`\n🎉 오늘은 ${episode}회차 발행일입니다!`);
      preparePublish(episode);
    } else {
      console.log(`\n📭 오늘은 발행 예정인 글이 없습니다.`);
    }
  });

  console.log('✅ 스케줄러가 실행 중입니다. (Ctrl+C로 종료)');
}

// 커맨드라인 인자 처리
const args = process.argv.slice(2);

if (args[0] === 'now' && args[1]) {
  // 즉시 실행: node scheduler.js now 1
  runNow(parseInt(args[1]));
} else if (args[0] === 'test') {
  // 오늘 발행할 거 확인
  const episode = getTodayEpisode();
  if (episode) {
    console.log(`오늘 발행 예정: ${episode}회차`);
  } else {
    console.log('오늘 발행 예정인 글이 없습니다.');
  }
} else {
  // 스케줄러 시작
  startScheduler();
}
