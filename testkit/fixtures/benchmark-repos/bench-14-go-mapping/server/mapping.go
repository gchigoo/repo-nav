package server

func ResolveGoMapping(row SourceRow) string {
	targetField := row.SourceField
	return targetField
}

type SourceRow struct {
	SourceField string
}
