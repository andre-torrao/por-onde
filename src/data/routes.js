// Rotas turísticas — cada rota tem concelhos que a compõem (por ordem)
// os IDs correspondem aos slugs do GeoJSON municipalities-final.json
export const ROUTES = [
  {
    id: 'nacional-2',
    name: 'Nacional 2',
    subtitle: 'Chaves → Faro · 738 km',
    description: 'A estrada mais longa de Portugal, de norte a sul, atravessa paisagens únicas e aldeias históricas.',
    color: '#DB750F',
    icon: '🛣️',
    municipalities: [
      'chaves', 'vila-pouca-de-aguiar', 'murca', 'mirandela', 'macedo-de-cavaleiros',
      'vila-flor', 'torre-de-moncorvo', 'vila-nova-de-foz-coa', 'vila-nova-de-fozcoa',
      'figueira-de-castelo-rodrigo', 'pinhel', 'guarda', 'covilha', 'fundao',
      'castelo-branco', 'idanha-a-nova', 'proenca-a-nova', 'macao', 'gaviao',
      'ponte-de-sor', 'mora', 'evora', 'beja', 'castro-verde',
      'almodova', 'sao-bras-de-alportel', 'faro'
    ],
  },
  {
    id: 'costa-vicentina',
    name: 'Rota da Costa Vicentina',
    subtitle: 'Sagres → Caminha · Costa selvagem',
    description: 'A costa mais selvagem e preservada da Europa Ocidental, com praias desertas e paisagens dramáticas.',
    color: '#30608C',
    icon: '🌊',
    municipalities: [
      'vila-do-bispo', 'aljezur', 'odemira', 'santiago-do-cacem', 'sines',
      'alcacer-do-sal', 'grandola', 'setubal', 'palmela', 'sesimbra'
    ],
  },
  {
    id: 'rota-do-douro',
    name: 'Rota do Douro',
    subtitle: 'Porto → Miranda do Douro · Vale do Douro',
    description: 'Percorra o vale do Douro, Património Mundial da UNESCO, entre vinhas e quintas históricas.',
    color: '#631662',
    icon: '🍇',
    municipalities: [
      'porto', 'gondomar', 'penafiel', 'marco-de-canaveses', 'amarante',
      'baiao', 'resende', 'cinfaes', 'lamego', 'peso-da-regua', 'sabrosa',
      'vila-real', 'alijó', 'alijo', 'carrazeda-de-ansiaes', 'carrazeda-de-ansines',
      'vila-flor', 'mogadouro', 'miranda-do-douro'
    ],
  },
  {
    id: 'rota-do-alentejo',
    name: 'Rota do Alentejo',
    subtitle: 'Évora → Mértola · Planície e história',
    description: 'Herdades, castelos medievais e planícies douradas no coração do Alentejo profundo.',
    color: '#EDC366',
    icon: '🌾',
    municipalities: [
      'evora', 'montemor-o-novo', 'arraiolos', 'portel', 'vidigueira',
      'moura', 'serpa', 'mertola', 'alcoutim'
    ],
  },
  {
    id: 'serra-da-estrela',
    name: 'Serra da Estrela',
    subtitle: 'Seia → Manteigas · O teto de Portugal',
    description: 'O ponto mais alto de Portugal continental, com paisagens de montanha e aldeias de xisto únicas.',
    color: '#135768',
    icon: '⛰️',
    municipalities: [
      'seia', 'gouveia', 'manteigas', 'guarda', 'covilha', 'belmonte',
      'fundao', 'oleiros', 'pampilhosa-da-serra'
    ],
  },
  {
    id: 'rota-do-minho',
    name: 'Rota do Minho',
    subtitle: 'Valença → Caminha · Verde e atlântico',
    description: 'O norte mais verde de Portugal, entre o rio Minho e o Atlântico, com gastronomia e cultura únicas.',
    color: '#43c59e',
    icon: '🟢',
    municipalities: [
      'valenca', 'monção', 'moncao', 'arcos-de-valdevez', 'paredes-de-coura',
      'caminha', 'viana-do-castelo', 'esposende', 'braga', 'guimaraes',
      'barcelos', 'ponte-de-lima', 'ponte-da-barca'
    ],
  },
]
