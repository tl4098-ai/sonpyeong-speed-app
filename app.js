const state = {
  manifest: null,
  packs: [],
  selectedPackMeta: null,
  selectedPack: null,
  questions: [],
  queue: [],
  current: null,
  index: 0,
  correct: 0,
  score: 0,
  startedAt: 0,
  timerId: null,
  timeLeft: 0,
  locked: false,
  mode: null,
};

const $ = (sel) => document.querySelector(sel);
const wrongKey = (packId) => `sonpyeong_wrong_${packId}`;

function normalizeAnswer(value){
  return String(value ?? "")
    .trim()
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s·,./\\()[\]{}'"“”‘’~!@#$%^&*_+=:;?<>|-]/g, "");
}

function isCorrect(input, q){
  if(q.type === "ox") return normalizeAnswer(input) === normalizeAnswer(q.answer);
  if(q.type === "mcq") return String(input) === String(q.answer);
  const accepted = [q.answer, ...(q.aliases || [])].map(normalizeAnswer);
  const cleaned = normalizeAnswer(input);
  if(accepted.includes(cleaned)) return true;
  return (q.aliases || [])
    .map(normalizeAnswer)
    .some(alias => alias.length >= 2 && cleaned.includes(alias));
}

function shuffle(list){
  return [...list].sort(() => Math.random() - 0.5);
}

function sampleQuestions(mode){
  const all = state.selectedPack.questions;
  if(mode === "wrong"){
    const wrongIds = getWrongIds(state.selectedPack.packId);
    return shuffle(all.filter(q => wrongIds.includes(q.id)));
  }
  if(mode === "level1") return shuffle(questionsByLevel(1));
  if(mode === "level2") return shuffle(questionsByLevel(2));
  if(mode === "level3") return shuffle(questionsByLevel(3));
  return shuffle(all);
}

function questionsByLevel(level){
  return state.selectedPack.questions.filter(q => Number(q.level) === level);
}

function dailySample(all, count){
  const today = new Date().toISOString().slice(0,10).replace(/-/g,"");
  let seed = Number(today);
  const seeded = [...all].sort((a,b) => seededRand(seed + a.id.length + a.id.charCodeAt(a.id.length-1)) - seededRand(seed + b.id.length + b.id.charCodeAt(b.id.length-1)));
  return seeded.slice(0, Math.min(count, seeded.length));
}

function timeLimitFor(q){
  if(state.mode === "wrong") return 25;
  const explicit = Number(q.timeLimit);
  if(explicit > 0) return explicit;
  if(q.type === "calc") return 30;
  if(q.type === "ox") return 12;
  if(state.mode === "level1") return 10;
  if(state.mode === "level2") return 15;
  if(state.mode === "level3") return 20;
  return q.timeLimit || 10;
}

