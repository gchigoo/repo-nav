export function renderBenchmarkChart(series) {
  return series.map((point) => point.value);
}

export function renderBenchmarkChartFactory() {
  return () => [];
}
