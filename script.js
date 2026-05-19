let allData = [];       // Guarda todo o array bruto em memória
let displayedCount = 0; // Quantos registros já foram injetados na tela
let mainCategory = 'guilds';
let subCategory = 'battles';
const CHUNK_SIZE = 100; // Tamanho exato de cada bloco de carregamento

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
    
    // Reseta o estado do scroll e esvazia o container antigo
    allData = [];
    displayedCount = 0;
    
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

        // Armazena todos os dados brutos recebidos
        allData = json.d;
        $('#total-rows').text(allData.length.toLocaleString('pt-BR'));

        // Renderiza a estrutura do cabeçalho
        renderHeaders(allData[0].length);

        // Carrega o primeiro bloco inicial de 100 registros instantaneamente
        loadNextRows();

        // Ativa o evento de detecção de scroll da caixinha terminal
        setupScrollEvent();

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
    let headers = '<tr><th>RANK</th>';
    if (mainCategory === 'guilds') {
        headers += (totalColumns === 6)
            ? '<th>TIME</th><th>BATTLE ID</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>'
            : '<th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>';
    } else {
        headers += (totalColumns === 7)
            ? '<th>TIME</th><th>BATTLE ID</th><th>JOGADOR</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>'
            : '<th>JOGADOR</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>';
    }
    headers += '</tr>';
    $('#table-head').html(headers);
}

function loadNextRows() {
    if (displayedCount >= allData.length) return;

    $('#scroll-loading').show();

    // Captura a próxima fatia (slice) de 100 registros da memória
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

    // Anexa as novas linhas sem apagar ou remontar o que já estava na tela
    $('#table-body').append(rowsHtml);
    displayedCount += nextChunk.length;

    $('#scroll-loading').hide();
}

function setupScrollEvent() {
    // Monitora a rolagem vertical interna do container do terminal
    $('#scroll-box').on('scroll', function() {
        const scrollTop = $(this).scrollTop();
        const innerHeight = $(this).innerHeight();
        const scrollHeight = $(this).prop('scrollHeight');

        // Se o usuário chegou a 40px do fim da rolagem, injeta mais 100 registros imediatamente
        if (scrollTop + innerHeight >= scrollHeight - 40) {
            loadNextRows();
        }
    });
}

// Escuta de eventos das abas e seletores
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

    // Início automático da primeira carga
    loadData();
});