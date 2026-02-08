

// 表示データオブジェクト
var obj
// チェック用エリア
var check
var url_check = false

// 全データを保持しておくための変数（絞り込み解除時に使用）
var all_data = null;

const CLIENT_ID = '735483267133-21gr8q3mdc62nqrhnvv4uju4plo94bq4.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/drive.readonly';

let tokenClient;
let gapiInited = false;
let gsiInited = false;

// 1. ライブラリ読み込みチェックと初期化
function checkLibrariesAndInit() {
    if (typeof gapi !== 'undefined' && typeof google !== 'undefined') {
        initializeGapiClient();
        initializeGsiClient();
    } else {
        // まだ読み込まれていなければ0.1秒待って再試行
        setTimeout(checkLibrariesAndInit, 100);
    }
}

async function initializeGapiClient() {
    gapi.load('client', async () => {
        await gapi.client.init({
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
        });
        gapiInited = true;
        console.log("gapiの初期化が完了しました");
    });
}

function initializeGsiClient() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (resp) => {
            if (resp.error !== undefined) {
                console.log("自動ログインに失敗しました（初回または期限切れ）");
                return;
            }
            // 💡 ログイン（または自動再認証）に成功したらデータを読み込む
            firstscript(); 
        },
    });
    gsiInited = true;
    console.log("google(GSI)の初期化が完了しました");

    // 💡 重要：リロード時にユーザーに内緒でトークンを再要求する
    // すでに一度許可していれば、これで firstscript() が走ります
    tokenClient.requestAccessToken({ prompt: 'none' });
}

// window.onload をこれに差し替え
window.onload = () => {
    checkLibrariesAndInit();
};

// ログインボタンが押された時の処理
function handleAuthClick() {
    // すでにトークンがあるか確認し、なければポップアップを表示
    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
}
let currentRequestId = 0; // 現在の最新リクエストIDを保持


function get_return_from_python(response) {
    obj = response

    //メニューのリストを作成するメソッド呼び出し
    create_menu()

    const div = document.createElement("div")
    div.setAttribute("id","div1")
    document.body.appendChild(div)
    create_disp()
}

// データの定義
const brands = ["ポッピンハート", "ミラクルムーン", "スカーレットバタフライ","プリズムストーン","クリスタルバース","ロゼッション","フラワーマーチ",
                "レインボーキャンディ","ベアベアベア","ラブマイミュージック","プリンセスリング","キューティーカラット","フューチャースクール"];
const seriesList = ["オーロラドリーム","ディアマイフューチャー","レインボーライブ", "プリパラ","プリ☆チャン","プリマジ", "aipuri"]; 
// const rarities = ["☆4", "☆3", "☆2", "スペシャル"];
const navLinks = [
    { name: "アイテムリスト", url: "https://karura1208.github.io/AipriVerse/" }
];