function seededRand(seed){
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

async function init(){
  bindEvents();
  await loadManifest();
}

function bindEvents(){
  $("#nextBtn").addEventListener("click", nextQuestion);
  $("#quitBtn").addEventListener("click", showResult);
  $("#backHomeBtn").addEventListener("click", () => showOnly("packPanel"));
  $("#retryWrongBtn").addEventListener("click", () => startMode("wrong"));
  $("#retryDailyBtn").addEventListener("click", () => startMode("level1"));
  $("#resetWrongBtn").addEventListener("click", () => {
    if(!state.selectedPackMeta) return;
    localStorage.removeItem(wrongKey(state.selectedPackMeta.id));
    updateWrongLabel();
  });
  document.querySelectorAll(".mode-card[data-mode]").forEach(btn => btn.addEventListener("click", () => startMode(btn.dataset.mode)));
}

async function loadManifest(){
  $("#loadStatus").textContent = "불러오는 중";
  try{
    const res = await fetch("data/manifest.json", { cache: "no-store" });
    if(!res.ok) throw new Error("manifest fetch failed");
    state.manifest = await res.json();
    state.packs = state.manifest.packs || [];
    renderPacks();
    $("#loadStatus").textContent = "준비 완료";
  }catch(err){
    $("#loadStatus").textContent = "불러오기 실패";
    $("#packList").innerHTML = '<div class="panel">문제팩 목록을 불러오지 못했습니다. GitHub Pages 또는 로컬 서버에서 실행해주세요.</div>';
  }
}

function renderPacks(){
  $("#packList").innerHTML = state.packs.map(pack => `
    <article class="pack-card">
      <div class="pack-copy">
        <b>${pack.title}</b>
        <span>${pack.description}</span>
        <span class="pack-meta"><em>${pack.questionCount}문제</em><em>${pack.level}</em><em>${pack.free ? "무료" : "유료"}</em></span>
        <p class="pack-cta">노트로 익숙해지고, 문제로 꺼내고, 게임으로 빨라집니다. 1점씩 확실하게 챙겨가세요.</p>
      </div>
      <button class="primary-btn pack-start" type="button" data-pack-id="${pack.id}">스피드훈련 시작</button>
      ${renderPackNoteLinks(pack)}
    </article>
  `).join("");
  document.querySelectorAll(".pack-start").forEach(btn => btn.addEventListener("click", () => selectPack(btn.dataset.packId)));
}

function renderPackNoteLinks(pack){
  if(!pack.notePdf) return "";
  return `
    <div class="pack-note-actions">
      <a class="secondary-btn note-link" href="${pack.notePdf}" target="_blank" rel="noopener">1~5강 암기노트 보기</a>
      <a class="secondary-btn note-link" href="${pack.notePdf}" download>PDF 정리노트 다운로드</a>
    </div>
  `;
}

async function selectPack(packId){
  const meta = state.packs.find(p => p.id === packId);
  if(!meta) return;
  state.selectedPackMeta = meta;
  $("#loadStatus").textContent = "문제팩 로딩";
  const res = await fetch(meta.file, { cache: "no-store" });
  if(!res.ok) throw new Error("pack fetch failed");
  state.selectedPack = await res.json();
  state.questions = state.selectedPack.questions || [];
  $("#selectedPackTitle").textContent = state.selectedPack.title;
  $("#selectedPackDesc").textContent = state.selectedPack.description;
  $("#sourceNote").textContent = state.selectedPack.sourceNote || "";
  $("#loadStatus").textContent = "선택 완료";
  updateWrongLabel();
  updateNoteLinks();
  showOnly("packPanel", "modePanel");
}

function updateNoteLinks(){
  const href = state.selectedPackMeta?.notePdf || "";
  const hasNote = Boolean(href);
  ["modeNotePanel"].forEach(id => $("#" + id).classList.toggle("hidden", !hasNote));
  [
    "modeNoteView",
    "modeNoteDownload",
    "level0NoteLink",
    "playNoteView",
    "playNoteDownload",
    "resultNoteView",
    "resultNoteDownload"
  ].forEach(id => {
    const el = $("#" + id);
    if(!el) return;
    el.href = hasNote ? href : "#";
    el.classList.toggle("hidden", !hasNote);
  });
  const playNotePanel = $("#playNotePanel");
  if(playNotePanel){
    playNotePanel.classList.toggle("hidden", !(hasNote && state.mode === "wrong"));
  }
}

function showOnly(...ids){
  ["packPanel","modePanel","playPanel","resultPanel"].forEach(id => $("#" + id).classList.toggle("hidden", !ids.includes(id)));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateWrongLabel(){
  const count = state.selectedPackMeta ? getWrongIds(state.selectedPackMeta.id).length : 0;
  $("#wrongCountLabel").textContent = `저장된 오답 ${count}개 · 문항당 25초`;
}

function getWrongIds(packId){
  try{ return JSON.parse(localStorage.getItem(wrongKey(packId)) || "[]"); }
  catch{ return []; }
}

function saveWrong(q, ok){
  const key = wrongKey(state.selectedPack.packId);
  const set = new Set(getWrongIds(state.selectedPack.packId));
  if(ok) set.delete(q.id);
  else set.add(q.id);
  localStorage.setItem(key, JSON.stringify([...set]));
  updateWrongLabel();
}

function startMode(mode){
  if(!state.selectedPack) return;
  const queue = sampleQuestions(mode);
  if(mode === "wrong" && queue.length === 0){
    alert("저장된 오답이 없습니다. 먼저 훈련을 진행해주세요.");
    return;
  }
  state.mode = mode;
  state.queue = queue;
  state.index = 0;
  state.correct = 0;
  state.score = 0;
  state.startedAt = Date.now();
  state.locked = false;
  updateNoteLinks();
  showOnly("playPanel");
  nextQuestion();
}

function nextQuestion(){
  clearInterval(state.timerId);
  if(state.index >= state.queue.length){
    showResult();
    return;
  }
  state.current = state.queue[state.index];
  state.locked = false;
  $("#feedbackBox").className = "feedback hidden";
  renderQuestion(state.current);
  startTimer(timeLimitFor(state.current));
}

function updateHud(){
  $("#scoreText").textContent = state.score;
  $("#progressText").textContent = `${Math.min(state.index + 1, state.queue.length)}/${state.queue.length}`;
  $("#correctText").textContent = state.correct;
}

function renderQuestion(q){
  updateHud();
  const style = displayStyleTag(q.styleTag);
  const meta = [`${q.lesson}강`, q.category, style, q.difficulty].filter(Boolean);
  $("#questionMeta").textContent = meta.join(" · ");
  $("#questionText").textContent = q.question;
  const area = $("#answerArea");
  if(q.type === "ox"){
    area.innerHTML = '<div class="ox-wrap"><button class="ox-btn" data-answer="O">O</button><button class="ox-btn" data-answer="X">X</button></div>';
    area.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => submitAnswer(btn.dataset.answer)));
    return;
  }
  if(q.type === "mcq"){
    area.innerHTML = '<div class="choice-grid"></div>';
    const choices = q.choices || [];
    area.querySelector(".choice-grid").innerHTML = choices.map((c,i)=>`<button class="choice-btn" data-answer="${i}">${i+1}. ${c}</button>`).join("");
    area.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => submitAnswer(btn.dataset.answer)));
    return;
  }
  area.innerHTML = `
    <div class="answer-form">
      <input class="answer-input" id="answerInput" autocomplete="off" inputmode="${q.type === "calc" ? "decimal" : "text"}" placeholder="정답 입력">
      <button class="primary-btn submit-button" id="submitBtn" type="button">확인</button>
    </div>
  `;
  $("#submitBtn").addEventListener("click", () => submitAnswer($("#answerInput").value));
  $("#answerInput").addEventListener("keydown", e => {
    if(e.key === "Enter") submitAnswer($("#answerInput").value);
  });
  $("#answerInput").focus();
}

