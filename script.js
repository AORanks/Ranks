let dt = null;
let mainCategory = 'guilds';
let subCategory = 'battles';

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

    console.log(`[AO Ranks] Efetuando requisição em: ${finalPath}`);
    $('#total-rows').text('...');

    try {
        const response = await fetch(finalPath);
        if (!response.ok) throw new Error(`HTTP Erro: Status ${response.status}`);
        
        const json = await response.json();
        renderTable(json.d);
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

function renderTable(data) {
    if (dt) {
        dt.destroy();
        dt = null;
    }

    // Recriação limpa do contêiner da tabela
    $('#table-wrapper').html(`
        <table id="rankTable" class="display nowrap" style="width:100%">
            <thead id="table-head"></thead>
            <tbody id="tableData"></tbody>
        </table>
    `);

    if (!data || data.length === 0) return;

    const totalColumns = data[0].length;
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

    // Injeção de linhas acelerada em memória
    let rowsHtml = '';
    for (let i = 0; i < data.length; i++) {
        let cells = `<td style="color: #f59e0b; font-weight: bold; text-align: center;">#${i + 1}</td>`;
        for (let j = 0; j < data[i].length; j++) {
            let val = data[i][j];
            let cleanVal = (val !== null && val !== undefined) ? val : '-';
            
            if (typeof val === 'number' && val > 999) {
                cleanVal = val.toLocaleString('pt-BR');
            }
            cells += `<td>${cleanVal}</td>`;
        }
        rowsHtml += `<tr>${cells}</tr>`;
    }
    $('#tableData').html(rowsHtml);

    // Define índice de ordenação padrão (Coluna de Abates/Kills)
    let sortIndex = 1;
    if (mainCategory === 'guilds' && totalColumns === 6) sortIndex = 4;
    if (mainCategory === 'players' && totalColumns === 7) sortIndex = 5;
    if (mainCategory === 'players' && totalColumns === 5) sortIndex = 3;

    // ATIVAÇÃO DO SCROLLER PROFISSIONAL (Carregamento Dinâmico por Scroll)
    dt = $('#rankTable').DataTable({
        responsive: true,
        order: [[sortIndex, "desc"]],
        
        // Configurações críticas para Scroll Infinito de Alta Performance:
        deferRender:    true,           // Só renderiza no HTML o que está visível na tela
        scrollY:        "500px",        // Altura máxima da janela de scroll da tabela
        scrollCollapse: true,           // Ajusta a altura caso o resultado tenha menos linhas
        scroller: {
            loadingIndicator: true,     // Mostra um aviso visual sutil de "Carregando..." ao rolar rápido
            displayBuffer: 4            // Mantém um cache pequeno de segurança (calcula cerca de 100 registros por bloco)
        },
        dom: 'frti',                    // Remove os botões de paginação (1, 2, 3...) do rodapé automaticamente
        
        language: {
            search: "PROCURAR IN-LINE:",
            info: "Exibindo de _START_ a _END_ (Total: _TOTAL_ registros)",
            infoFiltered: " - filtrados de _MAX_"
        }
    });

    $('#total-rows').text(data.length.toLocaleString('pt-BR'));
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