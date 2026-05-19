let allData = [];       // Guarda todo o array de dados em memória
let displayedCount = 0; // Controla quantos registros já foram renderizados
const CHUNK_SIZE = 150; // Quantidade otimizada de linhas por bloco no scroll

// Estado inicial correspondente ao primeiro botão ativo
let mainCategory = 'guilds'; 
let subCategory = 'battles'; 

// Estado de ordenação global
let currentSortColumn = null; 
let isAscending = false;      

async function loadData() {
    const serverElement = $('#select-server');
    const monthElement = $('#select-month');

    // PROTEÇÃO: Impede falhas caso o DOM ainda esteja carregando
    if (!serverElement.length || !monthElement.length) return;

    const server = (serverElement.val() || 'americas').toLowerCase().trim();
    const monthValue = (monthElement.val() || 'january').toLowerCase().trim();
    
    let monthNumber = "1";
    if (monthValue.includes("jan")) monthNumber = "1";
    else if (monthValue.includes("feb")) monthNumber = "2";
    else if (monthValue.includes("mar")) monthNumber = "3";
    else if (monthValue.includes("apr")) monthNumber = "4";

    // Mapeamento exato das tuas pastas do GitHub
    let folderSubName = subCategory === 'total' ? 'battlestotal' : subCategory;
    const rootFolder = mainCategory === 'guilds' ? 'Guilds' : 'Players';

    // Montagem do caminho exato do teu repositório
    const folderPath = `${rootFolder}/${server}${mainCategory}${folderSubName}`;
    const fileName = `${mainCategory} (${monthNumber}).json`;
    const finalPath = `./${folderPath}/${fileName}`;

    console.log(`[AO Ranks] Puxando dados direto de: ${finalPath}`);
    $('#total-rows').text('...');
    
    allData = [];
    displayedCount = 0;
    currentSortColumn = null;
    isAscending = false; 
    
    // Reconstrói a estrutura da tabela limpando resquícios anteriores
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
        
        const json = await response.json();
        
        if (!json.d || json.d.length === 0) {
            $('#table-body').html('<tr><td colspan="10" style="text-align:center; padding:30px; color:#f59e0b;">Nenhum registro encontrado para este mês.</td></tr>');
            $('#total-rows').text('0');
            return;
        }

        allData = json.d;
        $('#total-rows').text(allData.length.toLocaleString('pt-BR'));

        // Detecta o número real de colunas do JSON injetado
        const totalColumns = allData[0].length;
        renderHeaders(totalColumns);

        // BUSCA DINÂMICA: Acha o índice real da coluna "ABATES" para alinhar a ordenação
        let killColumnIndex = 0;
        $('#table-head th.clickable-header').each(function() {
            if ($(this).text() === 'ABATES') {
                killColumnIndex = parseInt($(this).attr('data-col'));
            }
        });

        // Aplica a ordenação inicial decrescente pela coluna correta de Kills
        currentSortColumn = killColumnIndex;
        sortDataByColumn(killColumnIndex, false);

        // Adiciona a seta indicadora visual no cabeçalho
        $(`th[data-col="${killColumnIndex}"]`).addClass('sort-desc');

        // Renderiza o primeiro lote na tela de forma instantânea
        renderTargetRows();
        setupScrollEvent();

    } catch (err) {
        console.error(err);
        $('#total-rows').text('Erro 404');
        $('#table-wrapper').html(`
            <div style="color: #f59e0b; font-family: monospace; padding: 25px; border: 1px dashed #334155; background: #070a0f;">
                <strong>[STATUS 404]:</strong> O arquivo de dados não foi localizado.<br>
                Caminho: <span style="color:#2dd4bf;">${finalPath}</span>
            </div>
        `);
    }
}