function create_menu(){

    // 親要素（ul）を取得
    const menuList = document.getElementById('menu_list');

    // --- A. 検索窓とボタンの作成 ---
    const searchLi = document.createElement('li');
    searchLi.style.display = 'flex'; // 横並びにする
    searchLi.style.gap = '5px';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'js-search-input';
    searchInput.placeholder = '検索...';
    searchInput.style.flex = '1';

    const searchBtn = document.createElement('button');
    searchBtn.textContent = '🔍';
    searchBtn.style.width = '40px';
    searchBtn.style.cursor = 'pointer';

    searchBtn.onclick = () => filter_and_display();

    // 検索窓にも追加
    searchInput.addEventListener('input', filter_and_display);

    searchLi.append(searchInput, searchBtn);
    menuList.appendChild(searchLi);

    // --- B. ブランド選択（開閉式 & スクロール対応） ---
    // 1. タイトル（クリックで開閉させるボタン）
    const brandTitleLi = document.createElement('li');
    brandTitleLi.className = 'menu-accordion-title';
    brandTitleLi.innerHTML = `ブランド選択 <span class="arrow">▼</span>`;
    menuList.appendChild(brandTitleLi);

    // 2. チェックボックスを入れる「入れ物」
    const brandContainer = document.createElement('ul');
    brandContainer.className = 'menu-scroll-container is-open'; // 初期は開いておく
    
    brands.forEach(brand => {
        const li = document.createElement('li');
        li.className = 'checkbox-item-img';
        li.style.width = '100%';
        li.style.boxSizing = 'border-box';

        // ラベル内にチェックボックスと画像を横並びで配置
        const label = document.createElement('label');
        label.htmlFor = `brand-${brand}`;
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '4px';
        label.style.width = '100%';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'brand';
        checkbox.value = brand;
        checkbox.id = `brand-${brand}`;
        checkbox.addEventListener('change', filter_and_display);

        const img = document.createElement('img');
        img.src = `brand/${brand}.webp`;
        img.alt = brand;
        img.className = 'menu-brand-logo';
        img.style.maxWidth = '100px';
        img.style.height = 'auto';

        label.appendChild(checkbox);
        label.appendChild(img);
        li.appendChild(label);
        brandContainer.appendChild(li);
    });
        menuList.appendChild(brandContainer);

    // 3. クリックイベント（開閉アニメーション）
    brandTitleLi.addEventListener('click', () => {
        brandContainer.classList.toggle('is-open');
        brandTitleLi.querySelector('.arrow').classList.toggle('rotated');
    });

    // --- C. シリーズ選択 (ブランドのロジックを流用) ---
    const seriesTitleLi = document.createElement('li');
    seriesTitleLi.className = 'menu-accordion-title';
    seriesTitleLi.innerHTML = `シリーズ選択 <span class="arrow">▼</span>`;
    menuList.appendChild(seriesTitleLi);

    const seriesContainer = document.createElement('ul');
    seriesContainer.className = 'menu-scroll-container is-open';

    seriesList.forEach(series => {
        const li = document.createElement('li');
        li.className = 'menu-checkbox-item'; // レアリティと同じスタイルを流用

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'series'; // 💡 フィルタリング用に名前を分ける
        checkbox.value = series;
        checkbox.id = `series-${series}`;

        // 💡 ブランドと同じイベントリスナーを追加
        checkbox.addEventListener('change', filter_and_display);

        // ラベルと画像を作成
        const label = document.createElement('label');
        label.htmlFor = `series-${series}`;
        const img = document.createElement('img');
        img.src = `series/${series}.webp`;
        img.alt = series;
        img.className = 'menu-series-logo';

        label.appendChild(img);
        li.appendChild(checkbox);
        li.appendChild(label);
        seriesContainer.appendChild(li);
    });
    menuList.appendChild(seriesContainer);

    // 開閉イベント
    seriesTitleLi.addEventListener('click', () => {
        seriesContainer.classList.toggle('is-open');
        seriesTitleLi.querySelector('.arrow').classList.toggle('rotated');
    });

    // --- D. レアリティ選択 (開閉式 & 文字チェックリスト) ---
    // 1. タイトル
    // const rarityTitleLi = document.createElement('li');
    // rarityTitleLi.className = 'menu-accordion-title';
    // rarityTitleLi.innerHTML = `レアリティ選択 <span class="arrow">▼</span>`;
    // menuList.appendChild(rarityTitleLi);

    // // 2. チェックボックスの入れ物 (スクロール対応)
    // const rarityContainer = document.createElement('ul');
    // rarityContainer.className = 'menu-scroll-container is-open'; // 初期は開く設定
    
    // rarities.forEach(r => {
    //     const li = document.createElement('li');
    //     li.className = 'menu-checkbox-item';

    //     const checkbox = document.createElement('input'); // 💡 変数を定義
    //     checkbox.type = 'checkbox';
    //     checkbox.name = 'rarity';
    //     checkbox.value = r;
    //     checkbox.id = `rarity-${r}`;

    //     // 💡 イベントを追加
    //     checkbox.addEventListener('change', filter_and_display);

    //     const label = document.createElement('label');
    //     label.htmlFor = `rarity-${r}`;
    //     label.textContent = r;

    //     li.appendChild(checkbox);
    //     li.appendChild(label);
    //     rarityContainer.appendChild(li);
    // });
    // menuList.appendChild(rarityContainer);

    // 3. 開閉イベント
    // rarityTitleLi.addEventListener('click', () => {
    //     rarityContainer.classList.toggle('is-open');
    //     rarityTitleLi.querySelector('.arrow').classList.toggle('rotated');
    // });

    // --- E. 通常のナビリンクの作成 ---
    navLinks.forEach(link => {
        const li = document.createElement('li');
        const a = document.createElement('a');
// 💡 ここでリンク先を紐づける
        a.href = link.url; 
        a.textContent = link.name;

        // 見た目を整えるためのクラス（任意）
        a.className = "menu-link";

        li.appendChild(a);
        menuList.appendChild(li);
    });

}

