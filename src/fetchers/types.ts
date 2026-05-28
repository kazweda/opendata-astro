export interface DataSet {
  title?: string
  labels: string[]
  series: { name: string; values: number[] }[]
}

export interface DataFetcher<P = Record<string, string>> {
  fetch(params: P): Promise<DataSet>
}
