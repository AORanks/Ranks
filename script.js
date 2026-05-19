let table = null;

async function carregar() {
    const srv = $('#srv').val();
    const cat = $('#cat').val();
    const tipo = $('#tipo').val();
    const mes = $('#mes').val();

    // Rota direta: ./americasguildsbattles/guilds (1).json
    const path = `./${srv}${cat}${tipo}/${cat} (${mes}).json`;

    try {
        const response = await fetch(path);
        const json = await response.json();
        MontarTabela(json.d, cat, tipo);
    } catch (err) {
        console.error("Erro ao carregar arquivo:", err);
    }
}

function MontarTabela(dados, cat, tipo) {
    // Destrói a tabela antiga para não dar conflito de colunas
    if (table) {
        table.destroy();
        $('#thead').empty();
        $('#tbody').empty();
    }

    // Define cabeçalho simples baseado na escolha
    let cols = '<tr><th>RANK</th>';
    if (cat === 'guilds') {
        cols += (tipo === 'battles') 
            ? '<th>TIME</th><th>BATTLE ID</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>'
            : '<th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>';
    } else {
        cols += (tipo === 'battles')
            ? '<th>TIME</th><th>BATTLE ID</th><th>JOGADOR</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>'
            : '<th>JOGADOR</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>';
    }
    cols += '</tr>';
    $('#thead').html(cols);

    // Injeta as linhas
    let linhas = '';
    dados.forEach((row, i) => {
        let celulas = `<td>#${i + 1}</td>`;
        row.forEach(val => {
            celulas += `<td>${val !== null ? val.toLocaleString('pt-BR') : '-'}</td>`;
        });
        linhas += `<tr>${celulas}</tr>`;
    });
    $('#tbody').html(linhas);

    // Inicializa o DataTables de forma limpa
    table = $('#rankTable').DataTable({
        responsive: true,
        pageLength: 25,
        language: { search: "BUSCAR:" }
    });
}

// Gatilho de inicialização
$(document).ready(() => {
    $('select').on('change', carregar);
    carregar();
});