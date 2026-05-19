let allData = [];       // Guarda todo o array de dados em memória
let displayedCount = 0; // Controla quantos registros já foram renderizados
const CHUNK_SIZE = 150; // Quantidade otimizada de linhas por bloco no scroll

// Estado inicial correspondente ao primeiro botão ativo
let mainCategory = 'guilds'; 
let subCategory = 'battles'; 

// Estado de ordenação global
let currentSortKey = 'ABATES'; // Por padrão, inicia ordenando pelos maiores abates
let isAscending = false;      

async function loadData() {
    const serverElement = $('#select-server');
    const monthElement = $('#select-month');

    if (!serverElement.length || !monthElement.length) return;

    const server = (serverElement.val() || 'americas').toLowerCase().trim();
    const monthValue = (monthElement.val() || 'january').toLowerCase().trim();
    
    let monthNumber = "1";
    if (monthValue.includes("jan")) monthNumber = "1";
    else if (monthValue.includes("feb")) monthNumber = "2";
    else if (monthValue.includes("mar")) monthNumber = "3";
    else if (monthValue.includes("apr")) monthNumber = "4";

    // CORREÇÃO DOS CAMINHOS BASEADO NOS TEUS PRINTS:
    // Junta exatamente: server + mainCategory (guilds/players) + battles (+ total se aplicável)
    let folderSubName = subCategory === 'total' ? 'battlestotal' : 'battles';
    const rootFolder = mainCategory === 'guilds' ? 'Guilds' : 'Players';

    const folderPath = `${rootFolder}/${server}${mainCategory}${folderSubName}`;
    const fileName = `${mainCategory} (${monthNumber}).json`;
    const finalPath = `./${folderPath}/${fileName}`;

    console.log(`[AO Ranks] Efetuando requisição em: ${finalPath}`);
    $('#total-rows').text('...');
    
    allData = [];
    displayedCount = 0;
    currentSortKey = 'ABATES'; 
    isAscending = false; 
    
    // Limpa e reconstrói a estrutura da tabela
    $('#table-wrapper').html(`
        <div class="scroll-container" id="scroll-box">
            <table id="rankTable">
                <thead id="table-head"></thead>
                <tbody id="table-body"></tbody>
            </table>
            <div id="scroll-loading" class="scroll-loader" style="display:none;">[CARREGANDO MAIS REGISTROS...]</div>
        </div>
    `);

    try {
        const response = await fetch(finalPath);
        if (!response.ok) throw new Error(`HTTP Erro: Status ${response.status}`);
        
        // Se o teu JSON vier dentro de uma chave ".d", usamos json.d, senão usamos o array direto
        const resData = await response.json();
        const rawArray = resData.d ? resData.d : resData;
        
        if (!rawArray || rawArray.length === 0) {
            $('#table-body').html('<tr><td colspan="10" style="text-align:center; padding:30px; color:#f59e0b;">Nenhum registro encontrado.</td></tr>');
            $('#total-rows').text('0');
            return;
        }

        allData = rawArray;
        $('#total-rows').text(allData.length.toLocaleString('pt-BR'));

        // Renderiza os cabeçalhos fixos da estrutura da UI
        renderHeaders();

        // Ordena inicialmente por Abates (Maior para o Menor)
        sortDataByKey(currentSortKey, false);
        $(`th[data-key="${currentSortKey}"]`).addClass('sort-desc');

        // Renderiza na tela
        renderTargetRows();
        setupScrollEvent();

    } catch (err) {
        console.error(err);
        $('#total-rows').text('Erro 404');
        $('#table-wrapper').html(`
            <div style="color: #f59e0b; font-family: monospace; padding: 25px; border: 1px dashed #334155; background: #070a0f;">
                <strong style="color:#ef4444;">[STATUS 404]:</strong> Arquivo não localizado.<br><br>
                <strong>Caminho tentado:</strong> <span style="color:#2dd4bf;">${finalPath}</span>
            </div>
        `);
    }
}

function renderHeaders() {
    let headers = '<tr><th class="clickable-header" data-key="rank" style="width: 80px; text-align: center;">RANK</th>';
    
    if (mainCategory === 'guilds') {
        if (subCategory === 'battles') {
            headers += '<th class="clickable-header" data-key="TIME">TIME</th>' +
                       '<th class="clickable-header" data-key="BATTLE ID">BATTLE ID</th>' +
                       '<th class="clickable-header" data-key="GUILDA">GUILDA</th>' +
                       '<th class="clickable-header" data-key="ABATES">ABATES</th>' +
                       '<th class="clickable-header" data-key="MORTES">MORTES</th>' +
                       '<th class="clickable-header" data-key="FAMA">FAMA</th>';
        } else {
            // GUILDS TOTAL - Apenas as 4 colunas essenciais
            headers += '<th class="clickable-header" data-key="GUILDA">GUILDA</th>' +
                       '<th class="clickable-header" data-key="ABATES">ABATES</th>' +
                       '<th class="clickable-header" data-key="MORTES">MORTES</th>' +
                       '<th class="clickable-header" data-key="FAMA">FAMA</th>';
        }
    } else {
        if (subCategory === 'battles') {
            headers += '<th class="clickable-header" data-key="TIME">TIME</th>' +
                       '<th class="clickable-header" data-key="BATTLE ID">BATTLE ID</th>' +
                       '<th class="clickable-header" data-key="JOGADOR">JOGADOR</th>' +
                       '<th class="clickable-header" data-key="GUILDA">GUILDA</th>' +
                       '<th class="clickable-header" data-key="ABATES">ABATES</th>' +
                       '<th class="clickable-header" data-key="MORTES">MORTES</th>' +
                       '<th class="clickable-header" data-key="FAMA">FAMA</th>';
        } else {
            // PLAYERS TOTAL
            headers += '<th class="clickable-header" data-key="JOGADOR">JOGADOR</th>' +
                       '<th class="clickable-header" data-key="GUILDA">GUILDA</th>' +
                       '<th class="clickable-header" data-key="ABATES">ABATES</th>' +
                       '<th class="clickable-header" data-key="MORTES">MORTES</th>' +
                       '<th class="clickable-header" data-key="FAMA">FAMA</th>';
        }
    }
    headers += '</tr>';
    $('#table-head').html(headers);
    setupHeaderClickEvents();
}