function renderHeaders(totalColumns) {
    let headers = '<tr><th class="clickable-header" data-col="rank" style="width: 80px; text-align: center;">RANK</th>';
    
    if (mainCategory === 'guilds') {
        // Se tem 6 colunas, é a aba normal de Battles (Time, Battle ID, Guilda, Abates, Mortes, Fama)
        if (totalColumns === 6) {
            headers += '<th class="clickable-header" data-col="0">TIME</th>' +
                       '<th class="clickable-header" data-col="1">BATTLE ID</th>' +
                       '<th class="clickable-header" data-col="2">GUILDA</th>' +
                       '<th class="clickable-header" data-col="3">ABATES</th>' +
                       '<th class="clickable-header" data-col="4">MORTES</th>' +
                       '<th class="clickable-header" data-col="5">FAMA</th>';
        } else {
            // Se NÃO tem 6 colunas, é a tua pasta TOTAL (Estrutura direta: Guilda, Abates, Mortes, Fama)
            headers += '<th class="clickable-header" data-col="0">GUILDA</th>' +
                       '<th class="clickable-header" data-col="1">ABATES</th>' +
                       '<th class="clickable-header" data-col="2">MORTES</th>' +
                       '<th class="clickable-header" data-col="3">FAMA</th>';
        }
    } else {
        // Se tem 7 colunas, é a aba de Players Battles
        if (totalColumns === 7) {
            headers += '<th class="clickable-header" data-col="0">TIME</th>' +
                       '<th class="clickable-header" data-col="1">BATTLE ID</th>' +
                       '<th class="clickable-header" data-col="2">JOGADOR</th>' +
                       '<th class="clickable-header" data-col="3">GUILDA</th>' +
                       '<th class="clickable-header" data-col="4">ABATES</th>' +
                       '<th class="clickable-header" data-col="5">MORTES</th>' +
                       '<th class="clickable-header" data-col="6">FAMA</th>';
        } else {
            // Se NÃO tem, é a pasta de Players TOTAL (Jogador, Guilda, Abates, Mortes, Fama)
            headers += '<th class="clickable-header" data-col="0">JOGADOR</th>' +
                       '<th class="clickable-header" data-col="1">GUILDA</th>' +
                       '<th class="clickable-header" data-col="2">ABATES</th>' +
                       '<th class="clickable-header" data-col="3">MORTES</th>' +
                       '<th class="clickable-header" data-col="4">FAMA</th>';
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
    const isRankCol = currentSortColumn === 'rank';

    for (let i = 0; i < nextChunk.length; i++) {
        const globalRank = isAscending && !isRankCol
            ? allData.length - (displayedCount + i)
            : displayedCount + i + 1;

        rowsHtml += `<tr><td style="color: #f59e0b; font-weight: bold; text-align: center;">#${globalRank}</td>`;
        
        const rowData = nextChunk[i];
        for (let j = 0; j < rowData.length; j++) {
            let val = rowData[j];
            if (val === null || val === undefined) {
                rowsHtml += '<td>-</td>';
            } else if (typeof val === 'number' && val > 999) {
                rowsHtml += `<td>${val.toLocaleString('pt-BR')}</td>`;
            } else {
                rowsHtml += `<td>${val}</td>`;
            }
        }
        rowsHtml += '</tr>';
    }

    $('#table-body').append(rowsHtml);
    displayedCount += nextChunk.length;
}

function sortDataByColumn(colIndex, asc) {
    if (colIndex === 'rank') {
        allData.reverse();
        return;
    }
    allData.sort((a, b) => {
        let valA = a[colIndex];
        let valB = b[colIndex];

        if (valA === null || valA === undefined) valA = asc ? Infinity : -Infinity;
        if (valB === null || valB === undefined) valB = asc ? Infinity : -Infinity;

        // Limpa formatações para garantir ordenação numérica pura
        let cleanA = String(valA).replace(/\./g, '').replace(/\s/g, '').trim();
        let cleanB = String(valB).replace(/\./g, '').replace(/\s/g, '').trim();

        let numA = Number(cleanA);
        let numB = Number(cleanB);

        if (!isNaN(numA) && !isNaN(numB)) {
            return asc ? numA - numB : numB - numA;
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
            return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return asc ? valA - valB : valB - valA;
    });
}

function setupHeaderClickEvents() {
    $('.clickable-header').off('click').on('click', function() {
        const colAttr = $(this).attr('data-col');
        const isRank = colAttr === 'rank';
        const colIndex = isRank ? 'rank' : parseInt(colAttr);

        if (currentSortColumn === colIndex) {
            isAscending = !isAscending;
        } else {
            currentSortColumn = colIndex;
            const text = $(this).text();
            isAscending = (text === 'ABATES' || text === 'FAMA' || text === 'MORTES') ? false : true;
        }

        $('.clickable-header').removeClass('sort-asc sort-desc');
        $(this).addClass(isAscending ? 'sort-asc' : 'sort-desc');

        sortDataByColumn(colIndex, isAscending);
        
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

        const rawMain = $(this).attr('data-main');
        const rawSub = $(this).attr('data-sub');

        if (!rawMain || !rawSub) return;

        $('.tab-btn').removeClass('active');
        $(this).addClass('active');

        mainCategory = rawMain.toLowerCase().trim();
        subCategory = rawSub.toLowerCase().trim();
        
        loadData();
    });

    loadData();
});