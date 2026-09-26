(function(){
  "use strict";

  // Адрес вашего бота на PythonAnywhere — сюда мини-апп обращается за
  // ссылкой на счёт при оплате. Впишите свой логин.
  var BACKEND_URL = "https://ваш-логин.pythonanywhere.com";

  // Ваш Telegram ID (числовой, узнать через @userinfobot) — если он совпадёт,
  // на экране появится значок ⚙ с панелью для тестирования.
  var DEV_USER_IDS = [0]; // замените 0 на свой реальный числовой ID

  // ---------- Telegram WebApp init ----------
  var tg = window.Telegram ? window.Telegram.WebApp : null;
  var insideTelegram = !!(tg && tg.initData);
  if (tg) {
    tg.ready();
    tg.expand();
    try { tg.setBackgroundColor('#22203a'); } catch(e){}
    try { tg.setHeaderColor('secondary_bg_color'); } catch(e){}
  }
  document.getElementById('notice-outside').style.display = insideTelegram ? 'none' : 'block';

  function haptic(type){
    if (tg && tg.HapticFeedback) {
      if (type === 'select') tg.HapticFeedback.selectionChanged();
      else tg.HapticFeedback.impactOccurred(type || 'light');
    }
  }

  // ---------- Tarot data (22 Old Arcana) ----------
  var CARDS = [
    {n:"0",  name:"Шут", glyph:"🃏",
      up:"Начало пути, лёгкость и готовность к риску. Доверьтесь моменту — план появится по ходу движения.",
      rev:"Опрометчивость и страх сделать первый шаг. Проверьте, не путаете ли вы смелость с бездумностью.",
      yn:"скорее да"},
    {n:"I",  name:"Маг", glyph:"✧",
      up:"У вас есть все ресурсы для результата. Пора действовать, а не собирать инструменты дальше.",
      rev:"Распыление сил или манипуляция вместо честного действия. Соберите фокус на одной цели.",
      yn:"да"},
    {n:"II", name:"Верховная Жрица", glyph:"☾",
      up:"Ответ уже внутри вас — тишина подскажет больше, чем чужой совет.",
      rev:"Вы игнорируете интуицию в пользу удобной версии событий. Вернитесь к честности с собой.",
      yn:"скорее нет"},
    {n:"III", name:"Императрица", glyph:"✿",
      up:"Рост, забота, изобилие. То, что вы взращиваете сейчас, скоро принесёт плоды.",
      rev:"Истощение от гиперзаботы о других. Дайте себе то внимание, которое отдаёте всем вокруг.",
      yn:"да"},
    {n:"IV", name:"Император", glyph:"▲",
      up:"Структура и дисциплина наведут порядок там, где сейчас хаос. Возьмите ответственность на себя.",
      rev:"Жёсткий контроль душит ситуацию. Где-то стоит ослабить хватку.",
      yn:"скорее да"},
    {n:"V", name:"Иерофант", glyph:"⛩",
      up:"Традиционный, проверенный путь окажется надёжнее эксперимента. Наставник рядом может помочь.",
      rev:"Правила устарели и не служат вам. Разрешите себе не следовать чужому сценарию.",
      yn:"скорее нет"},
    {n:"VI", name:"Влюблённые", glyph:"♡",
      up:"Выбор по зову сердца, союз, гармония ценностей. Решение будет верным, если оно честное.",
      rev:"Конфликт ценностей или колебание между двумя путями. Не решайте под давлением извне.",
      yn:"да"},
    {n:"VII", name:"Колесница", glyph:"➤",
      up:"Воля и направление побеждают препятствия. Двигайтесь вперёд — тормозить сейчас не время.",
      rev:"Вы теряете курс из-за внутреннего разлада. Сначала договоритесь сами с собой.",
      yn:"скорее да"},
    {n:"VIII", name:"Сила", glyph:"∞",
      up:"Мягкая, но непоколебимая сила духа сильнее грубого напора. Терпение — ваше оружие.",
      rev:"Сомнение в себе подрывает результат. Вы сильнее, чем ощущаете сейчас.",
      yn:"скорее да"},
    {n:"IX", name:"Отшельник", glyph:"🕯",
      up:"Время уединения и честного разговора с собой. Ответ придёт не в толпе, а в тишине.",
      rev:"Изоляция вместо размышления. Не прячьтесь от людей, которые могут помочь.",
      yn:"скорее нет"},
    {n:"X", name:"Колесо Фортуны", glyph:"☸",
      up:"Поворот судьбы, удачное стечение обстоятельств. Цикл меняется в вашу пользу.",
      rev:"Ощущение, что везение отвернулось — это временно, цикл снова изменится.",
      yn:"да"},
    {n:"XI", name:"Справедливость", glyph:"⚖",
      up:"Честный расчёт и баланс. Ситуация разрешится по справедливости, если вы сами честны.",
      rev:"Несправедливое решение или уклонение от ответственности. Проверьте, где вы кривите душой.",
      yn:"скорее да"},
    {n:"XII", name:"Повешенный", glyph:"↻",
      up:"Пауза и смена угла зрения важнее немедленного действия. Отпустите контроль на время.",
      rev:"Затянувшееся бездействие из страха перемен. Пора выйти из подвешенного состояния.",
      yn:"скорее нет"},
    {n:"XIII", name:"Смерть", glyph:"⟁",
      up:"Один этап завершается, чтобы освободить место новому. Сопротивление только продлевает боль.",
      rev:"Страх перемен держит вас в отжившей ситуации. Завершение неизбежно — вопрос только во времени.",
      yn:"нет"},
    {n:"XIV", name:"Умеренность", glyph:"◇",
      up:"Баланс, терпение, постепенное смешение крайностей в гармонию. Спешка сейчас навредит.",
      rev:"Перекос в одну сторону — слишком много или слишком мало. Ищите середину.",
      yn:"скорее да"},
    {n:"XV", name:"Дьявол", glyph:"◈",
      up:"Зависимость, иллюзия отсутствия выбора, привязанность к тому, что вредит. Цепи снимаются изнутри.",
      rev:"Первый шаг к освобождению от вредной привычки или токсичной связи уже сделан.",
      yn:"нет"},
    {n:"XVI", name:"Башня", glyph:"⚡",
      up:"Резкое разрушение старой конструкции. Больно, но необходимо — на руинах строится настоящее.",
      rev:"Вы оттягиваете неизбежный крах, и напряжение только растёт. Лучше пережить удар сразу.",
      yn:"нет"},
    {n:"XVII", name:"Звезда", glyph:"★",
      up:"Надежда после трудного периода, тихое исцеление. Верьте, что худшее позади.",
      rev:"Потеря веры в лучшее. Разрешите себе маленькую надежду вместо тотального разочарования.",
      yn:"да"},
    {n:"XVIII", name:"Луна", glyph:"☽",
      up:"Не всё то, чем кажется. Прислушайтесь к смутным сигналам — интуиция видит больше фактов.",
      rev:"Иллюзии и тревога рассеиваются, правда выходит на свет.",
      yn:"скорее нет"},
    {n:"XIX", name:"Солнце", glyph:"☀",
      up:"Ясность, радость, успех, который виден всем. Один из самых благоприятных знаков в колоде.",
      rev:"Временное затишье перед тем, как свет вернётся в полную силу.",
      yn:"да"},
    {n:"XX", name:"Суд", glyph:"🎺",
      up:"Пробуждение, важное решение, подведение итогов этапа. Пора честно оценить пройденный путь.",
      rev:"Излишняя самокритика или отказ признавать собственный прогресс.",
      yn:"скорее да"},
    {n:"XXI", name:"Мир", glyph:"◯",
      up:"Завершение цикла, целостность, достигнутая цель. Всё складывается в законченную картину.",
      rev:"Ощущение незавершённости — не хватает последнего шага до финала.",
      yn:"да"}
  ];

  // ---------- App state ----------
  var PREMIUM_KEY = 'tarot_premium_until';
  var FREE_DAY_KEY = 'tarot_free_day_used';
  var YESNO_KEY = 'tarot_yesno_day';
  var YESNO_FREE_LIMIT = 3;

  var currentSpread = null;
  var currentPicks = [];
  var currentPositions = [];

  var SPREADS = {
    day:   { title:"Карта дня", hint:"Сосредоточьтесь на вопросе и коснитесь одной карты", count:1, positions:["Карта дня"], premium:false },
    yesno: { title:"Да или нет", hint:"Задайте чёткий вопрос и коснитесь карты", count:1, positions:["Ответ"], premium:false },
    three: { title:"Прошлое · Настоящее · Будущее", hint:"Коснитесь трёх карт по очереди", count:3, positions:["Прошлое","Настоящее","Будущее"], premium:true },
    five:  { title:"Расклад на отношения", hint:"Коснитесь пяти карт по очереди", count:5, positions:["Вы","Партнёр","Чувства","Риски","Итог"], premium:true }
  };

  function isPremium(){
    var until = localStorage.getItem(PREMIUM_KEY);
    if (!until) return false;
    return new Date(until).getTime() > Date.now();
  }

  function grantPremiumLocally(plan){
    var days = plan === 'year' ? 365 : 30;
    var now = Date.now();
    var base = now;
    var current = localStorage.getItem(PREMIUM_KEY);
    if (current) {
      var currentTime = new Date(current).getTime();
      if (currentTime > now) base = currentTime; // продлеваем поверх текущей подписки
    }
    var newUntil = new Date(base + days * 24 * 60 * 60 * 1000);
    localStorage.setItem(PREMIUM_KEY, newUntil.toISOString());
  }

  function usedFreeToday(){
    var today = new Date().toDateString();
    return localStorage.getItem(FREE_DAY_KEY) === today;
  }
  function markFreeUsed(){
    localStorage.setItem(FREE_DAY_KEY, new Date().toDateString());
  }

  function getYesNoCountToday(){
    var today = new Date().toDateString();
    var raw = localStorage.getItem(YESNO_KEY);
    if (!raw) return 0;
    try {
      var data = JSON.parse(raw);
      return data.date === today ? data.count : 0;
    } catch(e) { return 0; }
  }
  function incrementYesNoCount(){
    var today = new Date().toDateString();
    var count = getYesNoCountToday() + 1;
    localStorage.setItem(YESNO_KEY, JSON.stringify({ date: today, count: count }));
  }
  function yesNoRemaining(){
    return Math.max(0, YESNO_FREE_LIMIT - getYesNoCountToday());
  }

  function refreshHomeTags(){
    document.getElementById('tag-day').textContent = (!usedFreeToday() || isPremium()) ? 'бесплатно' : 'уже использовано';

    var yesnoTag = document.getElementById('tag-yesno');
    if (isPremium()) {
      yesnoTag.textContent = 'безлимит';
    } else {
      var remaining = yesNoRemaining();
      yesnoTag.textContent = remaining > 0 ? (remaining + ' из ' + YESNO_FREE_LIMIT) : 'лимит исчерпан';
    }

    var lockedCards = document.querySelectorAll('.spread-card.locked');
    lockedCards.forEach(function(el){
      var tag = el.querySelector('.spread-tag');
      if (isPremium()) { tag.textContent = 'открыто'; el.classList.remove('locked'); }
    });
  }

  // ---------- Navigation ----------
  function showScreen(id){
    document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
    document.getElementById(id).classList.add('active');
  }

  document.querySelectorAll('.spread-card').forEach(function(card){
    card.addEventListener('click', function(){
      var key = card.getAttribute('data-spread');
      openSpread(key);
    });
  });

  document.getElementById('btn-back-spread').addEventListener('click', function(){
    showScreen('screen-home');
    refreshHomeTags();
  });
  document.getElementById('btn-back-result').addEventListener('click', function(){
    showScreen('screen-home');
    refreshHomeTags();
  });

  function openSpread(key){
    var spread = SPREADS[key];

    if (spread.premium && !isPremium()) {
      openLock();
      return;
    }
    if (key === 'day' && usedFreeToday() && !isPremium()) {
      openLock();
      return;
    }
    if (key === 'yesno' && yesNoRemaining() <= 0 && !isPremium()) {
      openLock();
      return;
    }

    currentSpread = key;
    currentPicks = [];
    currentPositions = spread.positions.slice();

    document.getElementById('spread-title').textContent = spread.title;
    document.getElementById('spread-hint').textContent = spread.hint;
    buildDeck(spread.count);
    buildDots(spread.count);
    showScreen('screen-spread');
    haptic('light');
  }

  // ---------- Deck rendering ----------
  var shuffledDeck = [];

  function shuffle(arr){
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function buildDeck(count){
    shuffledDeck = shuffle(CARDS);
    var area = document.getElementById('deck-area');
    area.innerHTML = '';
    var poolSize = Math.min(12, CARDS.length);
    for (var i = 0; i < poolSize; i++) {
      area.appendChild(makeCardEl(i));
    }
  }

  function makeCardEl(poolIndex){
    var wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.dataset.poolIndex = poolIndex;

    var back = document.createElement('div');
    back.className = 'card-face card-back';

    var front = document.createElement('div');
    front.className = 'card-face card-front';

    wrap.appendChild(back);
    wrap.appendChild(front);

    wrap.addEventListener('click', function onClick(){
      if (wrap.classList.contains('picked')) return;
      pickCard(wrap, front);
      wrap.removeEventListener('click', onClick);
    });

    return wrap;
  }

  function pickCard(wrap, frontEl){
    var cardData = shuffledDeck[currentPicks.length % shuffledDeck.length];
    var reversed = Math.random() < 0.35;

    frontEl.innerHTML =
      '<div class="num">' + cardData.n + '</div>' +
      '<div class="glyph">' + cardData.glyph + '</div>' +
      '<div class="cname">' + cardData.name + '</div>' +
      '<div class="orient">' + (reversed ? 'перевёрнута' : 'прямая') + '</div>';
    if (reversed) frontEl.style.transform = 'rotateY(180deg) rotate(180deg)';

    wrap.classList.add('picked');
    haptic('medium');

    currentPicks.push({ card: cardData, reversed: reversed });
    updateDots(currentPicks.length);

    var spread = SPREADS[currentSpread];
    if (currentPicks.length >= spread.count) {
      setTimeout(function(){
        var remaining = document.querySelectorAll('#deck-area .card:not(.picked)');
        remaining.forEach(function(el){ el.classList.add('fade-out'); });
        if (currentSpread === 'day') markFreeUsed();
        if (currentSpread === 'yesno' && !isPremium()) incrementYesNoCount();
        setTimeout(function(){ showResult(); }, 350);
      }, 700);
    }
  }

  function buildDots(count){
    var wrap = document.getElementById('progress-dots');
    wrap.innerHTML = '';
    for (var i = 0; i < count; i++) {
      var d = document.createElement('span');
      wrap.appendChild(d);
    }
  }
  function updateDots(doneCount){
    var dots = document.querySelectorAll('#progress-dots span');
    dots.forEach(function(d, i){ d.classList.toggle('done', i < doneCount); });
  }

  // ---------- Result ----------
  function showResult(){
    var list = document.getElementById('result-list');
    var yesnoWrap = document.getElementById('yesno-wrap');
    list.innerHTML = '';
    yesnoWrap.innerHTML = '';

    if (currentSpread === 'yesno') {
      var pick = currentPicks[0];
      var answer = pick.reversed ? invertYesNo(pick.card.yn) : pick.card.yn;
      var banner = document.createElement('div');
      banner.className = 'yesno-banner';
      banner.textContent = capitalize(answer);
      yesnoWrap.appendChild(banner);
    }

    currentPicks.forEach(function(pick, i){
      var item = document.createElement('div');
      item.className = 'result-item';
      item.style.animationDelay = (i * 0.08) + 's';
      var meaning = pick.reversed ? pick.card.rev : pick.card.up;
      item.innerHTML =
        '<div class="pos">' + currentPositions[i] + '</div>' +
        '<h3>' + pick.card.glyph + ' ' + pick.card.name + '</h3>' +
        '<div class="orient-tag">' + (pick.reversed ? 'Перевёрнутое положение' : 'Прямое положение') + '</div>' +
        '<p>' + meaning + '</p>';
      list.appendChild(item);
    });

    renderResultCTA();
    showScreen('screen-result');
  }

  function renderResultCTA(){
    var note = document.getElementById('result-note');
    var ctaArea = document.getElementById('cta-area');
    note.style.display = 'none';
    note.textContent = '';
    ctaArea.innerHTML = '';

    function addButton(text, className, onClick){
      var btn = document.createElement('button');
      btn.className = 'btn ' + className;
      btn.textContent = text;
      btn.addEventListener('click', onClick);
      ctaArea.appendChild(btn);
      return btn;
    }

    function goHome(){
      showScreen('screen-home');
      refreshHomeTags();
    }

    if (currentSpread === 'day') {
      if (isPremium()) {
        addButton('Ещё одна карта дня', 'btn-primary', function(){ openSpread('day'); });
        addButton('На главный', 'btn-ghost', goHome);
      } else {
        note.textContent = 'Бесплатная карта дня уже использована — новая появится завтра.';
        note.style.display = 'block';
        addButton('Открыть премиум-расклады', 'btn-primary', function(){ openLock(); });
        addButton('На главный', 'btn-ghost', goHome);
      }
      return;
    }

    if (currentSpread === 'yesno') {
      if (isPremium()) {
        addButton('Задать ещё вопрос', 'btn-primary', function(){ openSpread('yesno'); });
        addButton('На главный', 'btn-ghost', goHome);
      } else {
        var remaining = yesNoRemaining();
        if (remaining > 0) {
          addButton('Задать ещё вопрос (' + remaining + ' из ' + YESNO_FREE_LIMIT + ')', 'btn-primary', function(){ openSpread('yesno'); });
          addButton('На главный', 'btn-ghost', goHome);
        } else {
          note.textContent = 'Бесплатные вопросы на сегодня закончились — новые будут завтра.';
          note.style.display = 'block';
          addButton('Открыть безлимит', 'btn-primary', function(){ openLock(); });
          addButton('На главный', 'btn-ghost', goHome);
        }
      }
      return;
    }

    // premium spreads (three / five) — always unlimited once unlocked
    var spreadKey = currentSpread;
    addButton('Сделать ещё один расклад', 'btn-primary', function(){ openSpread(spreadKey); });
    addButton('На главный', 'btn-ghost', goHome);
  }

  function invertYesNo(yn){
    var map = { 'да':'скорее нет', 'скорее да':'скорее нет', 'нет':'скорее да', 'скорее нет':'скорее да' };
    return map[yn] || yn;
  }
  function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---------- Premium lock modal ----------
  var overlay = document.getElementById('overlay-lock');
  var selectedPlan = { plan:'month', stars:150 };

  function openLock(){ overlay.classList.add('active'); }
  function closeLock(){ overlay.classList.remove('active'); }

  document.getElementById('btn-close-lock').addEventListener('click', closeLock);

  document.getElementById('stars-help-toggle').addEventListener('click', function(){
    document.getElementById('stars-help').classList.toggle('active');
  });
  overlay.addEventListener('click', function(e){ if (e.target === overlay) closeLock(); });

  document.querySelectorAll('.price-option').forEach(function(opt){
    opt.addEventListener('click', function(){
      document.querySelectorAll('.price-option').forEach(function(o){ o.classList.remove('selected'); });
      opt.classList.add('selected');
      selectedPlan = { plan: opt.dataset.plan, stars: parseInt(opt.dataset.stars, 10) };
      haptic('select');
    });
  });

  document.getElementById('btn-buy').addEventListener('click', function(){
    if (!insideTelegram) {
      alert('Оплата доступна только внутри Telegram. Откройте приложение через бота.');
      return;
    }

    var buyBtn = document.getElementById('btn-buy');
    var originalText = buyBtn.textContent;
    buyBtn.textContent = 'Загрузка...';
    buyBtn.disabled = true;

    var userId = (tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) || 0;
    var url = BACKEND_URL + '/create_invoice?plan=' + encodeURIComponent(selectedPlan.plan) +
              '&stars=' + encodeURIComponent(selectedPlan.stars) +
              '&user_id=' + encodeURIComponent(userId);

    fetch(url)
      .then(function(res){ return res.json(); })
      .then(function(data){
        buyBtn.textContent = originalText;
        buyBtn.disabled = false;

        if (!data.ok) {
          alert('Не удалось создать счёт. Попробуйте ещё раз чуть позже.');
          return;
        }

        // openInvoice открывает окно оплаты Stars прямо поверх мини-аппа,
        // не закрывая его — в отличие от sendData.
        tg.openInvoice(data.link, function(status){
          if (status === 'paid') {
            grantPremiumLocally(selectedPlan.plan);
            closeLock();
            refreshHomeTags();
            haptic('medium');
          }
          // 'cancelled' / 'failed' — просто ничего не делаем, пользователь
          // остаётся на том же экране и может попробовать снова.
        });
      })
      .catch(function(){
        buyBtn.textContent = originalText;
        buyBtn.disabled = false;
        alert('Не удалось связаться с сервером. Проверьте подключение и попробуйте снова.');
      });
  });

  // ---------- Init ----------
  (function generateStars(){
    var layer = document.getElementById('stars-layer');
    var count = 55;
    for (var i = 0; i < count; i++) {
      var dot = document.createElement('div');
      dot.className = 'star-dot';
      var size = (Math.random() * 2.2 + 0.8).toFixed(1);
      var top = (Math.random() * 100).toFixed(1);
      var left = (Math.random() * 100).toFixed(1);
      var duration = (Math.random() * 3 + 2).toFixed(1);
      var delay = (Math.random() * 4).toFixed(1);
      var minOp = (Math.random() * 0.15 + 0.08).toFixed(2);
      var maxOp = (Math.random() * 0.4 + 0.5).toFixed(2);
      dot.style.width = size + 'px';
      dot.style.height = size + 'px';
      dot.style.top = top + '%';
      dot.style.left = left + '%';
      dot.style.setProperty('--min-op', minOp);
      dot.style.setProperty('--max-op', maxOp);
      dot.style.animationDuration = duration + 's';
      dot.style.animationDelay = delay + 's';
      layer.appendChild(dot);
    }
  })();

  // ---------- Dev panel (виден только вам) ----------
  (function initDevPanel(){
    var myId = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) || null;
    var isDev = insideTelegram && myId && DEV_USER_IDS.indexOf(myId) !== -1;
    if (!isDev) return;

    var toggleBtn = document.getElementById('dev-toggle');
    var panel = document.getElementById('dev-panel');
    toggleBtn.style.display = 'flex';
    toggleBtn.style.alignItems = 'center';
    toggleBtn.style.justifyContent = 'center';

    function updateDevStatus(){
      var lines = ['Ваш ID: ' + myId];
      lines.push(isPremium() ? 'Премиум: включён' : 'Премиум: выключен');
      lines.push('Карта дня: ' + (usedFreeToday() ? 'использована' : 'доступна'));
      lines.push('Да/нет: ' + yesNoRemaining() + ' из ' + YESNO_FREE_LIMIT);
      document.getElementById('dev-status').innerHTML = lines.join('<br>');

      document.getElementById('dev-toggle-premium').textContent =
        isPremium() ? 'Выключить премиум' : 'Включить премиум (тест)';
    }

    toggleBtn.addEventListener('click', function(){
      var visible = panel.style.display === 'block';
      panel.style.display = visible ? 'none' : 'block';
      if (!visible) updateDevStatus();
    });

    document.getElementById('dev-reset-limits').addEventListener('click', function(){
      localStorage.removeItem(FREE_DAY_KEY);
      localStorage.removeItem(YESNO_KEY);
      refreshHomeTags();
      updateDevStatus();
    });

    document.getElementById('dev-toggle-premium').addEventListener('click', function(){
      if (isPremium()) {
        localStorage.removeItem(PREMIUM_KEY);
      } else {
        var farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        localStorage.setItem(PREMIUM_KEY, farFuture.toISOString());
      }
      refreshHomeTags();
      updateDevStatus();
    });

    document.getElementById('dev-clear-all').addEventListener('click', function(){
      localStorage.clear();
      refreshHomeTags();
      updateDevStatus();
    });
  })();

  refreshHomeTags();
})();
