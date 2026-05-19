let dt = null;

async function loadData() {
    const server = $('#select-server').val().toLowerCase().trim(); 
    const mainCategory = $('#select-type').val().toLowerCase().trim(); // 'guilds' ou 'players'
    const subCategory = $('#select-mode').val().toLowerCase().trim(); // 'battles' ou 'battlestotal'
    const monthValue = $('#select-month').val().toLowerCase().trim(); 
    
    // Mapeamento numérico dos arquivos (1, 2, 3, 4)
    let monthNumber = "1";
    if (monthValue.includes("jan")) monthNumber = "1";
    else if (monthValue.includes("feb")) monthNumber = "2";
    else if (monthValue.includes("mar")) monthNumber = "3";
    else if (monthValue.includes("apr")) monthNumber = "4";

    // Constrói a rota exata da pasta local (ex: ./americasguildsbattles)
    const folderName = `${server}${mainCategory}${subCategory}`;
    const fileName = `${mainCategory} (${monthNumber}).json`;
    const finalPath = `./${folderName}/${fileName}`;

    $('#total-rows').text('Carregando...');

    try {
        const response = await fetch(finalPath);
        
        if (!response.ok) {
            throw new Error(`Arquivo não localizado em: ${finalPath}`);
        }
        
        const json = await response.json();
        
        if (!json.d || json.d.length === 0) {
            throw new Error("Propriedade de dados ('d') vazia ou inválida.");
        }

        render(json.d, mainCategory, subCategory);
        
    } catch (err) {
        console.error(err);
        $('#total-rows').text('Erro');
        $('#top-name').text('---');
        $('#table-head').html(`<tr><th>Status: Arquivo offline</th></tr>`);
        $('#tableData').html(`<tr><td style="color:#ff6b6b; padding:20px;">${err.message}</td></tr>`);
    }
}

function render(data, mainCategory, subCategory) {
    if (dt) {
        dt.destroy();
        $('#tableData').empty();
    }
    
    // Configuração dos Cabeçalhos Dinâmicos
    let headersHtml = '<tr><th>RANK</th>';
    if (mainCategory === 'guilds') {
        if (subCategory === 'battles') {
            headersHtml += `<th>TIME</th><th>BATTLE ID</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>`;
        } else {
            headersHtml += `<th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>`;
        }
    } else { 
        if (subCategory === 'battles') {
            headersHtml += `<th>TIME</th><th>BATTLE ID</th><th>JOGADOR</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>`;
        } else {
            headersHtml += `<th>JOGADOR</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>`;
        }
    }
    headersHtml += '</tr>';
    $('#table-head').html(headersHtml);

    // Injeção das Linhas
    let rows = '';
    data.forEach((row, i) => {
        let cells = `<td class="font-bold text-center">#${i+1}</td>`;
        
        row.forEach(value => {
            let displayValue = (value !== null && value !== undefined) ? value : '-';
            if (typeof value === 'number' && !isNaN(value) && value > 100) {
                displayValue = value.toLocaleString();
            }
            cells += `<td>${displayValue}</td>`;
        });

        rows += `<tr class="hover:bg-slate-800/50 transition">${cells}</tr>`;
    });
    $('#tableData').html(rows);
    
    // Define índice de ordenação automática (Coluna de Abates/Kills)
    let defaultSortIndex = 2; 
    if (mainCategory === 'guilds' && subCategory === 'battles') defaultSortIndex = 4;
    if (mainCategory === 'players' && subCategory === 'battles') defaultSortIndex = 5;
    if (mainCategory === 'players' && subCategory === 'battlestotal') defaultSortIndex = 3;

    // Inicialização do DataTables
    dt = $('#rankTable').DataTable({
        responsive: true,
        order: [[defaultSortIndex, "desc"]],
        pageLength: 50,
        language: { 
            search: "PROCURAR:",
            lengthMenu: "MOSTRAR _MENU_",
            info: "Mostrando _TOTAL_ registros",
            paginate: {
                first: "«",
                last: "»",
                next: "›",
                previous: "‹"
            }
        }
    });

    // Atualiza cards informativos superiores
    if (data[0] && data[0][0]) {
        let topNameIndex = (subCategory === 'battles') ? 2 : 0; 
        $('#top-name').text(data[0][topNameIndex] || data[0][0]);
    }
    $('#total-rows').text(data.length.toLocaleString());
}

// Inicialização e gatilhos de mudança via jQuery
$(document).ready(() => {
    // Qualquer alteração nos seletores recarrega os dados imediatamente
    $('#select-server, #select-type, #select-mode, #select-month').on('change', () => {
        loadData();
    });

    loadData();
});