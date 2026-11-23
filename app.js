const cities = {
  shanghai: { name: '上海', lat: 31.2304, lon: 121.4737 },
  beijing: { name: '北京', lat: 39.9042, lon: 116.4074 },
  taipei: { name: '台北', lat: 25.033, lon: 121.5654 },
  hongkong: { name: '香港', lat: 22.3193, lon: 114.1694 },
  tokyo: { name: '東京', lat: 35.6762, lon: 139.6503 },
};
const palette = {
  木: [['森綠', '#2FBF71'], ['青碧', '#00A6A6']],
  火: [['朱紅', '#FF3B30'], ['洋紅', '#FF2D87']],
  土: [['赭黃', '#D9A441'], ['駝棕', '#A67C52']],
  金: [['銀白', '#DADDE2'], ['香檳金', '#E6C97A']],
  水: [['墨藍', '#1E3A8A'], ['玄黑', '#111318']],
};
const $ = selector => document.querySelector(selector);
const set = (selector, value) => { $(selector).textContent = value; };
const clock = date => new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
let current = cities.shanghai;
let request;
let locationAttempt = 0;
const canUseLocalProxy = ['http:', 'https:'].includes(location.protocol)
  && ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);

function calendar() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = type => Number(parts.find(part => part.type === type).value);
  const solar = Solar.fromYmd(value('year'), value('month'), value('day'));
  const lunar = solar.getLunar();
  // 日柱包含干支兩個五行，以日干（日主）決定單一配色，使用民用午夜換日。
  const element = LunarUtil.WU_XING_GAN[lunar.getDayGan()];
  set('#element', '今日屬 ' + element);
  set('#lunar-note', '僅供參考 · 日柱 ' + lunar.getDayInGanZhi());
  $('#colors').replaceChildren(...palette[element].map(([name, hex]) => {
    const block = document.createElement('div');
    block.className = 'swatch';
    const chip = document.createElement('i');
    chip.style.setProperty('--swatch', hex);
    chip.className = name === '銀白' ? 'silver' : name === '玄黑' ? 'ink' : '';
    const text = document.createElement('div');
    const label = document.createElement('strong');
    label.textContent = name;
    const code = document.createElement('code');
    code.textContent = hex;
    text.append(label, code);
    block.append(chip, text);
    return block;
  }));
  set('#date', new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', weekday: 'short' }).format(now));
}

function condition(symbol = '') {
  if (symbol.includes('thunder')) return '雷雨';
  if (symbol.includes('sleet')) return '雨夾雪';
  if (symbol.includes('snow')) return symbol.includes('heavy') ? '大雪' : '降雪';
  if (symbol.includes('rain')) return symbol.includes('heavy') ? '大雨' : symbol.includes('light') ? '小雨' : '有雨';
  if (symbol.includes('fog')) return '有霧';
  return ({ clearsky: '晴朗', fair: '晴時多雲', partlycloudy: '多雲', cloudy: '陰天' })[symbol.split('_')[0]] || '天氣預報';
}

function apparent(temperature, humidity, wind) {
  const vapor = humidity / 100 * 6.105 * Math.exp(17.27 * temperature / (237.7 + temperature));
  return temperature + .33 * vapor - .7 * wind - 4;
}

function outfit(temperature, wet, wind, range) {
  let items;
  let summary;
  if (temperature < 5) {
    items = ['保暖羽絨外套', '發熱衣加厚針織', '保暖長褲', '保暖防滑鞋', '圍巾與手套'];
    summary = '低溫明顯，分層保暖並遮住頸部';
  } else if (temperature < 15) {
    items = ['保暖外套', '長袖針織', '直筒長褲', '包覆式休閒鞋', '薄圍巾'];
    summary = '天氣偏涼，外套搭配長袖保暖';
  } else if (temperature < 22) {
    items = ['輕薄風衣', '長袖上衣', '透氣長褲', '休閒鞋', '輕便背包'];
    summary = '涼爽舒適，外層方便隨時增減';
  } else if (temperature < 28) {
    items = ['輕薄罩衫', '透氣短袖', '輕薄長褲', '透氣休閒鞋', '遮陽帽'];
    summary = '天氣溫暖，選擇輕薄透氣材質';
  } else {
    items = ['防曬薄外套', '吸濕排汗短袖', '寬鬆短褲', '透氣休閒鞋', '遮陽帽與水壺'];
    summary = '天氣炎熱，透氣穿搭並適時補水';
  }
  if (range >= 8) summary += '，早晚留意溫差';
  if (wind >= 8) { items[0] = '防風外套'; summary += '，風勢較強'; }
  if (wet) { items[3] = '防潑水防滑鞋'; items[4] = wind >= 10 ? '雨衣' : '折疊傘'; }
  $('#umbrella').hidden = !wet;
  set('#summary', summary);
  $('#layers').replaceChildren(...items.map((item, index) => {
    const row = document.createElement('li');
    const label = document.createElement('span');
    const text = document.createElement('strong');
    label.textContent = ['外層', '上身', '下身', '鞋', '配件'][index];
    text.textContent = item;
    row.append(label, text);
    return row;
  }));
}