//スペシャルコーデ以外の時
async function create_disp(){

    // テーブルの要素をクリア
    const div_old = document.getElementById("div1")
    div_old.remove()
    div = document.createElement("div")
    div.setAttribute("id","div1")
    document.body.appendChild(div)

    //テーブル作成
    //該当箇所のアイテム数テーブルを作成
    for(var j=0;j<Object.keys(obj).length;j++){
        const itemName = Object.keys(obj)[j]; // コーデ名
        
        // ドライブに画像がない場合は、このアイテムの処理をスキップする
        if (!driveCache.has(itemName)) {
            continue; // 次のアイテムのループへ飛ぶ（テーブルを作らない）
        }

        const itemData = Object.values(obj)[j];
        const imageUrl = driveCache.get(itemName); // ドライブの画像URLを使用

        const table = document.createElement("table")
        table.border = 1
        table.style = "border-collapse: collapse; margin-bottom: 10px"
        table.width = "450"

        // ブランド画像
        img = document.createElement("img")
        img.src = "brand/"+Object.values(obj)[j].brand_name+".webp"
        img.height = "20"
        img.width = "80"

        var tr = document.createElement('tr');

        // --- 1. コーデ名（リンク）の作成 ---
        var tdName = document.createElement('td');
        tdName.colSpan = 2;
        
        var nameLink = document.createElement('a');
        nameLink.href = "javascript:void(0)"; // ページ遷移を防止
        nameLink.text = itemName;
        nameLink.style.cursor = "pointer";
        nameLink.style.textDecoration = "underline";
        nameLink.style.color = "#0000EE";

        // 💡 クリック時に子画面（モーダル）を開くイベントを設定
        nameLink.onclick = () => openModal(imageUrl, itemName);

        tdName.appendChild(nameLink);
        
        // ブランドアイコンの追加
        var brandImg = document.createElement("img");
        brandImg.src = "brand/" + itemData.brand_name + ".webp";
        brandImg.height = "20";
        brandImg.width = "80";
        tdName.appendChild(brandImg);
        
        tr.appendChild(tdName);

        // --- 2. 画像（表示のみ）の作成 ---
        var tdImg = document.createElement('td');
        tdImg.rowSpan = 4;
        var img = document.createElement("img");
        img.src = itemData.total_image; // そのまま表示
        img.height = "100";
        img.width = "70";
        tdImg.appendChild(img);
        tr.appendChild(tdImg);

        table.appendChild(tr);
        div.appendChild(table);

    }
}

//表示データの作成
function create_disp_data(ver){

    return item

}

var driveCache = new Map(); // 画像URLを保存するマップ

