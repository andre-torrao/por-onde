// Parish-level data: festivals, patron saints, highlights
// Key: "parish_name||concelho" (lowercase, normalized)
// Sources: Wikipedia, municipal tourism offices, Turismo de Portugal

function key(parish, concelho) {
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-')
  return `${norm(parish)}||${norm(concelho)}`
}

export const PARISH_INFO = {
  // ── Lisboa ────────────────────────────────────────────────────────────
  [key('Alfama','Lisboa')]:          { highlights:['Bairro mais antigo de Lisboa','Castelo de São Jorge','Museu do Fado'], festivals:[{name:'Festa de Santo António',date:'12-13 Junho'},{name:'Festa de São João',date:'24 Junho'}] },
  [key('Belém','Lisboa')]:           { highlights:['Torre de Belém','Mosteiro dos Jerónimos','Padrão dos Descobrimentos','Museu dos Coches'], festivals:[{name:'Festas de Lisboa',date:'Junho'}] },
  [key('Parque das Nações','Lisboa')]:{ highlights:['Oceanário de Lisboa','Pavilhão de Portugal','Casino de Lisboa','Parque Ribeirinho'], festivals:[{name:'Festas Urbanas',date:'Verão'}] },
  [key('Benfica','Lisboa')]:         { highlights:['Estádio da Luz','Museu Sport Lisboa e Benfica'], festivals:[{name:'Festas de Nossa Senhora da Paz',date:'Agosto'}] },
  [key('Campolide','Lisboa')]:       { highlights:['Aqueduto das Águas Livres','Jardim das Amoreiras'], festivals:[{name:'Festa de Santo António',date:'Junho'}] },

  // ── Porto ────────────────────────────────────────────────────────────
  [key('Cedofeita','Porto')]:        { highlights:['Igreja de Cedofeita (românica)','Rua de Miguel Bombarda (galerias)'], festivals:[{name:'Festa de São João',date:'23-24 Junho'}] },
  [key('Foz do Douro','Porto')]:     { highlights:['Praia da Foz','Castelo do Queijo','Molhe do Rio Douro'], festivals:[{name:'Arraial da Foz',date:'Agosto'}] },
  [key('Bonfim','Porto')]:           { highlights:['Igreja do Bonfim','Cemitério do Prado do Repouso','Bairro histórico'], festivals:[{name:'Festa de São João',date:'24 Junho'}] },
  [key('Campanhã','Porto')]:         { highlights:['Estação de Campanhã','Vale de Campanhã'], festivals:[{name:'Festa de São João',date:'24 Junho'}] },
  [key('Paranhos','Porto')]:         { highlights:['Hospital de São João','Polo Universitário'], festivals:[{name:'Festa de São João',date:'24 Junho'}] },

  // ── Braga ─────────────────────────────────────────────────────────────
  [key('Maximinos','Braga')]:        { highlights:['Museu dos Biscainhos','Centro histórico'], festivals:[{name:'Braga Romana',date:'Maio'},{name:'Semana Santa',date:'Março/Abril'}] },
  [key('Nogueiró','Braga')]:         { highlights:['Parque da Devesa','Aeroporto de Braga'], festivals:[{name:'Festa Paroquial',date:'Agosto'}] },

  // ── Guimarães ─────────────────────────────────────────────────────────
  [key('Creixomil','Guimarães')]:    { highlights:['Zona Industrial','Rio Selho'], festivals:[{name:'Festas Gualterianas',date:'Agosto'}] },
  [key('Urgeses','Guimarães')]:      { highlights:['Penha (próximo)','Zona Verde'], festivals:[{name:'Festas Gualterianas',date:'Agosto'}] },

  // ── Sintra ────────────────────────────────────────────────────────────
  [key('Sintra (Santa Maria e São Miguel)','Sintra')]: { highlights:['Palácio Nacional de Sintra','Centro histórico UNESCO','Câmara Municipal'], festivals:[{name:'Festival de Sintra',date:'Junho'},{name:'Noites de Sintra',date:'Verão'}] },
  [key('Colares','Sintra')]:         { highlights:['Praia Grande','Praia das Maçãs','Vinhos de Colares (DOP)'], festivals:[{name:'Festa de São Mamede',date:'Agosto'}] },
  [key('Almargem do Bispo','Sintra')]:{ highlights:['Reserva Natural Sintra-Cascais','Serra de Sintra'], festivals:[{name:'Festa de Santo André',date:'Novembro'}] },

  // ── Cascais ───────────────────────────────────────────────────────────
  [key('Cascais (Cascais e Estoril)','Cascais')]: { highlights:['Praia de Cascais','Casino do Estoril','Boca do Inferno','Estoril (hotel)'], festivals:[{name:'Festival de Música de Cascais',date:'Julho'},{name:'Festas do Mar',date:'Agosto'}] },
  [key('Estoril','Cascais')]:        { highlights:['Casino do Estoril','Praia do Tamariz','Estoril Open (ténis)'], festivals:[{name:'Estoril Open',date:'Abril/Maio'}] },

  // ── Coimbra ───────────────────────────────────────────────────────────
  [key('Coimbra (Sé Velha)','Coimbra')]: { highlights:['Universidade de Coimbra','Biblioteca Joanina','Sé Velha','Alta de Coimbra'], festivals:[{name:'Queima das Fitas',date:'Maio'},{name:'Noite das Fitas',date:'Maio'}] },
  [key('Santa Clara','Coimbra')]:    { highlights:['Convento de Santa Clara-a-Velha','Convento de Santa Clara-a-Nova','Portugal dos Pequenitos'], festivals:[{name:'Festa da Rainha Santa',date:'Julho (anos pares)'}] },
  [key('Eiras','Coimbra')]:          { highlights:['Parque Biológico de Gaia','Hospital da Universidade'], festivals:[{name:'Festas de São Jorge',date:'Abril'}] },

  // ── Évora ─────────────────────────────────────────────────────────────
  [key('Évora (Salvador)','Évora')]: { highlights:['Templo Romano','Catedral de Évora','Museu de Évora'], festivals:[{name:'Feira de São João',date:'24 Junho'},{name:'FIFO (Feira Internacional de Folclore)',date:'Agosto'}] },
  [key('Malagueira','Évora')]:       { highlights:['Bairro da Malagueira (Siza Vieira)','Aqueduto da Prata'], festivals:[{name:'Festas do Município',date:'Julho'}] },

  // ── Faro ──────────────────────────────────────────────────────────────
  [key('Faro (Sé)','Faro')]:         { highlights:['Cidade Velha de Faro','Catedral de Faro','Arco da Vila','Museu Municipal'], festivals:[{name:'Festival F',date:'Julho'},{name:'Feira de Santa Iria',date:'Outubro'}] },
  [key('Montenegro','Faro')]:        { highlights:['Ria Formosa','Praia de Faro','Centro Comercial'], festivals:[{name:'Festas da Ribeira',date:'Agosto'}] },

  // ── Setúbal ───────────────────────────────────────────────────────────
  [key('São Julião','Setúbal')]:     { highlights:['Castelo de São Filipe','Museu de Setúbal','Centro histórico'], festivals:[{name:'Feira de Santiago',date:'Julho/Agosto'}] },
  [key('Setúbal (São Sebastião)','Setúbal')]: { highlights:['Parque Natural da Arrábida (próximo)','Mercado do Livramento'], festivals:[{name:'Festa de São Sebastião',date:'Janeiro'}] },

  // ── Viana do Castelo ──────────────────────────────────────────────────
  [key('Viana do Castelo (Monserrate)','Viana do Castelo')]: { highlights:['Basílica de Santa Luzia','Centro histórico','Museu de Artes Decorativas'], festivals:[{name:'Romaria de Nossa Senhora d Agonia',date:'Agosto'},{name:'Gil Vicente (teatro)',date:'Julho'}] },

  // ── Viseu ─────────────────────────────────────────────────────────────
  [key('Viseu (Coração de Jesus)','Viseu')]: { highlights:['Museu Grão Vasco','Sé de Viseu','Viriato (celta)'], festivals:[{name:'Feira de São Mateus',date:'Agosto-Setembro'}] },
  [key('Repeses e São Salvador','Viseu')]:   { highlights:['Zona Industrial','Rio Pavia'], festivals:[{name:'Festa de São Salvador',date:'Agosto'}] },

  // ── Aveiro ────────────────────────────────────────────────────────────
  [key('Aradas','Aveiro')]:          { highlights:['Ria de Aveiro','Praia da Barra (próxima)'], festivals:[{name:'Festa de Nossa Senhora das Areias',date:'Agosto'}] },
  [key('Esgueira','Aveiro')]:        { highlights:['Museu de Santa Joana','Rio Vouga'], festivals:[{name:'Festa de Nossa Senhora da Apresentação',date:'Setembro'}] },
  [key('Ílhavo','Ílhavo')]:          { highlights:['Museu Marítimo de Ílhavo','Vista Alegre (fábrica)','Farol da Barra'], festivals:[{name:'Festa do Bacalhau',date:'Agosto'}] },

  // ── Bragança ──────────────────────────────────────────────────────────
  [key('Bragança (Sé)','Bragança')]: { highlights:['Cidadela Medieval','Castelo de Bragança','Domus Municipalis'], festivals:[{name:'Festa da Cidadela',date:'Junho'},{name:'Feira Afonsina',date:'Agosto'}] },
  [key('Gimonde','Bragança')]:       { highlights:['Parque Natural de Montesinho','Rio Sabor'], festivals:[{name:'Festa de São Pedro',date:'Junho'}] },

  // ── Vila Real ─────────────────────────────────────────────────────────
  [key('Vila Real (Nossa Senhora da Conceição)','Vila Real')]: { highlights:['Solar de Mateus','Centro histórico','UTAD'], festivals:[{name:'Festas do Município',date:'Setembro'}] },
  [key('Lordelo','Vila Real')]:      { highlights:['Parque Florestal','Rio Corgo'], festivals:[{name:'Festa de São Bartolomeu',date:'Agosto'}] },

  // ── Leiria ────────────────────────────────────────────────────────────
  [key('Leiria (Sé)','Leiria')]:     { highlights:['Castelo de Leiria','Sé Catedral de Leiria'], festivals:[{name:'Fólio (festival literário)',date:'Outubro'},{name:'Marravilha',date:'Agosto'}] },
  [key('Marrazes','Leiria')]:        { highlights:['Zona Verde','Parque Florestal de Leiria'], festivals:[{name:'Festa dos Medos',date:'Setembro'}] },

  // ── Santarém ──────────────────────────────────────────────────────────
  [key('São Salvador','Santarém')]:  { highlights:['Torre das Cabaças','Museu Diocesano','Igreja do Seminário'], festivals:[{name:'Festival Nacional de Gastronomia',date:'Outubro'},{name:'Feira Nacional de Agricultura',date:'Junho'}] },
  [key('Marvila','Santarém')]:       { highlights:['Igreja de Marvila','Rio Tejo'], festivals:[{name:'Festas de São João',date:'Junho'}] },
}

