// main.js

(async () => {
  // 1) data/ufo.csv 로드 및 전처리
  const ufo = await d3.csv('./data/ufo_us.csv', d => {
    d.datetime = new Date(d.datetime);
    return d;
  });

  // 2) 컨트롤 초기화
  const states = Array.from(new Set(ufo.map(d => d.state))).sort();
  const years = Array.from(
  new Set(
    ufo.map(d => {
        return d.datetime.getFullYear();
      })
      .filter(y => y !== null)
  )
).sort();

  const cSel      = document.getElementById('stateSelect');
  const ySel      = document.getElementById('yearSelect');
  ['All', ...states].forEach(c => cSel.add(new Option(c, c)));
  ['All', ...years].forEach(y => { ySel.add(new Option(y, y));});

  let state = 'All',year = 'All';
  cSel.onchange   = () => { state = cSel.value;   renderAll(); };
  ySel.onchange   = () => { year   = ySel.value;   renderAll(); };

  // 3) Vega-Lite 스펙 정의

  function specWorldMap(data) {
    return {
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": "container",
  "height": "container",
  "projection": {
    "type": "albersUsa"
  },
  "layer": [
    {
      "data": {
        "url": "data/us-10m.json",
        "format": {
          "type": "topojson",
          "feature": "states"
        }
      },
      "mark": {
        "type": "geoshape",
        "fill": "lightgray",
        "stroke": "white"
      }
    },
    {
        "data": { "values": data },        // renderAll()에서 넘겨받은 coords
        "mark": {
          "type": "circle",
          "color": "red",
          "opacity": 0.6,
          "size": 20                     // 원의 크기 (pixel 단위)
        },
        "encoding": {
          "longitude": { "field": "longitude", "type": "quantitative" },
          "latitude":  { "field": "latitude",  "type": "quantitative" },
          "tooltip": [
            { "field": "date",     "type": "temporal",    "title": "Date",
              "format": "%Y-%m-%d %H:%M:%S" },
            { "field": "shape",    "type": "nominal",     "title": "Shape" },
            { "field": "duration", "type": "quantitative", "title": "Duration (s)" },
            { "field": "comments", "type": "nominal",      "title": "Comments"    },
            { "field": "latitude", "type": "quantitative", "title": "Latitude"    },
            { "field": "longitude","type": "quantitative", "title": "Longitude"   }
          ]
        }
      }
  ]
};
  }

  async function renderTimeSeries(filtered) {
    // 연도별 목격 수 집계
    const byYear = d3.rollups(
      filtered,
      v => v.length,
      d => d.datetime.getFullYear()
    )
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);

    const spec = {
      "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
      autosize: { type:'fit', contains:'padding', resize:true },
      width: 'container',
      height : 300,
      data: { values: byYear },
      mark: { type: 'line', point: true },
      encoding: {
        x: { field: 'year',  type: 'ordinal', title: 'Year' },
        y: { field: 'count', type: 'quantitative', title: 'Sightings' }
      }
    };

    await vegaEmbed('#timeseries', spec, { actions: false });
  }

async function renderDurationHist(filtered) {
  // 1) seconds → hours 로 변환 (d['duration (seconds)'] / 3600)
  const durations = filtered
    .map(d => +d['duration (seconds)'] / 60)
    .filter(d => d > 0);

  // 2) 데이터 없으면 클리어
  if (!durations.length) {
    document.getElementById('duration-hist').innerHTML = '';
    return;
  }

  // 3) 최소·최대값 계산
  const minVal = d3.min(durations);
  const maxVal = d3.max(durations);

  // 4) d3.bin 으로 bin 생성 (예: 30구간)
  const bins = d3.bin()
    .domain([minVal, maxVal])
    .thresholds(maxVal-minVal/20)
    (durations);

  // 5) bin 별 count 집계
  const binData = bins.map(bin => ({
    start: bin.x0,
    end:   bin.x1,
    count: bin.length
  }));

  // 6) 최고 빈도수 1/10 이하 제거
  const maxCount = d3.max(binData, d => d.count);
  const threshold = maxCount / 10;
  const filteredBins = binData.filter(d => d.count > threshold);

  // 7) Vega용 포맷 (bin 중앙값 사용)
  const values = filteredBins.map(d => ({
    duration_hr: (d.start + d.end) / 2,
    count:       d.count
  }));

  // 8) Vega-Lite 스펙 (x축 단위를 hours 로 표시)
  const spec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    autosize: { type: 'fit', contains: 'padding', resize: true },
    width:  'container',
    height: 300,
    data: { values },
    mark: 'bar',
    encoding: {
      x: {
        field: 'duration_hr',
        type: 'quantitative',
        title: 'Duration (min)',   // ← 단위 변경
        axis: { format: '.1f' }       // 소수점 한 자리까지
      },
      y: {
        field: 'count',
        type: 'quantitative',
        title: 'Frequency'
      },
      tooltip: [
        { field: 'duration_hr', type: 'quantitative', title: 'Duration (hr)' },
        { field: 'count',       type: 'quantitative', title: 'Count' }
      ]
    }
  };

  await vegaEmbed('#duration-hist', spec, { actions: false });
}