async function loadAllDriveImages() {
    const FOLDER_ID = '1Wzq0NdID0MmqknkPRcFJqrrzvN4YiraN'; // 必要なら指定
    try {
        let response = await gapi.client.drive.files.list({
            // 💡 ここを修正：'フォルダID' in parents を追加する
            'q': `'${FOLDER_ID}' in parents and mimeType contains 'image/' and trashed = false`,
            'fields': 'files(id, name)',
            'pageSize': 1000
        });

        const files = response.result.files;
        if (files) {
            files.forEach(file => {
                // 💡 ${file.id} を正しく使い、https かつ lh3... の形式にします
                const displayUrl = `https://lh3.googleusercontent.com/d/${file.id}`;
                
                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, ""); 
                driveCache.set(nameWithoutExt, displayUrl);
            });
       }
    } catch (err) {
        console.error("ドライブ読み込みエラー:", err);
    }
}

async function firstscript(){
    await loadAllDriveImages(); // 画像一覧を先に取得

    object={}
    object = create_disp_data(-1);
    let div_element = document.getElementById("id1");
    div_element.remove()
    get_return_from_python(object)
}

//　検索
function filter_and_display(){
// 初回実行時に全データを保存しておく
    if (all_data === null) { all_data = obj; }

    const keyword = document.getElementById('js-search-input')?.value.toLowerCase() || "";
    const selectedBrands = Array.from(document.querySelectorAll('input[name="brand"]:checked')).map(cb => cb.value);
    const selectedSeries = Array.from(document.querySelectorAll('input[name="series"]:checked')).map(cb => cb.value);
    // const selectedRarities = Array.from(document.querySelectorAll('input[name="rarity"]:checked')).map(cb => cb.value);

    // フィルタリング処理
    const filtered = {};
    Object.keys(all_data).forEach(key => {
        const item = all_data[key];
        const matchKeyword = key.toLowerCase().includes(keyword);
        const matchBrand = selectedBrands.length === 0 || selectedBrands.includes(item.brand_name);
        const matchSeries = selectedSeries.length === 0 || selectedSeries.includes(item.series);
        // const matchRarity = selectedRarities.length === 0 || selectedRarities.includes(item.rarity);

        // if (matchKeyword && matchBrand && matchRarity && matchSeries) {
        if (matchKeyword && matchBrand && matchSeries) {
            filtered[key] = item;
        }
    });

    // 💡 既存の create_disp が参照する obj を差し替えて実行
    obj = filtered; 
    create_disp();
}

// 子画面（モーダル）を表示する関数
function openModal(url, title) {
    let modal = document.getElementById("imgModal");
    
    // モーダルがなければ作成
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "imgModal";
        modal.style = `
            display: none; position: fixed; z-index: 9999; top: 0; left: 0; 
            width: 100%; height: 100%; background: rgba(0,0,0,0.8);
            justify-content: center; align-items: center; flex-direction: column;
        `;
        modal.onclick = () => modal.style.display = 'none'; // 背景クリックで閉じる
        
        const content = document.createElement("div");
        content.style = "position: relative; text-align: center;";
        
        const titleText = document.createElement("h2");
        titleText.id = "modalTitle";
        titleText.style = "color: white; margin-bottom: 10px; font-family: sans-serif;";
        
        const closeBtn = document.createElement("span");
        closeBtn.innerHTML = "&times;";
        closeBtn.style = "position: absolute; top: -40px; right: 0; color: white; font-size: 30px; cursor: pointer;";
        
        const img = document.createElement("img");
        img.id = "modalImg";
        img.style = "max-width: 90%; max-height: 80vh; border: 3px solid white; border-radius: 10px;";
        
        content.appendChild(closeBtn);
        content.appendChild(titleText);
        content.appendChild(img);
        modal.appendChild(content);
        document.body.appendChild(modal);
    }
    
    // データをセットして表示
    document.getElementById("modalImg").src = url;
    document.getElementById("modalTitle").textContent = title;
    modal.style.display = "flex";
}

// ハンバーガーメニューの開閉処理（既存）
const btn = document.getElementById('js-hamburger');
const nav = document.querySelector('.menu');

// ボタンが存在する場合のみイベントを登録（安全策）
if (btn) {
    btn.addEventListener('click', () => {
        nav.classList.toggle('is-active');
    });
}