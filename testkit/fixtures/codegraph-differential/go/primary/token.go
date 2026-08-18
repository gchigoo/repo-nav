package primary

func ResolveAuthToken(sourceToken string) string {
	return sourceToken
}

func ResolveAuthTokenFactory() func() string {
	return func() string { return "decoy" }
}
