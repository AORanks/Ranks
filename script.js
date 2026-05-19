// Valores padrão definidos de forma explícita para evitar falhas de inicialização nula
let dt = null;
let mainCategory = 'guilds';
let subCategory = 'battles';

async function loadData() {
    // Coleta os elementos DOM de forma segura
    const serverElement = $('#select-server');
    const monthElement = $('#select-month');

    // Validação de curto-circuito para impedir erros de propriedades de objetos indefinidos
    if (!serverElement.length || !monthElement.length) {
        console.warn("[AO Ranks] Aguardando inicialização completa do DOM.");
        return;
    }

    const server = serverElement.val().toLowerCase().trim();
    const monthValue = monthElement.val().toLowerCase().trim();
    
    // Mapeamento numérico exato para corresponder à estrutura de pastas do projeto
    let monthNumber = "1";
    if (monthValue.includes("jan")) monthNumber = "1";
    else if (monthValue.includes("feb")) monthNumber = "2";
    else if (monthValue.includes("mar")) monthNumber = "3";
    else if (monthValue.includes("apr")) monthNumber = "4";

    // Concatenação de string para montagem do caminho do arquivo local
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
        
        // Renderização de aviso contendo informações úteis para diagnóstico na tela
        $('#table-wrapper').html(`
            <div style="color: #f59e0b; font-family: monospace; padding: 20px; border: 1px dashed #334155; line-height: 1.5;">
                <strong>[STATUS 404 - NOT FOUND]:</strong> O arquivo de dados não foi localizado.<br>
                <strong>Caminho Solicitado:</strong> ${finalPath}<br><br>
                <span>Certifique-se de que a pasta local e os arquivos JSON estão nomeados corretamente. Se estiver rodando localmente no navegador, use a extensão <em>Live Server</em> do VS Code para evitar bloqueios de requisições.</span>
            </div>
        `);
    }
}

function renderTable(data) {
    // Desvincula e destrói instâncias existentes do DataTables para liberar alocação de memória
    if (dt) {
        dt.destroy();
        dt = null;
    }

    // Recriação limpa do contêiner da tabela para evitar colisão de estilos e metadados de colunas antigas
    $('#table-wrapper').html(`
        <table id="rankTable" class="display nowrap" style="width:100%">
            <thead id="table-head"></thead>
            <tbody id="tableData"></tbody>
        </table>
    `);

    if (!data || data.length === 0) return;

    const totalColumns = data[0].length;
    let headers = '<tr><th>RANK</th>';
    
    // Estruturação condicional do cabeçalho de acordo com a categoria e tamanho do array interno
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

    // Injeção de linhas com processamento otimizado de loops indexados nuançados
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

    // Identificação dinâmica da coluna indexada de abates (Kills) para ordenação descendente inicial
    let sortIndex = 1;
    if (mainCategory === 'guilds' && totalColumns === 6) sortIndex = 4;
    if (mainCategory === 'players' && totalColumns === 7) sortIndex = 5;
    if (mainCategory === 'players' && totalColumns === 5) sortIndex = 3;

    // Vinculação e ativação isolada do plug-in DataTables
    dt = $('#rankTable').DataTable({
        responsive: true,
        order: [[sortIndex, "desc"]],
        pageLength: 25,
        deferRender: true,
        language: {
            search: "PROCURAR:",
            lengthMenu: "MOSTRAR _MENU_",
            info: "Registros: _TOTAL_",
            paginate: { next: "›", previous: "‹" }
        }
    });

    $('#total-rows').text(data.length.toLocaleString('pt-BR'));
}

// Configuração centralizada de escuta de eventos
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

    // Inicialização da primeira carga de dados
    loadData();
});