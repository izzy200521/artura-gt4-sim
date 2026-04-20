// chartdetail.js — Full screen chart detail page

export function openChartDetail(chartId, title, datasets, labels, options) {
  // Store chart data in sessionStorage so the detail page can read it
  sessionStorage.setItem('chartDetail', JSON.stringify({
    chartId, title, datasets, labels, options
  }));
  window.open('chart-detail.html', '_blank');
}

export function initDetailPage() {
  const raw = sessionStorage.getItem('chartDetail');
  if (!raw) return;

  const { title, datasets, labels, options } = JSON.parse(raw);

  document.getElementById('chartTitle').textContent = title;

  const canvas = document.getElementById('detailChart');
  new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#d4d4d4',
            font: { size: 12, family: 'Consolas' },
            boxWidth: 12,
            padding: 16,
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: '#252526',
          borderColor: '#3c3c3c',
          borderWidth: 1,
          titleColor: '#9cdcfe',
          bodyColor: '#d4d4d4',
          padding: 10,
          titleFont: { family: 'Consolas', size: 11 },
          bodyFont: { family: 'Consolas', size: 11 },
        }
      },
      scales: {
        y: {
          grid: { color: '#2a2a2a' },
          ticks: {
            color: '#6a9955',
            font: { size: 11, family: 'Consolas' },
            callback: options?.yTickCallback
              ? new Function('value', 'index', options.yTickCallback)
              : undefined,
          },
          border: { color: '#3c3c3c' },
          min: options?.yMin,
          max: options?.yMax,
          ...(options?.y2 ? {} : {}),
        },
        ...(options?.y2 ? {
          y2: {
            grid: { display: false },
            ticks: { color: options.y2Color || '#4a90d9', font: { size: 11, family: 'Consolas' } },
            border: { color: '#3c3c3c' },
            position: 'right',
          }
        } : {}),
        x: {
          grid: { color: '#2a2a2a' },
          ticks: { color: '#6a9955', font: { size: 11, family: 'Consolas' } },
          border: { color: '#3c3c3c' },
          title: {
            display: true,
            text: 'Lap',
            color: '#6a9955',
            font: { size: 11, family: 'Consolas' },
          }
        }
      },
      elements: {
        point: { radius: 3, hoverRadius: 6 },
        line: { borderWidth: 2 }
      },
      animation: { duration: 400 },
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
    }
  });
}
