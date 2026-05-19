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

    // Tratamento de subpasta: se for 'total', a pasta física é 'battlestotal'
    let folderSubName = subCategory === 'total' ? 'battlestotal' : subCategory;
    
    // RESOLUÇÃO DO 404: Garante a primeira letra maiúscula das pastas raiz (Guilds / Players)
    const rootFolder = mainCategory === 'guilds' ? 'Guilds' : 'Players';

    // Montagem do caminho exato do teu repositório
    const folderPath = `${rootFolder}/${server}${mainCategory}${folderSubName}`;
    const fileName = `${mainCategory} (${monthNumber}).json`;
    const finalPath = `./${folderPath}/${fileName}`;

    console.log(`[AO Ranks] Carregando dados de: ${finalPath}`);
    $('#total-rows').text('...').attr('title', 'Aguardando resposta do servidor...');
    
    allData = [];
    displayedCount = 0;
    currentSortColumn = null;
    isAscending = false; // Falso inicia a ordenação do maior para o menor (Descendente)
    
    // Limpa e reconstrói o container de scroll de forma limpa
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
            $('#table-body').html('<tr><td colspan="10" style="text-align:center; padding:30px; color:#f59e0b;">Nenhum registro encontrado para a combinação selecionada.</td></tr>');
            $('#total-rows').text('0');
            return;
        }

        allData = json.d;
        $('#total-rows').text(allData.length.toLocaleString('pt-BR'));

        const totalColumns = allData[0].length;
        renderHeaders(totalColumns);

        // BUSCA DINÂMICA: Localiza a coluna "ABATES" no cabeçalho gerado
        let killColumnIndex = 0;
        $('#table-head th.clickable-header').each(function() {
            if ($(this).text() === 'ABATES') {
                killColumnIndex = parseInt($(this).attr('data-col'));
            }
        });

        // Aplica a ordenação focada em performance pelos maiores abates
        currentSortColumn = killColumnIndex;
        sortDataByColumn(killColumnIndex, false);

        // Aplica a classe CSS da seta descendente
        $(`th[data-col="${killColumnIndex}"]`).addClass('sort-desc');

        // Renderiza o primeiro lote na tela
        renderTargetRows();
        setupScrollEvent();

    } catch (err) {
        console.error(err);
        $('#total-rows').text('Erro 404');
        $('#table-wrapper').html(`
            <div style="color: #f59e0b; font-family: monospace; padding: 25px; border: 1px dashed #334155; line-height: 1.6; background: #070a0f;">
                <strong style="color:#ef4444;">[STATUS 404 - NOT FOUND]:</strong> Arquivo de dados ausente ou corrompido.<br><br>
                <strong>Caminho Alvo:</strong> <span style="color:#2dd4bf;">${finalPath}</span><br><br>
                <span>Certifique-se de que a estrutura de pastas no GitHub possui maiúsculas em <b>Guilds</b> ou <b>Players</b>.</span>
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

        // Limpeza profunda: remove pontos e espaços antes de forçar a conversão numérica
        let cleanA = String(valA).replace(/\./g, '').replace(/\s/g, '').trim();
        let cleanB = String(valB).replace(/\./g, '').replace(/\s/g, '').trim();

        let numA = Number(cleanA);
        let numB = Number(cleanB);

        // Se a conversão for bem sucedida, executa ordenação matemática real
        if (!isNaN(numA) && !isNaN(numB)) {
            return asc ? numA - numB : numB - numA;
        }

        // Fallback para ordenação alfabética (Nomes de guildas e players)
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
            // Colunas competitivas iniciam por padrão do maior para o menor
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

// Mecanismo de scroll otimizado usando quadros de animação do navegador (evita lag)
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
    // Evento dos seletores select
    $('#select-server, #select-month').on('change', loadData);

    // Tratamento seguro do clique das abas horizontais
    $('.tab-btn').off('click').on('click', function() {
        if ($(this).hasClass('active')) return;

        const rawMain = $(this).attr('data-main');
        const rawSub = $(this).attr('data-sub');

        if (!rawMain || !rawSub) return; // Proteção contra botões nulos

        $('.tab-btn').removeClass('active');
        $(this).addClass('active');

        mainCategory = rawMain.toLowerCase().trim();
        subCategory = rawSub.toLowerCase().trim();
        
        loadData();
    });

    // Gatilho inicial da página
    loadData();
});