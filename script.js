let allData = [];       // Guarda todo o array bruto em memória
let displayedCount = 0; // Quantos registros já foram injetados na tela
const CHUNK_SIZE = 100; // Tamanho de cada bloco de carregamento

// Estado das Categorias Activas (Padrão inicial)
let mainCategory = 'guilds'; 
let subCategory = 'battles'; 

// Controle de Ordenação
let currentSortColumn = null; 
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

    // NOVA REGRA DE PASTAS SOLICITADA:
    // Raiz: guilds ou players | Subpasta: americasguildsbattles, americasguildstotal, etc.
    const folderPath = `${mainCategory}/${server}${mainCategory}${subCategory}`;
    const fileName = `${mainCategory} (${monthNumber}).json`;
    const finalPath = `./${folderPath}/${fileName}`;

    console.log(`[AO Ranks] Efetuando requisição em: ${finalPath}`);
    $('#total-rows').text('...');
    
    allData = [];
    displayedCount = 0;
    currentSortColumn = null;
    isAscending = false;
    
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
            $('#table-body').html('<tr><td colspan="10" style="text-align:center; padding:20px;">Nenhum dado encontrado.</td></tr>');
            $('#total-rows').text('0');
            return;
        }

        allData = json.d;
        $('#total-rows').text(allData.length.toLocaleString('pt-BR'));

        const totalColumns = allData[0].length;
        renderHeaders(totalColumns);

        // Define coluna padrão para ordenação baseada no PvP (ABATES)
        let initialSortIndex = 0; 
        if (mainCategory === 'guilds' && totalColumns === 6) initialSortIndex = 3; 
        if (mainCategory === 'guilds' && totalColumns === 4) initialSortIndex = 1; 
        if (mainCategory === 'players' && totalColumns === 7) initialSortIndex = 4; 
        if (mainCategory === 'players' && totalColumns === 5) initialSortIndex = 2; 

        currentSortColumn = initialSortIndex;
        sortDataByColumn(initialSortIndex, false);

        $(`th[data-col="${initialSortIndex}"]`).addClass('sort-desc');

        renderTargetRows();
        setupScrollEvent();

    } catch (err) {
        console.error(err);
        $('#total-rows').text('Erro');
        $('#table-wrapper').html(`
            <div style="color: #f59e0b; font-family: monospace; padding: 20px; border: 1px dashed #334155; line-height: 1.5;">
                <strong>[STATUS 404]:</strong> Dados não localizados na nova estrutura.<br>
                <strong>Caminho Esperado:</strong> ${finalPath}
            </div>
        `);
    }
}

function renderHeaders(totalColumns) {
    let headers = '<tr><th class="clickable-header" data-col="rank" style="width: 80px; text-align: center;">RANK</th>';
    
    if (mainCategory === 'guilds') {
        if (totalColumns === 6) {
            headers += '<th class="clickable-header" data-col="0">TIME</th>' +
                       '<th class="clickable-header" data-col="1">BATTLE ID</th>' +
                       '<th class="clickable-header" data-col="2">GUILDA</th>' +
                       '<th class="clickable-header" data-col="3">ABATES</th>' +
                       '<th class="clickable-header" data-col="4">MORTES</th>' +
                       '<th class="clickable-header" data-col="5">FAMA</th>';
        } else {
            headers += '<th class="clickable-header" data-col="0">GUILDA</th>' +
                       '<th class="clickable-header" data-col="1">ABATES</th>' +
                       '<th class="clickable-header" data-col="2">MORTES</th>' +
                       '<th class="clickable-header" data-col="3">FAMA</th>';
        }
    } else {
        if (totalColumns === 7) {
            headers += '<th class="clickable-header" data-col="0">TIME</th>' +
                       '<th class="clickable-header" data-col="1">BATTLE ID</th>' +
                       '<th class="clickable-header" data-col="2">JOGADOR</th>' +
                       '<th class="clickable-header" data-col="3">GUILDA</th>' +
                       '<th class="clickable-header" data-col="4">ABATES</th>' +
                       '<th class="clickable-header" data-col="5">MORTES</th>' +
                       '<th class="clickable-header" data-col="6">FAMA</th>';
        } else {
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
    let rowsHtml = '';

    for (let i = 0; i < nextChunk.length; i++) {
        const globalRank = isAscending && currentSortColumn !== 'rank'
            ? allData.length - (displayedCount + i)
            : displayedCount + i + 1;

        let cells = `<td style="color: #f59e0b; font-weight: bold; text-align: center;">#${globalRank}</td>`;
        
        for (let j = 0; j < nextChunk[i].length; j++) {
            let val = nextChunk[i][j];
            let cleanVal = (val !== null && val !== undefined) ? val : '-';
            
            if (typeof val === 'number' && val > 999) {
                cleanVal = val.toLocaleString('pt-BR');
            }
            cells += `<td>${cleanVal}</td>`;
        }
        rowsHtml += `<tr>${cells}</tr>`;
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

function setupScrollEvent() {
    $('#scroll-box').off('scroll').on('scroll', function() {
        const scrollTop = $(this).scrollTop();
        const innerHeight = $(this).innerHeight();
        const scrollHeight = $(this).prop('scrollHeight');

        if (scrollTop + innerHeight >= scrollHeight - 50) {
            if (displayedCount < allData.length) {
                renderTargetRows();
            }
        }
    });
}

// Controle de cliques nas Abas e Sub-Abas
$(document).ready(() => {
    $('#select-server, #select-month').on('change', loadData);

    // Clique na Aba Principal (GUILDS / PLAYERS)
    $('.tab-btn').on('click', function() {
        if ($(this).hasClass('active')) return;
        $('.tab-btn').removeClass('active');
        $(this).addClass('active');

        mainCategory = $(this).attr('data-main');
        loadData();
    });

    // Clique na Sub-Aba Interna (BATTLES / TOTAL)
    $('.sub-tab-btn').on('click', function() {
        if ($(this).hasClass('active')) return;
        $('.sub-tab-btn').removeClass('active');
        $(this).addClass('active');

        subCategory = $(this).attr('data-sub');
        loadData();
    });

    loadData();
});