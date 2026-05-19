let allData = [];       // Guarda todo o array bruto em memória
let displayedCount = 0; // Quantos registros já foram injetados na tela
let mainCategory = 'guilds';
let subCategory = 'battles';
const CHUNK_SIZE = 100; // Tamanho de cada bloco de carregamento

// Controle de Ordenação
let currentSortColumn = null; // Índice da coluna atualmente ordenada
let isAscending = false;      // Alternador de direção (Padrão: Descendente para Kills/Fame)

async function loadData() {
    const serverElement = $('#select-server');
    const monthElement = $('#select-month');

    if (!serverElement.length || !monthElement.length) return;

    const server = serverElement.val().toLowerCase().trim();
    const monthValue = monthElement.val().toLowerCase().trim();
    
    let monthNumber = "1";
    if (monthValue.includes("jan")) monthNumber = "1";
    else if (monthValue.includes("feb")) monthNumber = "2";
    else if (monthValue.includes("mar")) monthNumber = "3";
    else if (monthValue.includes("apr")) monthNumber = "4";

    const folderName = `${server}${mainCategory}${subCategory}`;
    const fileName = `${mainCategory} (${monthNumber}).json`;
    const finalPath = `./${folderName}/${fileName}`;

    console.log(`[AO Ranks] Buscando arquivo: ${finalPath}`);
    $('#total-rows').text('...');
    
    // Reseta o estado geral
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

        // Renderiza cabeçalhos e define qual coluna ordena automaticamente no início
        const totalColumns = allData[0].length;
        renderHeaders(totalColumns);

        // Define a ordenação padrão inicial (Kills/Abates) dependendo da estrutura do arquivo
        let initialSortIndex = 0; // Se não achar colunas, ordena pela primeira disponível
        if (mainCategory === 'guilds' && totalColumns === 6) initialSortIndex = 3; // Coluna GUILDA/ABATES ajuste
        if (mainCategory === 'guilds' && totalColumns === 4) initialSortIndex = 1;
        if (mainCategory === 'players' && totalColumns === 7) initialSortIndex = 4;
        if (mainCategory === 'players' && totalColumns === 5) initialSortIndex = 2;

        // Executa a primeira ordenação inicial (decrescente de abates) de forma silenciosa
        sortDataByColumn(initialSortIndex, false);

        // Injeta os primeiros 100
        renderTargetRows();

        // Ativa listeners de Scroll e Clique de Cabeçalho
        setupScrollEvent();
        setupHeaderClickEvents();

    } catch (err) {
        console.error(err);
        $('#total-rows').text('Erro');
        $('#table-wrapper').html(`
            <div style="color: #f59e0b; font-family: monospace; padding: 20px; border: 1px dashed #334155; line-height: 1.5;">
                <strong>[STATUS 404]:</strong> O arquivo de dados não foi localizado.<br>
                <strong>Caminho Solicitado:</strong> ${finalPath}
            </div>
        `);
    }
}

function renderHeaders(totalColumns) {
    // data-col define o índice do array correspondente àquela coluna para o motor de sort
    let headers = '<tr><th class="no-sort">RANK</th>';
    if (mainCategory === 'guilds') {
        if (totalColumns === 6) {
            headers += '<th data-col="0">TIME</th><th data-col="1">BATTLE ID</th><th data-col="2">GUILDA</th><th data-col="3">ABATES</th><th data-col="4">MORTES</th><th data-col="5">FAMA</th>';
        } else {
            headers += '<th data-col="0">GUILDA</th><th data-col="1">ABATES</th><th data-col="2">MORTES</th><th data-col="3">FAMA</th>';
        }
    } else {
        if (totalColumns === 7) {
            headers += '<th data-col="0">TIME</th><th data-col="1">BATTLE ID</th><th data-col="2">JOGADOR</th><th data-col="3">GUILDA</th><th data-col="4">ABATES</th><th data-col="5">MORTES</th><th data-col="6">FAMA</th>';
        } else {
            headers += '<th data-col="0">JOGADOR</th><th data-col="1">GUILDA</th><th data-col="2">ABATES</th><th data-col="3">MORTES</th><th data-col="4">FAMA</th>';
        }
    }
    headers += '</tr>';
    $('#table-head').html(headers);
}

// Faz o fatiamento e renderização do bloco atual
function renderTargetRows() {
    const nextChunk = allData.slice(displayedCount, displayedCount + CHUNK_SIZE);
    let rowsHtml = '';

    for (let i = 0; i < nextChunk.length; i++) {
        const globalRank = displayedCount + i + 1;
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

// Algoritmo nativo de ordenação ultraveloz rodando direto na memória
function sortDataByColumn(colIndex, asc) {
    allData.sort((a, b) => {
        let valA = a[colIndex];
        let valB = b[colIndex];

        // Se for string, padroniza caixa baixa para comparação alfabética correta
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
    });
}

function setupHeaderClickEvents() {
    // Delegação de clique apenas para os cabeçalhos que possuem o atributo data-col
    $('#table-head').on('click', 'th:not(.no-sort)', function() {
        const colIndex = parseInt($(this).attr('data-col'));

        // Se clicou na mesma coluna que já estava ordenada, inverte o sentido (Asc / Desc)
        if (currentSortColumn === colIndex) {
            isAscending = !isAscending;
        } else {
            currentSortColumn = colIndex;
            isAscending = true; // Primeira batida ordena ascendente por padrão
        }

        // Atualização visual das setinhas nos cabeçalhos
        $('th').removeClass('sort-asc sort-desc');
        $(this).addClass(isAscending ? 'sort-asc' : 'sort-desc');

        // Executa a ordenação na memória, reseta o ponteiro visual e limpa a tabela
        sortDataByColumn(colIndex, isAscending);
        
        displayedCount = 0;
        $('#table-body').empty();
        $('#scroll-box').scrollTop(0); // Volta o scroll pro topo

        // Renderiza os novos primeiros 100 registros com a nova ordem aplicada
        renderTargetRows();
    });
}

function setupScrollEvent() {
    $('#scroll-box').off('scroll').on('scroll', function() {
        const scrollTop = $(this).scrollTop();
        const innerHeight = $(this).innerHeight();
        const scrollHeight = $(this).prop('scrollHeight');

        if (scrollTop + innerHeight >= scrollHeight - 40) {
            if (displayedCount < allData.length) {
                renderTargetRows();
            }
        }
    });
}

$(document).ready(() => {
    $('#select-server, #select-month').on('change', loadData);

    $('.tab-btn').on('click', function() {
        if ($(this).hasClass('active')) return;

        $('.tab-btn').removeClass('active');
        $(this).addClass('active');

        mainCategory = $(this).attr('data-main');
        subCategory = $(this).attr('data-sub');

        loadData();
    });

    loadData();
});