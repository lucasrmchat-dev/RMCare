import { Neighborhood } from '../types';

export const PARNAMIRIM_NEIGHBORHOODS: Neighborhood[] = [
  {
    id: 'passagem-de-areia',
    name: 'Passagem de Areia',
    color: '#3C4D6B',
    highlightColor: '#53688F',
    path: 'M 172,310 L 246,285 L 246,370 L 222,416 L 172,310 Z',
    center: { x: 215, y: 350 },
    description: 'Bairro residencial ao oeste com forte vínculo comunitário e comércio local.'
  },
  {
    id: 'nova-parnamirim',
    name: 'Nova Parnamirim',
    color: '#FFE600',
    highlightColor: '#FFF04B',
    path: 'M 255,225 L 324,242 L 302,298 L 246,285 Z',
    center: { x: 280, y: 260 },
    description: 'Bairro mais populoso da cidade, com expressivo polo comercial, escolas e serviços.'
  },
  {
    id: 'liberdade',
    name: 'Liberdade',
    color: '#00853B',
    highlightColor: '#10B981',
    path: 'M 324,242 L 355,248 L 350,302 L 302,298 Z',
    center: { x: 330, y: 270 },
    description: 'Bairro tradicional adjacente a Nova Parnamirim e Emaús.'
  },
  {
    id: 'santa-tereza-norte',
    name: 'Santa Tereza (Norte)',
    color: '#2B383B',
    highlightColor: '#435458',
    path: 'M 302,298 L 338,300 L 326,342 L 290,336 Z',
    center: { x: 314, y: 320 },
    description: 'Núcleo residencial histórico de Santa Tereza.'
  },
  {
    id: 'santos-reis',
    name: 'Santos Reis',
    color: '#EB445A',
    highlightColor: '#F87171',
    path: 'M 338,300 L 350,302 L 344,360 L 320,360 L 326,342 Z',
    center: { x: 335, y: 335 },
    description: 'Área central vibrante com praças e feiras tradicionais.'
  },
  {
    id: 'bela-vista',
    name: 'Bela Vista',
    color: '#0088DD',
    highlightColor: '#38BDF8',
    path: 'M 246,285 L 302,298 L 290,336 L 246,330 Z',
    center: { x: 270, y: 310 },
    description: 'Região com fácil acesso às principais avenidas da zona oeste.'
  },
  {
    id: 'santa-tereza-central',
    name: 'Santa Tereza',
    color: '#384B52',
    highlightColor: '#536870',
    path: 'M 290,336 L 326,342 L 305,375 L 285,365 Z',
    center: { x: 300, y: 355 },
    description: 'Bairro tranquilo de famílias pioneiras de Parnamirim.'
  },
  {
    id: 'centro',
    name: 'Centro',
    color: '#E06538',
    highlightColor: '#FB923C',
    path: 'M 265,340 L 285,365 L 305,375 L 300,405 L 260,410 L 246,370 L 246,330 Z',
    center: { x: 275, y: 375 },
    description: 'Coração administrativo, cívico e comercial da cidade.'
  },
  {
    id: 'boa-esperanca',
    name: 'Boa Esperança',
    color: '#5C388F',
    highlightColor: '#8B5CF6',
    path: 'M 222,416 L 320,388 L 320,410 L 245,432 L 222,416 Z',
    center: { x: 275, y: 412 },
    description: 'Bairro residencial central bem conectado ao comércio do Centro.'
  },
  {
    id: 'rosa-dos-ventos',
    name: 'Rosa dos Ventos',
    color: '#56B9E8',
    highlightColor: '#7DD3FC',
    path: 'M 322,360 L 344,360 L 344,415 L 322,410 Z',
    center: { x: 333, y: 385 },
    description: 'Bairro populoso com comércio variado e eventos esportivos locais.'
  },
  {
    id: 'monte-castelo',
    name: 'Monte Castelo',
    color: '#F498A9',
    highlightColor: '#F472B6',
    path: 'M 344,360 L 380,364 L 366,424 L 340,422 L 344,415 Z',
    center: { x: 355, y: 395 },
    description: 'Região com infraestrutura residencial e escolas consolidadas.'
  },
  {
    id: 'cohabnal',
    name: 'Cohabinal',
    color: '#EBB27D',
    highlightColor: '#FDBA74',
    path: 'M 380,364 L 406,378 L 398,428 L 366,424 Z',
    center: { x: 388, y: 400 },
    description: 'Bairro nobre tradicional com praças arborizadas e clínicas.'
  },
  {
    id: 'vale-do-sol',
    name: 'Vale do Sol',
    color: '#65BA97',
    highlightColor: '#34D399',
    path: 'M 222,430 L 325,415 L 325,495 L 215,495 Z',
    center: { x: 270, y: 460 },
    description: 'Ampla área residencial em expansão na zona sul.'
  },
  {
    id: 'vida-nova',
    name: 'Vida Nova',
    color: '#8CA1B0',
    highlightColor: '#CBD5E1',
    path: 'M 325,430 L 398,428 L 380,510 L 325,495 Z',
    center: { x: 355, y: 465 },
    description: 'Conjuntos habitacionais planejados e famílias jovens.'
  },
  {
    id: 'emaus',
    name: 'Emaús',
    color: '#D80064',
    highlightColor: '#FF2E88',
    path: 'M 375,160 L 415,175 L 420,195 L 465,235 L 448,275 L 355,270 L 355,248 L 360,195 Z',
    center: { x: 405, y: 220 },
    description: 'Importante polo logístico e residencial às margens da BR-101.'
  },
  {
    id: 'parque-nacoes',
    name: 'Parque das Nações',
    color: '#76B82A',
    highlightColor: '#95DD3A',
    path: 'M 490,185 L 510,205 L 590,275 L 545,310 L 465,235 Z',
    center: { x: 520, y: 250 },
    description: 'Bairro em grande expansão imobiliária e condomínios.'
  },
  {
    id: 'cajupiranga',
    name: 'Cajupiranga',
    color: '#D4D4D8',
    highlightColor: '#E4E4E7',
    path: 'M 355,270 L 448,275 L 465,235 L 500,270 L 472,360 L 440,345 L 395,385 L 344,360 L 355,270 Z',
    center: { x: 415, y: 315 },
    description: 'Grande área central em rápido desenvolvimento urbano.'
  },
  {
    id: 'coophab',
    name: 'Coophab / Encanto Verde',
    color: '#7D8053',
    highlightColor: '#A3A76B',
    path: 'M 545,310 L 565,315 L 585,380 L 595,375 L 590,395 L 548,395 L 530,350 Z',
    center: { x: 560, y: 355 },
    description: 'Bairro verde com chácaras e condomínios fechados.'
  },
  {
    id: 'parnamirim-leste',
    name: 'Parnamirim Leste',
    color: '#D4D4D8',
    highlightColor: '#E4E4E7',
    path: 'M 560,275 L 590,310 L 695,395 L 712,435 L 712,485 L 655,450 L 548,420 L 548,395 L 590,395 L 560,275 Z',
    center: { x: 630, y: 390 },
    description: 'Zona de transição leste com corredores viários ecológicos.'
  },
  {
    id: 'parque-exposicoes',
    name: 'Parque de Exposições',
    color: '#FFFACD',
    highlightColor: '#FEF08A',
    path: 'M 395,385 L 440,345 L 472,360 L 500,320 L 548,420 L 472,440 L 380,500 L 398,428 Z',
    center: { x: 460, y: 420 },
    description: 'Sede do Parque Aristófanes Fernandes e da tradicional Festa do Boi.'
  },
  {
    id: 'pium',
    name: 'Pium',
    color: '#B6B579',
    highlightColor: '#D1D099',
    path: 'M 620,460 L 655,450 L 702,490 L 685,520 Z',
    center: { x: 665, y: 480 },
    description: 'Distrito litorâneo com feiras gastronômicas e preservação ambiental.'
  },
  {
    id: 'cotovelo',
    name: 'Cotovelo',
    color: '#9C3D76',
    highlightColor: '#C05A96',
    path: 'M 702,490 L 715,490 L 748,560 L 730,575 L 685,520 Z',
    center: { x: 720, y: 535 },
    description: 'Praia tranquila famosa pelas falésias e passeios náuticos.'
  },
  {
    id: 'pirangi-do-norte',
    name: 'Pirangi do Norte',
    color: '#FFBE00',
    highlightColor: '#FCD34D',
    path: 'M 738,570 L 770,610 L 785,600 L 828,655 L 815,680 L 768,650 L 738,570 Z',
    center: { x: 780, y: 630 },
    description: 'Cartão postal do Rio Grande do Norte com o Maior Cajueiro do Mundo.'
  }
];