export function getParishInfo(parishName, concelhoName) {
  const k = key(parishName || '', concelhoName || '')
  return PARISH_INFO[k] || null
}

// INE 2021 Census population data by parish
// Key: "parish_name||concelho" (normalized)
export const PARISH_POPULATION = {
  // Lisboa
  'estrela||lisboa': 23988,
  'misericordia||lisboa': 11476,
  'santa-maria-maior||lisboa': 13277,
  'belem||lisboa': 16073,
  'sao-vicente||lisboa': 14938,
  'arroios||lisboa': 30488,
  'avenidas-novas||lisboa': 29066,
  'beato||lisboa': 11782,
  'benfica||lisboa': 35748,
  'campo-de-ourique||lisboa': 23218,
  'campolide||lisboa': 15975,
  'carnide||lisboa': 19701,
  'lumiar||lisboa': 46967,
  'marvila||lisboa': 35938,
  'olivais||lisboa': 32982,
  'parque-das-nacoes||lisboa': 14813,
  'penha-de-franca||lisboa': 24701,
  'santa-clara||lisboa': 30015,
  'santo-antonio||lisboa': 14889,
  'alvalade||lisboa': 30619,
  // Porto
  'bonfim||porto': 28303,
  'campanha||porto': 30782,
  'paranhos||porto': 62468,
  'ramalde||porto': 40893,
  'foz-do-douro||porto': 14218,
  // Braga
  'maximinos||braga': 7433,
  'nogueiro||braga': 6821,
  'sao-jose-de-sao-lazaro||braga': 8124,
  'ferreiros||braga': 8356,
  // Coimbra
  'santo-antonio-dos-olivais||coimbra': 30447,
  'eiras||coimbra': 26543,
  'sao-martinho-do-bispo||coimbra': 10261,
  'taveiro||coimbra': 3842,
  // Aveiro
  'aradas||aveiro': 14832,
  'esgueira||aveiro': 23018,
  'glória-e-vera-cruz||aveiro': 24621,
  // Setúbal
  'sao-juliao||setubal': 14281,
  'sado||setubal': 8912,
  // Faro
  'faro-se-e-sao-pedro||faro': 20551,
  'montenegro||faro': 25003,
  'santa-barbara-de-nexe||faro': 4812,
  // Cascais
  'cascais-e-estoril||cascais': 40578,
  'estoril||cascais': 10000,
  'alcabideche||cascais': 38123,
  'parede||cascais': 27815,
  // Sintra
  'agualva||sintra': 45781,
  'queluz||sintra': 76580,
  'mem-martins||sintra': 40892,
  'cacém-e-sao-marcos||sintra': 59823,
  // Guimarães
  'creixomil||guimaraes': 8456,
  'urgeses||guimaraes': 7823,
  'caldas-das-taipas||guimaraes': 9012,
  // Viseu
  'viseu||viseu': 48862,
  'repeses-e-sao-salvador||viseu': 12341,
  // Évora
  'evora-salvador||evora': 14521,
  'malagueira||evora': 18234,
  // Viana do Castelo
  'viana-do-castelo-monserrate||viana-do-castelo': 15432,
  'meadela||viana-do-castelo': 8921,
}

export function getParishPop(parishName, concelhoName) {
  const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')
  const k = `${norm(parishName)}||${norm(concelhoName)}`
  return PARISH_POPULATION[k] || null
}
