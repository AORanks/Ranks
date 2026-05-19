let dt = null;
let mainCategory = 'guilds';
let subCategory = 'battles';

async function loadData() {
    const serverElement = $('#select-server');
    const monthElement = $('#select-month');

    // Impede qualquer erro de inicialização prematura do DOM
    if (!serverElement.length || !monthElement.length) return;

    const server = serverElement.val().toLowerCase().trim();
    const monthValue = monthElement.val().toLowerCase().trim();
    
    let monthNumber = "1";
    if (monthValue.includes("jan")) monthNumber = "1";
    else if (monthValue.includes("feb")) monthNumber = "2";
    else if (monthValue.includes("mar")) monthNumber = "3";
    else if (monthValue.includes("apr")) monthNumber = "4";

    // Caminho relativo ideal para o ambiente do GitHub Pages
    const folderName = `${server}${mainCategory}${subCategory}`;
    const fileName = `${mainCategory} (${monthNumber}).json`;
    const finalPath = `./${folderName}/${fileName}`;

    console.log(`[AO Ranks] Requisição para: ${finalPath}`);
    $('#total-rows').text('...');

    try {
        const response = await fetch(finalPath);
        if (!response.ok) throw new Error(`Não pôde obter resposta HTTP estável.`);
        
        const json = await response.json();
        renderTable(json.d);
    } catch (err) {
        console.error(err);
        $('#total-rows').text('Erro');
        
        // Exibição visual limpa caso falte alguma pasta no repositório
        $('#table-wrapper').html(`
            <div style="color: #f59e0b; font-family: monospace; padding: 20px; border: 1px dashed #334155;">
                <strong>[STATUS 404]:</strong> Banco de dados offline ou arquivo não localizado.<br>
                <strong>Caminho verificado:</strong> ${finalPath}
            </div>
        `);
    }
}

function renderTable(data) {
    // Destruição total da instância do DataTables da memória para liberar performance
    if (dt) {
        dt.destroy();
        dt = null;
    }

    // Recria a estrutura pura da tabela no HTML eliminando caches antigos
    $('#table-wrapper').html(`
        <table id="rankTable" class="display nowrap" style="width:100%">
            <thead id="table-head"></thead>
            <tbody id="tableData"></tbody>
        </table>
    `);

    if (!data || data.length === 0) return;

    // Cabeçalhos flexíveis baseados na contagem do array de dados
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

    // Constrói linhas usando concatenação limpa de strings
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

    // Define índice padrão para ordenação (Coluna de Kills)
    let sortIndex = 1;
    if (mainCategory === 'guilds' && totalColumns === 6) sortIndex = 4;
    if (mainCategory === 'players' && totalColumns === 7) sortIndex = 5;
    if (mainCategory === 'players' && totalColumns === 5) sortIndex = 3;

    // Ativação precisa do Scroller (Carrega blocos conforme rola)
    dt = $('#rankTable').DataTable({
        responsive: true,
        order: [[sortIndex, "desc"]],
        deferRender: true,
        scrollY: 450, // Altura vertical física da tabela
        scrollCollapse: true,
        scroller: {
            loadingIndicator: true,
            displayBuffer: 4 // Mantém fatias de dados balanceadas de cerca de 100 registros na visão do DOM
        },
        dom: 'frti', // Oculta barra clássica de paginação sequencial (1, 2, 3...)
        language: {
            search: "BUSCAR:",
            info: "Registros: _START_ até _END_ de _TOTAL_",
            infoFiltered: ""
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