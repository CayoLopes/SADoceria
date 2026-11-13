# SADoceria — apoio à decisão
Três ferramentas: **Priorizar** (AHP, lib npm `ahp`), **Precificar** (insumos pré-cadastrados) e **Entregar** (mapa Leaflet + OSRM + Nominatim).
Rodar: `python -m http.server 8000` e abrir http://localhost:8000 (precisa de internet para mapa e AHP).
Estrutura: css/ (base, layout, components, ahp, app) · js/core (utils, state, nav, app) · js/features (precificar, entregar, priorizar/).

## Metodologia (resumo)
- **Precificação:** custeio por absorção (ingredientes + mão de obra + gás + energia + indiretos rateados por hora, dividido pelas unidades *vendáveis* após perdas) × (1 + lucro). Também mostra margem de contribuição (custeio variável) e ponto de equilíbrio = custos fixos ÷ margem de contribuição.
- **Gás:** (kg/h × horas) × preço do botijão ÷ kg do botijão. **Energia:** kW × horas × tarifa.
- **Rotas:** tempos reais por vias (OSRM `table`) + TSP exato (Held-Karp, `Calc.tsp`, até 10 entregas) + percurso por perna (`route` com steps), setas e cores por trecho; custo/km = combustível/consumo + outros.
- **AHP:** comparação par a par (escala de Saaty 1–9); ranking pela biblioteca `ahp`; CR (autovetor/RI de Saaty) e pares suspeitos (|ln(aij / (wi/wj))|) em `Calc.ahpDiag`; "valor sugerido" = razão implícita nos demais julgamentos.
- **Testes:** `node js/core/calc.test.js`

## Serviços gratuitos usados e limites (verificados na política de uso de cada um)
- **OSRM demo (router.project-osrm.org):** uso razoável e não comercial, no máximo ~1 requisição/s, sem garantia de disponibilidade; exige atribuição. O app enfileira as chamadas (1,1 s) e guarda em cache a matriz de tempos.
- **Nominatim (OpenStreetMap):** no máximo 1 requisição/s, sem autocompletar; o app também enfileira. Atribuição "© OpenStreetMap" exibida no mapa.
- **Tiles OSM:** uso leve (projeto acadêmico/pequeno porte). Para uso comercial contínuo: hospedar o próprio OSRM/Nominatim ou usar provedor com chave (OpenRouteService/GraphHopper têm planos gratuitos, mas exigem cadastro e chave, e têm cotas).
- Não há trânsito em tempo real nem janelas de horário; a otimização minimiza o tempo total de viagem.
