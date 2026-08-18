export function renderBenchmarkChart(series) {
  return series.map((point) => ({ ...point, legacy: true }));
}