async function renderStateBar(filtered) {
  // 1) state별 신고 건수 집계 후 정렬
  const byState = d3.rollups(
      filtered,
      v => v.length,
      d => d.state
    )
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
    // 2) 상위 20개만 추출
    .slice(0, 20);

  // 3) Vega-Lite 스펙
  const spec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    autosize: { type: 'fit', contains: 'padding', resize: true },
    width:  'container',
    height: 'container',
    data: { values: byState },  // 이제 상위 20개만 들어있습니다.
    mark: 'bar',
    encoding: {
      y: {
        field: 'state',
        type: 'nominal',
        sort: '-x',
        title: 'State'
      },
      x: {
        field: 'count',
        type: 'quantitative',
        title: 'Count'
      },
      tooltip: [
        { field: 'state', type: 'nominal',      title: 'State' },
        { field: 'count', type: 'quantitative', title: 'Count' }
      ]
    }
  };

  // 4) 렌더링
  await vegaEmbed('#state-bar', spec, { actions: false });
}


async function renderDurationViolin(filtered) {
  const spec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    autosize: { type:'fit', contains:'padding', resize:true },
    width:  'container',
    height: 300,
    data: { values: filtered },
    layer: [
      // ① Violin density
      {
        mark: { type: 'area', orient: 'horizontal', opacity: 0.3 },
        transform: [
          { density: 'duration (seconds)', bandwidth: 30, as: ['duration', 'density'] }
        ],
        encoding: {
          y: { field: 'duration', type: 'quantitative', title: 'Duration (s)' },
          x: { field: 'density',  type: 'quantitative', title: 'Density' },
          color: { value: '#69b3a2' }
        }
      },
      // ② Boxplot
      {
        mark: { type: 'boxplot', extent: 'min-max' },
        encoding: {
          y: { field: 'duration', type: 'quantitative' }
        }
      },
      // ③ Outliers
      {
        mark: 'point',
        encoding: {
          y: { field: 'duration', type: 'quantitative' },
          tooltip: [
            { field:'duration', type:'quantitative', title:'Duration (s)' }
          ]
        }
      }
    ]
  };

  await vegaEmbed('#duration-violin', spec, { actions: false });
}

async function renderShapeDonut(filtered) {
  // shape별 신고 건수 집계
  const byShape = d3.rollups(
    filtered,
    v => v.length,
    d => d.shape
  )
  .map(([shape, count]) => ({ shape, count }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 10);  // 상위 10개만

  // Vega-Lite 도넛 차트 스펙
  const spec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    autosize: { type: 'fit', contains: 'padding', resize: true },
    width:  'container',
    height: 300,

    data: { values: byShape },
    mark: {
      type: 'arc',
      innerRadius: 60,    // 도넛 구멍 크기
      stroke: '#fff'
    },
    encoding: {
      theta: { field: 'count', type: 'quantitative', title: 'Count' },
      color: {
        field: 'shape',
        type: 'nominal',
        title: 'Shape',
        legend: { orient: 'right', columns: 1 }
      },
      tooltip: [
        { field: 'shape', type: 'nominal',      title: 'Shape' },
        { field: 'count', type: 'quantitative', title: 'Count' },
        { field: 'count',
          type: 'quantitative',
          title: '% of Top 10',
          // 도넛 조각 중 비율 계산 (합계 대비)
          transform: {
            calculate: 'datum.count / d3.sum(data, d => d.count) * 100',
            as: 'pct'
          },
          format: '.1f'
        }
      ]
    }
  };

  await vegaEmbed('#shape-donut', spec, { actions: false });
}

async function renderAll() {
    // country 필터링 & ISO_A3 id 매핑 (US, CA 예시)
    const filtered = ufo.filter(d =>
      (state === 'All' || d.state === state) &&
      (year  === 'All' || d.datetime.getFullYear() === +year)
    );
    
    const stateFiltered = ufo.filter(d =>
      (state === 'All' || d.state === state)
    );

    const yearFiltered = ufo.filter(d =>
      (year  === 'All' || d.datetime.getFullYear() === +year)
    );
    // 2) 위도/경도만 추출
    const coords = filtered.map(d => ({
      latitude:  +d.latitude,
      longitude: +d.longitude,
      duration:  +d['duration (seconds)'],  // duration(초)
      comments:  d.comments,               // comment 텍스트
      date : d.datetime.toISOString(),
      shape : d.shape
    }));

    document.getElementById('filtered-count').textContent = coords.length;

    // 전세계 맵
    await vegaEmbed('#worldmap',
                    specWorldMap(coords),
                    { actions: false });
    await renderTimeSeries(stateFiltered);
    await renderDurationHist(filtered);
    await renderStateBar(yearFiltered);
    await renderShapeDonut(filtered);
    document.getElementById('filtered-count').textContent = filtered.length;
  }



  // 최초 호출
  renderAll();
  renderCharts(filtered);
})();
