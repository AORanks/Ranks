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
    // 1. Destrói completamente a instância e limpa o HTML do wrapper
    if (dt) {
        dt.destroy();
        dt = null;
    }

    // 2. Recria apenas a casca vazia da tabela (Sem carregar nenhuma linha no HTML ainda!)
    $('#table-wrapper').html(`
        <table id="rankTable" class="display nowrap" style="width:100%">
            <thead id="table-head"></thead>
        </table>
    `);

    if (!data || data.length === 0) return;

    const totalColumns = data[0].length;
    let headers = '<tr><th>RANK</th>';
    
    // 3. Define a estrutura de colunas para o DataTables mapear internamente
    let columnDefs = [
        {
            targets: 0,
            render: function (data, type, row, meta) {
                return `<span style="color: #f59e0b; font-weight: bold;">#${meta.row + 1}</span>`;
            },
            className: "dt-center"
        }
    ];

    if (mainCategory === 'guilds') {
        if (totalColumns === 6) {
            headers += '<th>TIME</th><th>BATTLE ID</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>';
        } else {
            headers += '<th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>';
        }
    } else {
        if (totalColumns === 7) {
            headers += '<th>TIME</th><th>BATTLE ID</th><th>JOGADOR</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>';
        } else {
            headers += '<th>JOGADOR</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>';
        }
    }
    headers += '</tr>';
    $('#table-head').html(headers);

    // 4. Cria a configuração de renderização de números grandes para todas as colunas de dados
    for (let i = 0; i < totalColumns; i++) {
        columnDefs.push({
            targets: i + 1,
            render: function (val) {
                if (val === null || val === undefined) return '-';
                if (typeof val === 'number' && val > 999) {
                    return val.toLocaleString('pt-BR');
                }
                return val;
            }
        });
    }

    // 5. Define qual coluna indexada vai ordenar por padrão (Coluna de Abates/Kills)
    let sortIndex = 1;
    if (mainCategory === 'guilds' && totalColumns === 6) sortIndex = 4;
    if (mainCategory === 'players' && totalColumns === 7) sortIndex = 5;
    if (mainCategory === 'players' && totalColumns === 5) sortIndex = 3;

    // 6. Inicializa passando o Array de dados brutas diretamente na propriedade 'data'
    // Desse jeito o processamento roda 100% em memória ultra rápido, renderizando só as ~15 linhas visíveis
    dt = $('#rankTable').DataTable({
        data: data,             // Passagem direta do array bruto do JSON
        columnDefs: columnDefs, // Aplica as regras de formatação e o Rank automático (#1, #2...)
        responsive: true,
        order: [[sortIndex, "desc"]],
        deferRender: true,
        scrollY: 450,
        scrollCollapse: true,
        scroller: {
            loadingIndicator: true,
            displayBuffer: 3 // Otimiza o tamanho do bloco para renderizar de 100 em 100 com perfeição
        },
        dom: 'frti',
        language: {
            search: "PROCURAR IN-LINE:",
            info: "Exibindo de _START_ a _END_ (Total: _TOTAL_ registros)",
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