function renderTargetRows() {
    const nextChunk = allData.slice(displayedCount, displayedCount + CHUNK_SIZE);
    if (nextChunk.length === 0) return;

    let rowsHtml = '';
    
    // Pegamos a lista de chaves textuais que devem ser exibidas nesta aba
    const keysToRender = [];
    $('#table-head th.clickable-header').each(function() {
        const key = $(this).attr('data-key');
        if (key !== 'rank') keysToRender.push(key);
    });

    for (let i = 0; i < nextChunk.length; i++) {
        const globalRank = isAscending && currentSortKey !== 'rank'
            ? allData.length - (displayedCount + i)
            : displayedCount + i + 1;

        rowsHtml += `<tr><td style="color: #f59e0b; font-weight: bold; text-align: center;">#${globalRank}</td>`;
        
        const itemData = nextChunk[i];

        // Mapeamento Inteligente: Busca no objeto do JSON pela palavra correta mapeada na Th
        for (let k = 0; k < keysToRender.length; k++) {
            const currentKey = keysToRender[k];
            let val = itemData[currentKey]; // EX: itemData["ABATES"] ou itemData["GUILDA"]

            // Se o teu JSON veio mapeado com índices (Array), fazemos o fallback automático de segurança:
            if (val === undefined && Array.isArray(itemData)) {
                val = itemData[k]; 
            }

            if (val === null || val === undefined) {
                rowsHtml += '<td>-</td>';
            } else if (typeof val === 'number' && val > 999) {
                rowsHtml += `<td>${val.toLocaleString('pt-BR')}</td>`;
            } else {
                // Se for um número stringificado com pontos do Pandas, limpa e formata como número real
                let cleanStr = String(val).replace(/\./g, '').trim();
                if (!isNaN(cleanStr) && cleanStr !== '' && currentKey !== 'BATTLE ID') {
                    rowsHtml += `<td>${Number(cleanStr).toLocaleString('pt-BR')}</td>`;
                } else {
                    rowsHtml += `<td>${val}</td>`;
                }
            }
        }
        rowsHtml += '</tr>';
    }

    $('#table-body').append(rowsHtml);
    displayedCount += nextChunk.length;
}

function sortDataByKey(key, asc) {
    if (key === 'rank') {
        allData.reverse();
        return;
    }
    allData.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];

        if (valA === null || valA === undefined) valA = asc ? Infinity : -Infinity;
        if (valB === null || valB === undefined) valB = asc ? Infinity : -Infinity;

        let cleanA = String(valA).replace(/\./g, '').replace(/\s/g, '').trim();
        let cleanB = String(valB).replace(/\./g, '').replace(/\s/g, '').trim();

        let numA = Number(cleanA);
        let numB = Number(cleanB);

        if (!isNaN(numA) && !isNaN(numB)) {
            return asc ? numA - numB : numB - numA;
        }

        return asc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });
}

function setupHeaderClickEvents() {
    $('.clickable-header').off('click').on('click', function() {
        const key = $(this).attr('data-key');

        if (currentSortKey === key) {
            isAscending = !isAscending;
        } else {
            currentSortKey = key;
            isAscending = (key === 'ABATES' || key === 'FAMA' || key === 'MORTES') ? false : true;
        }

        $('.clickable-header').removeClass('sort-asc sort-desc');
        $(this).addClass(isAscending ? 'sort-asc' : 'sort-desc');

        sortDataByKey(key, isAscending);
        
        displayedCount = 0;
        $('#table-body').empty();
        $('#scroll-box').scrollTop(0);

        renderTargetRows();
    });
}

let isScrolling = false;
function setupScrollEvent() {
    $('#scroll-box').off('scroll').on('scroll', function() {
        if (isScrolling) return;

        isScrolling = true;
        requestAnimationFrame(() => {
            const scrollTop = $(this).scrollTop();
            const innerHeight = $(this).innerHeight();
            const scrollHeight = $(this).prop('scrollHeight');

            if (scrollTop + innerHeight >= scrollHeight - 100) {
                if (displayedCount < allData.length) {
                    renderTargetRows();
                }
            }
            isScrolling = false;
        });
    });
}

$(document).ready(() => {
    $('#select-server, #select-month').on('change', loadData);

    $('.tab-btn').off('click').on('click', function() {
        if ($(this).hasClass('active')) return;

        $('.tab-btn').removeClass('active');
        $(this).addClass('active');

        mainCategory = $(this).attr('data-main').toLowerCase().trim();
        subCategory = $(this).attr('data-sub').toLowerCase().trim();
        
        loadData();
    });

    loadData();
});