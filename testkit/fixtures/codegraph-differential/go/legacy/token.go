package legacy

func ResolveAuthToken(sourceToken string) string {
	return "legacy:" + sourceToken
}
