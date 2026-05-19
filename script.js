let allData = [];       // Guarda todo o array de dados em memória
let displayedCount = 0; // Controla quantos registros já foram renderizados
const CHUNK_SIZE = 100; // Quantidade de linhas carregadas por bloco no scroll

// Estado inicial correspondente ao primeiro botão ativo
let mainCategory = 'guilds'; 
let subCategory = 'battles'; 

// Estado de ordenação
let currentSortColumn = null; 
let isAscending = false;      

async function loadData() {
    const serverElement = $('#select-server');
    const monthElement = $('#select-month');

    // PROTEÇÃO: Impede o erro de "toLowerCase of undefined" caso o DOM ainda não exista
    if (!serverElement.length || !monthElement.length) return;

    const server = (serverElement.val() || 'americas').toLowerCase().trim();
    const monthValue = (monthElement.val() || 'january').toLowerCase().trim();
    
    let monthNumber = "1";
    if (monthValue.includes("jan")) monthNumber = "1";
    else if (monthValue.includes("feb")) monthNumber = "2";
    else if (monthValue.includes("mar")) monthNumber = "3";
    else if (monthValue.includes("apr")) monthNumber = "4";

    // Mapeamento das pastas do teu GitHub: se subCategory for 'total', a subpasta é 'battlestotal'
    let folderSubName = subCategory;
    if (subCategory === 'total') {
        folderSubName = 'battlestotal';
    }

    // RESOLUÇÃO DO 404: Força a primeira letra maiúscula para as pastas raiz (Guilds / Players)
    const rootFolder = mainCategory === 'guilds' ? 'Guilds' : 'Players';

    // Montagem exata do caminho conforme o teu repositório
    const folderPath = `${rootFolder}/${server}${mainCategory}${folderSubName}`;
    const fileName = `${mainCategory} (${monthNumber}).json`;
    const finalPath = `./${folderPath}/${fileName}`;

    console.log(`[AO Ranks] Efetuando requisição em: ${finalPath}`);
    $('#total-rows').text('...');
    
    allData = [];
    displayedCount = 0;
    currentSortColumn = null;
    isAscending = false; // Começa como falso para ordenar do maior para o menor (Descendente)
    
    // Injeta a estrutura de rolagem de forma limpa na DOM
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
            $('#table-body').html('<tr><td colspan="10" style="text-align:center; padding:20px; color:#f59e0b;">Nenhum registro encontrado para este mês.</td></tr>');
            $('#total-rows').text('0');
            return;
        }

        allData = json.d;
        $('#total-rows').text(allData.length.toLocaleString('pt-BR'));

        const totalColumns = allData[0].length;
        renderHeaders(totalColumns);

        // DINÂMICO: Procura qual th tem o texto "ABATES" para saber o índice correto da coluna
        let killColumnIndex = 0;
        $('#table-head th.clickable-header').each(function() {
            if ($(this).text() === 'ABATES') {
                killColumnIndex = parseInt($(this).attr('data-col'));
            }
        });

        // Força a ordenação inicial por esta coluna encontrada (Maior número de Kills)
        currentSortColumn = killColumnIndex;
        sortDataByColumn(killColumnIndex, false);

        // Adiciona o indicador visual (setinha para baixo) na coluna de abates
        $(`th[data-col="${killColumnIndex}"]`).addClass('sort-desc');

        renderTargetRows();
        setupScrollEvent();

    } catch (err) {
        console.error(err);
        $('#total-rows').text('Error 404');
        $('#table-wrapper').html(`
            <div style="color: #f59e0b; font-family: monospace; padding: 20px; border: 1px dashed #334155; line-height: 1.5; background: #070a0f;">
                <strong>[STATUS 404 - NOT FOUND]:</strong> O arquivo de dados não foi localizado.<br><br>
                <strong>Caminho Gerado:</strong> <span style="color:#2dd4bf;">${finalPath}</span><br><br>
                <span>Verifica se as pastas no GitHub começam com maiúsculas (<b>Guilds</b> / <b>Players</b>) e se o JSON está lá dentro.</span>
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

        // PROTEÇÃO EXTRA DE TIPOS: Limpa pontos, espaços e converte para número puro
        let cleanA = String(valA).replace(/\./g, '').replace(/\s/g, '').trim();
        let cleanB = String(valB).replace(/\./g, '').replace(/\s/g, '').trim();

        let numA = Number(cleanA);
        let numB = Number(cleanB);

        // Se ambos conseguirem ser convertidos para números válidos, faz a ordenação matemática real
        if (!isNaN(numA) && !isNaN(numB)) {
            return asc ? numA - numB : numB - numA;
        }

        // Se for texto puro (Nomes), mantém a ordenação alfabética padrão
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

$(document).ready(() => {
    // Evento de mudança nos filtros select
    $('#select-server, #select-month').on('change', loadData);

    // BLINDAGEM DO CLICK DAS ABAS: Evita ler propriedades nulas de undefined
    $('.tab-btn').off('click').on('click', function() {
        if ($(this).hasClass('active')) return;

        const rawMain = $(this).attr('data-main');
        const rawSub = $(this).attr('data-sub');

        // Se por acaso faltar algum atributo no HTML, ignora para não crashar
        if (!rawMain || !rawSub) return;

        $('.tab-btn').removeClass('active');
        $(this).addClass('active');

        mainCategory = rawMain.toLowerCase().trim();
        subCategory = rawSub.toLowerCase().trim();
        
        loadData();
    });

    // Execução inicial automática ao abrir a página
    loadData();
});