function displayStyleTag(styleTag){
  if(!styleTag) return "";
  if(styleTag === "기출형") return "기출 출제포인트 변형";
  return styleTag;
}

function startTimer(seconds){
  state.timeLeft = seconds;
  updateTimer(seconds);
  state.timerId = setInterval(() => {
    state.timeLeft -= 0.1;
    updateTimer(seconds);
    if(state.timeLeft <= 0){
      clearInterval(state.timerId);
      submitAnswer("", true);
    }
  }, 100);
}

function updateTimer(total){
  const left = Math.max(0, state.timeLeft);
  $("#timeText").textContent = `${Math.ceil(left)}초`;
  $("#timerBar").style.width = `${Math.max(0, left / total * 100)}%`;
}

function submitAnswer(input, timeout=false){
  if(state.locked) return;
  state.locked = true;
  clearInterval(state.timerId);
  const q = state.current;
  const ok = !timeout && isCorrect(input, q);
  if(ok){
    state.correct += 1;
    state.score += 1;
  }
  updateHud();
  saveWrong(q, ok);
  showFeedback(q, ok, input, timeout);
}

function showFeedback(q, ok, input, timeout){
  const box = $("#feedbackBox");
  box.className = "feedback " + (ok ? "ok" : "no");
  $("#feedbackTitle").textContent = timeout ? "시간 초과" : ok ? "정답입니다" : "오답입니다";
  $("#feedbackAnswer").textContent = `정답: ${q.answer}`;
  $("#feedbackExplanation").textContent = q.explanation || "핵심 용어와 문제 단서를 다시 연결해보세요.";
  $("#feedbackTip").textContent = q.memoryTip || "짧은 문장으로 정답을 기억해두세요.";
  $("#feedbackTrap").textContent = q.trap || "비슷한 용어와 혼동하지 않도록 정답 단어를 정확히 확인하세요.";
  state.index += 1;
  $("#nextBtn").textContent = state.index >= state.queue.length ? "결과 보기" : "다음 문제";
}

function showResult(){
  clearInterval(state.timerId);
  const total = state.queue.length || 1;
  const rate = Math.round(state.correct / total * 100);
  const elapsed = Math.max(1, Math.round((Date.now() - state.startedAt) / 1000));
  const grade = gradeFor(rate);
  $("#gradeText").textContent = grade.title;
  $("#resultMessage").textContent = grade.message;
  $("#resultTotal").textContent = total;
  $("#resultCorrect").textContent = state.correct;
  $("#resultRate").textContent = rate + "%";
  $("#resultTime").textContent = elapsed + "초";
  updateWrongLabel();
  updateNoteLinks();
  showOnly("resultPanel");
}

function gradeFor(rate){
  if(rate >= 90) return {title:"합격 안정권", message:"좋습니다. 기초용어 반응 속도가 안정적으로 올라가고 있습니다."};
  if(rate >= 80) return {title:"실전권", message:"실전권입니다. 오답만 다시 풀면 훨씬 빨라집니다."};
  if(rate >= 70) return {title:"보완 필요", message:"핵심 용어는 잡혀 있습니다. 헷갈린 용어를 다시 고정하세요."};
  if(rate >= 60) return {title:"기초 점검", message:"보험가액·보험가입금액처럼 비슷한 용어 구분을 한 번 더 복습하세요."};
  return {title:"재도전 권장", message:"처음부터 다시 짧게 반복해도 괜찮습니다. 정답 단어를 먼저 익히세요."};
}

init();
