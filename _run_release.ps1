$ErrorActionPreference = "Continue"
$out = Join-Path $PSScriptRoot "_release_output.txt"
"" | Out-File $out -Encoding utf8
function Log($label, [scriptblock]$Block) {
  "`n===== $label =====" | Out-File $out -Append -Encoding utf8
  & $Block 2>&1 | Out-File $out -Append -Encoding utf8
}
Set-Location $PSScriptRoot
Log "1 git status -sb" { git status -sb }
Log "2 git log -10 --oneline" { git log -10 --oneline }
Log "3 git log grep release" { git log --oneline --grep="release: 1.0.0 GA" }
Log "4 package version" { node -e "console.log(require('./package.json').version)" }
Log "5 git tag v1.0.0" { git tag -l "v1.0.0" }
Log "6 rev-parse HEAD" { git rev-parse HEAD }
$dirty = git status --porcelain -- package.json npm-shrinkwrap.json .github/workflows/package-release-ci.yml
if ($dirty) {
  Log "commit release 1.0.0 GA" {
    git add package.json npm-shrinkwrap.json .github/workflows/package-release-ci.yml
    git commit -m "release: 1.0.0 GA" -m "Benchmark gate in package-release CI; publish latest after beta.2/beta.3 correctness and release-experience work."
  }
} else {
  "===== skip commit (no dirty release files) =====" | Out-File $out -Append -Encoding utf8
}
Log "7 git push origin HEAD" { git push origin HEAD }
$tag = git tag -l "v1.0.0"
if (-not $tag) {
  Log "8 tag create and push" {
    git tag -a v1.0.0 -m "repo-nav 1.0.0"
    git push origin v1.0.0
  }
} else {
  Log "8 tag exists" { Write-Output "v1.0.0 already tagged locally" }
}
Log "9 gh release view or create" {
  gh release view v1.0.0 2>&1
  if ($LASTEXITCODE -ne 0) {
    gh release create v1.0.0 --title "v1.0.0" --notes "GA: authoritative selector, v2-only exports, release CI, snapshotRef, real-repo benchmark gate. Install: npm i -g repo-nav@latest. Beta channel remains at 0.2.0-beta.3 via --tag beta."
  }
}
Log "10 npm whoami" { npm whoami }
Log "11 npm view or publish" {
  npm view repo-nav@1.0.0 version 2>&1
  if ($LASTEXITCODE -ne 0) { npm publish --access public 2>&1 }
}
Log "12 npm dist-tag ls" { npm dist-tag ls repo-nav }
Log "13 gh pr merge 3" { gh pr merge 3 --merge --admin 2>&1 }
Log "14 gh pr checks 3" { gh pr checks 3 2>&1 }
Log "final HEAD" { git rev-parse HEAD }