function chart(points) {
  const temperatures = points.map(point => point.data.instant.details.air_temperature);
  const low = Math.min(...temperatures) - 1;
  const high = Math.max(...temperatures) + 1;
  const coords = temperatures.map((temperature, index) => [12 + index / (points.length - 1) * 576, 100 - (temperature - low) / (high - low) * 80]);
  $('#chart').innerHTML = '<path class="chart-grid" d="M12 20H588M12 60H588M12 100H588"/><path class="chart-line" d="' + coords.map(([x,y], index) => (index ? 'L' : 'M') + x + ' ' + y).join(' ') + '"/><circle class="chart-point" cx="' + coords[0][0] + '" cy="' + coords[0][1] + '" r="4"/>';
  $('#chart').setAttribute('aria-label', '未來 24 小時溫度，最低 ' + Math.min(...temperatures) + ' 度，最高 ' + Math.max(...temperatures) + ' 度');
  $('#chart-labels').replaceChildren(...[0, Math.floor(points.length / 2), points.length - 1].map(index => {
    const label = document.createElement('span');
    label.textContent = clock(new Date(points[index].time)) + ' · ' + Math.round(temperatures[index]) + '°';
    return label;
  }));
}

async function load(city) {
  request?.abort();
  request = new AbortController();
  const active = request;
  current = city;
  document.body.dataset.state = 'loading';
  $('main').setAttribute('aria-busy', 'true');
  set('#city', city.name);
  for (const field of ['temperature', 'feels', 'condition', 'wind', 'humidity', 'rain', 'updated']) {
    set('#' + field, '—');
  }
  set('#range', 'H — / L —');
  set('#rain-label', '降雨');
  $('#umbrella').hidden = true;
  $('#layers').replaceChildren();
  $('#chart').replaceChildren();
  $('#chart-labels').replaceChildren();
  $('#chart').setAttribute('aria-label', '目前無溫度預報');
  set('#summary', '取得天氣資料後，這裡會顯示穿搭建議。');
  delete document.body.dataset.temperature;
  if (!canUseLocalProxy) {
    set('#status', '目前無法取得即時天氣。您仍可切換城市、主題或查看今日幸運色。');
    document.body.dataset.state = 'unavailable';
    $('main').setAttribute('aria-busy', 'false');
    return;
  }
  set('#status', '正在載入' + city.name + '天氣…');
  try {
    const endpoint = new URL('./api/weather', document.baseURI);
    endpoint.search = new URLSearchParams({ lat: city.lat, lon: city.lon });
    const response = await fetch(endpoint, { signal: AbortSignal.any([active.signal, AbortSignal.timeout(30000)]) });
    if (!response.ok) throw new Error('Weather service unavailable');
    const data = await response.json();
    if (active !== request) return;
    const series = data.properties.timeseries;
    const now = Date.now();
    const nearest = series.reduce((best, point) => Math.abs(Date.parse(point.time) - now) < Math.abs(Date.parse(best.time) - now) ? point : best);
    const points = series.filter(point => Date.parse(point.time) >= Date.parse(nearest.time) && Date.parse(point.time) <= Date.parse(nearest.time) + 86400000);
    const detail = nearest.data.instant.details;
    const next = nearest.data.next_1_hours || nearest.data.next_6_hours || nearest.data.next_12_hours;
    const chance = next?.details.probability_of_precipitation;
    const amount = next?.details.precipitation_amount;
    const symbol = next?.summary.symbol_code;
    const temperature = detail.air_temperature;
    const values = points.map(point => point.data.instant.details.air_temperature);
    set('#temperature', Math.round(temperature));
    set('#feels', Math.round(apparent(temperature, detail.relative_humidity, detail.wind_speed)) + '°');
    set('#range', 'H ' + Math.round(Math.max(...values)) + '° / L ' + Math.round(Math.min(...values)) + '°');
    set('#condition', condition(symbol));
    set('#wind', detail.wind_speed.toFixed(1) + ' m/s');
    set('#humidity', Math.round(detail.relative_humidity) + '%');
    set('#rain-label', chance == null ? '雨量' : '降雨');
    set('#rain', chance == null ? amount == null ? '—' : amount + ' mm' : Math.round(chance) + '%');
    outfit(apparent(temperature, detail.relative_humidity, detail.wind_speed), (chance ?? 0) >= 40 || (amount ?? 0) > .1 || /rain|sleet|snow/.test(symbol || ''), detail.wind_speed, Math.max(...values) - Math.min(...values));
    chart(points);
    set('#updated', clock(new Date()));
    set('#status', 'MET Norway · 預報 ' + clock(new Date(nearest.time)) + ' · 高低溫為未來 24 小時');
    document.body.dataset.state = 'ready';
    document.body.dataset.temperature = temperature;
    calendar();
  } catch (error) {
    if (active !== request || error.name === 'AbortError') return;
    document.body.dataset.state = 'error';
    set('#status', '目前無法取得即時天氣。若已啟動本機代理，請確認連線後按「更新天氣」重試。');
  } finally {
    if (active === request) $('main').setAttribute('aria-busy', 'false');
  }
}
$('#city-select').addEventListener('change', event => { locationAttempt++; load(cities[event.target.value]); });
$('#refresh').addEventListener('click', () => load(current));
$('#locate').addEventListener('click', () => {
  const attempt = ++locationAttempt;
  set('#status', '正在取得定位…');
  const failed = () => { if (attempt === locationAttempt) set('#status', '定位未取得，請從城市選單選擇，預設為上海'); };
  if (!navigator.geolocation) return failed();
  navigator.geolocation.getCurrentPosition(position => {
    if (attempt !== locationAttempt) return;
    load({ name: '目前位置', lat: position.coords.latitude, lon: position.coords.longitude });
  }, failed, { timeout: 10000, maximumAge: 300000 });
});
calendar();
load(current);
setInterval(calendar, 60000);
